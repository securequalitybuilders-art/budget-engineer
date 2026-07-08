# Step 4 — BOQ Engine Thin Slice Plan

Goal: turn generated `BuildingElement` quantities into BOQ line items using seeded Zimbabwe/CWICR-style rates, fully offline and deterministic.

## Scope
- Input: generated design options from `src/ai/designEngine.ts`
- Output: `BOQ` per design option with:
  - line items
  - quantity, unit, unit rate, amount
  - subtotal
  - contingency
  - professional fees
  - VAT
  - grand total
- Persistence: store BOQs in IndexedDB
- Audit: log BOQ generation in transaction history
- UI:
  - dashboard BOQ panel shows computed line items
  - design option selector can regenerate/select BOQ per option
  - summary cards for totals

## Domain assumptions
- Money stored as integer cents
- Rates stored as integer cents per unit
- Deterministic mapping from element category/type to rate code
- If no exact rate match exists, use category fallback and flag line item as estimated

## Core types
- RateCard
- BOQLineItem
- BOQ

## Pipeline
1. Read selected design option
2. Aggregate `BuildingElement[]`
3. Map each element to rate card entry
4. Compute amount = quantity × rate
5. Group into sections (substructure, superstructure, finishes, services, external)
6. Compute summary totals
7. Persist BOQ
8. Log transaction

## Next implementation files
- src/lib/money.ts
- src/domain/boq.ts
- src/engine/boqEngine.ts
- src/data/seedRates.ts
- src/store/appStore.ts
- src/routes/Dashboard.tsx
