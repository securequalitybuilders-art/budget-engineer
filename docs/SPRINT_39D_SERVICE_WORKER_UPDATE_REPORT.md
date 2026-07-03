# Sprint 39D — PWA Service Worker Update Fix

## Root Cause

The app uses `vite-plugin-pwa` v0.20.5 (Workbox-based). The `vite.config.ts` had `registerType: 'autoUpdate'` set, but this option only takes effect when the app uses the **virtual module registration** (`import { registerSW } from 'virtual:pwa-register'`). Without that import, `vite-plugin-pwa` falls back to generating a bare‑bones `registerSW.js` that just calls `navigator.serviceWorker.register(...)` — **no update detection, no `skipWaiting`, no reload**.

### What was happening

1. User visits site → `registerSW.js` registers the SW → old SW installs and caches everything.
2. Developer deploys new build with new `sw.js` (different revision hashes).
3. User returns → browser detects new SW, downloads it, the new SW calls `self.skipWaiting()` and `clientsClaim()`, **but** the registration script never listens for the `updatefound` event, so it never tells the old page to reload.
4. The old SW continues serving the **old cached `index.html` and old JS bundles** indefinitely.
5. Only a manual DevTools → Application → Service Workers → Unregister + Clear Storage fixes it.

### Config before

```typescript
// vite.config.ts — BEFORE
VitePWA({
  registerType: 'autoUpdate',  // ignored — only effective with virtual module import
  manifest: { ... },
})
```

The generated `dist/registerSW.js`:
```js
if('serviceWorker' in navigator) {window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
})}
```

No `updatefound` listener, no `skipWaiting` call, no `window.location.reload()`.

## Fix

### 1. Explicit `workbox` options

Added explicit Workbox config to guarantee the generated SW has the right lifecycle hooks:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    skipWaiting: true,            // new SW activates immediately after install
    clientsClaim: true,           // new SW takes over all open tabs on activate
    cleanupOutdatedCaches: true,  // remove precaches from old builds
  },
  manifest: { ... },
})
```

### 2. Virtual module registration in app entry point

Added `import { registerSW } from 'virtual:pwa-register'` to `src/main.tsx` and called `registerSW({ immediate: true })`. This:

1. Causes `vite-plugin-pwa` to detect the import (`useImportRegister = true`), which sets `injectRegister = null` — the old bare‑bones `registerSW.js` is **no longer generated**.
2. The registration is now handled by the plugin's client template (`dist/client/build/register.js`) which:
   - Uses `workbox-window` `Workbox` class for proper lifecycle management
   - When `registerType === 'autoUpdate'` (`auto = true`):
     - Listens for the `activated` event → calls `window.location.reload()` automatically
     - Listens for `installed` event (first install) → fires `onOfflineReady`
   - Page reloads automatically when a new SW activates, so the user gets the latest build
3. Takes `workbox-window` as a dependency (5.71 kB bundled chunk).

### 3. TypeScript declaration

Added `src/pwa-register.d.ts` declaring the `virtual:pwa-register` module so TypeScript resolves it.

### How it prevents the stale-app problem

| Scenario | Before | After |
|---|---|---|
| First visit | SW registers and caches all assets | Same |
| User returns, new deploy | Old SW continues serving old cached `index.html` forever | New SW detected → installs → activates → **page auto‑reloads** → user gets new app |
| User navigates while offline | Cached app works | Same (offline-first preserved) |
| Multiple tabs open | Each tab independently runs old code | New SW activates → `clientsClaim()` → all tabs see new service worker. On next navigation they get latest. |

## Files Changed

| File | Change |
|---|---|
| `vite.config.ts` | Added `workbox: { skipWaiting, clientsClaim, cleanupOutdatedCaches }` |
| `src/main.tsx` | Import `registerSW` from `virtual:pwa-register` and call `registerSW({ immediate: true })` |
| `src/pwa-register.d.ts` | **New** — type declaration for `virtual:pwa-register` module |
| `src/__tests__/pwaConfig.test.ts` | **New** — 5 documented-config tests asserting critical SW settings |
| `CHANGELOG.md` | Sprint 39D entry |

## Validation

| Check | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors (9 pre-existing warnings, unchanged) |
| Tests | **325 passed (26 files)** — +5 PWA config tests +1 file |
| Build | **success** — 3396 modules, 21 precache entries, `sw.js` emitted, no `registerSW.js` |
| `dist/sw.js` contains `self.skipWaiting()` | ✓ |
| `dist/sw.js` contains `clientsClaim()` | ✓ |
| `dist/sw.js` contains `cleanupOutdatedCaches()` | ✓ |
| `dist/sw.js` precache includes `workbox-window` | ✓ (5.71 kB chunk) |

## Why prior clinic fixes appeared to fail live

Because the old service worker served a **stale cached version of the entire app** (especially `index.html`), users never received any of the previously deployed JavaScript fixes — including the building‑type dropdown state wiring (Sprint 39A/B/C). The fixes were deployed to the server but the SW never updated, so the browser kept running the old code. With this fix, future deployments will auto‑update within one page reload cycle.
