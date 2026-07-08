# Stage 14 — Route Panel Code-Splitting (BimRoute slimming)

Local-first, free/open-source only. No paid APIs. Dark-first Dzenhare brand preserved.

## Goal
Shrink the monolithic `BimRoute` chunk by lazy-loading the lower, secondary panel
groups so the route renders its primary above-the-fold panels sooner, streaming the
heavier comparison/zone panels in afterwards.

## What changed
- New `src/components/sections/SnapshotPortfolioSection.tsx` (default export) bundling:
  `ProjectSnapshotsPanel`, `PortfolioDashboardPanel`, `PortfolioChartsPanel`,
  `SnapshotComparisonPanel`, `ComparisonDashboardPanel`, `SnapshotDiffTablePanel`,
  `QuantityComparisonPanel`, `BoqLineComparisonPanel`.
- New `src/components/sections/ZoneInspectorSection.tsx` (default export) bundling:
  `RoomProgramPanel`, Room Schedule (CSV/HTML export), `ZoneTracePanel`,
  `ZoneBoqGroupPanel`, `BimInspector`, `BimPropertyTaxonomyPanel`,
  `TransactionHistoryPanel`.
- New `src/components/sections/LazySections.tsx`:
  - `LazySnapshotPortfolioSection`, `LazyZoneInspectorSection` (React.lazy)
  - `LazySectionBoundary` Suspense wrapper with a branded "Loading panels…" fallback.
- `BimRoute.tsx`:
  - Removed the eager imports for the eight + seven panels now living in sections.
  - Renders the two sections through `LazySectionBoundary`, passing the same props/handlers.
  - Primary panels (user/project/RBAC/governance/cross-project/exports) stay eager.

## Measured impact (production build)
- `BimRoute` chunk: **188.70 kB → 167.61 kB** (gzip 57.58 → 54.33 kB).
- New on-demand chunks:
  - `SnapshotPortfolioSection` — 12.26 kB (gzip 2.54 kB)
  - `ZoneInspectorSection` — 10.24 kB (gzip 2.63 kB)
- `index.html` still preloads only `state-vendor` + `react-vendor` on first paint.
  3D (`BimViewer`, 865 kB) and both panel sections all load on demand.

## Build status
- `./node_modules/.bin/tsc --noEmit` → clean.
- `./node_modules/.bin/vite build` → success.

## Notes
- Behaviour is unchanged; sections receive identical props and the same store handlers.
- `node_modules` is not part of the workspace snapshot, so a fresh shell needs
  `npm install` before `tsc`/`vite` (deps are pinned in `package.json` / `package-lock.json`).

## Remaining / future targets
- `BimViewer` (3D) chunk remains the largest single payload but is fully deferred/opt-in.
- Could split drei helpers out of `BimViewer` to reduce 3D-load latency if needed.
