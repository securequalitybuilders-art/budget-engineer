# Stage 23 — Draggable Openings in the 2D Plan

## Objective
Extend the editable CAD plan so **doors and windows can be dragged directly along their host wall** instead of only being changed indirectly through property editing.

This closes the next major CAD editing gap and makes the 2D design workflow more natural:

**plan editing → BIM regeneration → quantities → BOQ**

all inside the local-first open-source pipeline.

## What changed

### 1) New store action: `moveCadOpening`
Updated:
- `src/store/appStore.ts`

Added a dedicated CAD action:
- `moveCadOpening(openingId, offset)`

Behavior:
- finds the opening and its host wall
- calculates host wall length
- clamps the new opening offset between `0` and `wallLength`
- rounds to the app’s normal CAD precision
- routes through the shared `persistCadAndRegen(...)` write path

That means every dragged opening now automatically:
- updates the CAD document
- regenerates BIM geometry
- regenerates BOQ
- persists to IndexedDB
- writes a transaction log entry for auditability

Transaction action used:
- `CAD_OPENING_MOVED`

### 2) CAD plan view now supports opening dragging
Updated:
- `src/components/cad/CadPlanView.tsx`

Openings now participate in interactive move mode.

#### New drag state
Added:
- `DragState.kind === 'opening'`

This tracks:
- opening id
- host wall id
- host wall length
- current live offset during dragging

#### New interaction behavior
In **Move / Reshape** mode:
- user can drag a door/window marker
- cursor projection is calculated onto the host wall vector
- projected distance becomes the live opening offset
- offset is snapped to the plan grid when snap is enabled
- offset is clamped to the wall extents
- release commits the opening move through the store

### 3) Visual feedback for opening offset
While dragging an opening, the plan now shows:
- live opening marker position on the wall
- a small text label above it with the current offset in metres
- enlarged marker while active

This gives direct visual confirmation that the opening is being repositioned along the wall axis rather than freely floating in plan space.

### 4) BimRoute wiring updated
Updated:
- `src/routes/BimRoute.tsx`

The route now passes the new callback into the plan editor:
- `onMoveOpening={(openingId, offset) => void moveCadOpening(openingId, offset)}`

## Interaction summary

### Move / Reshape mode now supports three edit classes
1. **Drag wall body** → translate wall
2. **Drag wall endpoint handle** → reshape wall
3. **Drag opening marker** → reposition door/window along host wall

This materially improves the bidirectional CAD authoring experience.

## Verification

### Type check
```bash
./node_modules/.bin/tsc --noEmit
```
Passed.

### Focused opening-move verification
A temporary verification script:
- loaded the seed CAD document
- moved opening `o1` from offset `2m` to `6m`
- regenerated BIM + BOQ
- confirmed the opening still exists and the updated offset is preserved

Observed output:

```json
{
  "wallLength": 12,
  "movedOffset": 6,
  "boqGrandTotal": 39354.84
}
```

This is expected:
- moving an opening along the same wall changes geometry placement
- but does **not** change counts/areas/rates in the current BOQ model
- therefore the grand total remains stable unless opening quantity/type/size changes

### Production build
```bash
./node_modules/.bin/vite build
```
Passed.

## Enterprise impact
This stage strengthens Budget Engineer as a practical computational design workstation:

- faster 2D design iteration
- clearer designer intent capture in plan view
- better local-first CAD/BIM synchronization
- more intuitive opening placement before IFC export and BOQ review
- stronger audit trail for design moves in transaction history

## Files changed
- `src/store/appStore.ts`
- `src/components/cad/CadPlanView.tsx`
- `src/routes/BimRoute.tsx`

## Result
Stage 23 completes another major 2D editing milestone:

- ✅ walls can move
- ✅ wall endpoints can reshape
- ✅ walls can be added/deleted
- ✅ doors/windows can be added/deleted/edited
- ✅ doors/windows can now be dragged directly along their host walls

## Next highest-value options
1. Multi-select and grouped CAD operations
2. Drag-to-duplicate or copy/paste CAD elements
3. Further reduce deferred 3D payload latency
