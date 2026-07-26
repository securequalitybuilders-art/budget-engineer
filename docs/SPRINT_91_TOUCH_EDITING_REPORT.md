# Sprint 91 — Touch Editing for the 2D Plan

## Interaction Model (Pointer Events)

All touch, mouse, and pen input goes through **Pointer Events** (`pointerdown`/`move`/`up`/`cancel`) on the SVG root. Active pointers are tracked in a `Map<number, {x, y}>`.

| Gesture | Fingers | Behavior |
|---|---|---|
| Tap | 1 | Select room/opening; deselect on empty space |
| Drag on room | 1 | Move selected room |
| Drag on handle | 1 | Resize room (8 handles) |
| Drag on opening | 1 | Move opening along wall |
| Drag on empty space | 1 | Pan viewport |
| Pinch | 2 | Zoom around midpoint + two-finger pan |

## Tap vs Drag Classification

A tap is identified when:
- Total movement < **10px** (`TAP_MOVEMENT_THRESHOLD_PX`)
- Elapsed time < **300ms** (`TAP_TIME_THRESHOLD_MS`)

On `pointerdown`: record a `TapCandidate` (start pos, time, hit target). Set selection immediately for visual feedback.
On `pointermove`: if movement exceeds threshold, call `commitDrag()` which invokes `beginMove`/`beginResize`/`beginMoveOpening`/`onPointerDown`.
On `pointerup`: if never committed and within time threshold, treat as tap (keep selection on rooms, deselect on empty).

## Pinch Zoom

When a second pointer goes down:
1. Snapshot both pointer positions (`pinchState`).
2. Cancel any active room editing session.
3. On `pointermove` with ≥2 pointers: compute previous midpoint, current midpoint, previous distance, current distance.
4. `newZoom = prevZoom * (curDist / prevDist)`, clamped to [0.3, 3.0].
5. Pan is adjusted so the world point under the pinch midpoint stays under the cursor: `newPan = curMid - worldPoint * newZoom`.

When back to one pointer, pinch mode deactivates; single-finger editing resumes normally.

## `touch-action: none`

Added to the SVG element via `touch-none` Tailwind class. This prevents the browser from intercepting touch gestures (scroll, zoom) while interacting with the canvas. The outer containers remain scrollable.

## Touch Handle Hit Targets

Resize handles now have a **two-layer** structure:
- **Visual layer**: `0.2m × 0.2m` cyan rect (same visual size as before).
- **Touch target layer**: `0.8m × 0.8m` transparent rect behind it accepting pointer events.

This gives a ~44px-equivalent tap target on a typical phone without enlarging the visual handle.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/usePlanViewport.ts` | Added `pinchZoom()` method, exported `midpoint`/`pinchScale`/`ZOOM_MIN`/`ZOOM_MAX` |
| `src/components/cad/PlanCanvas.tsx` | Multi-pointer tracking, pinch-zoom, tap-vs-drag classifier, two-layer handles, `touch-action: none` |
| `src/__tests__/touchViewport.test.ts` | 17 tests: midpoint, pinchScale clamp, pan delta, tap-threshold constants |

## Test Results

- **typecheck**: 0 errors
- **lint**: 0 errors, 9 warnings (unchanged baseline)
- **test**: 966 passed (53 files, +17 new tests)
- **build**: success, PWA — 32 precache entries
- **text-stone-500**: none
