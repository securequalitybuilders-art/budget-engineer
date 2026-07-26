# Sprint 67: Reliable 2D Room Editing

## Root cause

The drag glitch was caused by **per-frame deltas (movementX/movementY) being passed directly to `moveRoom(originPlan)`** without accumulating them. Each `pointermove` event called `moveRoom(originPlan, perFrameDx)` so the room position equalled `origin + perFrameDx` instead of `origin + cumulativeDrag`. Frame 2 would set room.x = origin.x + 3 instead of origin.x + 5 + 3, snapping the room backward on every frame.

## Fix

**`src/hooks/useEditablePlan.ts`** — Added `pointerAccum` (a `useRef` accumulating world-space deltas across successive `updatePointer` calls). Session state was moved from `useState` to `useRef` to avoid stale closures in the rapid `pointermove` handler.

## Interaction model

| Mechanism | Implementation |
|-----------|---------------|
| Pan/edit disambiguation | Room elements call `stopPropagation()` + `setPointerCapture()` so viewport pan handlers never fire during a room drag |
| Deselect on background | SVG's `onPointerDown` calls `setSelectedRoomId(null)` — only reaches background clicks because rooms `stopPropagation` |
| Selection outline | Dashed rect slightly larger than selected room (`strokeDasharray="0.16 0.12"`) |
| Resize handles | 8 handles (4 corners + 4 edge midpoints) with appropriate CSS `cursor` styling |
| Timeline | Horizontal strip below the SVG showing past snapshots (click = undo), "Now" marker, future snapshots (click = redo), and live "moving…"/"resizing…" indicator |
| Undo/redo | `usePlanHistory` manages past/present/future stacks. History is exposed as `timeline.past`/`timeline.future` arrays |

## Persistence flow

```
Dashboard (activePlan)
  ├─ persistedPlan ?? floorPlanToPlanModel(selectedTier3Plan, selectedDesign) ?? generatePlanModel(selectedDesign)
  │
  └─ PlanCanvas
       └─ useEditablePlan(onCommit → handleSavePlan)
            ├─ on commit (endPointer): saves PlanModel to IndexedDB via cadPersistenceService.savePlanModel
            ├─ auto-load: Dashboard useEffect calls loadPlanModel on design selection change
            └─ manual save/restore/reset buttons in CadSyncControls
```

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useEditablePlan.ts` | Cumulative deltas via `pointerAccum` ref; session moved to `useRef`; expose `timeline` (past/future) |
| `src/hooks/usePlanHistory.ts` | Export `past` and `future` state arrays |
| `src/components/cad/PlanCanvas.tsx` | Pointer capture, selection outline, 8 resize handles, TimelinePanel, deselect on background |
| `src/__tests__/editablePlan.test.ts` | 27 tests: room move (cumulative regression), resize, constrain, collision, history undo/redo/timeline, rebuildWalls, edit-flow drawing change, persistence round-trip |

## Validation

- typecheck: 0 errors
- lint: 0 errors, 9 warnings (pre-existing)
- test: 43 test files, 730 tests passed
- build: success, PWA 30 precache entries
- grep text-stone-500: none
- grep text-slate-500 in PlanCanvas: fixed (now text-slate-400)
