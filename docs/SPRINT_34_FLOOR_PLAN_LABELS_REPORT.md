# Sprint 34 — Make the 2D Floor Plan Readable

## Problem

After Sprint 33 made design option selection impossible to miss, users could
successfully select a design and reach the Design stage. However, the 2D floor
plan was functional but hard to read:

1. Room labels were a single line of low-contrast text (`rgba(255,255,255,0.5)`)
   with name and area concatenated on one line (e.g. "Lounge / Dining 22.0").
2. No distinction between room name and area — everything was the same size
   and color.
3. No overall building dimensions — only per-room dimensions cluttered the plan.
4. No indication that dimensions are in metres.
5. Area was computed inline (`room.width * room.height`) instead of reusing
   the `roomArea()` helper.

## What Changed

### RoomLabels.tsx (major rewrite)

**Before:**
```
┌──────────────────────┐
│                      │
│  Lounge / Dining 22.0│  ← single low-contrast line
│                      │
└──────────────────────┘
```

**After:**
```
┌──────────────────────┐
│                      │
│    Lounge / Dining   │  ← #e2e8f0 (Body Text), fontSize 0.30
│      22.0 m²         │  ← #94a3b8 (Muted Text), fontSize 0.22
│                      │
└──────────────────────┘
```

Specific changes:
- Room name rendered as a separate `<text>` element, centered in the room
  using `cx = room.x + room.width / 2` and `cy = room.y + room.height / 2`
- Area rendered as a second `<text>` element below the name, with a gap
- Uses `roomArea()` from `plan-geometry.ts` instead of inline multiplication
- Font sizes adapt: if `minDim < 1.2` (very small room), name is 0.18,
  area is 0.14; at `minDim < 2.0`, name 0.22 / area 0.16; otherwise
  name 0.30 / area 0.22
- Fallback label `Room N` (1-indexed) if `room.name` is empty/falsy
- `pointerEvents="none"` so labels don't interfere with editing

### DimensionLayer.tsx (replaced per-room with overall dimensions)

**Before:** Showed width and height for every room, creating visual clutter.

**After:** Shows overall building width along the top edge and overall height
along the left edge.

```
     8.4 m ←─────────────────→
    ┌─────────────────────────────┐
    │                             │
    │       (rooms with labels)   │
    │                             │
6.0 │                             │
 m  │                             │
    │                             │
    └─────────────────────────────┘
```

- Top dimension: dashed line from `x=0, y=-0.45` to `x=model.width, y=-0.45`
  with tick marks at both ends; label `{model.width.toFixed(1)} m` centered above
- Left dimension: dashed line from `x=-0.55, y=0` to `x=-0.55, y=model.height`
  with tick marks at both ends; vertically-oriented label using SVG `writingMode: "vertical-rl"`
- Consistent styling: `stroke="#94a3b8"`, `strokeDasharray="0.08 0.08"`

### PlanCanvas.tsx (caption addition)

Added "Dimensions in metres" text below the existing scale label in the
bottom-left SVG caption area.

## Files Added/Modified

| File | Change |
|------|--------|
| `src/components/cad/RoomLabels.tsx` | Two-line labels, `roomArea()` helper, adaptive font, room name fallback |
| `src/components/cad/DimensionLayer.tsx` | Overall width/height dimensions instead of per-room |
| `src/components/cad/PlanCanvas.tsx` | Added "Dimensions in metres" caption |
| `src/__tests__/floorPlanLabels.test.ts` | 8 new tests |
| `docs/SPRINT_34_FLOOR_PLAN_LABELS_REPORT.md` | This file |
| `CHANGELOG.md` | Sprint 34 entry |

## Tests Added

File: `src/__tests__/floorPlanLabels.test.ts` (8 tests)

- `model has rooms with names`
- `roomArea computes expected area matching room width × height`
- `each room has area > 0`
- `overall width and height dimension texts available from model`
- `footprintArea matches model width × height`
- `plan has scale label`
- `PlanCanvas dependencies: rooms, walls, openings all present`
- `room labels contain name and area in expected text format`

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (all pre-existing) |
| `npm test` | **263 passed** (22 files) |
| `npm run build` | 3389 modules, no errors |

## Remaining Limitations

1. **No text wrapping**: If a room name is very long (e.g. "Lounge / Dining"),
   it may overflow the room boundaries on narrow rooms. The adaptive font size
   helps for very small rooms but does not wrap text. A future sprint could
   add SVG `<text><tspan>` wrapping for long labels.

2. **DimensionLayer is SVG only**: The overall dimensions render inside the SVG
   viewport. If the plan is zoomed/panned, the dimension lines move with the
   plan. This is the expected behavior — dimensions are part of the plan, not
   the UI chrome.

3. **No React Testing Library**: The SVG label rendering is verified through
   model-level assertions rather than rendered DOM tests. The component
   structure is simple enough that the model tests cover the essential contract.
