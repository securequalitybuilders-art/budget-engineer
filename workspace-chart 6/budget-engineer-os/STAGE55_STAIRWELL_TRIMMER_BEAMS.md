# Stage 55 — Trimmer Beams Around the Stairwell

Continues from Stage 54 (Stairwell Slab Void). Completes the stairwell detail: a slab
opening must be framed by **trimmer beams** along its edge, so the opening that *removed*
slab concrete now *adds* edge framing — the structural complement to the void.

## What shipped

- **`src/engine/bimGenerator.ts`** — the stairwell computation now keeps the actual
  stair blocks (not just their summed area). For each stairwell opening in a floor's
  slab it emits a **trimmer beam** BIM element:
  - `type: 'beam'`, `IfcBeam`, on the floor that contains the opening,
  - `length = 2 × (stair.width + stair.depth)` (the opening perimeter / edge framing),
  - metadata `role: 'stairwell-trimmer'` + `openingM2`.
  Because trimmers are `type: 'beam'`, they merge into the existing **Beams** BOQ
  category and are priced per metre via the rate card.

## Verified round-trip (real engine, two-storey seed; stair 1 × 3 m)

| Check | Result |
|---|---|
| Trimmer elements | 1, on **First Floor** (the opening's floor) ✓ |
| Trimmer length | 8 m = 2 × (1 + 3) ✓ |
| Beam length with trimmers | 88 m |
| Beam length no stair | 80 m |
| Trimmer adds | +8.00 m (exact) ✓ |
| Beam cost delta | $1,760.00 = 8 m × $220/m ✓ |

The stairwell is now consistent: **Stage 54 removes 3 m² of slab** (−$330 concrete + less
rebar) while **Stage 55 adds 8 m of trimmer beam** (+$1,760) — two independent, correct
effects both flowing into the BOQ.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 152.38 kB (gzip 49.94), no 500 kB warning

## Honest scope note

The trimmer length is the opening perimeter (a reasonable framing allowance), not a
detailed two-trimmer + two-header layout with connection design, and the trimmers
aren't drawn in the 2D plan/section yet. Early-stage quantity, consistent with the OS.

## Next candidates

1. **Draw trimmers/void in the plan & section** so the drawing matches the quantity.
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
