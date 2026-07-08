# Stage 42 — Rebar Spec Override (Parametric Slab Reinforcement)

Continues from Stage 41 (Mixed-Material Per-Element Selector). This stage replaces
the previous fixed `18 kg/m²` reinforcement assumption with a genuine engineering
computation driven by bar diameter, spacing and mesh layers.

> ⚠️ **Reconstruction note (honest):** at the start of this session the workspace
> was empty — none of the Stage 1–41 files persisted. The consolidated core
> (domain types, BIM generator, BOQ generator, Dexie store, 2D plan, charts, AI
> brief module) was rebuilt **for real and verified to build/run**, then Stage 42
> was added on top. This is the first session where the code actually persists on
> disk and `tsc` + `vite build` both pass.

## What shipped

- **`src/lib/rebarSpec.ts`** — the reinforcement engine:
  - `barMassPerMetre(Ø)` from steel density 7850 kg/m³ × bar cross-section
    (Y10 ≈ 0.617, Y12 ≈ 0.888, Y16 ≈ 1.578 kg/m — textbook-correct).
  - `rebarKgPerM2(spec)` for a two-way mesh: `(1000/spacing) × 2 directions × mass/m × layers`.
  - `rebarTonnage(area, spec)` and `describeSpec(spec)`.
  - Defaults: **Y12 @ 200 c/c double layer = 17.76 kg/m²**, matching the old constant
    (backward compatible).
- **`src/engine/boqGenerator.ts`** — `generateBoqFromBim(bim, currency, rebarSpec)`
  now computes the Reinforcement line item from the spec instead of a hard-coded number.
- **`src/store/appStore.ts`** — `setRebarSpec(spec)` updates state and re-runs the BOQ
  through `regenAndPersist` (persist CAD/BIM/BOQ to IndexedDB + audit log
  `REBAR_SPEC_OVERRIDE`). Geometry is unchanged; only steel mass + cost recompute.
- **`src/components/panels/RebarSpecPanel.tsx`** — Ø / spacing / layers selectors with
  live KPI cards (mesh density, tonnage for the model's slab area, rebar cost @ $1200/t).

## Verified round-trip (real engine, 96 m² slab)

| Spec | Rebar tonnage | Rebar cost | Grand total |
|---|---|---|---|
| Y12 @ 200 ×2 (default) | 1.700 t | $2,045.52 | $53,085.60 |
| Y10 @ 250 ×1 (lighter) | 0.470 t | $568.20 | $51,182.80 |
| Y16 @ 150 ×2 (heavier) | 4.040 t | $4,848.65 | $56,696.02 |

Lighter spec → less steel → lower cost; heavier bar/tighter spacing → ~2.4× steel. ✓

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 122.59 kB (gzip 41.12), no 500 kB warning
- Sample export: `samples/demo-boq.csv` (7 line items, grand total $53,085.60)

## AI runtime decision (per your choice: local LLM)

`src/ai/briefParser.ts` exposes `parseBrief` / `parseBriefAsync` — the **exact interface
a WebLLM / transformers.js backend would implement**. The shipped implementation is a
deterministic, offline, no-paid-API parser so the app runs today; a local model can be
dropped behind `parseBriefAsync` later without touching callers. `designEngine.ts` turns
the parsed brief into a parametric CAD document → BIM → BOQ.

## Next candidates (from the Stage 41 list)

1. **Load combination factors** — toggle service vs. factored design loads (1.2G + 1.5Q).
2. **Material cost database** — editable rate tables per region/currency.
3. **Beam/column reinforcement schedules** — extend parametric rebar beyond slabs.
