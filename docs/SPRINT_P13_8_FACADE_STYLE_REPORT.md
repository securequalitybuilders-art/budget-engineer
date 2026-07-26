# SPRINT P13.8 — Façade Orientation, Typology-Aware Styles & Verandah Projection

**Status:** Complete  
**Date:** 2026-07-23  
**Engine:** `facadeStyle.ts` + `elevationEngine.ts` (style-driven colours)

## Summary

Added 15 typology-aware façade styles that drive colour palettes and architectural features (verandah, portico, quoins, accent bands, parapet). Building type from `DesignOption.buildingType` flows through the enhanced elevation pipeline to produce style-distinct elevations.

## Typology-to-Style Mapping

| Building Type | Style Name | Key Visual Features |
|---|---|---|
| House | Residential Modern | 1.8m verandah, portico, 1 accent band |
| Traditional house | Residential Traditional | 2.4m verandah, quoins, 2 bands, earth tones |
| Villa | Villa Luxury | 3.0m wraparound verandah, quoins, portico, blue accent |
| Duplex | Duplex | 1.5m verandah, portico |
| Apartment block | Apartment Block | Parapet only, 3 accent bands, grey palette |
| Clinic | Clinic Institutional | 2.0m verandah, wide portico, green tones |
| School | School Educational | 2.4m verandah, warm tones |
| Hotel | Hotel Hospitality | Grand 3.0m portico, quoins, indigo accent |
| Office | Office Commercial | Parapet, 2 bands, neutral palette, no verandah |
| Shop | Retail Streetfront | 1.5m canopy, parapet, red tones |
| Church | Worship Monumental | 3.0m monumental portico, quoins, stone palette |
| Warehouse | Warehouse Industrial | Parapet only, grey, no decoration |
| Community hall | Community Civic | 2.0m verandah, portico, slate tones |
| Mixed-use | Mixed-Use Building | Parapet, 2 bands, neutral |
| Unknown | Default | Minimal, no verandah/portico |

## New Features

### `facadeStyle.ts` (new, ~200 lines)
- `getFacadeStyle(buildingType)` — maps building type to full style object
- `getFacadeOrientation(planWidth, planDepth)` — detect front vs side
- `detectVerandah/getVerandahDepth` — verandah presence/depth per typology
- `detectPortico/getPorticoWidth` — portico presence/width per typology

### `elevationEngine.ts` (modified)
- All 3 `computeEnhanced*` functions accept optional `buildingType?: string`
- Plinth, wall, fascia, roof colours driven by style palette
- **Accent bands**: horizontal colour bands between floors
- **Quoins**: corner stone blocks at wall edges
- **Verandah**: dashed projection line at ground with depth annotation
- **Portico**: entrance marker band
- Non-breaking: `undefined` buildingType defaults to "unknown" → minimal style

### `DrawingsPanel.tsx` (modified)
- Passes `design?.buildingType` to all 3 enhanced engine calls

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `facadeStyle.test.ts` | 27 | ✅ |
| `elevationEngine.test.ts` | 60 | ✅ |
| `planToElevations.test.ts` | 31 | ✅ |
| `p13_7.test.ts` | 70 | ✅ |
| `cadDrawings.test.ts` | 105 | ✅ |
| `drawingEngineUpgrade.test.ts` | 92 | ✅ |
| `drawingFidelityHardening.test.ts` | 22 | ✅ |
| **Total** | **407** | **✅** |

## Files

| File | Action | Description |
|------|--------|-------------|
| `src/adapters/facadeStyle.ts` | **NEW** | 15 typology styles, orientation, verandah/portico detection |
| `src/__tests__/facadeStyle.test.ts` | **NEW** | 27 tests covering all styles |
| `src/adapters/elevationEngine.ts` | **MODIFIED** | Style-driven colours + accent bands, quoins, verandah, portico |
| `src/components/drawings/DrawingsPanel.tsx` | **MODIFIED** | Passes `design?.buildingType` to enhanced engine |
| `docs/SPRINT_P13_8_FACADE_STYLE_REPORT.md` | **NEW** | This file |

## Conformance
- ✅ ADDITIVE: Legacy engine preserved as fallback
- ✅ NULL-SAFE/OPTIONAL: `buildingType` parameter is optional, defaults to minimal style
- ✅ Same `ElevationDrawing` interface — zero downstream changes
- ✅ All 31 existing elevation tests still pass unchanged
- ✅ Style-based matching is keyword-ordered to avoid false positives
