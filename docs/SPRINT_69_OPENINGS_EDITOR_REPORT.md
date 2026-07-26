# Sprint 69: Editor — Add, Move & Delete Doors & Windows (Openings)

## Features

### Add Opening
- `useEditablePlan.addOpening(kind, wallId?)` creates a new `Opening` with `crypto.randomUUID()` id
- Default wall: the selected room's adjacent external wall; falls back to the plan's first external wall
- Width: 0.9m for doors, 1.2m for windows
- Offset clamped so the opening (± half-width in wall-length terms) stays fully on the wall
- New opening auto-selected; `onCommit` called for persistence
- Toolbar buttons `+ Door` and `+ Window`; no wall rebuild needed (openings reference wall IDs)

### Select & Move Opening
- Each opening renders as a coloured marker (door = amber `#f59e0b`, window = cyan `#38bdf8`) with `data-opening-id` attribute
- Clicking an opening selects it (cyan highlight dashed circle + centre dot)
- Dragging slides it along its wall: pointer delta is projected onto the wall direction, converted to offset change, clamped so the opening never hangs off the wall end
- Reuses SVG-root pointer capture + absolute-position delta approach (Sprint 67B)
- Debug readout shows `mode: opening`, `openingId`, `dx`, `dy`

### Delete Opening
- `deleteOpening(openingId)` removes the opening, clears selection, calls `onCommit`
- Keyboard Delete/Backspace: if an opening is selected, deletes the opening; if a room is selected, deletes the room (last-room guard still applies)

### Consistency & Safety
- All operations go through `history.set()` → Undo/Redo cover add, move, and delete
- All operations call `onCommit` → persist via `cadPersistenceService`
- Default wall picker uses `sameLine` helper: finds external walls adjacent to the selected room
- Offsets always clamped within `[0.5 * width / wallLength, 1 - 0.5 * width / wallLength]`
- All handlers wrapped in try/catch; never crash

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useEditablePlan.ts` | Added `selectedOpeningId`, `addOpening`, `beginMoveOpening`, `deleteOpening`, `clearSelection`, `findDefaultWall`, `sameLine`; updated `PointerSession` and `updatePointer` for opening-move mode |
| `src/components/cad/PlanCanvas.tsx` | Added `EditableOpening` component with selection highlight; `+ Door` / `+ Window` toolbar buttons; `data-opening-id` pointer routing; updated keyboard handler (openings before rooms); debug readout shows opening info; timeline shows opening count |
| `src/__tests__/editablePlan.test.ts` | +8 tests (51 total): addOpening (2), moveOpening (1), deleteOpening (1), opening undo/redo (2), edit-flow computeSection includes opening (1), persistence round-trip with openings (1) |

## Validation

- typecheck: 0 errors
- lint: 0 errors, 9 warnings (pre-existing, unchanged)
- test: 43 test files, 754 tests passed (51 in editablePlan.test.ts, +8 from Sprint 68)
- build: success, PWA 30 precache entries
- grep `text-stone-500` / `text-slate-500`: none
