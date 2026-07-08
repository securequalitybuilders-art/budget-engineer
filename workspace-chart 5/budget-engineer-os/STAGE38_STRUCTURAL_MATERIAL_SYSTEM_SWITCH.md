# Stage 38 — Structural Material System Switch

## What was implemented

### 1. Global material system state (`src/store/appStore.ts`)
- Added `materialSystem: 'concrete' | 'steel' | 'timber'` to the store state (default `'concrete'`).
- New action: `setMaterialSystem(system)` — updates all structural elements' `metadata.material` and regenerates the BIM + BOQ pipeline with material-specific rates. Audit-logged as `CAD_MATERIAL_SYSTEM_CHANGED`.

### 2. Material-specific BOQ rate engine (`src/engine/boqGenerator.ts`)
- Replaced flat rates with a `materialRates` lookup table keyed by material.
- The BOQ generator reads `material` from the first BIM element with metadata, then applies the appropriate rate table:

| Material | Walls ($/m²) | Slabs ($/m²) | Roof ($/m²) | Columns ($/ea) | Beams ($/m) | Footings ($/m³) |
|---|---|---|---|---|---|---|
| **Concrete** | 85 | 110 | 75 | 450 | 220 | 380 |
| **Steel** | 120 | 140 | 95 | 680 | 350 | 280 |
| **Timber** | 65 | 85 | 55 | 320 | 180 | 450 |

- BOQ line item descriptions now prefix the material (e.g. *"steel beam grid"*, *"timber columns & pilasters"*).

### 3. Material-aware 2D plan rendering (`src/components/cad/CadPlanView.tsx`)
- Structural walls and columns now render in material-specific colors:
  - **Concrete**: `#1a365d` (deep cobalt)
  - **Steel**: `#64748b` (cool grey)
  - **Timber**: `#a0522d` (sienna brown)
- Added a **Concrete / Steel / Timber** toggle button group in the drafting toolbar (right-aligned, compact).
- The material switch is bidirectional: the local UI state syncs with the store prop, and clicking a material calls `onSetMaterialSystem` to update the global project state.

### 4. Verified round-trip (live engine)

| Material | Grand Total | Wall Rate | Cost Impact |
|---|---|---|---|
| **Concrete** | $47,346.88 | $85/m² | Baseline ✓ |
| **Steel** | $65,636.48 | $120/m² | +39% higher ✓ |
| **Timber** | $36,630.72 | $65/m² | -23% lower ✓ |

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **155.30 kB** (gzip 46.65 kB) — only +2 kB for material toggle
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, opt-in

## Architecture note
The material system is stored in `CadWall`/`CadBlock` `metadata.material` and propagated through the BIM generator into `BimElement.metadata.material`. The BOQ engine is the consumer that reads this material and switches rate tables. This keeps the material decision close to the source geometry and allows mixed-material projects in the future (e.g., steel beams + timber walls).

## Next candidates
1. **Slab reinforcement takeoff** — rebar tonnage from slab area and thickness (Y12 @ 200 c/c density).
2. **Load magnitude labels** — annotate load-path arrows with estimated kN values based on tributary area and material density.
3. **Mixed-material per-element selector** — allow individual walls/columns to override the global material system.

Say **proceed** to continue, or name your priority.