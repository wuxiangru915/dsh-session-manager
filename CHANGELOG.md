# Changelog

## 0.2.2

Hardening pass, with ideas borrowed from
[dream12347/dsh-session-manager](https://github.com/dream12347/dsh-session-manager)
(its mutation lock, bounded request bodies, and explicit host/client contract).

### Changed

- **Mutating actions run one at a time.** Archive, unarchive, and delete share a
  promise queue, so two panes — or a retry racing a click — can no longer
  interleave a read-modify-write of `workspaceRegistry` state with a directory
  removal. Read-only actions (the two lists, and the content preview) stay off
  the queue and keep answering while a delete runs.
- **Request bodies are capped at 64 KiB.** These payloads are a session id plus
  a flag; anything larger is refused with `413` and the upload is dropped
  instead of buffered.
- **The action list is one exported contract.** `ACTIONS` is the single source
  for the route table, and mount fails loudly if an advertised action lacks a
  handler. The smoke test also checks that `lib/client.js` calls exactly that
  list, so host and browser half cannot drift apart silently.

### Tests

- 23 checks: adds the contract check, the 413 path, and a concurrency test that
  fails if the mutation queue is removed (`maxActive` 2 instead of 1).

## 0.2.1

### Fixed

- **Route ownership follows the plugin fiber.** `/dsh-sm` was registered with a
  bare `ctx.webServer.register()`, so the prefix stayed in the web server table
  after the plugin was disposed. Any reload — HMR, disable/enable, a reinstall
  through the plugin manager — applied the plugin again and failed activation
  with `webserver: duplicate prefix route "/dsh-sm"`, while the stale route kept
  answering requests. Registration now runs inside `ctx.effect()`, whose
  disposer removes the route on dispose.
- Action dispatch uses a `Map` lookup instead of rebuilding the `/dsh-sm/<key>`
  strings for every request.

### Tests

- The smoke test now models the real duplicate-route check and its disposer,
  and covers the unload → reload cycle that used to throw.

## 0.2.0

- Delete archived sessions for real, sync locales, dedicated plugin icon.
