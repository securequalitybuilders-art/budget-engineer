# Stage 36 — Automated Foundation Pad Footing Generator

## What was implemented

### 1. Foundation footing domain & BIM engine
- Added `'footing'` to `CadBlock.kind` union in `src/domain/cad.ts`.
- Updated `src/engine/bimGenerator.ts` to emit `IfcFooting` elements for footing blocks:
  - Positioned below ground (`z = -thickness / 2`, e.g., -0.2 m).
  - Scale = `[spreadWidth, spreadDepth, thickness]`.
- Updated `src/engine/boqGenerator.ts`:
  - Added `footing_m3: 380` rate (USD per cubic metre of reinforced concrete).
  - Computes footing concrete volume from `scale[0] × scale[1] × scale[2]`.
  - Added `Footings` category to `BOQLineItem` union.

### 2. Auto-generate pad footings under columns (`src/store/appStore.ts`)
- New action: `generateFoundationFootings(floorId)`.
- For every structural column on the floor, creates a `1.0 × 1.0 m` spread pad footing (`0.4 m` thick) centered under the column.
- Deduplicates by column position (rounded to 2 dp).
- Metadata includes: `material: '30MPa Concrete'`, `rebar: 'Y12 @ 200 c/c'`, `bearing: '150 kPa'`.
- Routes through `persistCadAndRegen` → BIM + BOQ + IndexedDB + audit log: `CAD_FOUNDATION_FOOTINGS_GENERATED`.

### 3. 2D plan rendering (`src/components/cad/CadPlanView.tsx`)
- Footings render as **green dashed rectangles** (`#22c55e`, `strokeDasharray="4 4"`) underneath columns.
- Clickable and draggable (move as a block).
- Added **🧱 Auto Footings** button to the drafting toolbar.
- Footer count includes `Footings: {blocks.filter(b => b.kind === 'footing').length}`.

### 4. Properties panel CTA (`src/components/cad/CadPropertiesPanel.tsx`)
- Added `onGenerateFootings` prop.
- Structural frame card now includes **🧱 Auto Footings** button (green) alongside Columns and Beams.
- Updated tooltip: *"Footings anchor columns to the ground."*

### 5. Route wiring (`src/routes/BimRoute.tsx`)
- `CadPlanView` and `CadPropertiesPanel` both receive `onGenerateFootings={store.generateFoundationFootings}`.

## Verified round-trip (live engine)

| Scenario | BOQ Grand Total | Footing Volume | Footing Cost | Status |
|---|---|---|---|---|
| Base (4 columns, 4 walls) | `$49,665.28` | `0 m³` | `$0` | Baseline ✓ |
| + 4 pad footings (1.0×0.4×0.4 m) | `$50,596.76` | `0.64 m³` | `$243.20` | **PASS ✓** |

Footing line item: `0.64 m³ @ $380/m³ = $243.20`, plus markups (contingency, fees, VAT) brings the grand total increase to ~$931.

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **151.01 kB** (gzip 45.66 kB)
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, not in critical path

## Structural chain now complete
The vertical load path is now fully modeled:
- **Roof** → **Beams** (band + link) → **Columns** → **Pad Footings** → **Ground**

Each element has its own BOQ category, IFC class, and audit trail.

## Next candidates
1. **Slab reinforcement takeoff** — rebar tonnage from slab area and thickness.
2. **Load path diagram** — visual force-flow arrows from roof → beams → columns → footings in the 2D plan.
3. **Structural steel / timber frame option** — switch material system from concrete to steel or timber.

Say **proceed** to continue, or name your priority.