# Step 2 Wall-First Authoring Plan

Goal: evolve the current room-first editable plan into a wall-first CAD authoring core suitable for enterprise-grade BIM preparation.

## Scope for this pass
1. Explicit editable wall objects
2. Door/window opening objects attached to walls
3. Layer system
4. Annotation system
5. Command-based drafting shell
6. Better topology healing foundation
7. Multi-floor data model foundation
8. Richer export semantics foundation

## Strategy
- Introduce a wall-first plan document alongside the current display model.
- Generate display geometry from wall objects.
- Preserve current room/BOQ workflow while migrating the editor core.
- Keep exports deterministic and local-first.

## Deliverables in this pass
- `CadDocument` domain model
- floor/layer/wall/opening/annotation entities
- wall-first document seed from existing plan
- editable wall selection and endpoint drag
- wall-attached opening entities
- command toolbar and active tool state
- layer visibility toggles
- floor selector scaffold
- document-to-PlanModel projection for existing BOQ + plan preview

## Deferred but prepared
- full wall splitting/joining commands
- room reconstruction from wall loops
- advanced constraints
- professional DXF layers and blocks
