# Stage 68 — Editable + Persisted Plan (Critical-Path #2)

Closes critical-path item #2 from `CRITICAL_PATH_ANALYSIS.md`: the CAD → BIM → BOQ → 3D
loop is now **iterative**. You can drag walls and objects directly in the 2D plan; each
edit regenerates the BIM model + BOQ + 3D view, persists to IndexedDB, and is audit-logged.
Until now the design was one-shot (seed/brief only), which made the entire issue-control
layer (Stages 57–66) rarely fire in real use. It now does.

## What shipped

- **`src/store/appStore.ts`** — added `moveCadBlock(blockId, dx, dy)` mirroring the
  existing `moveCadWall`. Both route through the shared `regenAndPersist` write path:
  apply CAD mutation → `generateBimModel` → `generateBoqFromBim` → persist
  `cadDocs`/`bimModels`/`boqs` → log a `CAD_WALL_MOVED` / `CAD_BLOCK_MOVED` transaction →
  refresh state. (`moveCadWall` existed but had **no UI caller** — the plan was view-only.)
- **`src/components/cad/CadPlanView.tsx`** — added an `editable` mode with pointer-based
  dragging:
  - drag a wall or block; a **live preview offset** follows the cursor;
  - on drop, the client-pixel delta is converted to metres (SVG-scale aware, Y inverted)
    and dispatched to `onMoveWall` / `onMoveBlock`;
  - sub-5 cm accidental drags are ignored; outside edit mode, clicking still selects.
- **`src/routes/BimRoute.tsx`** — **✎ Edit Plan** toggle in the plan header; wires the
  move actions and flips the cursor/help text.

## Verified round-trip (real engine)

| Action | Result |
|---|---|
| Move east wall +2 m | slab area **189 → 205 m²**, grand total **$106,884 → $110,516** ✓ |
| Move object (2,5) → (3,6) | position updates ✓ |

Because the 3D viewer and the revision **fingerprint** both read the live model, a plan
edit now propagates to the 3D view *and* trips the "design changed since Rev X" detector
with an accurate change summary — the whole stack finally reacts to edits.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 171 KB (gzip 56), `three-vendor`
  still its own deferred chunk.

## Honest scope note

This is translate-only editing (drag whole walls/blocks); endpoint reshaping, add/delete,
snapping, and opening drag are not in this slice (earlier charts had some of these — they
can be layered back on this clean write path). Drag commits a single grid-rounded move.

## Next on the critical path (per CRITICAL_PATH_ANALYSIS.md)

3. **Consolidation pass** — refresh `gemini.md` / `brandguidelines.md` + an architecture
   README + feature index, so this merges cleanly into your other charts.
4. Multi-project management, then local-LLM brief parsing.
