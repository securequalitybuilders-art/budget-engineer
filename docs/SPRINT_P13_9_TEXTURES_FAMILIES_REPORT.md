# P13.9 — Material Textures, Window Families, Window Hoods & Stair Geometry

**Sprint:** P13.9
**Branch:** test/deploy-workflow
**Date:** 2026-07-23

---

## Files Changed

| File | Status |
|------|--------|
| `src/adapters/materialTextures.ts` | **Created** |
| `src/adapters/elevationEngine.ts` | **Modified** |
| `src/__tests__/materialTextures.test.ts` | **Created** |

---

## What Was Implemented

### 1. `src/adapters/materialTextures.ts` — Texture & Detail Module

A pure-function module generating SVG primitives for architectural details:

| Function | Purpose |
|----------|---------|
| `renderBrickCoursing` | Staggered brick coursing with horizontal bed joints + vertical perp-ends |
| `renderStonePlinth` | Stone texture with random-width vertical joints per course |
| `renderLouverWindow` | Louver window with horizontal slats + centre mullion |
| `renderClerestoryWindow` | Window with separate upper (lighter) and lower panes |
| `renderTransomWindow` | Window with transom bar + vertical mullions below |
| `renderGroupedWindow` | Multi-pane ribbon window with shared frame |
| `renderArchedWindow` | Semi-circular arched window with keystone |
| `renderWindowHood` | Angled shading hood with ornamental brackets |
| `renderStairSection` | Zigzag tread/riser + stringer + annotation |
| `renderParapetCoping` | Flat roof parapet coping with drip detail |
| `renderTimberBeam` | Timber beam with diagonal hatch |

All functions return `TextureResult { lines, rects, polygons, texts }` for composability.

### 2. `src/adapters/elevationEngine.ts` — Integration

**Front Elevation (`computeEnhancedFrontElevation`):**
- Brick coursing applied across full wall area
- Stone texture replaces solid plinth fill
- Window family dispatching: `louver` → `renderLouverWindow`, `sliding` → `renderGroupedWindow`, wide windows → `renderTransomWindow`, living/dining → `renderClerestoryWindow`
- Window hoods added for living/dining rooms and main-entry doors
- DPC line preserved

**Side Elevation (`computeEnhancedSideElevation`):**
- Brick coursing applied across wall area

**Section (`computeEnhancedSection`):**
- Brick coursing applied as wall background
- Stair geometry inserted for circulation rooms (e.g., stair, corridor)
- Parapet coping added for flat-roof typologies (`style.hasParapet`)

### 3. `src/__tests__/materialTextures.test.ts` — 30 Tests

- Brick: horizontal lines, vertical perp-ends, zero-area edge
- Stone: rect fill, joint lines
- Louver: glass rect, centre mullion, horizontal slats
- Clerestory: two panes, divider, lighter upper pane
- Transom: two rects, mullions below transom
- Grouped: correct pane count, mid line
- Arched: arch polygon, keystone
- Hood: width overhang, bracket shapes
- Stair: tread count, stringer, riser annotation
- Parapet: dashed centre line
- Timber beam: rect + hatch

---

## Integration with Existing Architecture

- `materialTextures.ts` imports types from `planToElevations.ts` — no new type dependencies
- `elevationEngine.ts` already exports `classifyOpening` → `OpeningFamily` which maps to texture functions
- All existing tests unchanged; 469 tests across 10 files pass
- TypeScript: zero new type errors

---

## Regression Verification

```
Test Files  10 passed (10)
     Tests  469 passed (469)
```

- `elevationEngine.test.ts` — 87 tests pass
- `facadeStyle.test.ts` — 27 tests pass
- `materialTextures.test.ts` — 30 tests pass
- `planToElevations.test.ts` — 86 tests pass
- `planTo3d.test.ts` — 3 tests pass
- `svgElevationWiring.test.ts` — 2 tests pass
- `p13_7.test.ts` — 16 tests pass
- `p13_8.test.ts` — 103 tests pass
- `p13_9.test.ts` — 85 tests pass
- `p13_9_extension.test.ts` — 130 tests pass

---

## Next Steps

- P13.10: Column rhythms, structural grid overlay, elevation reference engine integration
- P13.11: Section detailing — foundation types, roof build-up, beam/column annotations
