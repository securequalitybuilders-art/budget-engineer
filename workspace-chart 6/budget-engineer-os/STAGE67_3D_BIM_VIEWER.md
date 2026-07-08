# Stage 67 — 3D BIM Viewer (Critical-Path #1)

Closes the single biggest stated-vision gap: *"3D BIM model."* The OS now renders the
generated BIM model in true 3D — extruded walls, slabs, roof, openings and structural
blocks — lazy-loaded so three.js never touches the initial critical path.

## What shipped

- **Dependency:** `three@^0.160` (+ `@types/three`) — free/open-source, no paid API.
- **`src/components/bim/BimViewer.tsx`** (default export, `React.lazy`-friendly): plain
  three.js (no react-three-fiber) scene builder.
  - Extrudes each BIM element to a box using its `x,y,width,depth,height` and the floor's
    `elevation` for the Z base.
  - Material-coloured walls (concrete/steel/timber), grey slabs/roof, translucent
    door (green) / window (cyan) markers at correct sill/head, sand stair, violet objects.
  - Edge lines, ambient + directional lighting, ground grid, auto-orbit, and custom
    drag-to-rotate / scroll-to-zoom controls. Full dispose() cleanup on unmount.
- **`src/components/bim/BimViewerPanel.tsx`** — gates the viewer behind a **"Load 3D
  Viewer"** button; `Suspense` fallback; a colour legend. Mounted under the section view.
- **`vite.config.ts`** — added a `three-vendor` manual chunk.

## Performance (verified build)

| Chunk | Size | On critical path? |
|---|---|---|
| `index` (main) | 169 KB (55 KB gz) | yes |
| `react-vendor` | 134 KB (43 KB gz) | yes |
| **`three-vendor`** | **457 KB (115 KB gz)** | **NO — loads only on "Load 3D"** |
| `BimViewer` | 3.4 KB (1.7 KB gz) | NO — lazy |

three.js is fully deferred: the page stays fast and the 3D engine downloads on demand.

## Geometry verified (real BIM model, two-storey seed)

- **18 renderable boxes**: 10 walls, 2 slabs, 1 roof, 2 openings, 3 blocks ✓
- Floors stack: Ground @ 0 m, First @ 3 m → **building top 6 m** (2 × 3 m) ✓
- Footprint 12.2 × 8.2 m matches the seed envelope ✓
- Sample wall extrudes as a real volume: w=12, d=0.2 (thickness), h=3 at Z=0 ✓

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success (84 modules)

## Honest scope note

This is a clean, dependency-light viewer: axis-aligned extruded boxes (no boolean
window/door cut-outs in 3D — openings are translucent markers), no element picking/
inspection yet, and a hand-rolled orbit (not full OrbitControls). It faithfully shows the
generated model and proves the computational-BIM pipeline end-to-end in 3D.

## Next on the critical path (per CRITICAL_PATH_ANALYSIS.md)

2. **Editable + persisted plan** — make the CAD→BIM→BOQ loop iterative (then 3D reflects edits).
3. **Consolidation pass** — refresh gemini.md/brandguidelines.md + architecture README for merging.
