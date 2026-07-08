# Step 2 Enterprise Final Pass Plan

Goal: push the wall-first authoring layer closer to enterprise-grade CAD/BIM semantics.

## Requested scope
1. True trim/intersection solver
2. True offset-chain behavior
3. In-canvas dimension editing UX
4. BIM property editor UI
5. Object/block library system
6. IFC/COBie export path
7. Vertical circulation / stair / core coordination
8. Richer multi-floor coordination engine

## Implementation note
A full production implementation of all items would require a much larger architecture phase. In this pass, I will implement credible working foundations and thin-slice functionality for each, integrated into the current app.

## Deliverables
- wall intersection trim utilities
- chained offset for collinear walls
- draggable dimension annotations
- BIM property editor panel
- reusable block library panel and insertion groundwork
- IFC/COBie-style JSON export
- stair/core object model foundation
- richer multi-floor coordination summary
