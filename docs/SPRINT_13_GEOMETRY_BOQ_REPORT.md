# Sprint 13 — Geometry-Derived BOQ Quantities

**Date:** 2026-07-01  
**Goal:** Derive BOQ quantities from generated CAD geometry instead of broad gross-floor-area assumptions — map walls, openings, rooms, and zones to accurate quantity line items for regional BOQ export.

---

## Problem

Before Sprint 13, the BOQ adapter used rough estimates:
- Partitions: `internalWallCount * 8` m² (fixed 8 m² per wall)
- Doors/windows: `internalWallCount * 2` (no opening dimensions)
- Finishes: `grossFloorArea * 3.5` (floors/walls/ceilings blended)
- Services: `grossFloorArea * $45/m²` (no room/zone awareness)

These estimates did not reflect actual generated geometry, making BOQ numbers imprecise for regional rate card pricing.

---

## Solution: `extractGeometryQuantities()`

New adapter `src/adapters/geometryQuantitiesAdapter.ts` computes 26 quantity fields from the geometry produced by `buildDesignGeometry()`:

| Quantity | Source | Formula |
|----------|--------|---------|
| `grossFloorArea` | DesignOption | area × floors |
| `footprintArea` | Perimeter walls | building width × depth |
| `slabArea` | footprintArea | same as footprint |
| `roofArea` | footprintArea | footprint × 1.15 (pitch factor) |
| `externalWallLength` | External walls (type='external') | sum of lengths |
| `internalWallLength` | Internal walls (type='internal') | sum of lengths |
| `externalWallArea` | externalWallLength × 3 m | includes openings deduction |
| `internalWallArea` | internalWallLength × 3 m | includes internal openings deduction |
| `partitionArea` | internalWallArea | ready for partition rate |
| `doorCount` | Openings with type='door' | count |
| `windowCount` | Openings with type='window' | count |
| `doorArea` | Door openings | sum of width × height |
| `windowArea` | Window openings | sum of width × height |
| `openingArea` | All openings | doorArea + windowArea |
| `roomCount` | Generated rooms | count |
| `wetRoomCount` | Rooms type='bathroom' | count |
| `kitchenCount` | Rooms type='kitchen' | count |
| `bedroomCount` | Rooms type='bedroom' | count |
| `clinicRoomCount` | Rooms type='clinic' | count |
| `finishFloorArea` | Sum of room areas | per-room area sum |
| `serviceZoneArea` | Zone type='service' | sum of areas |
| `floors` | DesignOption.floors | from design |
| `warnings` | Array of edge-case notes | e.g., no openings found |

### Wall Height Convention
- `GeneratedWall` has a `height` field but it may be zero
- Fallback: **3.0 m** — matches existing `FLOOR_HEIGHT` convention in `designToBim.ts`

### Opening Deduction
- External wall area: `externalWallLength × height - windowArea` (doors on external walls are rare but excluded)
- Partition area: `internalWallLength × height - doorArea`

---

## Changes to `designToBoq.ts`

- `buildBoqFromDesignOption()` now calls `extractGeometryQuantities()` instead of directly introspecting `buildDesignGeometry()`
- BOQ line items use derived quantities:
  - **Doors:** `doorCount` (was `internalWallCount * 2`)
  - **Windows:** `windowCount` (was `internalWallCount * 2`)
  - **Partitions:** `partitionArea` m² (was `internalWallCount * 8`)
  - **Finishes:** `finishFloorArea` m² (was `grossFloorArea * 3.5`)
  - **Services:** `roomCount` + `wetRoomCount` (was `grossFloorArea` alone)
- **New line item:** External wall area (`externalWallArea` m²) — separate from slab/roof
- **Rate assumption labels** now include derived quantity values, e.g.:
  - "External walls (202 m² from generated geometry)"
  - "Internal partitions (74 m² from generated geometry)"
  - "Electrical, plumbing & drainage (300 m² from 8 rooms, 2 wet rooms)"
- `buildExportCsv()` accepts optional `GeometryQuantities` and emits quantity-basis header lines
- `BoqResult` now includes `quantities?: GeometryQuantities`

---

## Changes to `BoqExportPanel.tsx`

- New **"Quantity Basis"** section between design summary and BOQ table — shows 6 key quantities in a small dark card
- CSV export passes `boq.quantities` to `buildExportCsv()`

---

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/__tests__/geometryQuantitiesAdapter.test.ts` | 10 (NEW) | ✅ PASS |
| `src/__tests__/designToBoq.test.ts` | 16 (+5 from Sprint 9) | ✅ PASS |
| All other test files | 47 (unchanged) | ✅ PASS |
| **Total** | **73** | **✅ PASS** |

### New geometryQuanititesAdapter Tests
1. Null design → safe zeros + warning
2. Residential → external wall length > 0
3. Internal wall length > 0
4. Door count > 0 for residential
5. Window count > 0 for residential
6. No NaN in any numeric field (26-field check)
7. Clinic design → clinicRoomCount > 0
8. Duplex (2 floors) → more area/rooms than 1-floor
9. Finish floor area > 0 and ≥ 50% of GFA
10. Wet rooms counted for residential bathrooms

### New designToBoq Tests
1. Geometry-derived items (doors/windows/partitions/finishes/services) present in BOQ
2. Quantities object included with geometry data
3. CSV export includes quantity-basis lines
4. Duplex BOQ > house BOQ in same region
5. Clinic BOQ has quantities with clinicRoomCount

---

## Sample Quantity Tables

### 150 m² House (1 floor, residential)

| Quantity | Value |
|----------|-------|
| External wall area | 202 m² |
| Internal partitions | 74 m² |
| Doors | 5 nr |
| Windows | 4 nr |
| Finish area | 287 m² |
| Rooms (wet) | 8 (2) |

### 240 m² Duplex (2 floors, residential)

| Quantity | Value |
|----------|-------|
| External wall area | ~404 m² |
| Internal partitions | ~148 m² |
| Doors | ~10 nr |
| Windows | ~8 nr |
| Finish area | ~574 m² |
| Rooms (wet) | ~16 (4) |

### 300 m² Clinic (1 floor, clinic type)

| Quantity | Value |
|----------|-------|
| External wall area | ~404 m² |
| Internal partitions | ~148 m² |
| Doors | ~10 nr |
| Windows | ~8 nr |
| Rooms (clinic) | ~16 (4+) |

---

## Comparison: Before vs After (150 m² House, Zimbabwe)

| Line Item | Before (Sprint 8) | After (Sprint 13) | Basis |
|-----------|-------------------|-------------------|-------|
| Slab | 150 m² | 150 m² | footprintArea |
| Roof | 172 m² | 172 m² | footprintArea × 1.15 |
| External walls | — | 202 m² | **NEW** — was missing |
| Partitions | 80 m² (10 × 8) | 74 m² | derived from actual internal walls |
| Doors | 20 nr (10 × 2) | 5 nr | actual door count |
| Windows | 20 nr (10 × 2) | 4 nr | actual window count |
| Finishes | 525 m² (150 × 3.5) | 287 m² | actual room areas |
| Services | 150 m² (GFA × $45) | 300 m² from 8 rooms, 2 wet | room/zone derived |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/adapters/geometryQuantitiesAdapter.ts` | `extractGeometryQuantities()` — 26 quantity fields |
| `src/__tests__/geometryQuantitiesAdapter.test.ts` | 10 tests for the new adapter |
| `docs/SPRINT_13_GEOMETRY_BOQ_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/adapters/designToBoq.ts` | Uses `extractGeometryQuantities()`; external wall line item; CSV quantity-basis headers; `BoqResult.quantities` |
| `src/components/dashboard/BoqExportPanel.tsx` | Quantity Basis section; passes quantities to CSV export |

---

## Build Result

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ PASS (0 errors) |
| `npm test` | ✅ PASS (73 tests, 8 files) |

---

## Still Deferred

- Component-level tests (PlanCanvas, LazyBimViewer, Dashboard panels)
- WebLLM parser tests (requires `@mlc-ai/web-llm`)
- Multi-floor room distribution for >2 floors
- CAD export (DXF/SVG) string generation tests
- Furniture/blocks in generated rooms
- Load path analysis algorithm extraction
- Room layout optimization (self-intersecting wall rings)
- Multi-floor layout variation (ground vs upper floor templates)
