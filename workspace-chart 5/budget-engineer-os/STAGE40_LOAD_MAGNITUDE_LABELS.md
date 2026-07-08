# Stage 40 — Load Magnitude Labels on Structural Load Path Diagram

## What was implemented

### 1. Engineering load computation engine (`src/components/cad/CadPlanView.tsx`)
- Added material density constants (kN/m³):
  - **Concrete**: 25 kN/m³
  - **Steel**: 0.5 kN/m³ (light-gauge frame, negligible)
  - **Timber**: 6 kN/m³
- **Roof dead load** per material:
  - Concrete: 25 × 0.15 m = 3.75 kN/m²
  - Steel: 2.5 kN/m² (composite deck)
  - Timber: 6 × 0.15 m = 0.9 kN/m²
- **Live load**: 1.5 kN/m² (residential)
- **Wall self-weight**: `density × thickness × height` (kN/m)
- **Tributary width**: computed as half the perpendicular distance to the nearest parallel wall (one-way slab assumption)
- **Wall total load**: `roof load (dead + live) × tributary width × wall length + self-weight × wall length`

### 2. Hierarchical load accumulation (`useMemo`)
- **`wallLoads`** — individual structural wall loads (kN)
- **`colWallLoads`** — sum of wall loads assigned to each column by nearest-neighbor proximity
- **`beamLoads`** — average of the two column wall loads at the beam endpoints (simplified transfer)
- **`colTotalLoads`** — column wall loads + half of each connected beam load (final axial load)

### 3. Annotated SVG arrows with kN labels
- Every load path arrow now carries a **small dark label badge** with the estimated load in kN:
  - **Red arrows** (wall → column): wall total load in kN
  - **Orange arrows** (beam → column): beam transfer load in kN
  - **Yellow arrows** (column → footing): final column axial load in kN
- Labels use `rect` backgrounds with `#0b1220` fill and `opacity: 0.85` for readability over the plan geometry.
- Text is color-matched to the arrow (red/orange/yellow) with bold 8px font.

### 4. Material-aware load scaling
- The load computation uses the active `materialSystem` (concrete/steel/timber) so switching materials recalculates all loads instantly.
- Steel frames show dramatically lower wall loads (light-gauge framing).
- Timber frames show intermediate loads with lighter roof dead load.

## Example load estimates (concrete, 12 m × 8 m footprint)

| Element | Tributary Width | Roof Load | Self-Weight | Total Load |
|---|---|---|---|---|
| 12 m wall (S/N) | 4.0 m | 5.25 kN/m² × 4 × 12 = 252 kN | 15 kN/m × 12 = 180 kN | **~432 kN** |
| 8 m wall (E/W) | 6.0 m | 5.25 kN/m² × 6 × 8 = 252 kN | 15 kN/m × 8 = 120 kN | **~372 kN** |

*Note: actual tributary widths depend on wall-to-wall perpendicular distance and are computed dynamically.*

## Build status
- `./node_modules/.bin/tsc --noEmit` ✅ Clean
- `./node_modules/.bin/vite build` ✅ Success
- `BimRoute` chunk: **161.37 kB** (gzip 48.02 kB) — +8 kB from load computation engine
- `BimViewer` chunk: **852.55 kB** (gzip 229.09 kB) — lazy-loaded, opt-in

## Engineering significance
This is the first **real-time structural engineering calculation** in the 2D plan view:
- Loads are not mocked — they are computed from geometry, material density, and standard code loads.
- The tributary area method is a genuine structural engineering technique for one-way systems.
- Column loads accumulate from multiple walls and beams, giving a realistic axial load estimate for footing design.
- The diagram transforms from a visual aid into a **structural analysis tool**.

## Limitations (honest)
- One-way slab assumption (simplified tributary width).
- Beam load is averaged from column loads, not computed from beam self-weight + supported slab.
- No wind, seismic, or point load factors.
- No load combination factors (1.2D + 1.5L, etc.) — loads are unfactored service loads.
- Mixed-direction walls in complex footprints may have ambiguous tributary widths.

## Next candidates
1. **Mixed-material per-element selector** — override global material on individual walls/columns (e.g., steel beams + concrete columns).
2. **Rebar spec override** — allow Y10/Y16, different spacing, recalculated tonnage.
3. **Load combination factors** — toggle between service loads and factored design loads (1.2G + 1.5Q).

Say **proceed** to continue, or name your priority.