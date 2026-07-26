# Sprint 72 — Dollhouse / Cutaway 3D View

> **Phase:** Interior Inspection (1/3)  
> **Release:** v0.5.0+ (post-release)  
> **Commit:** follows `8f60c7e` (v0.5.0)  
> **Branch:** `main`

## Summary

Added three view-mode toggles to the 3D BIM viewer: **Full**, **Dollhouse**, and **No Roof**, plus a **storey selector** for multi-storey plans. All implemented as props on `BimModel3D` with a pure-logic helper `computeVisibility()` in a separate `.ts` module for testability.

## Changes

### New files

| File | Purpose |
|------|---------|
| `src/components/bim/viewMode.ts` | `computeVisibility(viewMode, visibleStorey, storeyCount)` → `VisibilityState` (`{ showRoof, wallOpacity, showCeilings, storeysToShow }`) |
| `src/__tests__/bimViewMode.test.ts` | 12 pure-logic tests for `computeVisibility` — all modes, storey filtering, bounds clamping |

### Modified files

| File | Changes |
|------|---------|
| `src/components/bim/BimModel3D.tsx` | Accepts `viewMode` and `visibleStorey` props. `Scene` receives `wallOpacity`/`showRoof`/`showCeilings`/`storeysToShow` from `computeVisibility`. `WallPierMesh` creates transparent material when `wallOpacity < 1`. Meshes filtered by storey. `CameraController` adjusts camera on dollhouse entry. |
| `src/components/bim/LazyBimModel3D.tsx` | Manages `viewMode` + `visibleStorey` state. Renders mode buttons and storey selector above Canvas. Passes props to `BimModel3DInner`. |

### Behaviour

- **Full** (default, restored on mode change): roof visible, walls opaque, ceilings visible, all storeys.
- **No Roof**: roof hidden, walls opaque, ceilings visible — look down into the top floor.
- **Dollhouse**: roof hidden, walls at 40% opacity (transparent, depthWrite disabled), ceilings hidden, camera tilts to a top-down-ish 3/4 view. Interiors visible through translucent walls.
- **Storey selector**: appears only when `design.floors > 1`. Buttons `All | G | 1 | 2...`. Filters walls, slabs, ceilings, and openings to the selected storey.
- All toggles are immediately responsive; OrbitControls remain fully interactive after camera adjustment.
- Wrapped by existing `ErrorBoundary` — any failure shows "3D unavailable" fallback. Never crashes the page.

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (exact baseline) |
| `npm test` | **778 passed** (44 files) |
| `npm run build` | Success, PWA 30 precached entries |
| `grep -r "text-stone-500" src --include=*.tsx` | 0 matches |

## QA Notes

- The camera adjustment for dollhouse mode is instantaneous (no animation). The user can orbit freely after the snap.
- `WallPierMesh` clones materials only when `wallOpacity < 1` (dollhouse); at full opacity it uses the global shared materials — zero overhead for Full/NoRoof modes.
- Storey filtering uses simple `filter()` on each mesh array in `Scene`. No changes to `planTo3d.ts` geometry pipeline.
- `AccentEdges` (building volume outline) is unaffected by all modes — provides spatial reference.
- Ground plane and grid always render — prevents disorientation.

## Future

Sprint 73 (Interior Inspection 2/3) will add **floating inspection camera** (walk/fly mode with WASD + mouse-look inside rooms). Sprint 74 (3/3) will add **room highlight** on hover/click with name tooltip.
