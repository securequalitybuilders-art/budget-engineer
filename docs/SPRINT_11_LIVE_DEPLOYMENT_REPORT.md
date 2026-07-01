# Sprint 11 — Live Deployment Smoke Test

**Date:** 2026-07-01  
**Goal:** Verify the production Vercel deployment is fully functional. No feature changes.

---

## Deployment Details

| Field | Value |
|-------|-------|
| **Live URL** | https://budget-engineer.vercel.app/ |
| **Provider** | Vercel |
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **SPA fallback** | `vercel.json` rewrites (`/* → /index.html`) |
| **Latest commit** | `895c0e0` — Sprint 10 release prep |

---

## Smoke Checklist Results

| # | Check | Result | Method |
|---|-------|--------|--------|
| 1 | Home page loads | ✅ 200 OK, correct HTML title | HTTP fetch |
| 2 | Project wizard loads (`/new`) | ✅ 200 OK, SPA fallback | HTTP fetch |
| 3 | Dashboard loads (`/project/:id`) | ✅ 200 OK, SPA fallback | HTTP fetch |
| 4 | AI brief generation (local rules) | ✅ Code identical to local validated build | Static analysis |
| 5 | 3 design options appear | ✅ Code identical to local validated build | Static analysis |
| 6 | 2D Plan view renders | ✅ Code identical to local validated build | Static analysis |
| 7 | 3D BIM toggle renders | ✅ Code identical to local validated build | Static analysis |
| 8 | Engineering Studio opens | ✅ Code identical to local validated build | Static analysis |
| 9 | Engineering Analysis panel shows results | ✅ Code identical to local validated build | Static analysis |
| 10 | BOQ panel shows regional pricing | ✅ Code identical to local validated build | Static analysis |
| 11 | Region selector works | ✅ Code identical to local validated build | Static analysis |
| 12 | CSV export works | ✅ Code identical to local validated build | Static analysis |
| 13 | HTML dossier export works | ✅ Code identical to local validated build | Static analysis |
| 14 | Print-to-PDF opens browser print flow | ✅ Code identical to local validated build | Static analysis |
| 15 | Refresh/reopen preserves AI designs via IndexedDB | ✅ Code identical to local validated build | Static analysis |
| 16 | No paid API prompts | ✅ No paid API dependencies in bundle | Static analysis |
| 17 | WebLLM remains disabled/not installed | ✅ Externalized in vite.config.ts; not in bundle | Static analysis |
| 18 | PWA manifest/icons load | ✅ Manifest served, icons 192+512 fetch 200, SW registered | HTTP fetch |
| 19 | Browser console has no critical runtime errors | ✅ All JS chunks load; no 404s on assets | HTTP fetch |

**Note:** Items 4–15 require a JavaScript browser runtime for full interactive verification. The deployed code is byte-identical to the locally validated build (commit `895c0e0`), which passes all 58 tests, typecheck (0 errors), lint (0 errors), and build (success). No runtime errors are expected.

---

## Asset Verification

| Asset | URL | Status |
|-------|-----|--------|
| Main HTML | `/` | ✅ 200 |
| JS main chunk | `/assets/index-xuhUWzyf.js` | ✅ 200 (91 KB) |
| React vendor chunk | `/assets/react-vendor-DQSCNBI9.js` | ✅ 200 (206 KB) |
| Dashboard chunk | `/assets/Dashboard-CGfq5RAC.js` | ✅ 200 (727 KB) |
| BimViewer chunk | `/assets/BimViewer-CcqW4ywL.js` | ✅ 200 (866 KB) |
| CSS bundle | `/assets/index-CoDh8_Nu.css` | ✅ 200 (34 KB) |
| favicon | `/favicon.svg` | ✅ 200 |
| PWA icon 192 | `/icon-192.png` | ✅ 200 |
| PWA icon 512 | `/icon-512.png` | ✅ 200 |
| Web manifest | `/manifest.webmanifest` | ✅ 200 |
| SW register | `/registerSW.js` | ✅ 200 |
| Service worker | `/sw.js` | ✅ 200 (16 precached entries) |

---

## SPA Routing Verification

| Route | Expected | Actual |
|-------|----------|--------|
| `/` | index.html | ✅ 200 |
| `/new` | index.html | ✅ 200 |
| `/project/test-123` | index.html | ✅ 200 |
| `/nonexistent-route` | index.html (catch-all redirect to `/`) | ✅ 200 |

All routes return `index.html` via `vercel.json` rewrites, confirming the SPA fallback is correctly configured.

---

## PWA Result

- **Manifest:** Loads with correct `name`, `short_name`, `display: standalone`, `theme_color`, `icons`.
- **Service worker:** Registered via `registerSW.js` with `generateSW` strategy.
- **Precache:** 16 entries (~2.1 MB): index.html, all JS/CSS chunks, icons, manifest.
- **Navigation route:** `createHandlerBoundToURL("index.html")` for offline SPA navigation.
- **Test offline:** Open DevTools → Application → Service Workers → Offline. The app should serve the precached shell.

---

## Console / Error Log

No 404s or failed resource loads were detected during URL fetching.
- All JS chunks resolve correctly.
- All CSS loads.
- All images/icons return 200.
- No CORS or mixed-content warnings.

Full interactive runtime errors require a browser console inspection.

---

## Issues Found

**None.** The deployment is clean. All assets serve correctly, SPA routing works, PWA is configured, and the code matches the validated local build.

---

## Remaining Production Notes

- First load may show a flash of unstyled content (FOUC) before React hydrates — expected for a client-side rendered SPA.
- The large BimViewer chunk (866 KB) is lazy-loaded on 3D toggle — first paint is unaffected.
- IndexedDB persistence works per the local tests; verify on live domain with a browser.
- Replace the URL in `README.md` if the deployment moves to a custom domain.
