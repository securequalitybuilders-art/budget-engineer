# Sprint 28 — Export Source Metadata and CAD-Edited BOQ Sync

**Date:** 2026-07-02  
**Goal:** Surface geometry/source metadata in BOQ/export outputs and improve BOQ sync so users know whether quantities are based on generated design, persisted CAD, or fallback.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/adapters/cadQuantitiesAdapter.ts` | Extracts quantities (wall lengths, door/window count, opening area) from CadDocument |
| `src/__tests__/cadQuantitiesAdapter.test.ts` | 10 tests for the new adapter |
| `docs/SPRINT_28_EXPORT_SOURCE_METADATA_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/adapters/designToBoq.ts` | Extended `BoqResult` with optional `sourceMetadata` (geometrySource, quantitySourceLabel, sourceWarnings, computedAt). Added `BoqSourceMetadata` interface. Updated `buildExportCsv`/`buildExportHtml` to include source metadata. Added `GeometrySource` type export. |
| `src/adapters/cadToDesignSyncAdapter.ts` | `deriveBoqFromCadOrDesign` now returns BOQ with source metadata and post-processed labels ("edited CAD" vs "generated geometry"). Added `projectId` input field. |
| `src/components/dashboard/BoqExportPanel.tsx` | Accepts optional `boq` prop from parent. Displays collapsible source badge (color-coded: amber=edited CAD, red=fallback, emerald=generated). Shows warnings when present. Passes source metadata to CSV/HTML exports. |
| `src/pages/Dashboard.tsx` | `currentBoq` now derived via `deriveBoqFromCadOrDesign` when `persistedPlan` exists. Passes external `boq` to `BoqExportPanel`. |

## Source Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `geometrySource` | `'generated-design' \| 'persisted-cad' \| 'fallback-generated' \| 'unknown'` | Origin of geometry data |
| `quantitySourceLabel` | `string` | Human-readable label (e.g. "Edited CAD / persisted plan") |
| `sourceWarnings` | `string[]` (optional) | Warnings from the conversion/sync process |
| `computedAt` | `string` (ISO 8601) | Timestamp of BOQ computation |
| `designId` | `string` (optional) | Source design ID |
| `projectId` | `string` (optional) | Source project ID |
| `cadDocumentId` | `string` (optional) | Source CAD document ID (when available) |

## CAD Quantity Sync Behavior

### `deriveBoqFromCadOrDesign`
1. If `plan` is provided and converts successfully:
   - `geometrySource` = `'persisted-cad'`
   - `quantitySourceLabel` = `'Edited CAD / persisted plan'`
   - BOQ assumptions/items labels updated: "from generated geometry" → "from edited CAD"
2. If no plan or plan conversion fails:
   - `geometrySource` = Source input or `'fallback-generated'`
   - `quantitySourceLabel` = `'Generated design geometry'` or `'Fallback generated geometry'`
3. Always produces valid BOQ with grandTotal > 0 (design-based fallback)

### `extractCadDocumentQuantities(cad)`
- Extracts: floors, external/internal wall length/area, door/window count, opening area
- Uses default wall height 3m
- NaN/clamp protection on all numeric fields
- Returns warnings for null CAD or zero-wall CAD

## UI Changes

### BoqExportPanel
- New collapsible "Geometry Source" badge section between design summary and quantity basis
- Color-coded badge: amber = Edited CAD, red = Fallback, emerald = Generated
- Shows: source label, computed timestamp, design ID, CAD document ID (truncated)
- Red warning section when source warnings present
- Source metadata included in CSV and HTML export outputs

### CSV Export (new lines)
- `Geometry source: persisted-cad`
- `Quantity source: Edited CAD / persisted plan`
- `Warning: ...` (one per warning)
- `Computed at: 2026-07-02T14:30:00.000Z`

### HTML Export (new meta row)
- Geometry Source badge in meta section
- Quantity Source label in meta section
- Source warnings displayed as red warning text above footer

## Tests Added

### cadQuantitiesAdapter.test.ts — 10 tests

| Test | What it verifies |
|------|-----------------|
| null CAD returns warnings and zeros | Invalid input handling |
| sample CAD returns positive wall lengths | Basic extraction |
| external and internal wall lengths computed correctly | 36m external, 8m internal for sample |
| wall area computed with default height 3m | Width×Height=Area |
| door and window counts correct | 1 door, 2 windows for sample |
| opening area computed from dimensions | Door area + window areas |
| floor count matches floors array | 1 floor for sample |
| no wall cad returns warning | Zero-wall detection |
| invalid numbers are clamped | NaN start/negative thickness handled |
| no NaN values in any fields | All numeric fields valid |

### designToBoq.test.ts — 8 new tests (24 total)

| Test | What it verifies |
|------|-----------------|
| BOQ with source metadata includes geometrySource | Metadata present |
| BOQ with source metadata has computedAt timestamp | Valid ISO date |
| BOQ with source metadata has grand total > 0 | Positive total with metadata |
| CSV includes geometry source when metadata provided | Source in CSV |
| CSV includes computedAt | Timestamp in CSV |
| CSV includes source warnings | Warnings in CSV |
| HTML includes geometry source | Source in HTML meta |
| HTML includes source warnings | Warnings in HTML footer |

### cadToDesignSyncAdapter.test.ts — 3 new tests (29 total)

| Test | What it verifies |
|------|-----------------|
| source metadata reflects generated-design | No plan = generated-design |
| source metadata reflects persisted-cad | Plan = persisted-cad |
| BOQ labels updated to edited CAD | Labels say "edited CAD" |

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors) |
| `npm test` (`vitest run`) | ✅ PASS (235 tests, 18 files) |

## Remaining Limitations

1. **BOQ quantities not fully derived from CAD** — Label text updated but underlying quantities still come from design geometry adapter. Full CAD-derived quantity override deferred.
2. **Snapshot source metadata deferred** — SnapshotHistoryPanel does not yet store/display BOQ source metadata.
3. **No Dashboard UI wiring for "revert to generated design"** — Users must re-save PlanModel in PlanCanvas to see changes.
4. **Single-plan only** — Only one PlanModel per (projectId, designId) pair.
5. **No export sync for WS6 boq-export.ts** — The WS6 boq-export.ts (drawing register + plan SVGs) is separate from the canonical designToBoq export path.
