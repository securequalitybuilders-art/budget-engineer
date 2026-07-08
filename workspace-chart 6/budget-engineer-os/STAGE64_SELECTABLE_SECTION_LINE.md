# Stage 64 — Selectable Section Line

Continues from Stage 53/56 (Building Section). The section was a fixed A–A elevation
across the building width. Now the **cut line is selectable**: choose axis A–A
(looking North) or B–B (looking East) and slide the cut plane to any position, with the
section reflecting what's actually on that cut.

## What shipped

- **`src/lib/sectionSvg.ts`** — `buildSectionSvg(cad, titleMeta?, config?)` with
  `SectionConfig { axis: 'AA' | 'BB', position }`:
  - **AA** — horizontal extent = X, cut plane at a **Y** value (looking North);
  - **BB** — horizontal extent = Y, cut plane at an **X** value (looking East).
  - Generalised horizontal/plane coordinate accessors so slabs, walls, stair flight and
    stairwell gap all project onto the chosen axis.
  - **Only openings whose host wall lies within ±0.6 m of the cut plane** are drawn.
  - Header shows the section label, cut coordinate and viewing direction.
- **`src/components/cad/SectionView.tsx`** — A–A / B–B toggle + a cut-position slider
  bounded to the model extent on the relevant axis.

## Verified output (real engine, two-storey seed)

| Cut | Result |
|---|---|
| A–A @ Y=0 (south wall) | door marker shown (1 green); label "Section A–A", "cut @ Y=0.0" ✓ |
| A–A @ Y=8 (back) | 0 door markers — off-plane openings excluded ✓ |
| B–B @ X=6 | label "Section B–B", "looking East", "cut @ X=6.0" ✓ |
| Width is axis-aware | AA 416 px (12 m) vs BB 304 px (8 m) ✓ |

Both axes produce valid SVGs.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 164.58 kB (gzip 53.83), no 500 kB warning

## Honest scope note

The section remains a schematic projection (uniform external wall members, no interior
partition cut geometry), and the dossier still embeds the default A–A section — exporting
the user-selected cut into the dossier is a small follow-up. Opening on-plane test uses a
±0.6 m tolerance band.

## Next candidates

1. **Export the selected section into the dossier** (pass the chosen config through).
2. **Slab edge & column formwork** for a fuller formwork takeoff.
3. **Section line marker drawn on the plan** (show where A–A / B–B is cut).
