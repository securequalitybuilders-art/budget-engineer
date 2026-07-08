# Step 2.3 — Editable Geometry Plan

Goal: upgrade the generated 2D CAD canvas into an interactive planning workspace.

## This implementation scope
- Select rooms
- Drag rooms to reposition them
- Resize rooms using corner handle
- Recompute room labels live
- Recompute plan metrics live
- Persist edited plan state per project/design in app store

## Deferred to next iterations
- Wall-level editing
- Constraint snapping
- Collision prevention
- Orthogonal adjacency repair
- Multi-select
- Undo/redo
- Maker.js export
- Geometry-derived BOQ sync

## Data model additions
- Editable plan state keyed by projectId + designId
- Selected room id
- Transient pointer interaction state in canvas

## Outcome
This creates the bridge from generated visualization to computational drafting behavior.
