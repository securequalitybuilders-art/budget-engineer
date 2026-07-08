# Stage 66 — Section Marker on the Interactive Plan

Continues from Stage 65. Brings the on-screen plan to parity with the export: the live
`CadPlanView` now draws the same dashed section line + A/B bubbles, driven by the shared
`sectionConfig`, so what you see while choosing the cut matches the dossier exactly.

## What shipped

- **`src/components/cad/CadPlanView.tsx`** — new `sectionMark?: SectionConfig | null` prop.
  When set it renders the section line:
  - **AA** → horizontal dashed line at the cut Y with "A" bubbles at both ends;
  - **BB** → vertical dashed line at the cut X with "B" bubbles.
  Uses the component's existing `px`/`py` mappers.
- **`src/routes/BimRoute.tsx`** — reads `sectionConfig` from the store and passes it to
  `CadPlanView`, so adjusting the Section panel's axis/slider updates the plan marker live.

## Coordinate parity (verified)

`CadPlanView` and `planSvg` share identical constants and mappers — `SCALE = 28`,
`PAD = 30`, `ox = -minX*SCALE + PAD`, `oy = -minY*SCALE + PAD`,
`px = x*SCALE + ox`, `py = h - (y*SCALE + oy)` — so the marker sits at the **same pixel
position** on screen and in the exported plan.

Sample export confirms placement: BB @ x=6 m → vertical dashed line at **x=198 px**
(= 6 × 28 + 30), "B" bubbles top/bottom, falling exactly on the central partition wall.
(`samples/plan-marker-AA.svg`, `samples/plan-marker-BB.svg`.)

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 166.80 kB (gzip 54.36), no 500 kB warning

## Honest scope note

The marker is presentational and follows the active floor; it's a single section line
(A or B) at a time, matching the current `sectionConfig`. Multiple simultaneous named
section lines remain a future step.

## Next candidates

1. **Multiple named section lines** (A–A, B–B, C–C) shown together on one plan.
2. **Slab edge & column formwork** for a fuller formwork takeoff.
3. **Click-on-plan to set the section line** (drag the cut directly in the plan).
