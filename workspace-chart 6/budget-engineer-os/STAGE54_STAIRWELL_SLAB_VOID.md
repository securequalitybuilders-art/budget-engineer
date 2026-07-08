# Stage 54 — Stair Opening Cuts the Upper Slab

Continues from Stage 50/53 (Multi-Floor + Section). Adds the first genuine
**inter-floor coordination**: a stair rises into the floor above, so it cuts a
stairwell void in that floor's slab — correctly reducing the slab area, rebar and
cost in the BOQ. Geometry on one floor now affects quantities on another.

## What shipped

- **`src/engine/bimGenerator.ts`** — for each floor's slab, the generator finds any
  **stair blocks on the floor below** and subtracts their footprint from the slab area:
  `slabArea = footprint − Σ(stair.width × stair.depth)`. The void is recorded in the
  slab's BIM metadata (`stairwellVoidM2`). The roof remains full footprint (no void).

## Verified round-trip (real engine, two-storey seed; stair 1 × 3 m on ground)

| Slab | Area | Void |
|---|---|---|
| Ground Floor | 96.00 m² | 0 |
| First Floor | 93.00 m² | 3.00 m² (stairwell) |

BOQ slab quantity: **189 m²** with the stairwell vs **192 m²** without — a 3 m²
reduction ($330 less slab concrete, and the void also reduces slab reinforcement
because rebar is computed from slab area). Grand total correctly lower with the
stairwell: **$104,617.51** vs $104,970.34. ✓

Because the slab rebar takeoff (Stage 39/42) reads slab area, the stairwell void
flows through to **both** the concrete and the reinforcement lines automatically.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 151.97 kB (gzip 49.87), no 500 kB warning

## Honest scope note

The void is a simple footprint subtraction (axis-aligned, no trimmer-beam framing
around the opening, and the section drawing still shows the slab as a continuous band).
It's an early-stage quantity correction, not a detailed slab-opening design.

## Next candidates

1. **Trimmer beams around the stairwell** — add framing + quantity for the opening edge.
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
