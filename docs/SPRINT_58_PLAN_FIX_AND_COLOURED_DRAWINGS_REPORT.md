# Sprint 58 — Fix Blank Plan Tab + Coloured Material/Discipline Drawing System

**Date:** 2026-07-06
**Branch:** `main`

## Part A — Root Cause of Blank Plan Tab

**Root cause:** `DrawingsPanel.tsx` rendered the Plan sub-tab as `<PlanCanvas projectId={null} design={null} persistedPlan={activePlan} />`. Inside `PlanCanvas`, the fallback check at line 45 reads `if (!design || !model)` — even when `persistedPlan` (i.e. `activePlan`) was non-null, `design` being `null` caused the component to always display "No active design selected. Choose a design option to render a 2D floor plan." The Front/Side/Section tabs never had this problem because they computed their drawing data directly from `activePlan` without checking `design`.

**Fix:** Added a `design: DesignOption | null` prop to `DrawingsPanel` and passed it through to `PlanCanvas`. Dashboard.tsx now passes `selectedDesign` to `DrawingsPanel` (same `selectedDesign` used by the main canvas area at line 568). All four sub-tabs now use the same `activePlan` and `design` — the Plan tab renders the 2D floor plan consistently with the elevations and section.

## Part B — Coloured Material + Discipline Colour System

### New files

| File | Purpose |
|---|---|
| `src/components/drawings/drawingColors.ts` | Material colours (concrete grey, brick red-orange, earth brown, insulation yellow, steel blue, glass cyan, blockwork light grey) + Discipline colours (structural red, electrical yellow, plumbing blue, HVAC green, architectural black, dimensions grey) + `MATERIAL_LEGEND` and `DISCIPLINE_LEGEND` arrays |
| `src/components/drawings/drawingLegend.tsx` | `MaterialHatchDefs` — SVG `<defs>` with coloured `<pattern>` elements per material (id `mat-concrete`, `mat-brick`, `mat-blockwork`, `mat-earth`, `mat-insulation`), combining fill colour + hatch lines. `LegendBox` — bordered legend with colour swatch + label list |

### Modified files

| File | Change |
|---|---|
| `src/components/drawings/DrawingsPanel.tsx` | Added `design: DesignOption | null` prop; passes it to `PlanCanvas` |
| `src/pages/Dashboard.tsx` | Passes `selectedDesign` to `DrawingsPanel` |
| `src/components/drawings/SectionView.tsx` | Uses `MaterialHatchDefs` instead of plain hairline poché: cut walls = brick (external) / blockwork (internal) fills, floor slabs = concrete pattern, earth datum = brown earth pattern. Added MATERIALS legend box top-left of the section |
| `src/components/drawings/ElevationView.tsx` | Window rects now get a subtle cyan glass fill (`MATERIAL.glass.fill`) so openings read as glass rather than white voids |

### Colour convention

Colours follow common architectural/engineering drawing convention (BS 1192 / ISO 13567-2 inspired). All values are marked "indicative — confirm with local authority / by-laws for formal submissions."

## Tests

| File | Change |
|---|---|
| `src/__tests__/cadDrawings.test.ts` | +7 tests: MATERIAL_LEGEND contains concrete/brick/earth with hex colours; DISCIPLINE_LEGEND contains structural/electrical/plumbing/hvac with hex colours; MaterialHatchDefs/LegendBox/DrawingsPanel are valid component exports |

## Validation

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors, 9 warnings (baseline unchanged) |
| Tests | 616 pass (39 files, +7 new) |
| Build | Succeeds, PWA 30 precache entries |
| a11y (text-stone-500) | 0 files — all new/existing use `text-stone-400` |
