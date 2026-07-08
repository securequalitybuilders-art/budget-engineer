# Stage 52 — Excavation & Formwork Line Items

Continues from Stage 49 (Footing Reinforcement). Rounds out the foundation takeoff
with the two remaining big-ticket sub-trades: **excavation** and **formwork**, both
derived from the Stage 45 sized footing schedule and priced via the regional rate card.

## What shipped

- **`src/domain/types.ts`** — added `Excavation` and `Formwork` to `BoqCategory`.
- **`src/lib/rateCard.ts`** — added `excavation_m3` and `formwork_m2` to every preset
  (ZW $18/$32, ZA R320/R580, KE KSh2300/KSh4100, Global $20/$35).
- **`src/lib/footingSizer.ts`** — `footingExcavationFormwork(schedule)`:
  - **Excavation** = each pit (pad + 0.30 m working margin per side) × depth
    (pad thickness + 0.15 m blinding/working allowance), summed.
  - **Formwork** = four vertical faces per pad = `4 × side × thickness`, summed.
- **`src/engine/boqGenerator.ts`** — emits `Excavation` (m³) and `Formwork` (m²) line
  items whenever a footing schedule is present.

## Verified round-trip (real engine, ULS)

| Soil | Excavation | Formwork |
|---|---|---|
| Soft clay | 57.97 m³ ($1,043) | 47.20 m² ($1,510) |
| Medium | 24.79 m³ ($446) | 23.52 m² ($753) |
| Firm | 11.47 m³ ($206) | 12.00 m² ($384) |
| Rock | 5.44 m³ ($98) | 5.88 m² ($188) |

Hand-check (medium, 2.1×2.1×0.7 m pads): excavation `4 × (2.70² × 0.85) = 24.79 m³`
= engine; formwork `4 × (4 × 2.1 × 0.7) = 23.52 m²` = engine — both exact. ✓
Currency-aware: South Africa applies 320 ZAR/m³ excavation. ✓

The BOQ now spans **10 categories**: Walls, Slabs, Roof, Openings, Objects, Beams,
Footings, Reinforcement, Excavation, Formwork.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 147.68 kB (gzip 48.71), no 500 kB warning

## Honest scope note

Excavation uses a uniform working-margin/depth allowance, not a cut/fill model or
disposal/cart-away; formwork covers the footing sides only (no slab edge/soffit
formwork yet). Early-stage takeoff allowances consistent with the rest of the OS.

## Next candidates

1. **Section / elevation view** showing the stacked storeys + stair vertically.
2. **Stair opening cuts the upper slab** (inter-floor coordination).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
