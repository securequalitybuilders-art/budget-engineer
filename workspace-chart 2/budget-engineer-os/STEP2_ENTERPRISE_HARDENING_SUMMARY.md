# Step 2 Enterprise Hardening Summary

## Completed in this hardening pass

### 1. Dynamic wall graph rebuild from edited rooms
- Added topology rebuild logic from room adjacency
- Internal walls are regenerated from touching room boundaries
- Openings are regenerated when walls are rebuilt
- External walls remain envelope-driven

### 2. Snapping + constraints + collision control
- Added 0.2m snapping
- Enforced in-bounds room movement/resizing
- Prevented room overlap during edits

### 3. Undo/redo stack
- Added local history stack for plan edits
- Added Undo and Redo actions to canvas toolbar

### 4. Actual Maker.js integration
- Installed `makerjs`
- Export now uses Maker.js line paths and DXF exporter
- Added JSON and DXF output actions

### 5. DXF/SVG export
- Added direct DXF export download
- Added SVG export download
- Added generic client-side text file exporter

### 6. Side-by-side plan comparison shell
- Added option comparison table for generated designs
- Displays area, footprint, internal area, and room count

## Files added
- `src/lib/planConstraints.ts`
- `src/lib/planTopology.ts`
- `src/components/cad/usePlanHistory.ts`
- `src/lib/fileExport.ts`
- `src/lib/svgExport.ts`
- `src/components/cad/PlanComparison.tsx`
- `STEP2_ENTERPRISE_HARDENING_PLAN.md`

## Files updated
- `src/lib/makerExport.ts`
- `src/components/cad/useEditablePlan.ts`
- `src/components/cad/PlanCanvas.tsx`
- `src/routes/Dashboard.tsx`

## Validation
- `npm install makerjs` ✅
- `npm run typecheck` ✅
- `npm run build` ✅

## Build output
- JS bundle: 337.34 kB
- Gzip: 107.60 kB

## Important notes
- This is now a much stronger CAD workflow, but still not a full professional drafting system.
- Wall topology is inferred from room adjacency, not from explicit editable wall objects.
- Constraint logic is grid/bounds/collision based, not full spatial solving.
- Undo/redo is session-local.
- Export works, but full enterprise DXF layer semantics are not yet modeled.

## Remaining gap to true enterprise CAD
- Editable explicit wall objects
- Constraint solver for adjacency preservation
- Layer management
- true dimensions object model
- annotations library
- door/window object editing
- better topology healing after edits
- command palette for drafting actions
- multi-floor support
