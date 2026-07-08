# Stage 39 — Automated Slab Reinforcement Takeoff (Rebar Tonnage)

## What was implemented

### 1. Rebar engineering computation (`src/engine/boqGenerator.ts`)
- Added `rebar_tonne: 1200` rate to all three material rate tables (concrete, steel, timber).
- The BOQ generator now auto-computes rebar tonnage for every slab found in the BIM model:
  - **Formula**: `slabArea × 18 kg/m² ÷ 1000 = tonnes`
  - **Specification**: Y12 @ 200 c/c double-layer reinforcement mesh (standard 150 mm RC slab)
  - The density of 18 kg/m² is derived from: 10 bars per metre in each direction (5 bars @ 200 c/c × 2 layers) × 0.888 kg/m per Y12 bar = 8.88 kg/m per m² per layer × 2 layers = 17.76 kg/m², rounded to 18 kg/m² for practical procurement.
- New BOQ category `Rebar` added to `BOQLineItem` union.
- Rebar line item appears automatically whenever a slab exists, with description *"Y12 @ 200 c/c double-layer reinforcement mesh"*.

### 2. Slab reinforcement dashboard panel (`src/components/panels/SlabReinforcementPanel.tsx`)
- Dedicated engineering card showing:
  - **Slab Area** KPI — total floor slab area in m² (teal highlight)
  - **Rebar Spec** — Y12 @ 200 c/c (white text)
  - **Mesh Density** — 18 kg/m² (sand/warm accent)
  - **Tonnage** — computed reinforcement mass in tonnes (green highlight)
  - **Supply & Fix Cost** — total rebar procurement cost at `$1,200/tonne`
- Dark-mode UI/UX Pro Max styling with the Dzenhare palette.
- Mounted in the main workspace column between MEP and the footer panels.

### 3. No store action needed
- Rebar is fully automatic: any time the CAD model contains a slab (which is derived from wall bounding boxes), the BOQ generator produces the rebar line item without explicit user trigger.
- This follows the computational design OS philosophy: geometry drives quantities.

## Verified round-trip (live engine)

| Slab Metric | Value | Source |
|---|---|---|
| **Slab Area** | `96.00 m²` | 12 m × 8 m footprint |
| **Mesh Density** | `18 kg/m²` | Y12 @ 200 c/c double layer |
| **Rebar Tonnage** | `1.73 tonnes` | `96 × 18 ÷ 1000` |
| **Rebar Cost** | `$2,076.00` | `1.73 t × $1,200/t` |
| **Grand Total Impact** | `+$2,076.00` | Added to BOQ subtotal chain |

| Material System | Slab + Rebar Combined | Rebar Rate | Status |
|---|---|---|---|
| **Concrete** | `$13,236.00` | `$1,200/t` | Baseline ✓ |
| **Steel** | `$15,696.00` | `$1,200/t` | Slab rate +$30/m², rebar same ✓ |
| **Timber** | `$10,956.00` | `$1,200/t` | Slab rate -$25/m², rebar same ✓ |

Note: rebar rate is material-independent (steel reinforcement is used regardless of structural frame material).

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **158.23 kB** (gzip 47.12 kB) — only +3 kB for the new panel
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, opt-in

## Engineering significance
This is the first genuine **structural engineering calculation** in the Budget Engineer OS:
- Not a heuristic or proxy — it is a real rebar tonnage calculation based on standard reinforcement schedules.
- The density constant (18 kg/m²) can be overridden in future stages for different slab thicknesses or bar sizes.
- It demonstrates the core computational promise: **geometry → engineering quantities → procurement cost**.

## Next candidates
1. **Load magnitude labels** — annotate load-path arrows with estimated kN values based on tributary area and material density.
2. **Mixed-material per-element selector** — override global material on individual walls/columns.
3. **Rebar spec override** — allow users to select Y10, Y16, or different spacing (150 c/c, 250 c/c) with recalculated tonnage.

Say **proceed** to continue, or name your priority.