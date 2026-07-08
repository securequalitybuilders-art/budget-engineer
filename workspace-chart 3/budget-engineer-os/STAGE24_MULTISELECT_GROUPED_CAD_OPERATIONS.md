# Stage 24 — Multi-Select and Grouped CAD Operations

## Objective
Upgrade the 2D CAD plan editor from single-element editing to **multi-select, grouped move, and grouped delete** operations for walls and objects.

This is a significant usability step toward an enterprise-grade computational design workspace because real planning workflows often require:
- shifting multiple walls together
- relocating several objects in one gesture
- deleting grouped elements as one audited action

## What changed

### 1) Store now tracks multi-selection state
Updated:
- `src/store/appStore.ts`

Added:
- `selectedElementIds: string[]`
- `setSelectedElements(ids: string[])`

Selection behavior is now:
- `selectedElementId` still exists for compatibility with existing panels and inspectors
- `selectedElementIds` provides the full grouped selection set
- `setSelectedElement(id)` now also synchronizes the grouped selection state
- `setSelectedElements(ids)` sets both the primary selected id and the grouped selection list

This preserves backward compatibility while enabling multi-select workflows.

## 2) New grouped CAD actions in the store
Updated:
- `src/store/appStore.ts`

Added grouped edit actions:
- `moveCadWalls(wallIds, dx, dy)`
- `moveCadBlocks(blockIds, dx, dy)`
- `deleteCadElements(items)`

### Group wall move
`moveCadWalls(...)`
- translates all listed walls by the same vector
- preserves relative layout between selected walls
- regenerates BIM + BOQ
- writes one audit transaction:
  - `CAD_WALLS_MOVED`

### Group block move
`moveCadBlocks(...)`
- translates all listed blocks by the same vector
- preserves relative object spacing
- regenerates BIM + BOQ
- writes one audit transaction:
  - `CAD_BLOCKS_MOVED`

### Group delete
`deleteCadElements(...)`
- accepts a mixed list of wall/block targets
- removes all selected walls
- cascades opening deletion for any removed wall
- removes all selected blocks
- clears deleted items from selection state
- writes one audit transaction:
  - `CAD_ELEMENTS_DELETED`

## 3) CAD plan now supports Shift multi-select
Updated:
- `src/components/cad/CadPlanView.tsx`

New plan interaction:
- in **Select** mode, hold **Shift** while clicking walls, openings, or objects to add/remove them from the selection set
- normal click still performs single selection
- clicking the canvas clears the selection set

This creates an intuitive desktop-style selection model without adding dependencies.

## 4) Grouped drag move for selected walls and objects
If a dragged wall or object is already part of the current multi-selection set:
- the entire selected set moves together
- the move is previewed live during drag
- on release, one grouped store action is executed

Behavior details:
- selected walls move together via `moveCadWalls(...)`
- selected objects move together via `moveCadBlocks(...)`
- if only one item is selected, existing single-item behavior is retained

## 5) Group delete in delete mode
In **Delete** mode:
- clicking a selected wall/object that belongs to a multi-selection deletes the entire selected set together
- otherwise only the clicked element is deleted

This improves speed for plan restructuring and keeps the audit trail concise.

## 6) Selection-aware visual states
The plan editor now highlights:
- primary selected items
- multi-selected items
- grouped dragged items

The bottom status area now also reports when multiple elements are selected:
- e.g. `3 elements selected for grouped operations.`

## Notes on scope
This stage intentionally focuses grouped operations on:
- **walls**
- **blocks/objects**

Openings remain individually editable for movement along host walls. That keeps the grouped behavior clear and avoids invalid grouped opening-wall relationships.

## Verification

### Type check
```bash
./node_modules/.bin/tsc --noEmit
```
Passed.

### Focused grouped-operation verification
A temporary script verified a representative grouped scenario:
- move walls `w1` and `w2` by `(1.5m, 0.5m)`
- move block `b1` by the same vector
- regenerate BIM + BOQ
- confirm updated positions are preserved

Observed output:

```json
{
  "movedWalls": [
    {
      "id": "w1",
      "start": { "x": 1.5, "y": 0.5 },
      "end": { "x": 13.5, "y": 0.5 }
    },
    {
      "id": "w2",
      "start": { "x": 13.5, "y": 0.5 },
      "end": { "x": 13.5, "y": 8.5 }
    }
  ],
  "movedBlocks": [
    {
      "id": "b1",
      "position": { "x": 4.5, "y": 2.5 }
    }
  ],
  "boqGrandTotal": 43822.59,
  "wallCount": 5
}
```

This confirms grouped geometric edits propagate correctly through the BIM and BOQ pipeline.

### Production build
```bash
./node_modules/.bin/vite build
```
Passed.

## Enterprise impact
This stage materially improves Budget Engineer’s CAD authoring capability:
- faster bulk editing
- more realistic plan refactoring workflows
- better support for iterative option testing
- cleaner audit history for grouped design intent
- stronger foundation for future copy/paste, duplication, and zone-based operations

## Files changed
- `src/store/appStore.ts`
- `src/components/cad/CadPlanView.tsx`
- `src/routes/BimRoute.tsx`

## Result
Stage 24 adds the first grouped CAD authoring workflow:

- ✅ Shift multi-select
- ✅ grouped wall move
- ✅ grouped object move
- ✅ grouped delete
- ✅ preserved CAD → BIM → BOQ regeneration pipeline
- ✅ transaction logging for grouped changes

## Next highest-value options
1. Copy/paste or drag-to-duplicate CAD elements
2. Grouped property edits for selected walls
3. Further reduce deferred 3D viewer payload latency
