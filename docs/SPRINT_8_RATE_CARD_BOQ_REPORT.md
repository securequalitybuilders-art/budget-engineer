# Sprint 8 — Regional Rate Card BOQ Pricing

**Date:** 2026-07-01  
**Goal:** Replace fixed BOQ assumptions where practical with regional rate cards so costs vary by Zimbabwe, South Africa, Kenya, or Global defaults.

## Rate Card Structure

Existing `src/lib/rates/rate-card.ts`:

| Field | Type | Description |
|---|---|---|
| `id` | string | Region identifier |
| `region` | string | Display name |
| `currency` | string | ISO code (USD, ZAR, KES) |
| `symbol` | string | Currency symbol ($, R, KSh) |
| `wall` | Record<MaterialSystem, number> | Rate per m² (concrete/steel/timber) |
| `slab_m2` | number | Slab rate per m² |
| `roof_m2` | number | Roof rate per m² |
| `opening_each` | number | Opening rate each |
| `object_each` | number | Fixture rate each |
| `contingency` | number | % (e.g. 0.05) |
| `fees` | number | % (e.g. 0.07) |
| `vat` | number | % (e.g. 0.15) |
| *(plus beam, column, footing, rebar, excavation, formwork)* | | |

## Regions Supported

| ID | Label | Currency |
|---|---|---|
| `zimbabwe` | Zimbabwe (CWICR) | USD |
| `southafrica` | South Africa | ZAR |
| `kenya` | Kenya | KES |
| `global` | Global (USD baseline) | USD |

## Files Created

### `src/adapters/rateCardAdapter.ts`

| Export | Purpose |
|---|---|
| `getDefaultRegionId()` | Returns `'zimbabwe'` |
| `getRegionRateCard(id)` | Returns RateCard or fallback to Zimbabwe |
| `getSupportedRegions()` | `[{id, label, currency}]` for UI dropdown |
| `resolveBoqRate(regionId, itemKey, fallbackRate)` | Resolves a rate from card or returns fallback with warning |
| `getBoqRateAssumptions(regionId)` | Returns `RateAssumption[]` for display/export |
| `getContingencyRate(regionId)` | Returns % from rate card |
| `getFeesRate(regionId)` | Returns % from rate card |
| `getVatRate(regionId)` | Returns % from rate card |

## Item Mapping

| BOQ Item Key | Rate Card Field | Notes |
|---|---|---|
| `wall` | `wall.concrete` | External walls |
| `slab` | `slab_m2` | Floor slabs |
| `roof` | `roof_m2` | Roof structure |
| `opening` | `opening_each` | Generic openings |
| `object` | `object_each` | Fixtures |
| `door` | `opening_each` | Mapped to general opening rate |
| `window` | `opening_each` | Mapped to general opening rate |
| `partition` | `wall.concrete × 0.7` | Partitions ~70% of external wall |
| `finishes` | *fallback: 35* | No rate card field |
| `services` | *fallback: 45* | No rate card field |

## Fallback Rules

- If an item key exists in the rate card, the rate card value is used (source: `rate-card`)
- If an item key does not exist in the rate card, the fallback rate is used and a warning is attached (source: `fallback`)
- Contingency, fees, and VAT percentages are always taken from the selected rate card

## Files Modified

### `src/adapters/designToBoq.ts`
- Returns `BoqResult` which extends BOQ with an `assumptions: RateAssumption[]` field
- Base BOQ items (from boq-generator) post-processed to replace rates with rate card values
- Extra items (doors, windows, partitions, finishes, services) use `resolveBoqRate`
- Contingency, fees, VAT percentages from selected rate card
- `buildExportCsv()` now accepts optional `regionName` prepended to output
- `buildExportHtml()` now accepts optional `regionName` and `assumptions[]` for assumptions table

### `src/components/dashboard/BoqExportPanel.tsx`
- Added region selector dropdown (4 regions)
- BOQ recomputes when region changes via `useMemo` dependency on `regionId`
- Rate Assumptions toggle button shows per-item rate source (rate-card vs fallback) with warnings
- CSV/HTML exports include region name and assumptions

## Sample Cost Comparison (150 m² house)

| Region | Walls | Slabs | Roof | Openings | Extras | **Grand Total** |
|--------|-------|-------|------|----------|--------|-----------------|
| **Zimbabwe** (USD) | $3,060 | $16,500 | $11,250 | $2,500 | $13,200 | **~$57,000** |
| **South Africa** (ZAR) | R55,800 | R300,000 | R204,000 | R45,500 | R240,000 | **~R1,036,000** |
| **Kenya** (KES) | KSh 396,000 | KSh 2,130,000 | KSh 1,455,000 | KSh 323,000 | KSh 1,704,000 | **~KSh 7,373,000** |
| **Global** (USD) | $3,420 | $18,300 | $12,450 | $2,780 | $14,640 | **~$63,200** |

*Note: Totals are approximate and vary by actual item quantities. VAT, fees, and contingency percentages differ by region.*

## Export Changes

### CSV Export
- First line: `Region: Zimbabwe (CWICR)`
- Second line: `Currency: USD`
- Original column headers and data
- Totals section unchanged

### HTML Export
- Cover section includes Region and Currency
- New **Rate Assumptions** table below totals
  - Item label, rate, source tag (Rate card / Estimate), notes
  - Green dot = rate card, Amber dot = fallback estimate
- Preserves all existing layout, print-to-PDF, and styling

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors (6 pre-existing warnings) |
| `npm run build` | ✅ 3369 modules, 16 precache |

## Limitations
- Finishes and services rates are fixed fallbacks ($35/m² and $45/m²) — no rate card fields exist yet
- Door and window rates share the same `opening_each` rate card key (no separate door/window fields in rate card)
- Rate card does not distinguish between material systems for partitions (always concrete-based)
- Contingency/fees/VAT percentages pulled from rate card but not yet user-editable in BoqExportPanel (editable in RateCardPanel)
- Region choice is local state only (not persisted to IndexedDB) — lightweight, no persistence risk
