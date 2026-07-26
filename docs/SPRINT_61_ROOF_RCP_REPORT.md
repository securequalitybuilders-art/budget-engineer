# Sprint 61 — Add Roof Plan + Reflected Ceiling Plan (RCP) drawing types

**Goal**: Add two construction-standard drawing types to the Drawings view: Roof Plan and Reflected Ceiling Plan (RCP). Pure SVG, deterministic, offline, free.

## Deliverables

### Part 1 — RoofPlanView.tsx (new)
- **Top-down roof outline** = building footprint (`plan.width` × `plan.height`) plus `ROOF_OVERHANG` (0.3 m) drawn as a thin dashed eaves line.
- **Central ridge line** along the building centre, with slope lines from ridge to eaves and a slope-direction arrow labelled `FALL ~1:4`.
- **Gutter line** along the low eaves edge with two downpipe markers (small circles + "DP" labels) at corners.
- **North arrow** (`NorthArrow`), **ScaleBar**, dimension strings (roof size incl. overhang), grid bubbles, `DrawingTitle` ("ROOF PLAN"), legend (ridge / eaves / gutter / downpipe), title block, sheet border.
- **Material note:** "Roof covering indicative (IBR / tile — confirm with spec)".

### Part 2 — CeilingPlanView.tsx (new)
- **RCP convention**: mirrored view looking up at the ceiling. Draws room outlines (walls) same as floor plan, without floor-level fixtures — instead shows ceiling elements.
- **Ceiling grid**: 600×600 mm suspended-ceiling grid lines on larger rooms, plain ceiling on smaller rooms.
- **Light fixtures**: one circle+cross symbol per room centre in `DISCIPLINE.electrical` colour (`#e6b800`).
- **North arrow**, **ScaleBar**, dimensions, grid bubbles, `DrawingTitle` ("REFLECTED CEILING PLAN"), legend (ceiling grid / light fixture), title block, sheet border.
- **Ground Floor RCP** labelled, ceiling height ~2.7 m indicative.
- **Schematic note:** "Ceiling layout schematic — verify with electrical engineer".

### Part 3 — DrawingsPanel.tsx (modified)
- Added sub-tabs: `Plan` | `Site Plan` | `Foundation` | **`Roof Plan`** | **`Ceiling (RCP)`** | `Front Elevation` | `Side Elevation` | `Section A-A`.
- Both new tabs use the same `activePlan` with try/catch fallback.

## Files Changed
| File | Change |
|------|--------|
| `src/components/drawings/RoofPlanView.tsx` | **New** — Roof plan with ridge, eaves, overhang, gutter, downpipes, NorthArrow, ScaleBar, dimensions, legend, title block, sheet border |
| `src/components/drawings/CeilingPlanView.tsx` | **New** — Reflected ceiling plan with room outlines, ceiling grid, auto-placed light fixtures (electrical yellow), NorthArrow, ScaleBar, dimensions, legend, title block, sheet border |
| `src/components/drawings/DrawingsPanel.tsx` | Added Roof Plan and Ceiling (RCP) tabs to the tab row; imports + renders both new components |

## Tests
- **RoofPlanView**: 6 tests — component is function, null/zero-width fallback, ridge line exists (1), eaves/gutter/downpipe/legend all exist, NorthArrow and ScaleBar exist.
- **CeilingPlanView**: 5 tests — component is function, null/zero-width fallback, at least one light fixture exists, legend/NorthArrow/ScaleBar all exist.
- **Total**: +11 tests → **647 tests** (39 files).
- All 636 existing tests remain green.

## Validation
| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (10 warnings: same pattern as existing) |
| `npm test` | 647 passed (39 files) |
| `npm run build` | Success, PWA 30 precache entries |
| `text-stone-500` | No matches in new/edited `.tsx` files |
