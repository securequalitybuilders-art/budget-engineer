# Stage 49 — Footing Reinforcement

Continues from Stage 46/48. Extends the parametric rebar engine (Stage 42) beyond
slabs to the **foundation pads**: each sized footing gets a two-way bottom mat, and
the tonnage flows into the BOQ Reinforcement category.

## What shipped

- **`src/lib/footingSizer.ts`** — `footingRebarTonnage(schedule, spec)`: sums the plan
  area of every pad (`sideM²`) and multiplies by the spec's `rebarKgPerM2` (the same
  two-way mat density used for slabs), returning tonnes.
- **`src/engine/boqGenerator.ts`** — when a footing schedule is present, adds a
  **Footing reinforcement** line item (`boq-footing-rebar`, category *Reinforcement*),
  described with the active rebar spec. It merges into the Reinforcement category total
  alongside the slab rebar.

## Verified round-trip (real engine, ULS, Y12@200×2 = 17.76 kg/m²)

| Soil | Pad plan area | Footing rebar | Reinforcement total | Grand total |
|---|---|---|---|---|
| Soft clay | 19.36 m² | 0.34 t ($408) | $2,454 | $60,717.77 |
| Medium | 9.61 m² | 0.17 t ($204) | $2,250 | $55,932.58 |
| Firm | 4.84 m² | 0.09 t ($108) | $2,154 | $54,164.43 |
| Rock | 2.56 m² | 0.05 t ($60) | $2,106 | $53,534.85 |

Hand-check (medium): `9.61 m² × 17.76 kg/m² ÷ 1000 = 0.171 t`; engine = 0.17 t — exact match. ✓
Softer soil → bigger pads → more footing rebar, and the Reinforcement category now
combines slab + footing mats. Changing the Stage 42 spec (Y10/Y12/Y16, spacing, layers)
also rescales footing rebar.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 144.83 kB (gzip 47.65), no 500 kB warning

## Honest scope note

This is a two-way bottom-mat allowance sized by area × mesh density — it does not do
bending design, development length, top steel or starter bars. It is an early-stage
takeoff allowance consistent with the rest of the OS, clearly tied to the parametric spec.

## Next candidates

1. **Multi-floor support** — storeys in the model + a plan section per floor in the dossier.
2. **Excavation & formwork** line items for a fuller foundation takeoff.
3. **Beam/column reinforcement** schedules.
