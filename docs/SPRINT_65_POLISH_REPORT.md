# Sprint 65 — Polish: White-paper Floor Plan + Fixed Elevation Opening Projection

## Part A — White Floor Plan Cell in A1 Sheet

**Before:** The A1 Presentation Sheet's Floor Plan cell rendered with `embedFloorPlan()` which drew only wall outlines (white fill, dark stroke) and room name labels — no room outline rectangles, no north arrow, no area labels, and the rendering was inline within `PresentationSheetView.tsx`.

**After:** Created `src/components/drawings/planSheetModel.tsx` with a pure `renderFloorPlanSheet(plan)` function that returns a complete white-paper CAD plan:

- White background (`#ffffff`) with dark ink (`#1a1a1a`)
- Exterior + interior wall lines (white fill, dark stroke, same y-flip convention as other *Model.ts renderers)
- Room outline rectangles (white fill, thin dark outline)
- Room name + area labels (e.g. "Living 48.0 m²")
- North arrow (triangle + "N" label) in top-right corner
- Caption "FLOOR PLAN"

The `PresentationSheetView.tsx` was updated to use `embedSheetDrawing()` with the new `renderFloorPlanSheet` output instead of the inline `embedFloorPlan` function. The interactive dark PlanCanvas remains unchanged in the normal "Plan" tab — only the sheet cell changed. The PNG/PDF export serialises the same sheet SVG, so the fix applies there too.

**Deleted:** The `embedFloorPlan()` function from `PresentationSheetView.tsx` (no longer needed).

## Part B — Fixed Elevation Opening Projection

**Root cause:** `ElevationView.tsx` mapped opening rectangles from the `planToElevations` viewBox to sheet coordinates using incorrect formulas:

- **X mapping:** Used `(v - drawWorldLeft) / drawWorldW * s(bw)` without subtracting the viewBox padding, causing opening rects to shift right and compress by `bw / (bw + 2×PADDING)`.
- **Y mapping:** Used `(v - drawWorldTop) / drawWorldH * s(totalH)` where `drawWorldH = svgH` (which includes 2×PADDING), causing the entire building to be compressed vertically and shifted upward. The ground line didn't align with the sheet ground level, making doors float above the ground.
- **Width/height:** Used `(rect.w / drawWorldW) * s(bw)` and `(rect.h / drawWorldH) * s(totalH)`, compressing opening dimensions by the same padding factor.

**Fix:** Rewrote the mapping formulas in `ElevationView.tsx` (lines 130–148):

```
Before:
  const oxx = (v) => ox + ((v - drawWorldLeft) / drawWorldW) * s(bw)
  const oyy = (v) => oy - ((v - drawWorldTop) / drawWorldH) * s(totalH)
  irw = (rect.w / drawWorldW) * s(bw)
  irh = (rect.h / drawWorldH) * s(totalH)

After:
  const PADDING = (drawWorldH - totalH) / 2
  const groundViewBoxY = vbParts[1] + drawWorldH - PADDING
  irx = ox + ((rect.x - PADDING) / bw) * s(bw)
  iry = oy - ((groundViewBoxY - rect.y) / totalH) * s(totalH)
  irw = s(rect.w)
  irh = s(rect.h)
```

**Results:**
- ✅ Doors sit on the ground: door rect bottom = sheet ground line (`oy`)
- ✅ Windows at sill height: window rect bottom = `oy - s(0.9)` (0.9m above ground)
- ✅ Openings placed at correct X positions along facade (using world coordinates minus PADDING)
- ✅ No overlapping openings at distinct offsets
- ✅ Only front-wall openings appear in front elevation, side-wall in side elevation
- ✅ Multi-storey correctly repeated per floor
- ✅ Width/height correctly scaled via `s()` helper

## Files Changed

| File | Change |
|------|--------|
| `src/components/drawings/planSheetModel.tsx` | **NEW** — Pure white-paper floor plan renderer |
| `src/components/drawings/PresentationSheetView.tsx` | Use `renderFloorPlanSheet` via `embedSheetDrawing`; removed `embedFloorPlan` |
| `src/components/drawings/ElevationView.tsx` | Fixed opening rect coordinate mapping (X/Y pos, w/h) |
| `src/__tests__/planToElevations.test.ts` | Added 5 tests: door positioning, window positioning, non-overlap, front/side filtering |
| `src/__tests__/presentationSheet.test.ts` | Added 5 tests: white bg, room label, wall fills, north arrow, null plan |
| `CHANGELOG.md` | Added Sprint 65 entry under `[Unreleased]` |
| `docs/SPRINT_65_POLISH_REPORT.md` | This report |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (unchanged baseline) |
| `npm test` | **41 files, 691 passed** (+10 new tests) |
| `npm run build` | Success, **PWA 30 entries** |
| `grep text-stone-500 src --include="*.tsx"` | No matches |
