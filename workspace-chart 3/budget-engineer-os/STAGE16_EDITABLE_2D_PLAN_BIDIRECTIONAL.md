# Stage 16 — Editable 2D Plan (bidirectional CAD ↔ BIM ↔ BOQ)

Local-first, free/open-source only. No paid APIs. Inline SVG drag interaction (preview-safe).
Dark-first Dzenhare brand preserved.

## Why
Stage 15 added a read-only 2D plan. The journey was still one-way (CAD data → BIM → BOQ).
This stage makes the plan **editable**: dragging a wall or object in the 2D plan writes back
to the `CadDocument`, then **regenerates the BIM model and BOQ**, closing the loop so design
edits immediately drive engineering quantities and cost.

## What changed
### Store: direct CAD edit + auto-regeneration
`src/store/appStore.ts`:
- New actions `moveCadWall(wallId, dx, dy)` and `moveCadBlock(blockId, x, y)`.
- Shared internal `persistCadAndRegen(...)` write path:
  1. apply the CAD mutation,
  2. `generateBimModel` → `generateBoqFromBim`,
  3. persist `cadDocs` / `bimModels` / `boqs` to IndexedDB,
  4. log a `CAD_WALL_MOVED` / `CAD_BLOCK_MOVED` audit transaction,
  5. refresh derived state (snapshots, portfolio, transactions).
- `round2()` helper keeps coordinates clean.

### Interactive drag in the plan
`src/components/cad/CadPlanView.tsx`:
- New **Edit Plan** toggle (only shown when move callbacks are provided).
- Drag walls or objects with the mouse; live pixel offset previews during drag.
- On drop, pixel delta is converted to metres (with screen-Y inversion) and dispatched
  to `moveCadWall` / `moveCadBlock`. Tiny accidental drags (< 1 cm) are ignored.
- Outside edit mode, clicking still selects/inspects (unchanged behaviour).

### Route wiring
`src/routes/BimRoute.tsx`:
- Destructures `moveCadWall` / `moveCadBlock` and passes them into `CadPlanView`.

## Verified round-trip
Ran the real engine code (`createSeedCadDocument → generateBimModel → generateBoqFromBim`):
- Moving the east wall **+2 m** enlarges the footprint.
- BOQ grand total: **$39,354.84 → $43,167.32** (changed: true).
This proves geometry edits propagate through BIM into quantities/cost — the slab/roof recompute
from wall bounds and wall lengths feed wall quantities.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success. `BimRoute` 173.99 kB → 176.59 kB (+~3 kB; drag logic, no new deps).
- Critical-path preloads unchanged; 3D still deferred.

## Remaining / future targets
- Drag wall *endpoints* (not just whole-wall translation) and add/delete elements.
- Snap-to-grid while dragging.
- Split drei helpers out of `BimViewer` to reduce 3D-load latency.
- Free OSS IFC import/export round-trip.
