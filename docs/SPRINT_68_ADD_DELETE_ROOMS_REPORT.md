# Sprint 68: Editor — Add + Delete Rooms

## Features

### Add Room
- `useEditablePlan.addRoom(name?)` creates a new `RoomRect` with `crypto.randomUUID()` id, 3m × 3m default size
- Placement uses `pickNonCollidingPosition`: tries plan centre, then 8 offset positions; `constrainRoom` snaps to grid; `hasCollision` ensures no overlap
- Walls rebuilt via `rebuildWallsFromRooms`; new room auto-selected; `onCommit` called for persistence
- Toolbar button `+ Room` always enabled; also programmatic API for future double-click

### Delete Room
- `useEditablePlan.deleteRoom(roomId)` removes the room, rebuilds walls (fresh openings, no dangling references)
- Guard: refuses to delete the last room (`rooms.length <= 1` → no-op)
- Selection cleared if deleted room was selected; `onCommit` called for persistence
- Toolbar button `− Room` enabled only when a room is selected
- Keyboard: `Delete` / `Backspace` key deletes selected room (ignored when focus is in input)

### Safety
- Both operations go through `history.set()` → Undo/Redo cover add AND delete
- Both call `onCommit` → persist via existing `cadPersistenceService`
- `rebuildWallsFromRooms` generates fresh walls and openings after every structural change — zero dangling references
- All handlers wrapped in try/catch; never crash

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useEditablePlan.ts` | Added `addRoom(name?)`, `deleteRoom(roomId)`, helper `pickNonCollidingPosition` |
| `src/components/cad/PlanCanvas.tsx` | Added `+ Room` / `− Room` toolbar buttons; `useEffect` keyboard handler for Delete/Backspace |
| `src/__tests__/editablePlan.test.ts` | +10 tests (43 total): addRoom (3), deleteRoom (3), addRoom undo/redo (1), deleteRoom undo/redo (1), edit-flow addRoom → computeSection (1), persistence round-trip with addRoom (1) |

## Validation

- typecheck: 0 errors
- lint: 0 errors, 9 warnings (pre-existing, unchanged)
- test: 43 test files, 746 tests passed (43 in editablePlan.test.ts, +10 from Sprint 67)
- build: success, PWA 30 precache entries
- grep `text-stone-500`: none
