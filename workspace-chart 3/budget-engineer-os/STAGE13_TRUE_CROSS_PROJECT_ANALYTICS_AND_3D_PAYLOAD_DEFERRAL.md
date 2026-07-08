# Stage 13 — Truly Independent Cross-Project Analytics & 3D Payload Deferral

Local-first, free/open-source only. No paid APIs. Dark-first Dzenhare brand preserved.

## 1. Cross-project analytics are now fully independent

### Problem
`leftPortfolio` / `rightPortfolio` (and therefore `CrossProjectAnalyticsPanel` and the
cross-project dashboard) were derived by **filtering the active-project-scoped** `portfolio`
and `snapshots` store arrays. They were only correct when a compared side happened to be the
active project; the other side was effectively empty.

### Fix
- New `src/lib/crossProjectPortfolio.ts`:
  - `loadProjectPortfolio(projectId)` — reads any project's snapshots/BIM/BOQ **directly
    from IndexedDB**, independent of the active project.
  - `loadProjectPortfolioWithLive(projectId)` — also folds in the project's **live working
    model** (`bim-{id}` / `boq-{id}`) as a synthetic metric so comparison reflects the current
    model even before a snapshot exists.
- `BimRoute.tsx` now holds independent `leftPortfolio` / `rightPortfolio` state, loaded via
  `useEffect` keyed on `compareLeftProjectId` / `compareRightProjectId` (and re-run on
  `snapshots` / `bim` change so an active-project side stays fresh).
- Removed the old active-scoped `portfolio.filter(...)` derivations.
- `buildCrossProjectMetric` now receives genuinely independent left/right data.

Result: BOQ category totals, BOQ % composition, and the cross-project analytics/dashboard
are all sourced independently per side — correct regardless of which project is active.

## 2. 3D (three.js) payload deferred off the critical path

### Problem
`vite.config.ts` pinned `three` + `@react-three/fiber` + `@react-three/drei` into a static
`three-vendor` manual chunk. Vite then **module-preloaded** that ~999 kB (gzip ~276 kB) chunk
in `index.html`, so it downloaded on first paint — even though the 3D viewer is lazy and
opt-in (`show3d` defaults to `false`).

### Fix
- Removed `three`/`@react-three/*` from `manualChunks` in `vite.config.ts`.
- `three` is only imported by `BimViewer.tsx`, which is reachable solely through the
  dynamically-imported `LazyBimViewer`. Rollup now keeps the 3D libraries inside that
  on-demand chunk.

### Measured impact (production build)
- Before: `three-vendor` **998.90 kB** (gzip 276.37 kB) — module-preloaded on first load.
- After: 3D folded into `BimViewer-*.js` **865.84 kB** (gzip 233.35 kB) — lazy, **not**
  preloaded. `index.html` now only preloads `state-vendor` + `react-vendor`.
- First-paint critical path: `index` (3.39 kB) + `react-vendor` (133.93 kB) +
  `state-vendor` (10.57 kB) + `BimRoute` (188.70 kB). The 3D bundle downloads only when the
  user clicks **“Load 3D Viewer.”**
- Net: ~**277 kB gzip** removed from the initial load path.

The remaining >500 kB Rollup warning now refers only to the deferred `BimViewer` chunk, which
is acceptable because it is opt-in and off the critical path.

## Build status
- `npx tsc --noEmit` → clean.
- `npx vite build` → success.

## Remaining / future targets
- `BimViewer` chunk could be split further (e.g. drei helpers) if 3D-load latency matters.
- RBAC remains local-only (no auth backend) by design.
