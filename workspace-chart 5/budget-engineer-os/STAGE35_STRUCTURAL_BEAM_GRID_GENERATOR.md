# Stage 35 — Automated Structural Concrete Beam Grid Generator

## What was implemented

### 1. Structural beam generation engine (`src/engine/bimGenerator.ts`)
- The BIM generator now automatically extrudes structural wall elements as **beam entities** (`IfcBeam`) in addition to wall meshes. This captures the structural wall as a lintel/band beam for engineering takeoff.
- Base structural walls (perimeter + internal structural walls) contribute to the `Beams` BOQ category via total linear metres at `$220/m`.

### 2. Column-to-column link beam generator (`src/store/appStore.ts`)
- New action: `generateStructuralBeams(floorId)` — analyzes all structural columns (`kind: 'column'`) on a floor, identifies column pairs that are **not** already connected by a structural wall, and auto-generates link beams between them.
- Uses a deduplication key (`${start}->${end}`) so the same pair is never generated twice.
- Link beams are added to the CAD document as `CadWall` records with `id: beam-...`, `thickness: 0.25m`, `height: 0.35m` (typical RC beam), `structural: true`, and `metadata: { ifcClass: 'IfcBeam', category: 'Beam' }`.
- Routes through `persistCadAndRegen` to regenerate BIM + BOQ + persist to IndexedDB + log transaction: `CAD_STRUCTURAL_BEAMS_GENERATED`.

### 3. Interactive CAD plan rendering (`src/components/cad/CadPlanView.tsx`)
- Beams are rendered in the 2D plan with **cyan** color (`#06B6D4`) and thicker stroke (3px) so they are visually distinct from walls.
- Endpoint handles are suppressed for beams (beams are not endpoint-editable in this stage).
- Beams are included in the plan metadata footer count.

### 4. Properties panel CTA (`src/components/cad/CadPropertiesPanel.tsx`)
- When no element is selected, the panel shows **Generate Structural Frame** card with:
  - **🏛 Auto Columns** — generates columns at wall corners (Stage 30)
  - **🏗 Auto Beams** — generates link beams between columns (Stage 35)
- Beams button uses cyan background (`#06B6D4`) for high-visibility.

## Verified round-trip (live engine)

| Scenario | BOQ Grand Total | Beam Quantity | Status |
|---|---|---|---|
| Base (structural walls + columns) | `$49,665.28` | 40m (wall band beams) | Baseline ✓ |
| Add interior column (no link beams) | `$50,244.88` | 40m | +$580 (column object) ✓ |
| Add interior column + link beam | `$52,564.53` | 47.21m | +$2,320 (link beam) ✓ |

The beam category line item correctly calculates: `quantity × $220/m = total`.

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **148.26 kB** (gzip 45.19 kB)
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, not in critical path

## Architecture note
Beams are stored in the `walls[]` array of `CadDocument` with a `beam-` prefix ID. This is an intentional simplification: beams share the same geometric topology as walls (start/end vector, thickness, height), so they slot directly into the existing wall renderer, BIM extruder, and BOQ engine without duplicating the geometric pipeline. The BOQ category is split into `Beams` for procurement separation.

## Next candidates
1. **Structural slab reinforcement takeoff** — calculate rebar tonnage from slab area and thickness.
2. **Foundation pad footing generator** — auto-place pad footings under each column with spread dimensions.
3. **Load path diagram** — visual force-flow arrows from roof → beams → columns → footings.

Say **proceed** to continue, or name your priority.