# Step 2 Enterprise Hardening Plan

Goal: move the 2D CAD system from editable demo to enterprise-leaning computational drafting.

## This hardening iteration
1. Dynamic wall graph rebuild from edited rooms
2. Snapping + boundary/collision constraints
3. Undo/redo stack
4. Real Maker.js package integration
5. DXF/SVG export
6. Side-by-side plan comparison shell

## Constraints
- Keep bundle under control
- Preserve local/offline behavior
- Maintain deterministic geometry pipeline

## Deliverables
- Rebuild walls/openings from room topology after edits
- Snap move/resize to 0.2m grid
- Prevent room overlap and out-of-bounds placement
- History stack for edited plan state
- Maker.js export JSON via actual package if available
- Downloadable SVG export
- Dashboard comparison panel for design options
