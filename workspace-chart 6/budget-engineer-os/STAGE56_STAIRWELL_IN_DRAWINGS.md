# Stage 56 — Draw the Stairwell Void + Trimmers in the Plan & Section

Continues from Stage 54/55. Makes the **drawings match the quantities**: the stairwell
void (Stage 54) and its trimmer framing (Stage 55) are now drawn — the opening appears
on the floor *above* the stair in the plan, and the slab shows a gap with trimmer edges
in the section.

## What shipped

- **`src/lib/planSvg.ts`** — for the floor *above* a stair, draws the stairwell opening
  as a dashed amber rectangle with a diagonal and a "VOID" label (architectural
  convention: the void is shown on the floor above the stair). The stair itself still
  renders normally on its own floor.
- **`src/lib/sectionSvg.ts`** — the upper slab is split into left/right bands leaving a
  **gap over the stair**, with **cyan trimmer-beam markers** at each edge of the opening.

## Verified output (real engine, two-storey seed)

| Check | Result |
|---|---|
| Ground plan "VOID" | absent (stair is on this floor) ✓ |
| Upper plan "VOID" + dashed amber opening | present ✓ |
| Section slab gap + trimmer markers | upper slab split, 2 cyan trimmer markers ✓ |
| Section still valid SVG | ✓ |

Samples refreshed: `samples/demo-plan-upper.svg` (shows the void),
`samples/demo-section.svg`, `samples/demo-boq-dossier.html` (plans + section + BOQ all
consistent with the Stage 54 void and Stage 55 trimmers).

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 153.91 kB (gzip 50.27), no 500 kB warning

## Honest scope note

The void is drawn as the stair's plan footprint (axis-aligned), and the section gap/
trimmer markers are schematic indicators rather than detailed framing geometry. Drawing
and quantities now tell the same story, which is the goal of this stage.

## Next candidates

1. **Selectable section line** (A–A / B–B anywhere through the plan).
2. **Slab edge & column formwork** for a fuller formwork takeoff.
3. **Title block** on plans/section (project, scale, date, revision).
