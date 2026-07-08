# Step 2 Enterprise Sub-step Plan

Goal: strengthen the 2D CAD thin slice toward enterprise-grade computational design.

## Ordered sub-steps
1. Add dimensions and room tags
2. Add pan interaction
3. Add editable geometry
4. Add Maker.js export
5. Derive quantities directly from geometry

## This iteration scope
Implement sub-steps 1 and 2 fully, plus prepare the data model for 3 and 5.

### Deliverables
- Dimension annotations on plan perimeter
- Room area labels
- Mouse-drag pan interaction
- Reset view control
- Plan view state abstraction
- Geometry utility helpers for later quantity derivation

## Next iteration prep
- Add selectable rooms/walls
- Add direct rectangle resize handles
- Convert plan model to Maker.js-compatible graph
- Compute wall lengths, gross wall area, and footprint area from plan geometry
