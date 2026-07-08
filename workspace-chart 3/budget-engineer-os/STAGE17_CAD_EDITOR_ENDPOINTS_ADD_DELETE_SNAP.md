# Stage 17 — 2D CAD Editor: Endpoint Reshape, Add / Delete Walls, Snap-to-Grid

Local-first, free/open-source only. No paid APIs. Inline SVG interaction (preview-safe).
Dark-first Dzenhare brand preserved.

## Why
Stage 16 made the plan editable by *translating* whole walls/objects. This stage turns the
plan into a real lightweight CAD editor: reshape wall geometry by endpoint, add new walls,
delete elements, and snap to a metric grid — every edit still flowing CAD → BIM → BOQ.

## What changed
### Store: three new audited CAD edit actions
`src/store/appStore.ts` (all routed through the existing `persistCadAndRegen` write path —
persist CAD, regenerate BIM + BOQ, log a transaction, refresh derived state):
- `moveCadWallEndpoint(wallId, end, x, y)` → `CAD_WALL_RESHAPED`
- `addCadWall(floorId, start, end)` → `CAD_WALL_ADDED` (new structural wall, sensible defaults)
- `deleteCadElement(kind, id)` → `CAD_ELEMENT_DELETED`
  - deleting a wall cascade-removes its openings,
  - clears selection if the deleted element was selected.

### Plan editor: tool palette + interactions
`src/components/cad/CadPlanView.tsx`:
- **Tool palette**: Select · Move/Reshape · Add Wall · Delete.
- **Endpoint handles** (cyan) appear on walls in Move mode — drag to reshape an individual
  wall end; the wall previews live and commits on release.
- **Add Wall**: click start point, click end point; a dashed green rubber-band previews the
  span before the second click commits it.
- **Delete**: click any wall/object to remove it.
- **Snap-to-grid** toggle (0.5 m). When on, drags, endpoints and new-wall clicks snap to the
  grid; the background grid pattern matches the snap resolution.
- **Dims** toggle retained. Contextual helper text per tool.

### Route wiring
`src/routes/BimRoute.tsx` destructures and passes the three new actions into `CadPlanView`.

## Verified round-trips (real engine)
Ran `createSeedCadDocument → generateBimModel → generateBoqFromBim` for each operation:
| Operation | BOQ grand total | Expected |
|---|---|---|
| Base | $39,354.84 | — |
| Delete partition wall | $36,727.32 | lower ✓ |
| Reshape (enlarge footprint) | $50,560.64 | higher ✓ |
| Add internal wall | $41,982.36 | higher ✓ |

Confirms geometry edits propagate through BIM into quantities/cost.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success. `BimRoute` 176.59 kB → 180.33 kB (+~4 kB; editor tools, no new deps).
- Critical-path preloads unchanged; 3D still deferred.

## Remaining / future targets
- Edit wall thickness / properties and add openings (doors/windows) in-plan.
- Multi-select + group move.
- Split drei helpers out of `BimViewer` to reduce 3D-load latency.
- Free OSS IFC import/export round-trip.
