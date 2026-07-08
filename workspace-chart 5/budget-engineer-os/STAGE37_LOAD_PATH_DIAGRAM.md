# Stage 37 — Structural Load Path Diagram

## What was implemented

### 1. Force-flow arrow visualization in 2D CAD plan (`src/components/cad/CadPlanView.tsx`)
- Added a **Load Path** toggle checkbox in the drafting toolbar alongside Snap, Dims, and the structural generators.
- When enabled, renders a directed overlay of SVG arrows showing how structural forces travel through the building frame, using color-coded hierarchy markers:
  - **Red arrows** (`#ef4444`) — **Roof/Wall loads** → from structural wall midpoints toward the nearest column position. Represents gravity loads from roof and wall self-weight transferring into the vertical support system.
  - **Orange arrows** (`#f59e0b`) — **Beam transfer** → from link-beam midpoints to both column endpoints. Represents beam reactions distributing loads to supporting columns.
  - **Yellow arrows** (`#eab308`) — **Column axial** → from column center down to the associated pad footing center. Represents vertical load transfer into the foundation.
- Arrow markers are defined as SVG `<marker>` elements with `auto-start-reverse` orientation for crisp directional heads.
- The overlay group uses `opacity: 0.7` so it doesn't obscure the underlying geometry.

### 2. Structural hierarchy logic
- The arrow graph is computed live from the CAD document state:
  - **Walls**: Every structural wall (excluding beam IDs) finds its nearest column by Euclidean distance; draws an arrow from wall midpoint to that column.
  - **Beams**: Every `beam-` prefixed wall draws two arrows from its midpoint to its `start` and `end` endpoints (which correspond to column positions, since beams are generated between columns).
  - **Columns**: Every column searches for a footing block within `0.3 m` tolerance; draws a downward arrow to the footing center.
- This creates a complete visual chain: **Wall (red) → Beam (orange) → Column (yellow) → Footing (green dashed)**.

### 3. Integration with existing workflow
- No new domain types or store actions were needed — this is a pure visual overlay computed from existing CAD topology.
- The toggle is part of the standard drafting toolbar, so users can switch it on/off without changing tools.
- Fully compatible with all edit modes: drag, reshape, add, delete, trim/join.

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **153.17 kB** (gzip 46.11 kB) — only +2 kB from the arrow overlay
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, opt-in

## Visual semantics
| Arrow Color | Source | Target | Meaning |
|---|---|---|---|
| 🔴 Red | Structural wall midpoint | Nearest column | Roof/wall gravity load |
| 🟠 Orange | Beam midpoint | Column endpoints | Beam reaction distribution |
| 🟡 Yellow | Column center | Footing center | Axial load into foundation |
| 🟢 Green dashed | Footing spread | — | Ground bearing pressure |

The complete vertical load path is now visually readable in the 2D plan: **Roof → Walls → Beams → Columns → Footings → Ground**.

## Next candidates
1. **Slab reinforcement takeoff** — rebar tonnage from slab area and thickness (Y12 @ 200 c/c density).
2. **Structural steel / timber frame material switch** — toggle material system between concrete, steel, and timber, updating BOQ rates and IFC classes.
3. **Load magnitude labels** — annotate arrows with estimated kN values based on tributary area and material density.

Say **proceed** to continue, or name your priority.