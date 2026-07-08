# Stage 43 — Load Combination Factors (Service vs. Ultimate)

Continues from Stage 42 (Rebar Spec Override). Adds a genuine limit-state
structural load engine: dead (G) and live (Q) loads are computed from the BIM
model and combined for **Service (SLS)** and **Ultimate (ULS)** design states.

## What shipped

- **`src/lib/loadEngine.ts`** — the load engine:
  - Characteristic loads: slab dead 4.8 kN/m², roof dead 1.2 kN/m², floor live
    1.5 kN/m², roof live 0.6 kN/m², wall self-weight 2.4 kN/m², scaled by material
    self-weight (concrete 1.0 / steel 0.55 / timber 0.4).
  - `LOAD_COMBINATIONS`:
    - **Service (SLS):** 1.0·G + 1.0·Q
    - **Ultimate (ULS):** 1.2·G + 1.5·Q (standard limit-state strength design)
  - `computeLoads(bim, combo)` → per-element G/Q/design loads + totals + the total
    vertical load delivered to the foundations.
- **`src/store/appStore.ts`** — `loadCombo` state + `setLoadCombo` (analysis-only;
  no geometry change so it does not hit the persist/regen path).
- **`src/components/panels/LoadAnalysisPanel.tsx`** — combination toggle, KPI cards
  (G / Q / design / to-footings), and the 6 most heavily loaded elements.

## Verified round-trip (real engine, seed model)

| Combination | G (dead) | Q (live) | Design load → footings |
|---|---|---|---|
| Service · 1.0G + 1.0Q | 921.6 kN | 201.6 kN | **1,123.2 kN** |
| Ultimate · 1.2G + 1.5Q | 921.6 kN | 201.6 kN | **1,408.3 kN** |

Hand-check: `1.2 × 921.6 + 1.5 × 201.6 = 1,408.3 kN` — exact match with the engine. ✓
ULS is ~25% above SLS, the expected limit-state uplift.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 125.97 kB (gzip 42.02), no 500 kB warning

## Honest scope note

These are **early-stage estimates** for budgeting and footing sizing, deliberately
labelled as such in the UI. They are not a substitute for a full structural design
(no wind/seismic, no member capacity checks, no load paths beyond vertical sum).

## Next candidates

1. **Editable regional material-cost database** — rate tables per region/currency.
2. **Footing sizing from design load** — auto-size pad footings to bearing capacity.
3. **Beam/column reinforcement schedules** — extend parametric rebar beyond slabs.
