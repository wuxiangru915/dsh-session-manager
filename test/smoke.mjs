/**
 * Host-logic smoke test for @dshwp/dsh-session-manager.
 *
 * Drives apply(ctx) with stub services and a temporary Harness home — no dsh
 * instance needed. Verifies the /dsh-sm/* route wiring, the archive-set
 * read/write path, the current `sessionPersistence.list()` snapshot shape
 * (plus the legacy header shape), real on-disk deletion, and the critical
 * "never prune bookkeeping when the artifact cannot be located" guard.
 *
 * Run: node test/smoke.mjs
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply, name, inject } from "../lib/index.js";

let pass = 0;
function ok(label) {
  pass += 1;
  console.log("ok - " + label);
}

// ---------- temporary Harness home ----------
const home = mkdtempSync(join(tmpdir(), "dsh-sm-test-"));
const sessionRoot = join(home, "sessions");
const projectDir = join(sessionRoot, "--proj--");

function makeSession(id, bytes) {
  const dir = join(projectDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "session.v4.jsonl.zstd"), Buffer.alloc(bytes || 128, 1));
  return dir;
}

const arch1Dir = makeSession("arch-1", 256);
const arch2Dir = makeSession("arch-2", 128);
const live1Dir = makeSession("live-1", 64);
const orphan1Dir = makeSession("orphan-1", 32);

// ---------- stub services ----------
let headers = [
  { id: "arch-1", createdAt: 1000, cwd: "/home/wxr/demo" },
  { id: "arch-2", createdAt: 2000, cwd: "/home/wxr/demo" },
  { id: "live-1", createdAt: 3000, cwd: "/home/wxr/demo" },
  { id: "gone-1", createdAt: 4000, cwd: "/home/wxr/demo" }
];
let listMode = "snapshots";
const detached = [];

const state = {
  initialized: true,
  workspaceIds: ["ws-1"],
  archivedSessionIds: ["arch-1", "arch-2", "ghost-1", "gone-1", "orphan-1"],
  pinnedSessionIds: ["arch-1"],
  pendingMutation: undefined
};

const registry = {
  state,
  get archivedSessionIds() {
    return this.state.archivedSessionIds;
  },
  get pinnedSessionIds() {
    return this.state.pinnedSessionIds;
  },
  setState(next) {
    this.state = next;
    return Promise.resolve();
  },
  async unarchiveSession(id) {
    if (!this.state.archivedSessionIds.includes(id)) return;
    this.state = { ...this.state, archivedSessionIds: this.state.archivedSessionIds.filter((x) => x !== id) };
  },
  async unpinSession(id) {
    if (!this.state.pinnedSessionIds.includes(id)) return;
    this.state = { ...this.state, pinnedSessionIds: this.state.pinnedSessionIds.filter((x) => x !== id) };
  },
  list() {
    return [
      {
        id: "ws-1",
        title: "demo",
        path: "/home/wxr/demo",
        sessionIds: ["arch-1", "arch-2", "live-1", "gone-1"],
        detachSession(id) {
          detached.push(id);
          return Promise.resolve();
        }
      }
    ];
  },
  async archiveSession(id) {
    if (!this.state.archivedSessionIds.includes(id)) {
      await this.setState({ ...this.state, archivedSessionIds: [...this.state.archivedSessionIds, id] });
    }
  }
};

const persistence = {
  list: () =>
    Promise.resolve(
      headers.map((header) =>
        listMode === "legacy" ? header : { header, revision: "rev-" + header.id, sizeBytes: 128 }
      )
    )
};

const query = {
  listSessions: () =>
    Promise.resolve(headers.map((header) => ({ header, live: header.id === "live-1", persisted: true }))),
  readTitleSnapshots: (ids) =>
    Promise.resolve(ids.map((id) => ({ sessionId: id, status: "fulfilled", value: { title: { title: "标题-" + id } } }))),
  readSession: (id) =>
    Promise.resolve({
      session: { createdAt: 1000, cwd: "/home/wxr/demo" },
      events: [
        { seq: 1, time: 1000, type: "user/message", data: { content: [{ type: "text", text: "你好" }] } },
        { seq: 2, time: 1001, type: "assistant/message", data: { message: { content: [{ type: "text", text: "你好！" }] } } },
        { seq: 3, time: 1002, type: "tool/call", data: { name: "bash", arguments: "{}" } }
      ]
    })
};

const liveEntries = new Map();
liveEntries.set("live-1", {
  session: { id: "live-1", header: headers[2] },
  detach() {
    liveEntries.delete("live-1");
  }
});
const flushed = [];
const sessions = {
  store: liveEntries,
  get: (id) => {
    const entry = liveEntries.get(id);
    return entry ? entry.session : undefined;
  },
  list: () => [...liveEntries.values()].map((entry) => entry.session),
  flush: (session) => {
    flushed.push(session.id);
    return Promise.resolve();
  }
};

const agents = { get: () => undefined };

const services = {
  workspaceRegistry: registry,
  sessionPersistence: persistence,
  sessionQuery: query,
  sessions,
  agents,
  dshHomePath: (...segments) => join(home, ...segments)
};

const ctx = {
  get: (key) => services[key]
};

// ---------- capture the route ----------
let captured = null;
ctx.webServer = {
  register(route) {
    captured = route;
  }
};

assert.equal(name, "dsh-session-manager");
assert.deepEqual(inject, ["webServer"]);
apply(ctx);
assert.ok(captured && captured.kind === "prefix" && captured.path === "/dsh-sm");
ok("route registered as /dsh-sm prefix");

// ---------- fake req/res ----------
function makeReq(method, url, body, headersIn) {
  return {
    method,
    url,
    headers: headersIn || { host: "127.0.0.1:3080" },
    on(ev, cb) {
      if (ev === "data") {
        if (body !== undefined) cb(Buffer.from(JSON.stringify(body)));
      } else if (ev === "end") {
        cb();
      } else if (ev === "error") {
        // noop
      }
    }
  };
}

function post(url, body, headersIn) {
  return new Promise((resolve) => {
    const chunks = [];
    const res = {
      writeHead(status, responseHeaders) {
        res.status = status;
        res.headers = responseHeaders;
      },
      end(payload) {
        chunks.push(payload);
        resolve({ status: res.status, json: JSON.parse(chunks.join("")) });
      }
    };
    captured.handler(makeReq("POST", url, body, headersIn), res);
  });
}

// ---------- fence ----------
{
  const r = await post("/dsh-sm/sessions/list", {}, { host: "evil.example.com" });
  assert.equal(r.status, 403);
  ok("loopback fence rejects foreign Host");
}
{
  const r = await post("/dsh-sm/sessions/list", {}, { host: "127.0.0.1:3080", origin: "http://evil.example.com" });
  assert.equal(r.status, 403);
  ok("origin fence rejects cross-origin");
}

// ---------- archived/list: current snapshot shape ----------
{
  const r = await post("/dsh-sm/archived/list", {});
  assert.equal(r.status, 200);
  assert.equal(r.json.items.length, 5);
  const arch1 = r.json.items.find((x) => x.id === "arch-1");
  assert.equal(arch1.title, "标题-arch-1");
  assert.equal(arch1.createdAt, 1000);
  assert.equal(arch1.path, arch1Dir);
  assert.ok(arch1.sizeBytes >= 256);
  assert.equal(arch1.missing, false);
  assert.equal(arch1.workspaceTitle, "demo");
  const ghost = r.json.items.find((x) => x.id === "ghost-1");
  assert.equal(ghost.missing, true);
  assert.ok(r.json.totalBytes >= 256);
  ok("archived/list resolves wrapped persistence snapshots, titles, paths and sizes");
}

// ---------- sessions/list: current snapshot shape ----------
{
  const r = await post("/dsh-sm/sessions/list", {});
  assert.equal(r.status, 200);
  assert.equal(r.json.items.length, 4);
  for (const item of r.json.items) assert.equal(typeof item.id, "string");
  const arch2 = r.json.items.find((x) => x.id === "arch-2");
  assert.equal(arch2.archived, true);
  assert.equal(arch2.path, arch2Dir);
  const live = r.json.items.find((x) => x.id === "live-1");
  assert.equal(live.live, true);
  assert.equal(live.path, live1Dir);
  ok("sessions/list returns ids (not undefined) with archived/live flags and paths");
}

// ---------- archived/unarchive ----------
{
  const r = await post("/dsh-sm/archived/unarchive", { sessionId: "arch-1" });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.changed, true);
  assert.deepEqual(r.json.archivedSessionIds, ["arch-2", "ghost-1", "gone-1", "orphan-1"]);
  assert.ok(!registry.state.archivedSessionIds.includes("arch-1"));
  ok("archived/unarchive uses the registry's public unarchive path");
}

// ---------- sessions/archive ----------
{
  const r = await post("/dsh-sm/sessions/archive", { sessionId: "live-1" });
  assert.equal(r.status, 200);
  assert.ok(registry.state.archivedSessionIds.includes("live-1"));
  ok("sessions/archive delegates to registry.archiveSession");
}

// ---------- live archived session: flush, evict, delete ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "live-1" });
  assert.equal(r.status, 200);
  assert.equal(r.json.deleted, true);
  assert.ok(flushed.includes("live-1"));
  assert.equal(existsSync(live1Dir), false);
  assert.equal(sessions.get("live-1"), undefined);
  headers = headers.filter((h) => h.id !== "live-1");
  ok("a live archived session is flushed and evicted before its directory is removed");
}

// ---------- live unarchived session: refuse ----------
{
  const live3Dir = makeSession("live-3", 32);
  headers = headers.concat([{ id: "live-3", createdAt: 5000, cwd: "/home/wxr/demo" }]);
  liveEntries.set("live-3", {
    session: { id: "live-3", header: headers[headers.length - 1] },
    detach() {
      liveEntries.delete("live-3");
    }
  });
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "live-3" });
  assert.equal(r.status, 500);
  assert.match(r.json.error, /open in the current Harness/);
  assert.equal(existsSync(live3Dir), true);
  liveEntries.delete("live-3");
  headers = headers.filter((h) => h.id !== "live-3");
  rmSync(live3Dir, { recursive: true, force: true });
  ok("deleting an open, unarchived session is refused instead of orphaning a live writer");
}

// ---------- sessions/delete: real on-disk removal ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "arch-2" });
  assert.equal(r.status, 200);
  assert.equal(r.json.deleted, true);
  assert.equal(r.json.path, arch2Dir);
  assert.ok(r.json.sizeBytes >= 128);
  assert.equal(existsSync(arch2Dir), false);
  assert.ok(!registry.state.archivedSessionIds.includes("arch-2"));
  assert.ok(detached.includes("arch-2"));
  headers = headers.filter((h) => h.id !== "arch-2");
  const list = await post("/dsh-sm/sessions/list", {});
  assert.equal(list.json.items.some((x) => x.id === "arch-2"), false);
  ok("sessions/delete removes the directory, archive id, pin and workspace slot");
}

// ---------- stale archive id with no artifact: bookkeeping only ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "ghost-1" });
  assert.equal(r.status, 200);
  assert.equal(r.json.deleted, false);
  assert.equal(r.json.reason, "no-artifact");
  assert.ok(!registry.state.archivedSessionIds.includes("ghost-1"));
  ok("a stale archived id with no artifact is cleaned without touching other state");
}

// ---------- archived id with an orphan directory but no header ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "orphan-1" });
  assert.equal(r.status, 200);
  assert.equal(r.json.deleted, true);
  assert.equal(r.json.path, orphan1Dir);
  assert.equal(existsSync(orphan1Dir), false);
  assert.ok(!registry.state.archivedSessionIds.includes("orphan-1"));
  ok("an archived orphan directory without a readable header is still deleted");
}

// ---------- listed header but no locatable directory: refuse ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "gone-1" });
  assert.equal(r.status, 500);
  assert.match(r.json.error, /Could not locate the on-disk directory/);
  assert.ok(registry.state.archivedSessionIds.includes("gone-1"));
  assert.ok(!detached.includes("gone-1"));
  ok("delete refuses to prune bookkeeping when the artifact cannot be located");
}

// ---------- traversal ids are rejected ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "../arch-1" });
  assert.equal(r.status, 500);
  assert.equal(existsSync(arch1Dir), true);
  ok("session ids containing path separators are rejected");
}

// ---------- sessions/detail ----------
{
  const r = await post("/dsh-sm/sessions/detail", { sessionId: "arch-1" });
  assert.equal(r.status, 200);
  assert.equal(r.json.messageCount, 3);
  assert.equal(r.json.messages[0].role, "user");
  assert.equal(r.json.messages[0].text, "你好");
  assert.equal(r.json.messages[2].role, "tool");
  ok("sessions/detail extracts user/assistant/tool messages");
}

// ---------- persistence fallback: current snapshots ----------
{
  query.listSessions = null;
  const r = await post("/dsh-sm/sessions/list", {});
  assert.equal(r.status, 200);
  assert.ok(r.json.items.length > 0);
  for (const item of r.json.items) assert.equal(typeof item.id, "string");
  const arch1 = r.json.items.find((x) => x.id === "arch-1");
  assert.equal(arch1.path, arch1Dir);
  ok("persistence.list() snapshots are normalized when sessionQuery is absent");
}

// ---------- persistence fallback: legacy header shape ----------
{
  listMode = "legacy";
  const r = await post("/dsh-sm/sessions/list", {});
  assert.equal(r.status, 200);
  assert.ok(r.json.items.length > 0);
  for (const item of r.json.items) assert.equal(typeof item.id, "string");
  ok("legacy header-shaped persistence.list() results still work");
}

// ---------- locale + icon packaging ----------
{
  const en = JSON.parse(readFileSync(new URL("../locale/en.json", import.meta.url), "utf8"));
  const zh = JSON.parse(readFileSync(new URL("../locale/zh.json", import.meta.url), "utf8"));
  assert.equal(typeof en.meta.title, "string");
  assert.equal(typeof en.meta.description, "string");
  assert.equal(typeof zh.meta.title, "string");
  assert.equal(typeof zh.meta.description, "string");
  assert.equal(existsSync(new URL("../assets/icon.svg", import.meta.url)), true);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.icon, "./assets/icon.svg");
  assert.ok(pkg.exports["./locale/*"]);
  ok("locale metadata and dedicated plugin icon are packaged");
}

// ---------- validation errors ----------
{
  const r = await post("/dsh-sm/archived/unarchive", {});
  assert.equal(r.status, 500);
  ok("missing sessionId is rejected");
}

rmSync(home, { recursive: true, force: true });
console.log("\n" + pass + " checks passed");
