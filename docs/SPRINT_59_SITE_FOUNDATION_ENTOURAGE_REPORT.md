# Sprint 59 — Site Plan + Foundation Plan + Reusable Entourage & Ground Library

**Date:** 2026-07-06
**Branch:** `main`

## Summary

Added two new professional drawing types (Site Plan, Foundation Plan) and a reusable pure-SVG entourage/ground library that all future drawings can reuse. All new rendering is deterministic, 100% offline, and free/open-source. No AI images or external APIs.

## New Files

| File | Purpose |
|---|---|
| `src/components/drawings/entourage.tsx` | `TreeElevation` (round/conifer/palm variants with trunk, canopy, cast shadow), `PersonSilhouette` (1.7 m human figure for scale), `CarSilhouette` (site-plan car outline), `NorthArrow` (circle + needle + "N"), `ScaleBar` (graduated bar-scale with tick segments + metre labels), `NumberedLegend` (circled numbers ①②③ + labels for reference) |
| `src/components/drawings/ground.tsx` | `GroundHatchDefs` (topsoil/subsoil/rock SVG `<pattern>` elements), `GroundLine` (heavy datum line), `SoilLayers` (stacked coloured soil strata with typed hatch patterns + labels) |
| `src/components/drawings/SitePlanView.tsx` | Full site plan: plot boundary (dashed), building footprint (concrete poché) with entry indicator, road/access strip with centre line, plan-view trees, parking bay, car silhouette, north arrow, scale bar, setback dimensions, site coverage % note, title block, sheet border |
| `src/components/drawings/FoundationPlanView.tsx` | Foundation plan: strip footings beneath each load-bearing wall (concrete poché, footing width = wall thickness × 2.5), wall lines above (thin dashed), dimension strings, grid bubbles, north arrow, scale bar, materials legend, "confirm with structural engineer" note, title block, sheet border |

## Modified Files

| File | Change |
|---|---|
| `src/components/drawings/DrawingsPanel.tsx` | Added `'site-plan'` and `'foundation'` tabs to the tab bar (now: Plan / Site Plan / Foundation / Front Elevation / Side Elevation / Section A-A). Imports and renders `SitePlanView` and `FoundationPlanView` from the same `activePlan`/`design` |
| `src/components/drawings/SectionView.tsx` | Replaced flat earth hatch below datum with `SoilLayers` (topsoil → subsoil → rock). Added `TreeElevation` (2 trees, round + conifer), `PersonSilhouette` for scale, and `NumberedLegend` with numbered callouts (1=brick wall, 2=concrete slab, 3=natural soil) |

## Entourage Library

All components are pure SVG (no external assets, all inline paths):
- **TreeElevation**: 3 variants — round canopy (ellipse), conifer (triangle), palm (curved trunk + fronds). Soft green fills with cast shadow ellipse on ground.
- **PersonSilhouette**: ~1.7 m human figure (head, body, arms, legs) in grey `#6b7280` fill.
- **CarSilhouette**: Simple car body + roof cabin + windows + wheels.
- **NorthArrow**: Circle + filled north half + "N" label.
- **ScaleBar**: Graduated alternating black/white segments with 0/5/10/... m tick labels.
- **NumberedLegend**: Bordered box with circled numbers + label text.

## Ground Library

- **GroundHatchDefs**: 3 soil patterns — topsoil (brown/stipple), subsoil (lighter hatch), rock (grey crosshatch).
- **SoilLayers**: Accepts array of `{depth, type}` strata, renders coloured rects with typed hatches + separator lines + type labels.
- **GroundLine**: Heavy ground datum using `CAD_HEAVY` stroke.

## Section Enrichment

Section A‑A now shows layered soil strata below datum (topsoil 8px, subsoil 12px, rock remainder), two trees (round-canopy left, conifer right) and a person silhouette for scale, plus a numbered legend referencing wall/slab/soil callouts.

## Indicative Values

All setback, footing, and site coverage values are labelled "indicative / schematic — verify with local authority" or "confirm with a structural engineer". No authoritative legal claims.

## Tests

| File | Change |
|---|---|
| `src/__tests__/cadDrawings.test.ts` | +11 tests: entourage components (TreeElevation, NorthArrow, ScaleBar, NumberedLegend, PersonSilhouette, CarSilhouette), ground components (GroundHatchDefs, SoilLayers, GroundLine), SitePlanView, FoundationPlanView |

## Validation

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors, 9 warnings (baseline unchanged) |
| Tests | 627 pass (39 files, +11 new) |
| Build | Succeeds, PWA 30 precache entries |
| a11y (text-stone-500) | 0 files — all use `text-stone-400` for app-chrome text, SVG labels use dark `#1a1a1a` ink on white |
