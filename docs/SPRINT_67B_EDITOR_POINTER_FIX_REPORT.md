# Sprint 67B: Fix Live 2D Editing — Pointer Capture on SVG Root, Absolute-Position Deltas

## Root cause

Two bugs in Sprint 67's pointer handling prevented drag/pan from working after the first pointermove:

### Bug 1: Pointer capture on wrong element

Sprint 67 attached `setPointerCapture` on each room's `<rect>` element. Once a rect captured the pointer, **all subsequent `pointermove` events targeted that rect** — they never reached the SVG root's `onPointerMove` handler where the pan/edit disambiguation lived. The drag was orphaned on the very first frame.

```
Room <rect> captures pointer
  → pointermove fires on <rect> (no handler)
  → SVG root never sees pointermove
  → drag dead after 1 frame
```

### Bug 2: movementX/movementY unreliable under capture

Even if pointermove reached the handler, `movementX`/`movementY` are relative deltas since the **last** pointermove event. After a capture handoff, the first captured event reports a huge `movementX` (the delta from the pre-capture position to the capture position), causing a violent jump — or zero, depending on browser implementation.

## Fix

### Fix 1: SVG-root pointer capture with data-attribute routing

Moved `setPointerCapture` from room `<rect>` elements to the single SVG root element. Added `data-room-id` and `data-resize="true"` attributes to room rects and resize handles respectively. The SVG root's `onPointerDown` handler checks `e.target.closest('[data-room-id]')` or `e.target.closest('[data-resize="true"]')` to determine the interaction target.

This means:
- The SVG root ALWAYS receives `pointermove` (it has the capture)
- Room identification is done via DOM traversal, not per-element handlers
- No `stopPropagation` needed — pan/edit disambiguation is purely logical (`activeMode`)
- Resize handle detection uses `data-resize` attribute

### Fix 2: Absolute-position deltas via `lastPointer` ref

Replaced `movementX`/`movementY` in `handleSvgPointerMove` with absolute deltas computed from `clientX`/`clientY` tracked in a `lastPointer` ref:

```ts
const dx = e.clientX - lastPointer.current.x;
const dy = e.clientY - lastPointer.current.y;
lastPointer.current = { x: e.clientX, y: e.clientY };
const [worldDx, worldDy] = toWorldDelta(dx, dy);
```

These are frame-independent, reliable under pointer capture, and work identically across mouse, stylus, and touch.

### Fix 3: On-screen debug readout

Added a fixed-position overlay (`z-index: 9999`, `text-slate-400`) showing live values during drag:
- `activeMode` ("idle" / "moving-room-<id>" / "resizing-room-<id>")
- `debugInfo.roomId` — the dragged/resized room
- `debugInfo.dx`, `debugInfo.dy` — cumulative world-space deltas (from `pointerAccum`)

Visible only during active drag. Helps verify the fix is working without console.log.

## Interaction model (updated)

| Mechanism | Sprint 67 (broken) | Sprint 67B (fixed) |
|-----------|-------------------|-------------------|
| Pointer capture | Each room `<rect>` captures independently | SVG root captures once |
| move routing | `onPointerMove` on SVG root — never fires | `onPointerMove` on SVG root — always fires |
| Target detection | React event on each rect | `closest('[data-room-id]')` / `closest('[data-resize="true"]')` |
| Delta source | `movementX/movementY` | `clientX - lastPointer.clientX` |
| stopPropagation | Required on room handlers | Not needed |
| Pan while idle | `activeMode === 'idle'` handler | Same (unchanged) |
| Pan during drag | Impossible (capture orphaned the drag) | Impossible (capture on SVG root, we check activeMode first) |
| Debug readout | None | Fixed overlay during drag |

## Files changed

| File | Change |
|------|--------|
| `src/components/cad/PlanCanvas.tsx` | Rewrote pointer handling: SVG-root capture (`onPointerDown` on `<svg>`), data-attribute routing (`data-room-id`, `data-resize="true"`), absolute clientX/Y deltas via `lastPointer` ref, debug overlay |
| `src/__tests__/editablePlan.test.ts` | +6 tests (33 total): pointerAccum simulation (cumulative accumulation, accumulator reset on new session, accumulator works with resize), edit commit flow (beginMove → updatePointer → endPointer → onCommit fires once with correct plan, guard prevents commit during active edit, onCommit call count) |

## Validation

- typecheck: 0 errors
- lint: 0 errors, 9 warnings (pre-existing, unchanged)
- test: 43 test files, 736 tests passed (33 in editablePlan.test.ts, +6 from Sprint 67)
- build: success, PWA 30 precache entries
- grep `text-stone-500`: none
