# Step 2 Wall-First Pass B Summary

## Completed in this pass

### 1. Wall creation command
- Added command-driven wall drafting
- In wall tool mode, first click sets start point, second click creates a wall

### 2. Wall delete command
- Added selected wall deletion
- Deleting a wall also removes wall-attached openings

### 3. Opening insert/remove commands
- Added add door command to selected wall
- Added add window command to selected wall
- Added delete opening command for selected opening

### 4. CAD document persistence
- Added CAD document persistence in app store
- CAD docs are keyed by project + design

### 5. CAD history
- Added wall-first CAD undo/redo stack
- Toolbar command panel now drives undo/redo

### 6. Floor switching and floor creation
- Added active floor switching
- Added add floor command
- Floor panel now supports selecting floors

### 7. Stronger command shell
- Added drafting command panel
- Selection-aware commands enabled/disabled by context

## New files
- `src/lib/cadCommands.ts`
- `src/components/cad/useCadHistory.ts`
- `src/components/cad/CadCommandPanel.tsx`
- `STEP2_WALL_FIRST_PASS_B_PLAN.md`

## Files updated
- `src/components/cad/useCadDocument.ts`
- `src/store/appStore.ts`
- `src/components/cad/FloorPanel.tsx`
- `src/components/cad/WallFirstCanvas.tsx`
- `src/routes/Dashboard.tsx`

## Validation
- `npm run typecheck` ✅
- `npm run build` ✅

## Build output
- JS bundle: 352.12 kB
- Gzip: 111.22 kB

## What this enables now
- Wall-first drafting is no longer just endpoint editing
- You can create new walls
- You can delete selected walls
- You can insert and remove openings
- You can persist CAD documents
- You can undo/redo CAD drafting actions
- You can add and switch floors

## Remaining enterprise-grade CAD/BIM authoring gaps
- wall split/join/trim/offset commands
- room reconstruction from wall loops
- in-canvas annotation text editing
- explicit dimension entity editing
- advanced DXF layers/blocks/metadata
- BIM classification semantics
- better floor-aware geometry projection
- full drafting keyboard command system
