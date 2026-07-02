# Sprint 27 — PlanModel to CadDocument Roundtrip

**Date:** 2026-07-02  
**Goal:** Convert persisted PlanModel into canonical CadDocument and use it in downstream analysis. No Dashboard UI changes.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/adapters/planModelToCadAdapter.ts` | Converts PlanModel → CadDocument: walls, openings, default Ground Floor, layer definitions, NaN clamping, invalid-plan detection |
| `src/__tests__/planModelToCadAdapter.test.ts` | 13 tests for the converter |

## Files Modified

| File | Change |
|------|--------|
| `src/adapters/cadToDesignSyncAdapter.ts` | `deriveAnalysisFromCadOrDesign` now prefers PlanModel-converted CadDocument; falls back to `buildCadFromDesignOption` when plan unavailable/invalid. Added `deriveCadFromPlan` helper. |
| `src/adapters/designToAnalysis.ts` | Exported `buildCadFromDesignOption` for use by sync adapter |
| `src/__tests__/cadToDesignSyncAdapter.test.ts` | 9 new tests for conversion path, fallback, source metadata, NaN protection |

---

## Conversion Mapping

| PlanModel | CadDocument | Notes |
|-----------|-------------|-------|
| `WallSegment` | `CadWall` | id, start/end point, thickness, structuralRole (external/internal), layerId='walls', bim classification |
| `Opening` | `CadOpening` | id, wallId, kind, offset → offsetRatio (wall-length-relative), width, sillHeight/headHeight, layerId='openings' |
| — | `CadFloor` (f1) | Default "Ground Floor" at elevation 0 — PlanModel has no floor concept |
| `id`, `designOptionId` | `id`, `designId` | Preserved from PlanModel |
| Project/Design IDs | `projectId`, `designId` | From input parameters |
| `RoomRect` | (unmapped) | No direct CadDocument field for rooms |
| — | `layers` | 6 default layers: Grid, Walls, Openings, Annotations, Rooms, Dimensions |

## Key Decisions

1. **PlanModel has no floor concept** → create a single "Ground Floor" (f1) during conversion.
2. **Opening offset** (absolute distance from wall start) → `offsetRatio` (ratio of wall length) computed via wall length calculation, clamped to [0, 1].
3. **NaN protection** — all numeric values clamped to safe ranges: thickness [0.01, 10], offsetRatio [0, 1], width [0.1, 10], wall endpoints ±1e6.
4. **No-wall rejection** — PlanModel with zero walls returns `source: 'invalid-plan'`.
5. **BIM/BOQ still use DesignOption** — they need building type, floors, GFA which PlanModel lacks.
6. **Analysis now accepts converted CadDocument** for clash/solar analysis instead of building one from DesignOption.
7. **Fallback chain** — if PlanModel conversion fails or is null, `buildCadFromDesignOption` is called as fallback, with a "Using generated-design fallback" warning.

## Tests Added

### planModelToCadAdapter.test.ts — 13 tests

| Test | What it verifies |
|------|-----------------|
| null plan returns null + warning | Invalid input handling |
| sample PlanModel converts to CadDocument | Basic conversion |
| converted CadDocument has floors | Ground Floor default |
| converted CadDocument has walls matching PlanModel walls | Wall mapping fidelity |
| converted CadDocument has openings when fixture includes them | Opening mapping with offsetRatio |
| converted CadDocument has empty openings when fixture has none | No-openings edge case |
| converted CadDocument has default layers | 6 layers present |
| no NaN in converted geometry | All numeric fields valid |
| invalid geometry is clamped or warned | NaN thickness, NaN start point handled |
| ids/projectId/designId preserved where possible | Identity fields pass through |
| PlanModel with no walls returns null | Zero-wall rejection |
| CadDocument has activeTool and activeFloorId | Metadata fields present |
| CadDocument has empty annotations and blocks | Default empty arrays |

### cadToDesignSyncAdapter.test.ts — 9 new tests (26 total)

| Test | What it verifies |
|------|-----------------|
| safe analysis fallback when no plan | Fallback path builds cad from design |
| analysis from design fallback when plan provided | Plan conversion succeeds |
| persisted PlanModel path preferred over generated | Plan-model walls used when valid |
| invalid PlanModel falls back to generated | Zero-wall plan falls through |
| no NaN when plan available | Valid output with plan |
| analysis safe when plan available | No crashes with plan |
| deriveCadFromPlan returns CadDocument | Helper function works |
| deriveCadFromPlan returns null when PlanModel is null | Helper null handling |
| deriveCadFromPlan returns null when PlanModel has no walls | Helper empty handling |

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors) |
| `npm test` (`vitest run`) | ✅ PASS (214 tests, 17 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS |

## Remaining Limitations

1. **BIM/BOQ still use DesignOption** — PlanModel lacks building type, floors, GFA data needed to generate BIM/BOQ.
2. **No Dashboard UI wiring** — conversion is internal to sync adapter; no "Show in CAD" button or save/load UX.
3. **No multi-floor** — PlanModel has no floor concept; only Ground Floor (f1) is generated.
4. **RoomRects unmapped** — PlanModel rooms have no corresponding CadDocument field.
5. **No export sync** — CSV/HTML/PDF exports still use original design data, not CAD-edited data.
6. **No manual save/restore UI** — Auto-save only, no explicit "Save" or "Revert to generated" action.
