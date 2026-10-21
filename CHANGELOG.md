# Changelog

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
