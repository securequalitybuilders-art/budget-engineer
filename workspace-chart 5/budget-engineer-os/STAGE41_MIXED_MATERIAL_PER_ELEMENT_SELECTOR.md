# Stage 41 — Mixed-Material Per-Element Selector

## What was implemented

### 1. Per-element material override (`src/store/appStore.ts`)
- New action: `updateCadElementMaterial(elementId, material)` — updates the `metadata.material` and `ifcClass` of a single wall or column, regenerates BIM + BOQ, and logs `CAD_ELEMENT_MATERIAL_CHANGED`.
- The global `setMaterialSystem` no longer retroactively changes all elements. It now only sets the **default material for new elements** (walls, columns, beams, footings generated after the switch).
- New elements (added walls, auto-generated columns, beams, footings) inherit the current global `materialSystem` default.

### 2. Material selector in properties panel (`src/components/cad/CadPropertiesPanel.tsx`)
- When a **single wall** is selected, a compact **Concrete / Steel / Timber** button group appears below the Structural checkbox.
- When a **column (block)** is selected, the same material selector appears.
- The active material is highlighted with the Deep Cobalt `#1a365d` background.
- Clicking a material immediately calls `updateCadElementMaterial` and recalculates the BOQ.

### 3. Mixed-material BOQ engine (`src/engine/boqGenerator.ts`)
- Refactored to group structural elements by their `metadata.material`.
- For each material present in the model, separate BOQ line items are generated:
  - `concrete walling` @ $85/m²
  - `steel walling` @ $120/m²
  - `timber walling` @ $65/m²
  - `concrete beam grid` @ $220/m
  - `steel beam grid` @ $350/m
  - etc.
- Slabs and roof use the **dominant material** (material with the most wall area) for their rate table.
- Rebar remains material-independent (steel reinforcement is universal).

### 4. Per-element load computation (`src/components/cad/CadPlanView.tsx`)
- The load path diagram now reads each wall's **individual** `metadata.material` instead of the global default.
- A concrete wall uses density 25 kN/m³; a steel wall uses 0.5 kN/m³; a timber wall uses 6 kN/m³.
- This means load magnitude labels correctly reflect the actual material of each structural member.

### 5. Verified round-trip (live engine)

| Material | Wall Length | Rate | Expected Cost | Status |
|---|---|---|---|---|
| **Concrete** | 72 m² (3 walls) | $85/m² | $6,120 | ✓ |
| **Steel** | 24 m² (1 wall) | $120/m² | $2,880 | ✓ |
| **Timber** | 24 m² (1 wall) | $65/m² | $1,560 | ✓ |

Total mixed-material walls: **$10,560** (vs. $10,200 all-concrete)

Grand total with mixed frame: **$50,484.45**

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **163.46 kB** (gzip 48.32 kB)
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, opt-in

## Architecture note
The material system is now a **two-level hierarchy**:
- **Global default** (`materialSystem`) — applied to all new elements
- **Per-element override** (`metadata.material`) — applied to individual walls/columns

This enables realistic hybrid structural systems:
- Steel frame with concrete core
- Timber roof on masonry walls
- Concrete columns with steel beams
- Mixed-species timber framing

## Next candidates
1. **Rebar spec override** — allow Y10/Y16, different spacing, recalculated tonnage per slab
2. **Load combination factors** — toggle service loads vs. factored design loads (1.2G + 1.5Q)
3. **Material cost database** — editable rate tables per region/currency

Say **proceed** to continue, or name your priority.