/**
 * Host half of the session manager (@dshwp/dsh-session-manager).
 *
 * Exposes a small JSON API under /dsh-sm/* on the harness web server:
 *   POST /dsh-sm/archived/list      {}                    -> { items, totalBytes }
 *   POST /dsh-sm/archived/unarchive { sessionId }         -> { ok, changed, archivedSessionIds }
 *   POST /dsh-sm/sessions/list      {}                    -> { items }
 *   POST /dsh-sm/sessions/archive   { sessionId }         -> { ok, archivedSessionIds }
 *   POST /dsh-sm/sessions/delete    { sessionId }         -> { ok, deleted, sessionId, path?, reason? }
 *   POST /dsh-sm/sessions/detail    { sessionId }         -> { id, createdAt, cwd, totalEvents, messageCount, truncated, messages }
 *
 * Everything here reuses official services only (workspaceRegistry,
 * sessionPersistence, sessionQuery, sessions, fs, shell, sandboxPolicy,
 * agents) — no official package is patched or modified.
 *
 * The browser half ships in the same package (exports["./client"]).
 */

/** Wait for the browser HTTP carrier before registering the route. */
export const inject = ["webServer"];

/** Plugin display name for the loader. */
export const name = "dsh-session-manager";

// ---------- helpers ----------

function parentDir(p) {
  const a = p.lastIndexOf("/");
  const b = p.lastIndexOf("\\");
  const i = a > b ? a : b;
  return i <= 0 ? p : p.slice(0, i);
}

function sessionIdOf(args) {
  if (args === null || typeof args !== "object") throw new Error("sessionId is required");
  const id = args.sessionId;
  if (typeof id !== "string" || id.length === 0) throw new Error("sessionId is required");
  return id;
}

/** Extract readable text from a content-block array. */
function blocksText(blocks) {
  if (!Array.isArray(blocks)) return "";
  const parts = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
    else if (b.type === "reasoning" && typeof b.text === "string") parts.push("[Thinking] " + b.text);
    else if (b.type === "tool-call") parts.push("[Call " + (b.name || "?") + "]");
    else if (b.type === "tool-result") parts.push("[Tool Result]");
    else if (b.type === "image") parts.push("[Image]");
  }
  return parts.join("\n");
}

/**
 * Recursive byte size of a session directory via the fs service.
 * Returns null when the path cannot be resolved (missing on disk).
 */
async function dirSizeBytes(fsSvc, dirPath, depth) {
  let target;
  try {
    target = await fsSvc.resolve(dirPath);
  } catch (e) {
    return null;
  }
  try {
    const info = await fsSvc.stat(target);
    if (!info) return 0;
    if (info.type !== "directory") return info.size || 0;
    if (depth > 10) return 0;
    let total = 0;
    let entries = [];
    try {
      entries = await fsSvc.listDir(target);
    } catch (e) {
      entries = [];
    }
    for (const entry of entries) {
      if (entry.type === "directory") {
        const sub = await dirSizeBytes(fsSvc, fsSvc.processPath(entry.target), depth + 1);
        total += sub === null ? 0 : sub;
      } else {
        total += entry.size || 0;
      }
    }
    return total;
  } catch (e) {
    return 0;
  }
}

/**
 * Resolve an explicit danger-full-access policy so the shell executor runs the
 * deletion unconfined (the ACL sandbox would otherwise block removing files
 * the agent workspace does not own).
 */
function dangerPolicy(ctx) {
  const sp = ctx.get("sandboxPolicy");
  if (!sp || typeof sp.resolve !== "function") return undefined;
  try {
    return sp.resolve({ mode: "danger-full-access" });
  } catch (e) {
    return undefined;
  }
}

/** Delete a directory recursively through the shell executor (pwsh / rm). */
async function removeDir(ctx, dirPath) {
  const shell = ctx.get("shell");
  if (!shell || typeof shell.resolve !== "function" || typeof shell.run !== "function") {
    throw new Error("shell executor unavailable; cannot delete from disk");
  }
  const isWindows = /^[A-Za-z]:[\\/]/.test(dirPath);
  const command = isWindows
    ? "Remove-Item -LiteralPath '" + dirPath.replace(/'/g, "''") + "' -Recurse -Force -ErrorAction Stop"
    : "rm -rf -- '" + dirPath.replace(/'/g, "'\\''") + "'";
  const request = { command, timeoutMs: 60000 };
  const policy = dangerPolicy(ctx);
  if (policy) request.sandboxPolicy = policy;
  let spec;
  try {
    spec = shell.resolve(request);
  } catch (e) {
    throw new Error("shell resolve failed: " + String((e && e.message) || e));
  }
  const result = await shell.run(spec);
  if (result && result.exitCode === 0) return;
  let detail = "";
  try {
    const out = result && (result.stderr || result.stdout);
    if (out && typeof out.text === "string") detail = out.text.slice(0, 400);
  } catch (e) {
    detail = "";
  }
  throw new Error("Delete failed (exit " + String(result && result.exitCode) + "): " + (detail || dirPath));
}

/**
 * Remove one id from the durable archive set and keep the registry's in-memory
 * state consistent so its own later writes cannot clobber it. The full state
 * object is passed through unchanged apart from the pruned set.
 */
async function removeFromArchiveSet(ctx, sessionId) {
  const registry = ctx.get("workspaceRegistry");
  if (!registry) throw new Error("workspace registry unavailable");
  if (!registry.state || typeof registry.state !== "object") throw new Error("workspace registry is not started");
  const current = registry.archivedSessionIds;
  if (!Array.isArray(current) || !current.includes(sessionId)) return false;
  const next = current.filter((id) => id !== sessionId);
  const state = Object.assign({}, registry.state, { archivedSessionIds: next });
  if (typeof registry.setState === "function") {
    await registry.setState(state);
    return true;
  }
  const domain = ctx.get("storageDomain");
  if (!domain) throw new Error("storage domain unavailable");
  const unit = domain.get("workspace");
  if (!unit || !unit.global || typeof unit.global.set !== "function") throw new Error("workspace domain is not open");
  await unit.global.set(state);
  registry.state = state;
  return true;
}

/** A session is deletable unless its agent is actively running a turn. */
function sessionRunning(ctx, sessionId) {
  const agents = ctx.get("agents");
  if (!agents || typeof agents.get !== "function") return false;
  const agent = agents.get(sessionId);
  return !!(agent && agent.status === "running");
}

/**
 * Evict a live session from the in-memory store (the store's own detach path),
 * so a deleted session cannot resurface in the workspace afterward.
 */
function evictSessionFromMemory(ctx, sessionId) {
  const sessions = ctx.get("sessions");
  if (!sessions) return false;
  try {
    const store = sessions.store;
    if (!store || typeof store.get !== "function") return false;
    const entry = store.get(sessionId);
    if (!entry || typeof entry.detach !== "function") return false;
    entry.detach();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Remove a deleted session from its workspace's accounting slot so the sidebar
 * cannot render a ghost row for a session whose files are gone.
 */
async function detachFromWorkspace(ctx, sessionId) {
  const registry = ctx.get("workspaceRegistry");
  if (!registry || typeof registry.list !== "function") return false;
  let changed = false;
  for (const entity of registry.list()) {
    if (!entity || !Array.isArray(entity.sessionIds) || !entity.sessionIds.includes(sessionId)) continue;
    if (typeof entity.detachSession === "function") {
      await entity.detachSession(sessionId);
      changed = true;
    }
  }
  return changed;
}

// ---------- data builders ----------

async function buildSessionItem(ctx, id, header, titles, workspacesBySession, liveSvc, fsSvc) {
  let sizeBytes = 0;
  let missing = false;
  let path = null;
  if (header) {
    let location = null;
    try {
      location = ctx.get("sessionPersistence").locate(header);
    } catch (e) {
      location = null;
    }
    if (location && typeof location.path === "string" && location.path.length > 0) {
      path = location.path;
      if (fsSvc) {
        const size = await dirSizeBytes(fsSvc, parentDir(location.path), 0);
        if (size === null) missing = true;
        else sizeBytes = size;
      }
    } else {
      missing = true;
    }
  } else {
    missing = true;
  }
  const ws = workspacesBySession ? workspacesBySession.get(id) : undefined;
  return {
    id,
    title: titles ? titles.get(id) || null : null,
    createdAt: header ? header.createdAt : null,
    cwd: header ? header.cwd || null : null,
    parentSession: header ? header.parentSession || null : null,
    workspaceId: ws ? ws.id : null,
    workspaceTitle: ws ? ws.title : null,
    sizeBytes,
    missing,
    live: !!(liveSvc && liveSvc.get(id) !== undefined),
    running: sessionRunning(ctx, id),
    path
  };
}

/** Build id -> workspaceTitle mapping from the registry's own accounting. */
function workspaceMap(ctx) {
  const registry = ctx.get("workspaceRegistry");
  const map = new Map();
  if (!registry || typeof registry.list !== "function") return map;
  try {
    for (const entity of registry.list()) {
      if (!entity || !Array.isArray(entity.sessionIds)) continue;
      for (const sid of entity.sessionIds) {
        map.set(sid, { id: entity.id, title: entity.title });
      }
    }
  } catch (e) {
    // best effort
  }
  return map;
}

// ---------- API handlers ----------

async function handleArchivedList(ctx) {
  const registry = ctx.get("workspaceRegistry");
  const persistence = ctx.get("sessionPersistence");
  if (!registry || !persistence) return { items: [], totalBytes: 0 };
  const archived = Array.isArray(registry.archivedSessionIds) ? [...registry.archivedSessionIds] : [];
  if (archived.length === 0) return { items: [], totalBytes: 0 };

  const headers = await persistence.list();
  const byId = new Map();
  for (const h of headers) byId.set(h.id, h);

  const titles = new Map();
  const query = ctx.get("sessionQuery");
  if (query && typeof query.readTitleSnapshots === "function") {
    try {
      const results = await query.readTitleSnapshots(archived);
      for (const r of results) {
        if (r && r.status === "fulfilled" && r.value && r.value.title && typeof r.value.title.title === "string") {
          titles.set(r.sessionId, r.value.title.title);
        }
      }
    } catch (e) {
      // best effort
    }
  }

  const liveSvc = ctx.get("sessions");
  const fsSvc = ctx.get("fs");
  const workspaces = workspaceMap(ctx);
  const items = [];
  let totalBytes = 0;
  for (const id of archived) {
    const item = await buildSessionItem(ctx, id, byId.get(id), titles, workspaces, liveSvc, fsSvc);
    totalBytes += item.sizeBytes;
    items.push(item);
  }
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { items, totalBytes };
}

async function handleUnarchive(ctx, args) {
  const sessionId = sessionIdOf(args);
  const registry = ctx.get("workspaceRegistry");
  if (!registry) throw new Error("workspace registry unavailable");
  if (!Array.isArray(registry.archivedSessionIds) || !registry.archivedSessionIds.includes(sessionId)) {
    throw new Error("Session '" + sessionId + "' is not in the archive");
  }
  const changed = await removeFromArchiveSet(ctx, sessionId);
  return { ok: true, changed, archivedSessionIds: [...registry.archivedSessionIds] };
}

async function handleSessionsList(ctx) {
  const persistence = ctx.get("sessionPersistence");
  if (!persistence) return { items: [] };
  const registry = ctx.get("workspaceRegistry");
  const archivedSet = new Set(
    Array.isArray(registry && registry.archivedSessionIds) ? registry.archivedSessionIds : []
  );
  const headers = await persistence.list();
  const titles = new Map();
  const query = ctx.get("sessionQuery");
  if (query && typeof query.readTitleSnapshots === "function") {
    try {
      const ids = headers.map((h) => h.id);
      const results = await query.readTitleSnapshots(ids);
      for (const r of results) {
        if (r && r.status === "fulfilled" && r.value && r.value.title && typeof r.value.title.title === "string") {
          titles.set(r.sessionId, r.value.title.title);
        }
      }
    } catch (e) {
      // best effort
    }
  }
  const liveSvc = ctx.get("sessions");
  const fsSvc = ctx.get("fs");
  const workspaces = workspaceMap(ctx);
  const items = await Promise.all(
    headers.map(async (h) => {
      const item = await buildSessionItem(ctx, h.id, h, titles, workspaces, liveSvc, fsSvc);
      item.archived = archivedSet.has(h.id);
      return item;
    })
  );
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { items };
}

async function handleArchive(ctx, args) {
  const sessionId = sessionIdOf(args);
  const registry = ctx.get("workspaceRegistry");
  if (!registry || typeof registry.archiveSession !== "function") {
    throw new Error("workspace registry unavailable");
  }
  await registry.archiveSession(sessionId);
  return { ok: true, archivedSessionIds: [...registry.archivedSessionIds] };
}

async function handleDelete(ctx, args) {
  const sessionId = sessionIdOf(args);
  const registry = ctx.get("workspaceRegistry");
  const persistence = ctx.get("sessionPersistence");
  if (!registry || !persistence) throw new Error("workspace registry or session persistence unavailable");
  if (sessionRunning(ctx, sessionId)) {
    throw new Error("Session '" + sessionId + "' is currently running and cannot be deleted");
  }
  // A live (in-memory) session would otherwise resurface in the workspace once
  // its files are gone; evict it so the deletion is complete.
  const liveSvc = ctx.get("sessions");
  const isLive = !!(liveSvc && typeof liveSvc.get === "function" && liveSvc.get(sessionId) !== undefined);
  if (isLive && !evictSessionFromMemory(ctx, sessionId)) {
    throw new Error("Session '" + sessionId + "' is still resident in memory and could not be removed; delete incomplete — please restart the harness and try again");
  }
  const headers = await persistence.list();
  let header = null;
  for (const h of headers) {
    if (h.id === sessionId) {
      header = h;
      break;
    }
  }
  if (!header) {
    // Already gone from persistence: just prune bookkeeping.
    await removeFromArchiveSet(ctx, sessionId);
    await detachFromWorkspace(ctx, sessionId);
    return { ok: true, deleted: false, reason: "no-artifact", sessionId };
  }
  let location = null;
  try {
    location = persistence.locate(header);
  } catch (e) {
    location = null;
  }
  if (!location || typeof location.path !== "string" || location.path.length === 0) {
    await removeFromArchiveSet(ctx, sessionId);
    await detachFromWorkspace(ctx, sessionId);
    return { ok: true, deleted: false, reason: "no-artifact", sessionId };
  }
  const dirPath = parentDir(location.path);
  const fsSvc = ctx.get("fs");
  let sizeBytes = 0;
  if (fsSvc) {
    const size = await dirSizeBytes(fsSvc, dirPath, 0);
    sizeBytes = size === null ? 0 : size;
  }
  await removeDir(ctx, dirPath);
  await removeFromArchiveSet(ctx, sessionId);
  await detachFromWorkspace(ctx, sessionId);
  return { ok: true, deleted: true, sessionId, path: dirPath, sizeBytes };
}

async function handleDetail(ctx, args) {
  const sessionId = sessionIdOf(args);
  const query = ctx.get("sessionQuery");
  if (!query || typeof query.readSession !== "function") {
    throw new Error("session query unavailable");
  }
  let snapshot;
  try {
    snapshot = await query.readSession(sessionId);
  } catch (e) {
    throw new Error("Could not read session content (it may have been deleted from disk): " + String((e && e.message) || e));
  }
  if (!snapshot || !Array.isArray(snapshot.events)) {
    throw new Error("Session content is empty or unreadable");
  }
  const events = snapshot.events;
  const messages = [];
  const MAX_MESSAGES = 100;
  const MAX_TEXT = 8000;
  for (const ev of events) {
    if (messages.length >= MAX_MESSAGES) break;
    if (!ev || typeof ev !== "object" || !ev.data || typeof ev.data !== "object") continue;
    const data = ev.data;
    if (ev.type === "user/message") {
      const text = blocksText(data.content);
      if (text) messages.push({ seq: ev.seq, time: ev.time, role: "user", text: text.slice(0, MAX_TEXT) });
    } else if (ev.type === "assistant/message" && data.message && typeof data.message === "object") {
      const text = blocksText(data.message.content);
      if (text) messages.push({ seq: ev.seq, time: ev.time, role: "assistant", text: text.slice(0, MAX_TEXT) });
    } else if (ev.type === "tool/call") {
      const toolName = typeof data.name === "string" ? data.name : "?";
      const argsText = typeof data.arguments === "string" ? data.arguments.slice(0, 300) : "";
      messages.push({ seq: ev.seq, time: ev.time, role: "tool", text: "[" + toolName + "] " + argsText });
    }
  }
  const header = snapshot.session || null;
  return {
    id: sessionId,
    createdAt: header ? header.createdAt : null,
    cwd: header ? header.cwd || null : null,
    parentSession: header ? header.parentSession || null : null,
    totalEvents: events.length,
    messageCount: messages.length,
    truncated: messages.length >= MAX_MESSAGES,
    messages
  };
}

// ---------- HTTP route ----------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(Buffer.concat(chunks).toString("utf8"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

/** Loopback-only guard: the request must come from the harness's own origin. */
function isLoopbackHost(host) {
  if (typeof host !== "string") return false;
  const h = host.split(":")[0].toLowerCase().replace(/^\[|\]$/g, "");
  return h === "127.0.0.1" || h === "localhost" || h === "::1" || h === "0.0.0.0" || h === "::";
}

function originAllowed(req, host) {
  const origin = req.headers && req.headers.origin;
  if (origin !== undefined && origin !== null) {
    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch (e) {
      return false;
    }
    if (originHost !== host) return false;
  }
  const fetchSite = req.headers && req.headers["sec-fetch-site"];
  if (fetchSite !== undefined && fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }
  return true;
}

export function apply(ctx) {
  const handlers = {
    "archived/list": () => handleArchivedList(ctx),
    "archived/unarchive": (args) => handleUnarchive(ctx, args),
    "sessions/list": () => handleSessionsList(ctx),
    "sessions/archive": (args) => handleArchive(ctx, args),
    "sessions/delete": (args) => handleDelete(ctx, args),
    "sessions/detail": (args) => handleDetail(ctx, args)
  };

  async function handler(req, res) {
    const host = req.headers && req.headers.host;
    if (!isLoopbackHost(host) || !originAllowed(req, host)) {
      sendJson(res, 403, { error: "forbidden: loopback origin only" });
      return;
    }
    if ((req.method || "") !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }
    const pathname = (req.url || "").split("?")[0].replace(/\/+$/, "");
    let action = null;
    for (const key of Object.keys(handlers)) {
      if (pathname === "/dsh-sm/" + key) {
        action = key;
        break;
      }
    }
    if (action === null) {
      sendJson(res, 404, { error: "not found" });
      return;
    }
    let body = {};
    try {
      const raw = await readBody(req);
      if (raw.trim().length > 0) body = JSON.parse(raw);
    } catch (e) {
      sendJson(res, 400, { error: "invalid JSON body" });
      return;
    }
    try {
      sendJson(res, 200, await handlers[action](body));
    } catch (e) {
      sendJson(res, 500, { error: (e && e.message) || String(e) });
    }
  }

  ctx.webServer.register({
    kind: "prefix",
    path: "/dsh-sm",
    handler
  });
}
