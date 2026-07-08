# Stage 18 — In-Plan Openings (Doors/Windows) & Wall Property Editing

Local-first, free/open-source only. No paid APIs. Dark-first Dzenhare brand preserved.

## Why
The CAD editor could reshape/add/delete walls, but architectural editing wasn't complete
without **openings** (doors & windows) and **wall properties**. Openings drive a distinct BOQ
line (`opening_each`), and wall thickness/structural status affect material/quantities — so
this stage closes the architectural editing loop with full CAD → BIM → BOQ propagation.

## What changed
### Store: four new audited CAD edit actions
`src/store/appStore.ts` (all via `persistCadAndRegen` → persist CAD, regenerate BIM + BOQ,
log a transaction, refresh derived state):
- `addCadOpening(wallId, kind, offset)` → `CAD_OPENING_ADDED`
  - doors default 0.9 m, windows 1.2 m with 0.9 m sill; correct IfcDoor/IfcWindow class.
- `deleteCadOpening(openingId)` → `CAD_OPENING_DELETED` (clears selection if needed).
- `updateCadWallProps(wallId, { thickness?, structural?, name? })` → `CAD_WALL_PROPS_UPDATED`.
- `updateCadOpening(openingId, { kind?, width? })` → `CAD_OPENING_UPDATED`
  (switching kind also updates the IFC class).

### New CAD Properties panel
`src/components/cad/CadPropertiesPanel.tsx`:
- Resolves the plan selection (`bim-{cadId}`) back to its CAD wall or opening.
- **Wall editor**: rename, thickness (m), structural toggle, live length read-out, list of
  openings on the wall with quick door↔window swap and delete, plus **+ Door / + Window**
  buttons (placed at wall mid-span).
- **Opening editor**: type (door/window) and width, with delete.
- Empty state guides the user to select an element with the Select tool.

### Route wiring
`src/routes/BimRoute.tsx`: destructures the four new actions and mounts `CadPropertiesPanel`
directly beneath `CadPlanView`.

## Verified round-trips (real engine)
`createSeedCadDocument → generateBimModel → generateBoqFromBim`:
| Operation | BOQ grand total | Openings | Expected |
|---|---|---|---|
| Base | $39,354.84 | 1 | — |
| Add window | $39,676.84 | 2 | higher ✓ |
| Delete door | $39,032.84 | — | lower ✓ |

Confirms openings flow through BIM into quantities/cost.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success. `BimRoute` 180.33 kB → 186.70 kB (+~6 kB; properties panel, no new deps).
- Critical-path preloads unchanged; 3D still deferred.

## Remaining / future targets
- Drag openings along their host wall (adjust offset visually).
- Multi-select + group operations.
- Split drei helpers out of `BimViewer` to reduce 3D-load latency.
- Free OSS IFC import/export round-trip.
