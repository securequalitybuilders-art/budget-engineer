# Stage 45 — Footing Sizing from Design Load

Continues from Stage 44 (Regional Cost Database) and connects Stage 43's load
engine to the foundations: pad footings are now **sized** from the ULS design load
and the soil's allowable bearing capacity, instead of a fixed pad volume.

## What shipped

- **`src/lib/footingSizer.ts`** — the sizing engine:
  - `SOIL_TYPES`: soft clay 75 kPa · medium 150 kPa · firm 300 kPa · weathered rock 600 kPa.
  - `sizeFootings(bim, combo, soil)`:
    - shares the total ULS/SLS vertical load (`computeLoads(...).foundationDesignKn`)
      equally over the modelled columns (or 4 corner pads if none yet),
    - required area `A = N* / q_allow`,
    - side `L = ceil(√A)` rounded up to a 50 mm module, min 600 mm,
    - thickness ≈ `L / 3`, min 300 mm,
    - reports volume and bearing utilisation per pad.
- **`src/store/appStore.ts`** — `soil` state + `setSoil` action (analysis-only;
  shares the existing `loadCombo`).
- **`src/components/panels/FootingSizingPanel.tsx`** — soil selector, KPI cards
  (columns / load-per-pad / pad size / total concrete), the footing schedule table
  with utilisation, and an over-utilisation warning.

## Verified round-trip (real engine, ULS = 1,408.3 kN over 4 pads → 352.1 kN/pad)

| Soil | q (kPa) | Req. area | Pad size | Thk | Util. | Total concrete |
|---|---|---|---|---|---|---|
| Soft clay | 75 | 4.69 m² | 2.2×2.2 m | 0.75 m | 97% | 14.52 m³ |
| Medium clay / loose sand | 150 | 2.35 m² | 1.55×1.55 m | 0.55 m | 98% | 5.28 m³ |
| Firm / dense sand | 300 | 1.17 m² | 1.1×1.1 m | 0.40 m | 97% | 1.92 m³ |
| Weathered rock | 600 | 0.59 m² | 0.8×0.8 m | 0.30 m | 92% | 0.76 m³ |

Hand-check (medium): `352.1 / 150 = 2.347 m²` required; engine = 2.35 m², provided
1.55 m side = 2.40 m² ≥ required ✓. Service vs Ultimate: SLS 281 kN → 1.4 m pad,
ULS 352 kN → 1.55 m pad (ULS correctly larger). ✓

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 134.10 kB (gzip 44.17), no 500 kB warning

## Honest scope note

This is a **bearing-pressure sizing** for early-stage budgeting and concrete takeoff —
it does not perform punching-shear, bending-reinforcement, settlement or eccentric-load
checks, and it shares load equally rather than by tributary area. Clearly labelled in the UI.

## Next candidates

1. **Feed sized footings into the BOQ** — replace the fixed pad volume with the schedule total.
2. **Beam/column reinforcement schedules** — extend parametric rebar beyond slabs.
3. **Currency-aware CSV/PDF BOQ export.**
