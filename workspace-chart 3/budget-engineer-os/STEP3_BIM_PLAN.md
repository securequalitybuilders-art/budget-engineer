# STEP3_BIM_PLAN.md

## Goal
Build a local 3D BIM thin slice on top of the wall-first CAD foundation.

## Scope
1. BIM domain schema
2. BIM generator from CAD document
3. three.js viewer
4. floor visibility controls
5. BIM metadata inspector
6. selection and quantity references

## Out of scope for this pass
- full IFC import/export
- clash detection
- advanced parametric families
- section/elevation generation
- full MEP systems

## Acceptance criteria
- App builds and runs locally
- User can switch floors
- User can select BIM objects
- Inspector shows metadata and quantity refs
- BIM is generated from source CAD entities
