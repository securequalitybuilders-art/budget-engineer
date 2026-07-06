# Sprint 57 — Professional Orthographic CAD Drawings (Flat Black-on-White Style)

**Date:** 2026-07-06
**Branch:** `main`

## Summary

Refactored ElevationView and SectionView into professional flat black-on-white CAD sheets with proper line weights, dimension strings, grid bubbles, level markers, poché hatching on cut walls, and an A1-format title block. All geometry continues to come from the unchanged `planToElevations.ts` — this sprint is exclusively a presentation/annotation layer upgrade.

## New Files

| File | Purpose |
|---|---|
| `src/components/drawings/cadConstants.ts` | Line-weight constants (`CAD_HEAVY=2`, `CAD_MEDIUM=1.2`, `CAD_THIN=0.6`, `CAD_HAIR=0.4`), ink/paper colors (`INK='#1a1a1a'`, `PAPER='#ffffff'`), `metresToMm()` helper |
| `src/components/drawings/cadPrimitives.tsx` | React SVG components: `HatchDefs` (poche 45° diagonal + earth stipple `<defs>`), `SheetBorder`, `TitleBlock` (project, date, scale, sheet, drawn-by fields), `DimensionLineH`, `DimensionLineV`, `GridBubble`, `LevelMarker`, `DrawingTitle` |
| `src/components/drawings/SectionView.tsx` | Standalone CAD section view with poché-hatched cut walls, heavy floor slabs, hatched earth datum, dimension strings, grid bubbles, level markers, title block |
| `src/__tests__/cadDrawings.test.ts` | 24 tests: `metresToMm` conversions, front/side/section drawing data shape, empty/null/zero fallback safety |

## Modified Files

| File | Change |
|---|---|
| `src/components/drawings/ElevationView.tsx` | Complete white-sheet refactor: white `#ffffff` background, black `#1a1a1a` ink, CAD line weights, dimension strings above/left of building, grid bubbles at bottom/left, level markers at each storey, title block bottom-right, drawing title top-left, sheet border |
| `src/components/drawings/DrawingsPanel.tsx` | Passes `activePlan`, `floors`, `storeyHeight`, `pitchHeight`, `title` props to `ElevationView` and `SectionView` |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Removed `buildSampleCad` function and `CadDocument` import; section tab now shows redirect text pointing to main Drawings view |

## CAD Sheet Layout

All drawings render on an A1-proportioned white sheet (`#ffffff` paper, `#1a1a1a` ink):

- **Sheet border**: 2 mm heavy outer + 0.6 mm thin inner, 10 mm margins
- **Drawing view**: ViewBox-scaled elevation/section centred in the live area
- **Drawing title**: `FRONT ELEVATION` / `SIDE ELEVATION` / `SECTION A-A` in 10 mm text at top-left
- **Dimension strings**: Offsets above (width) / left of (height) building, 4 mm text, thin leader lines with tick marks
- **Grid bubbles**: 8 mm diameter circles at bottom (A, B, C...) and left (1, 2, 3...), 6 mm text
- **Level markers**: Triangle marker + elevation label (`+0.000`, `+3.000`, `+6.000`) at each storey datum, right side
- **Title block**: Bottom-right corner — Project, Date, Scale, Sheet number, Drawn By fields, 2 mm outer border
- **Poché hatching** (SectionView only): 45° diagonal hairline fill on cut walls; denser stipple on earth datum

## Line Weight Convention

| Weight | Value | Usage |
|---|---|---|
| CAD_HEAVY | 2 mm | Sheet border, building outline, cut walls |
| CAD_MEDIUM | 1.2 mm | Floor slabs (section), roof outline, title block border |
| CAD_THIN | 0.6 mm | Internal walls, openings, dimension lines, grid lines |
| CAD_HAIR | 0.4 mm | Poché hatch lines, earth hatch lines, tick marks |

## Geometry Source

`planToElevations.ts` is **unchanged** from Sprint 56. All three views (front, side, section) derive from the same `activePlan` resolution used by 2D PlanCanvas and 3D BimModel3D:

- Wall segments → elevation projection by face direction
- Floor slabs → section cut at `plan.height / 2`
- Roof gable → pitched triangle at `pitchHeight` above eaves
- Openings → projected by `wallId` match + `storeyIndex × storeyHeight + sillHeight`
- Constants reused from `planTo3d.ts`: `DEFAULT_STOREY_HEIGHT`, `ROOF_PITCH_HEIGHT`, `ROOF_OVERHANG`, `DOOR_DEFAULT_HEIGHT`, `WINDOW_DEFAULT_HEIGHT`, `WINDOW_DEFAULT_SILL`

## Before / After

**Before (Sprint 56):** Elevations used brand-colored strokes (cyan/sky-400 walls, amber-400 roof) on dark background with simple "Dimensions in metres" caption. No title block, no grid, no level markers, no poché.

**After (Sprint 57):** Professional flat black-on-white CAD sheets with proper line weights, dimension offsets, grid bubble references, level markers at every storey datum, poché hatching on cut walls (section), hatched earth datum, title block with project metadata, sheet border — matching the mosque-reference standard.

## Validation

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors, 9 warnings (baseline unchanged) |
| Tests | 609 pass (39 files, +24 new) |
| Build | Succeeds, PWA intact |
| a11y (text-stone-500) | 0 files — all labels use `text-stone-400` |
