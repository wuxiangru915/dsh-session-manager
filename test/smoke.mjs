/**
 * Host-logic smoke test for @dshwp/dsh-session-manager.
 *
 * Drives apply(ctx) with stub services — no dsh instance needed. Verifies the
 * /dsh-sm/* route wiring, the archive-set read/write path, delete bookkeeping,
 * detail extraction and the loopback fence.
 *
 * Run: node test/smoke.mjs
 */
import assert from "node:assert/strict";
import { apply, name, inject } from "../lib/index.js";

let pass = 0;
function ok(label) {
  pass += 1;
  console.log("ok - " + label);
}

// ---------- stub services ----------
const state = {
  initialized: true,
  workspaceIds: ["ws-1"],
  archivedSessionIds: ["arch-1", "arch-2"],
  pendingMutation: undefined,
};

const registry = {
  state,
  get archivedSessionIds() {
    return this.state.archivedSessionIds;
  },
  setState(next) {
    this.state = next;
    return Promise.resolve();
  },
  list() {
    return [
      {
        id: "ws-1",
        title: "demo",
        path: "/home/wxr/demo",
        sessionIds: ["arch-1", "arch-2", "live-1"],
        detachSession() {
          return Promise.resolve();
        },
      },
    ];
  },
  async archiveSession(id) {
    if (!this.state.archivedSessionIds.includes(id)) {
      await this.setState({ ...this.state, archivedSessionIds: [...this.state.archivedSessionIds, id] });
    }
  },
};

const headers = [
  { id: "arch-1", createdAt: 1000, cwd: "/home/wxr/demo" },
  { id: "arch-2", createdAt: 2000, cwd: "/home/wxr/demo" },
  { id: "live-1", createdAt: 3000, cwd: "/home/wxr/demo" },
];

const persistence = {
  list: () => Promise.resolve(headers),
  locate: (h) => ({ path: h.cwd + "/.dsh/sessions/" + h.id + "/header.json" }),
};

const query = {
  readTitleSnapshots: (ids) =>
    Promise.resolve(ids.map((id) => ({ sessionId: id, status: "fulfilled", value: { title: { title: "标题-" + id } } }))),
  readSession: (id) =>
    Promise.resolve({
      session: { createdAt: 1000, cwd: "/home/wxr/demo" },
      events: [
        { seq: 1, time: 1000, type: "user/message", data: { content: [{ type: "text", text: "你好" }] } },
        { seq: 2, time: 1001, type: "assistant/message", data: { message: { content: [{ type: "text", text: "你好！" }] } } },
        { seq: 3, time: 1002, type: "tool/call", data: { name: "bash", arguments: "{}" } },
      ],
    }),
};

const sessions = {
  store: { get: () => undefined },
  get: (id) => (id === "live-1" ? { id } : undefined),
};

const agents = { get: () => undefined };

const fsSvc = {
  resolve: (p) => Promise.resolve(p),
  stat: () => Promise.resolve({ type: "directory", size: 0 }),
  listDir: () => Promise.resolve([]),
  processPath: (p) => p,
};

const services = {
  workspaceRegistry: registry,
  sessionPersistence: persistence,
  sessionQuery: query,
  sessions,
  agents,
  fs: fsSvc,
  storageDomain: null,
  shell: {
    resolve: (request) => request,
    run: () => Promise.resolve({ exitCode: 0, stdout: "", stderr: "" }),
  },
  sandboxPolicy: {
    resolve: () => ({ mode: "danger-full-access" }),
  },
};

const ctx = {
  get: (key) => services[key],
  webServer: null,
};

// ---------- capture the route ----------
let captured = null;
ctx.webServer = {
  register(route) {
    captured = route;
  },
};

assert.equal(name, "dsh-session-manager");
assert.deepEqual(inject, ["webServer"]);
apply(ctx);
assert.ok(captured && captured.kind === "prefix" && captured.path === "/dsh-sm");
ok("route registered as /dsh-sm prefix");

// ---------- fake req/res ----------
function makeReq(method, url, body, headers) {
  const req = {
    method,
    url,
    headers: headers || { host: "127.0.0.1:3080" },
    on(ev, cb) {
      if (ev === "data") {
        if (body !== undefined) cb(Buffer.from(JSON.stringify(body)));
      } else if (ev === "end") {
        cb();
      } else if (ev === "error") {
        // noop
      }
    },
  };
  return req;
}

function post(url, body, headers) {
  return new Promise((resolve) => {
    const chunks = [];
    const res = {
      writeHead(status, headers) {
        res.status = status;
        res.headers = headers;
      },
      end(payload) {
        chunks.push(payload);
        resolve({ status: res.status, json: JSON.parse(chunks.join("")) });
      },
    };
    captured.handler(makeReq("POST", url, body, headers), res);
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

// ---------- archived/list ----------
{
  const r = await post("/dsh-sm/archived/list", {});
  assert.equal(r.status, 200);
  assert.equal(r.json.items.length, 2);
  assert.equal(r.json.items[0].title, "标题-arch-2"); // sorted by createdAt desc
  assert.equal(r.json.items[0].workspaceTitle, "demo");
  ok("archived/list returns archived sessions with title/workspace");
}

// ---------- archived/unarchive ----------
{
  const r = await post("/dsh-sm/archived/unarchive", { sessionId: "arch-1" });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.archivedSessionIds, ["arch-2"]);
  assert.ok(!registry.state.archivedSessionIds.includes("arch-1"));
  ok("archived/unarchive removes the id from the durable set");
}

// ---------- sessions/list ----------
{
  const r = await post("/dsh-sm/sessions/list", {});
  assert.equal(r.status, 200);
  assert.equal(r.json.items.length, 3);
  const live = r.json.items.find((x) => x.id === "live-1");
  assert.equal(live.archived, false);
  assert.equal(live.live, true);
  const arch2 = r.json.items.find((x) => x.id === "arch-2");
  assert.equal(arch2.archived, true);
  ok("sessions/list returns all sessions with archived/live flags");
}

// ---------- sessions/archive ----------
{
  const r = await post("/dsh-sm/sessions/archive", { sessionId: "live-1" });
  assert.equal(r.status, 200);
  assert.ok(registry.state.archivedSessionIds.includes("live-1"));
  ok("sessions/archive delegates to registry.archiveSession");
  // restore the set for later checks
  await post("/dsh-sm/archived/unarchive", { sessionId: "live-1" });
}

// ---------- sessions/delete ----------
{
  const r = await post("/dsh-sm/sessions/delete", { sessionId: "arch-2" });
  assert.equal(r.status, 200);
  assert.equal(r.json.deleted, true);
  assert.ok(!registry.state.archivedSessionIds.includes("arch-2"));
  ok("sessions/delete removes files (stub shell) and prunes the archive set");
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

// ---------- validation errors ----------
{
  const r = await post("/dsh-sm/archived/unarchive", {});
  assert.equal(r.status, 500);
  ok("missing sessionId is rejected");
}

console.log("\n" + pass + " checks passed");
