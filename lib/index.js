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
 * sessionQuery, sessionPersistence, sessions, agents) plus the Harness home
 * path for locating the shipped JSONL session directories — no official
 * package is patched or modified.
 *
 * The browser half ships in the same package (exports["./client"]).
 */

import { promises as fsp } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative } from "node:path";

/** Route prefix this plugin owns on the Harness web server. */
const ROUTE_PATH = "/dsh-sm";

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

/**
 * Session ids become directory names, so path separators and traversal
 * spellings are rejected before they can reach the filesystem.
 */
function isSafeSessionId(id) {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 256 &&
    id !== "." &&
    id !== ".." &&
    !id.includes("/") &&
    !id.includes("\\") &&
    !id.includes("\0")
  );
}

function sessionIdOf(args) {
  if (args === null || typeof args !== "object") throw new Error("sessionId is required");
  const id = args.sessionId;
  if (typeof id !== "string" || id.length === 0) throw new Error("sessionId is required");
  if (!isSafeSessionId(id)) throw new Error("sessionId is not a valid session id");
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
 * The Harness home owns the shipped JSONL session tree. The official
 * `dshHomePath` provider resolves it (including a configured home); the
 * environment/default fallback keeps this usable from a bare context.
 */
function sessionsRoot(ctx) {
  try {
    const homePath = ctx.get("dshHomePath");
    if (typeof homePath === "function") {
      const resolved = homePath("sessions");
      if (typeof resolved === "string" && resolved.length > 0) return resolved;
    }
  } catch (e) {
    // fall through to the environment/default home
  }
  const fromEnv = process.env.DSH_HOME;
  const home =
    typeof fromEnv === "string" && fromEnv.trim().length > 0 ? fromEnv.trim() : join(homedir(), ".dsh");
  return join(home, "sessions");
}

/** Whether `target` is strictly inside `root` (used before recursive deletes). */
function isInside(root, target) {
  const rel = relative(root, target);
  return rel.length > 0 && rel !== ".." && !rel.startsWith(".." + "/") && !rel.startsWith(".." + "\\") && !isAbsolute(rel);
}

/**
 * Index the shipped JSONL layout: `<home>/sessions/<project>/<sessionId>/`.
 * A single readdir pass per project keeps listing O(projects + sessions).
 * Returns an empty map when the tree does not exist (non-JSONL backends).
 */
async function indexSessionDirs(ctx) {
  const map = new Map();
  const root = sessionsRoot(ctx);
  let projects;
  try {
    projects = await fsp.readdir(root, { withFileTypes: true });
  } catch (e) {
    return map;
  }
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    const projectPath = join(root, project.name);
    let entries;
    try {
      entries = await fsp.readdir(projectPath, { withFileTypes: true });
    } catch (e) {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || map.has(entry.name)) continue;
      map.set(entry.name, join(projectPath, entry.name));
    }
  }
  return map;
}

/**
 * Resolve one session's on-disk directory. Newer Harness persistence
 * services no longer expose `locate`, so the shipped JSONL tree is indexed
 * directly; an older `locate` implementation, when present, is preferred.
 */
async function resolveSessionDir(ctx, persistence, header, dirs) {
  if (header && persistence && typeof persistence.locate === "function") {
    try {
      const location = persistence.locate(header);
      if (location && typeof location.path === "string" && location.path.length > 0) {
        const dir = parentDir(location.path);
        // Guard against a backend that returns a project-level path: only a
        // directory named exactly like the session is safe to size/delete.
        if (header && basename(dir) === header.id) return { dir, path: location.path };
      }
    } catch (e) {
      // fall through to the directory index
    }
  }
  if (!header) return null;
  const dir = dirs.get(header.id);
  if (typeof dir !== "string" || dir.length === 0) return null;
  const root = sessionsRoot(ctx);
  if (!isInside(root, dir)) return null;
  return { dir, path: dir };
}

/** Recursive byte size of one session directory; null when it does not exist. */
async function dirSizeBytes(dirPath, depth) {
  if (depth > 10) return 0;
  let info;
  try {
    info = await fsp.stat(dirPath);
  } catch (e) {
    return null;
  }
  if (!info.isDirectory()) return info.size || 0;
  let entries;
  try {
    entries = await fsp.readdir(dirPath, { withFileTypes: true });
  } catch (e) {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const child = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const sub = await dirSizeBytes(child, depth + 1);
      total += sub === null ? 0 : sub;
    } else if (entry.isFile()) {
      try {
        total += (await fsp.stat(child)).size || 0;
      } catch (e) {
        // file vanished while sizing; ignore
      }
    }
  }
  return total;
}

/**
 * Normalize one persistence listing entry. Current Harness returns
 * `{ header, revision, ... }` snapshots; older versions returned the header
 * itself. Accept both so a shape change can never silently hide every
 * session (and, on delete, can never prune archive bookkeeping while leaving
 * the session files behind).
 */
function headerOf(entry) {
  if (!entry || typeof entry !== "object") return null;
  const wrapped = entry.header;
  if (wrapped && typeof wrapped === "object" && typeof wrapped.id === "string" && wrapped.id.length > 0) {
    return wrapped;
  }
  if (typeof entry.id === "string" && entry.id.length > 0) return entry;
  return null;
}

/**
 * Read every known session header, preferring `sessionQuery.listSessions`
 * (live + persisted, shape-stable) and falling back to persistence. A
 * listing failure propagates: callers must never mistake a broken listing
 * for "the session is already gone".
 */
async function listHeaders(ctx) {
  const query = ctx.get("sessionQuery");
  if (query && typeof query.listSessions === "function") {
    try {
      const records = await query.listSessions();
      const headers = [];
      const seen = new Set();
      for (const record of Array.isArray(records) ? records : []) {
        const header = headerOf(record);
        if (!header || seen.has(header.id)) continue;
        seen.add(header.id);
        headers.push(header);
      }
      const liveSvc = ctx.get("sessions");
      if (liveSvc && typeof liveSvc.list === "function") {
        for (const session of liveSvc.list()) {
          const header = session && session.header;
          if (header && typeof header.id === "string" && !seen.has(header.id)) {
            seen.add(header.id);
            headers.push(header);
          }
        }
      }
      return headers;
    } catch (e) {
      // fall through to the persistence listing
    }
  }
  const persistence = ctx.get("sessionPersistence");
  if (!persistence || typeof persistence.list !== "function") {
    throw new Error("session listing is unavailable: no sessionQuery or sessionPersistence service");
  }
  const raw = await persistence.list();
  const headers = [];
  const seen = new Set();
  for (const entry of Array.isArray(raw) ? raw : []) {
    const header = headerOf(entry);
    if (!header || seen.has(header.id)) continue;
    seen.add(header.id);
    headers.push(header);
  }
  return headers;
}

async function findHeader(ctx, sessionId) {
  const headers = await listHeaders(ctx);
  for (const header of headers) {
    if (header.id === sessionId) return header;
  }
  return null;
}

/** Remove the id from the durable archive set through the public registry API. */
async function removeFromArchiveSet(ctx, sessionId) {
  const registry = ctx.get("workspaceRegistry");
  if (!registry) throw new Error("workspace registry unavailable");
  if (!Array.isArray(registry.archivedSessionIds) || !registry.archivedSessionIds.includes(sessionId)) return false;
  if (typeof registry.unarchiveSession === "function") {
    await registry.unarchiveSession(sessionId);
    return !registry.archivedSessionIds.includes(sessionId);
  }
  // Compatibility with older registries: rewrite the whole durable state.
  if (!registry.state || typeof registry.state !== "object") throw new Error("workspace registry is not started");
  const next = registry.archivedSessionIds.filter((id) => id !== sessionId);
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

/** Drop a deleted session from the pin set so no stale bookmark survives. */
async function removeFromPinSet(ctx, sessionId) {
  const registry = ctx.get("workspaceRegistry");
  if (!registry || typeof registry.unpinSession !== "function") return false;
  if (!Array.isArray(registry.pinnedSessionIds) || !registry.pinnedSessionIds.includes(sessionId)) return false;
  await registry.unpinSession(sessionId);
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
 * Evict a live session from the in-memory store (the store's own detach path)
 * so a deleted session cannot resurface in the workspace afterward. Returns
 * false when the entry is still attached (for example, while an append owns
 * the publication boundary) — the caller must then refuse the delete.
 */
async function evictSessionFromMemory(ctx, sessionId) {
  const sessions = ctx.get("sessions");
  if (!sessions || typeof sessions.get !== "function") return true;
  if (sessions.get(sessionId) === undefined) return true;
  const store = sessions.store;
  if (!store || typeof store.get !== "function") return false;
  const entry = store.get(sessionId);
  if (!entry || typeof entry.detach !== "function") return false;
  try {
    entry.detach();
  } catch (e) {
    return false;
  }
  if (sessions.get(sessionId) === undefined) return true;
  // `detach()` defers while an append is publishing; give that boundary one
  // turn to unwind before refusing.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return sessions.get(sessionId) === undefined;
}

/**
 * Remove a deleted session from every workspace's accounting slot so the
 * sidebar cannot render a ghost row for a session whose files are gone.
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

async function buildSessionItem(ctx, id, header, titles, workspacesBySession, liveSvc, persistence, dirs) {
  let sizeBytes = 0;
  let missing = false;
  let path = null;
  if (header) {
    const location = await resolveSessionDir(ctx, persistence, header, dirs);
    if (location) {
      const size = await dirSizeBytes(location.dir, 0);
      if (size === null) {
        missing = true;
      } else {
        sizeBytes = size;
        path = location.dir;
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
    live: !!(liveSvc && typeof liveSvc.get === "function" && liveSvc.get(id) !== undefined),
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

async function readTitles(ctx, ids) {
  const titles = new Map();
  if (ids.length === 0) return titles;
  const query = ctx.get("sessionQuery");
  if (!query || typeof query.readTitleSnapshots !== "function") return titles;
  try {
    const results = await query.readTitleSnapshots(ids);
    for (const result of results) {
      if (
        result &&
        result.status === "fulfilled" &&
        result.value &&
        result.value.title &&
        typeof result.value.title.title === "string" &&
        result.value.title.title.length > 0
      ) {
        titles.set(result.sessionId, result.value.title.title);
      }
    }
  } catch (e) {
    // title snapshots are best effort; the id and metadata still render
  }
  return titles;
}

// ---------- API handlers ----------

async function handleArchivedList(ctx) {
  const registry = ctx.get("workspaceRegistry");
  if (!registry) return { items: [], totalBytes: 0 };
  const archived = Array.isArray(registry.archivedSessionIds) ? [...registry.archivedSessionIds] : [];
  if (archived.length === 0) return { items: [], totalBytes: 0 };

  const persistence = ctx.get("sessionPersistence");
  const headers = await listHeaders(ctx);
  const byId = new Map();
  for (const header of headers) byId.set(header.id, header);

  const titles = await readTitles(ctx, archived);
  const liveSvc = ctx.get("sessions");
  const workspaces = workspaceMap(ctx);
  const dirs = await indexSessionDirs(ctx);
  const items = [];
  let totalBytes = 0;
  for (const id of archived) {
    const item = await buildSessionItem(ctx, id, byId.get(id), titles, workspaces, liveSvc, persistence, dirs);
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
  const registry = ctx.get("workspaceRegistry");
  const archivedSet = new Set(
    Array.isArray(registry && registry.archivedSessionIds) ? registry.archivedSessionIds : []
  );
  const persistence = ctx.get("sessionPersistence");
  const headers = await listHeaders(ctx);
  const titles = await readTitles(
    ctx,
    headers.map((header) => header.id)
  );
  const liveSvc = ctx.get("sessions");
  const workspaces = workspaceMap(ctx);
  const dirs = await indexSessionDirs(ctx);
  const items = await Promise.all(
    headers.map(async (header) => {
      const item = await buildSessionItem(ctx, header.id, header, titles, workspaces, liveSvc, persistence, dirs);
      item.archived = archivedSet.has(header.id);
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

  const liveSvc = ctx.get("sessions");
  const liveSession = liveSvc && typeof liveSvc.get === "function" ? liveSvc.get(sessionId) : undefined;
  const archived = Array.isArray(registry.archivedSessionIds) && registry.archivedSessionIds.includes(sessionId);
  if (liveSession !== undefined && !archived) {
    // An open, unarchived session can still be woken by a queued follow-up;
    // deleting it under a live agent would let the agent recreate the log.
    // Close it first (or archive it, which gates further steps) and retry.
    throw new Error(
      "Session '" + sessionId + "' is open in the current Harness; close it before deleting, or archive it first"
    );
  }
  if (liveSession !== undefined) {
    // The archived gate blocks new model steps, but buffered log events may
    // still be pending. Flush them through the open writer first so the
    // writer close on detach cannot recreate the directory after deletion.
    if (!liveSvc || typeof liveSvc.flush !== "function") {
      throw new Error("Session '" + sessionId + "' is live but cannot be flushed; delete incomplete");
    }
    try {
      await liveSvc.flush(liveSession);
    } catch (e) {
      throw new Error(
        "Could not flush session '" + sessionId + "' before deleting: " + String((e && e.message) || e)
      );
    }
  }

  const evicted = await evictSessionFromMemory(ctx, sessionId);
  if (!evicted) {
    throw new Error(
      "Session '" +
        sessionId +
        "' is still resident in memory and could not be removed; delete incomplete — please close it and try again"
    );
  }

  // Resolve after eviction: a live-only (unmaterialized) session disappears
  // from the listing entirely, while a persisted session keeps its header.
  const header = await findHeader(ctx, sessionId);
  const dirs = await indexSessionDirs(ctx);
  let location = header ? await resolveSessionDir(ctx, persistence, header, dirs) : null;
  if (!location) {
    // A directory can survive without a readable header (corrupt log or a
    // listing backend that skipped it). The exact id names the directory, so
    // deleting that orphan is still the user's intent.
    const orphan = dirs.get(sessionId);
    if (orphan && isInside(sessionsRoot(ctx), orphan)) {
      location = { dir: orphan, path: orphan };
    }
  }
  if (!location && header) {
    // The header is still listed, so files may exist. Never prune archive
    // bookkeeping without having removed (or proved absent) the artifact.
    throw new Error(
      "Could not locate the on-disk directory for session '" +
        sessionId +
        "'; nothing was deleted. The session files were left untouched."
    );
  }

  let deleted = false;
  let dirPath = null;
  let sizeBytes = 0;
  if (location) {
    dirPath = location.dir;
    let info = null;
    try {
      info = await fsp.stat(location.dir);
    } catch (e) {
      info = null;
    }
    if (info && info.isDirectory()) {
      const size = await dirSizeBytes(location.dir, 0);
      sizeBytes = size === null ? 0 : size;
      try {
        await fsp.rm(location.dir, { recursive: true, force: true });
      } catch (e) {
        throw new Error(
          "Delete failed for session '" + sessionId + "': " + String((e && e.message) || e)
        );
      }
      let stillThere = null;
      try {
        stillThere = await fsp.stat(location.dir);
      } catch (e) {
        stillThere = null;
      }
      if (stillThere) {
        throw new Error("Delete failed: the session directory still exists at " + location.dir);
      }
      deleted = true;
    } else {
      // The directory disappeared between listing and stat (another actor
      // deleted it); the artifact is absent, so bookkeeping cleanup is safe.
      deleted = false;
    }
  }

  // Only after the artifact is gone (or was already absent) remove the
  // archive, pin, and workspace bookkeeping that made the session visible.
  await removeFromArchiveSet(ctx, sessionId);
  await removeFromPinSet(ctx, sessionId);
  await detachFromWorkspace(ctx, sessionId);

  return {
    ok: true,
    deleted,
    sessionId,
    ...(dirPath === null ? {} : { path: dirPath }),
    ...(deleted ? { sizeBytes } : {}),
    ...(header === null ? { reason: "no-artifact" } : deleted ? {} : { reason: "already-gone" })
  };
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
  const actions = new Map([
    ["archived/list", () => handleArchivedList(ctx)],
    ["archived/unarchive", (args) => handleUnarchive(ctx, args)],
    ["sessions/list", () => handleSessionsList(ctx)],
    ["sessions/archive", (args) => handleArchive(ctx, args)],
    ["sessions/delete", (args) => handleDelete(ctx, args)],
    ["sessions/detail", (args) => handleDetail(ctx, args)]
  ]);

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
    const action = pathname.startsWith(ROUTE_PATH + "/") ? pathname.slice(ROUTE_PATH.length + 1) : null;
    const run = action === null ? undefined : actions.get(action);
    if (run === undefined) {
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
      sendJson(res, 200, await run(body));
    } catch (e) {
      sendJson(res, 500, { error: (e && e.message) || String(e) });
    }
  }

  // The prefix belongs to this plugin fiber, not to the process: ctx.effect()
  // owns the disposer, so dispose (HMR reload, disable, re-enable, profile
  // switch) frees the route. A bare register() left it in the web server table
  // and the next apply() died with
  // `webserver: duplicate prefix route "/dsh-sm"`, failing activation.
  ctx.effect(
    () => ctx.webServer.register({ kind: "prefix", path: ROUTE_PATH, handler }),
    "session-manager: /dsh-sm route"
  );
}
