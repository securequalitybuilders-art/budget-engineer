# Sprint 56 — Auto-Generated Elevations and Section Drawings (SVG)

**Date:** 2026-07-06  
**Commit:** (to be filled after push)  
**Branch:** `main`

## Summary

Added pure-SVG front elevation, side elevation, and cross-section drawings derived from the same PlanModel geometry used by the existing 2D plan and 3D BIM model. Zero geometry duplication — all constants (storey height, pitch height, wall thickness, opening defaults) are re-exported from `planTo3d.ts`.

## New Files

| File | Purpose |
|---|---|
| `src/adapters/planToElevations.ts` | `computeFrontElevation()`, `computeSideElevation()`, `computeSection()`, `emptyDrawing()` |
| `src/components/drawings/ElevationView.tsx` | Renders ElevationDrawing as responsive SVG |
| `src/components/drawings/DrawingsPanel.tsx` | Container with Plan / Front / Side / Section tabs |
| `src/__tests__/planToElevations.test.ts` | 26 pure tests (no DOM, no WebGL) |

## Modified Files

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Added `'drawings'` canvas view + toolbar button + DrawingsPanel rendering |
| `src/components/dashboard/BuilderJourneyGuide.tsx` | Extended type union to include `'drawings'` |

## Geometry Derivation

All drawings derive from the active PlanModel (the same `activePlan` used by PlanCanvas and LazyBimModel3D):

- **Front elevation** → walls at `y = plan.height` (front face). Width = `plan.width`. Height = `floors × storeyHeight`. Roof = gable triangle at `pitchHeight` above eaves.
- **Side elevation** → walls at `x = plan.width` (side face). Width = `plan.height`. Height and roof same as front.
- **Section A-A** → cut along X axis at `y = plan.height / 2`. Shows floor slabs (thick horizontal lines, sky-400 fill), wall poché (12% white fill) at cut plane, ground line with hatching, and roof gable above.

Openings (doors/windows) are projected onto elevation faces by matching `wallId` against front/side walls, with X position from `wall.start + offset × wallLength` and Y from `storeyIndex × storeyHeight + sillHeight`. Each opening repeats per storey.

Constants reused from `planTo3d.ts`:
- `DEFAULT_STOREY_HEIGHT = 3`
- `ROOF_PITCH_HEIGHT = 1.5`
- `ROOF_OVERHANG = 0.3`
- `DOOR_DEFAULT_HEIGHT = 2.1`, `DOOR_DEFAULT_SILL = 0`
- `WINDOW_DEFAULT_HEIGHT = 1.5`, `WINDOW_DEFAULT_SILL = 0.9`

## Consistency with 2D/3D

- Same `activePlan` (PlanModel) as PlanCanvas (2D) and LazyBimModel3D (3D).
- Same `floors` count from `selectedDesign.floors`.
- Same wall thickness from `plan.wallThickness || FALLBACK_WALL_THICKNESS`.
- If CAD edits are persisted (`persistedPlan`), they are reflected in elevations/section automatically because `activePlan` resolves the same way.

## UI Placement

- New "Drawings" toggle button in the canvas toolbar (between "2D" and "3D").
- Shows DrawingsPanel with sub-tabs: Plan | Front Elevation | Side Elevation | Section A-A.
- "Plan" tab reuses PlanCanvas component.
- Empty state shown when no active plan exists.

## Validation

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors, 9 warnings (baseline unchanged) |
| Tests | 585 pass (38 files, +26 new) |
| Build | Succeeds, PWA intact (30 precache entries) |
| a11y (text-stone-500) | 0 files — uses text-stone-400 for all labels |

## Before / After

**Before:** Users could only see the 2D floor plan and 3D BIM model. No elevations or sections — critical documents for any architectural submission were missing.

**After:** Users can toggle to Drawings view, choose Front Elevation / Side Elevation / Section A-A, and see clean SVG line drawings with gable roof, storey lines, door/window openings, ground line, and dimension annotations.
