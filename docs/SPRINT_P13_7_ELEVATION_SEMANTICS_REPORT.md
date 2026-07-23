# SPRINT P13.7 — Elevation & Section Semantics / Façade Articulation

**Status:** Complete  
**Date:** 2026-07-23  
**Engine:** `elevationEngine.ts` (add-on, legacy fallback preserved)

## Summary

Elevations upgraded from flat rectangles with generic openings to architecturally meaningful façade compositions derived from actual room data. The enhanced engine (`computeEnhanced*`) runs first; if it returns `null`, the legacy engine (`compute*` from `planToElevations`) serves as fallback — zero downstream breakage.

## New Features

### Room Classification (`classifyRoom`)
11 room functions derived from name keywords:
- `bedroom`, `bathroom`, `kitchen`, `living`, `dining`, `entrance`, `prayer`, `study`, `utility`, `circulation`, `unknown`

### Structural Bay Detection (`deriveStructuralBays`)
Vertical rhythms extracted from room X-boundaries. Each bay carries the name of the room it belongs to. Used to generate vertical grid lines on the elevation.

### Opening Families (`classifyOpening`)
Opening type derived from room context:
- **main-entry**: entrance rooms or doors ≥ 1.2m wide
- **secondary-entry**: utility/bathroom or narrow doors
- **sliding**: windows ≥ 2.0m wide
- **louver**: bathroom/utility windows
- **casement**: standard windows in living/dining

### Opening-to-Room Mapping (`findOpeningHostRoom`)
Maps each opening to its nearest room via wall midpoint, enabling room-contextual opening treatment.

### Dimension Formatting (`formatDimMm`)
Converts raw metres (`35.512`) to spaced mm notation (`"35 512"`).

### Level Formatting (`formatLevel`)
Converts elevation to professional notation: `0 → "±0.000"`, `3 → "+3.000"`, `-1.5 → "-1.500"`.

## Façade Zones (Front & Side Elevations)

| Zone | Colour | Description |
|------|--------|-------------|
| Plinth | `#d6cfc4` stone fill, `#a8a29e` stroke | 0.3m base band per storey |
| DPC | `#dc2626` red dashed line | At 0.18m above plinth base (ground floor) |
| Wall zone | `#f8fafc` linework | Room-derived structural bay lines |
| Fascia | `#e7e5e4` board fill | 0.12m band at eave level |
| Door (main) | `#d4a574` panel + `#92400e` frame | Centre line for double-leaf |
| Door (secondary) | Amber translucent | Same frame/threshold detail |
| Threshold | `#a8a29e` | 0.04m strip at door bottom |
| Window glass | `#7dd3fc` pane + `#0284c7` frame | Sill/head bands `#a8a29e` |
| Window mullions | Vertical frame lines | For openings > 1.5m wide |

## Section A-A Features

- **Floor slabs**: `#c8bdb0` fill with screed line and ceiling indicator
- **Cut walls**: `#e8e0d0` fill with diagonal hatch lines
- **Foundation footings**: `#6b7280` fill with "FOOTING" annotation
- **Room labels**: Room name centered in cut-through space
- **Rafters**: 4 rafter lines above gable (light opacity)
- **Ground hatching**: Sub-grade terrain indication
- **Level markers**: `formatLevel()` at each floor + ridge

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `classifyRoom` | 8 | ✅ Pass |
| `deriveStructuralBays` | 5 | ✅ Pass |
| `classifyOpening` | 6 | ✅ Pass |
| `findOpeningHostRoom` | 3 | ✅ Pass |
| `formatDimMm` | 4 | ✅ Pass |
| `formatLevel` | 3 | ✅ Pass |
| `computeEnhancedFrontElevation` | 14 | ✅ Pass |
| `computeEnhancedSideElevation` | 5 | ✅ Pass |
| `computeEnhancedSection` | 8 | ✅ Pass |
| Regression (extra) | 4 | ✅ Pass |
| **Total** | **60** | **✅ All Pass** |

### Existing test suites (regression)
- `planToElevations.test.ts`: 31 ✅
- `p13_7.test.ts` (SVG pipeline): 70 ✅

## Files

| File | Action | Lines |
|------|--------|-------|
| `src/adapters/elevationEngine.ts` | Created (replaced stubs) | ~296 |
| `src/__tests__/elevationEngine.test.ts` | Created | ~444 |
| `src/components/drawings/DrawingsPanel.tsx` | Already wired (enhanced + fallback) | — |
| `src/components/drawings/ElevationView.tsx` | Already compatible with `ElevationDrawing` | — |
| `docs/SPRINT_P13_7_ELEVATION_SEMANTICS_REPORT.md` | Updated | This file |

## Conformance

- ✅ ADDITIVE: Legacy engine preserved as fallback
- ✅ NULL-SAFE: Enhanced returns `null` → legacy used
- ✅ Same `ElevationDrawing` interface — zero downstream changes
- ✅ `formatDimMm("35 512")` replaces raw metres
- ✅ `formatLevel("±0.000")` replaces `.toFixed(3)`
- ✅ Room classification is keyword-based, not hardcoded
