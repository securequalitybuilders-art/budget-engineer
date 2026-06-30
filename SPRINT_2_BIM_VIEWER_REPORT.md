# Sprint 2 — BIM Viewer Dashboard Integration — Smoke Report

**Date:** 2026-06-30  
**Goal:** Integrate the existing lazy-loaded 3D BIM viewer (`LazyBimViewer`, `BimViewer`) into the dashboard with a 2D/3D toggle, via a design-to-BIM adapter that converts WS1 `DesignOption` into canonical `BimModel`.

---

## What Was Done

### 1. Created `src/adapters/designToBim.ts`
Adapter that converts a canonical `DesignOption` (from `@/domain/boq`) into a canonical `BimModel` (from `@/domain/bim`).

**Mapping logic:**
- Floor count & gross floor area → multi-floor BIM floors (3 m floor-to-floor)
- Perimeter walls (4 walls per floor) as `BimWall` with `start`/`end` Vec3 + thickness 0.23 m + height 3 m
- Ground and upper floor slabs as `BimSlab` with `origin` Vec3 + width/depth derived from `sqrt(GFA) * 2` aspect
- Roof slab as a wall-type element at top elevation
- UUID generated per model

### 2. Updated `src/pages/Dashboard.tsx`
- Added `activeCanvasView` state (`'plan' | 'bim'`) — default `'plan'`
- Added 2D/3D toggle buttons next to the existing toolbar — `LayoutGrid` icon for 2D, `Boxes` icon for 3D
- Active button uses `default` variant (brand accent background); inactive uses `ghost`
- When `activeCanvasView === 'bim'`: renders `<LazyBimViewer model={bimModel} height={480} />` in place of `<PlanCanvas>`
- `PlanComparison` remains visible in both views
- `bimModel` computed via `useMemo` from `designOptionToBimModel(selectedDesign)`
- Imported `LazyBimViewer` from `@/components/bim/LazyBimViewer`

### 3. No Structural Changes
- No existing components removed or renamed
- No stores modified
- No routes modified
- No new dependencies added

---

## Files Changed

| File | Change |
|------|--------|
| `src/adapters/designToBim.ts` | **Created** — design-to-BIM adapter |
| `src/pages/Dashboard.tsx` | **Modified** — added 2D/3D toggle and LazyBimViewer render |

---

## Smoke Checklist

| Check | Status |
|-------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` (`eslint . --ext ts,tsx`) | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3357 modules, 16 precache) |
| BIM viewer lazy-loaded (separate chunk) | ✅ `BimViewer-BoP0yaD9.js` (866 KB) |
| Dashboard chunk | ✅ `Dashboard-CbMQvHzT.js` (673 KB) |
| 2D view renders PlanCanvas unchanged | ✅ |
| 3D view renders LazyBimViewer when designs exist | ✅ |
| Empty BIM state shows BimViewer's built-in empty message | ✅ |
| Toggle buttons in toolbar | ✅ |
| No unused imports or variables | ✅ |

---

## Remaining Risks

| Risk | Mitigation |
|------|------------|
| BIM model is generated from DesignOption metadata (GFA, floors) only — no actual CAD geometry used | Adapter creates approximate perimeter geometry; refinement requires wiring WS1 `Design[]` → `CadDocument` → `BimModel` pipeline |
| BimViewer renders all floors at once by default; floor visibility not wired | BimViewer supports `activeFloorId` prop — future toggle could pass selected floor |
| No element selection or inspection from BIM view | BimViewer supports `onSelectElement`, `selectedElementId`, `BimInspector` — not wired yet |
| Three.js chunk (866 KB) is large but lazy-loaded | Acceptable — only loaded on 3D toggle, not on initial page load |

---

## Future Enhancements

- Wire `BimInspector` and `FloorVisibilityPanel` alongside the viewer
- Persist `activeCanvasView` preference in UI store or localStorage
- Adapter: use actual wall positions from WS1 `Design.elements` when available, not just area-based approximation
- Add smooth transition/animation when switching between 2D and 3D views
