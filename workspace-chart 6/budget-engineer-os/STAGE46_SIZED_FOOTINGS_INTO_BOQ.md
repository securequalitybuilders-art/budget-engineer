# Stage 46 — Feed Sized Footings into the BOQ

Continues from Stage 45 (Footing Sizing). Closes the structural→cost loop: the
load/soil-sized footing schedule now drives the **actual foundation concrete
volume** in the BOQ, instead of a fixed pad estimate (or no line item at all).

## What shipped

- **`src/engine/boqGenerator.ts`** — `generateBoqFromBim(bim, rateCard, rebarSpec, footingSchedule?)`.
  When a `FootingSchedule` (from `sizeFootings`) is supplied, the **Footings** line
  item is set from `schedule.totalVolumeM3` and described with the pad size + soil
  class (e.g. *"RC pad footings 1.55×1.55×0.55 m on Medium clay (150 kPa)"*),
  overriding any per-block fixed estimate.
- **`src/store/appStore.ts`** — `regenAndPersist` and `initialize` now build the
  schedule (`sizeFootings(bim, loadCombo, soil)`) and pass it into the BOQ.
  `setSoil` and `setLoadCombo` became async actions that re-run + persist the BOQ
  (audit logs `SOIL_CHANGED` / `LOAD_COMBO_CHANGED`), because they now affect cost.

## Verified round-trip (real engine, ULS combo)

| Soil | Footing volume | Footing cost | Grand total |
|---|---|---|---|
| Soft clay | 14.52 m³ | $5,518 | $60,192.26 |
| Medium | 5.28 m³ | $2,006 | $55,669.83 |
| Firm | 1.92 m³ | $730 | $54,025.32 |
| Rock | 0.76 m³ | $289 | $53,457.57 |

Before/after on the seed model: previously **no Footings line** (grand $53,085.60);
with the sized schedule the Footings line appears and the grand total rises to
$55,669.83 (medium). ✓ Softer soil → more concrete → higher cost, as expected.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 134.72 kB (gzip 44.32), no 500 kB warning

## Honest scope note

The foundation cost now reflects bearing-pressure-sized concrete volume across the
assumed/modelled pads. It still does not include excavation, blinding, formwork or
footing reinforcement as separate line items — those remain candidates for a later
foundation-detail stage.

## Next candidates

1. **Footing reinforcement** — add rebar tonnage for the pads (extends Stage 42 beyond slabs).
2. **Excavation & formwork line items** — fuller foundation takeoff.
3. **Currency-aware CSV/PDF BOQ export.**
