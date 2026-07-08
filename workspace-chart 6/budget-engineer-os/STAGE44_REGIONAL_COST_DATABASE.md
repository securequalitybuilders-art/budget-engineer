# Stage 44 — Editable Regional Material-Cost Database

Continues from Stage 43 (Load Combination Factors). Replaces the hard-coded BOQ
rate constants with structured, editable **rate cards per region & currency**, so
the same design can be priced for Zimbabwe (CWICR), South Africa, Kenya or a global
USD baseline — and every rate is overridable in the UI.

## What shipped

- **`src/lib/rateCard.ts`** — `RateCard` type + four presets:
  - **Zimbabwe (CWICR)** — USD (default)
  - **South Africa** — ZAR
  - **Kenya** — KES
  - **Global** — USD baseline
  - Each card carries material-aware rates (wall/beam/column × concrete/steel/timber),
    flat rates (slab, roof, opening, object, footing, rebar) and markups
    (contingency / fees / VAT). `cloneRateCard` for safe edits.
- **`src/engine/boqGenerator.ts`** — now takes `(bim, rateCard, rebarSpec)`; all rates
  and markups read from the card; BOQ `currency` comes from the card.
- **`src/lib/currency.ts`** — currency-code → symbol mapping; BOQ panel, KPI cards and
  cost chart are now currency-aware (R, KSh, $ …) and markup labels show the card's %.
- **`src/store/appStore.ts`** — `rateCard` state + `setRegion(id)` and `setRateCard(card)`
  actions; both re-run the BOQ through `regenAndPersist` (persist + audit log
  `REGION_CHANGED` / `RATE_CARD_UPDATED`).
- **`src/components/panels/RateCardPanel.tsx`** — region dropdown + editable inputs for
  material wall rates, slab/roof/rebar, and contingency/fees/VAT.

## Verified round-trip (real engine, same seed geometry)

| Region | Grand total |
|---|---|
| Zimbabwe (CWICR) | $53,086 USD |
| South Africa | R 974,171 ZAR |
| Kenya | KSh 6,987,106 KES |
| Global (USD baseline) | $56,484 USD |

Custom edit (ZW concrete wall $85 → $150): grand total **$53,085.60 → $65,141.28** ✓ —
rate edits propagate through quantities to the grand total, and the currency code flows
through to display.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 130.36 kB (gzip 43.18), no 500 kB warning

## Honest scope note

Regional presets are representative early-stage figures structured CWICR-style, not a
live market feed. They are fully editable, persisted to IndexedDB and audit-logged, so a
QS can tune them to a real tender. No FX conversion between currencies — each card is
priced natively in its own currency.

## Next candidates

1. **Footing sizing from design load** — use the Stage 43 ULS load to auto-size pad footings to a bearing capacity.
2. **Beam/column reinforcement schedules** — extend parametric rebar beyond slabs.
3. **CSV/PDF BOQ export honoring the active currency.**
