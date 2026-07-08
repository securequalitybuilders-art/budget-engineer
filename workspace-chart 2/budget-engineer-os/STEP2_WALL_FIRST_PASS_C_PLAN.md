# Step 2 Wall-First Pass C Plan

Goal: add geometric intelligence to the wall-first drafting core.

## Scope
1. Wall split groundwork
2. Wall join groundwork
3. Room loop detection scaffold
4. Room reconstruction from axis-aligned wall circuits
5. Dimension entities
6. Stronger CAD semantics for projection/export preparation

## This pass deliverables
- split selected wall at midpoint command
- join two compatible walls command groundwork
- derive rooms from closed wall rectangles where possible
- generate dimension annotations/entities from walls
- project reconstructed rooms back into plan model

## Deferred
- arbitrary polygon room loop solver
- trim/offset operations
- non-orthogonal wall loop solving
- full DXF block semantics
