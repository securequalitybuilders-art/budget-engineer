# Sprint 74 — First-person Walkthrough

> **Phase:** Interior Inspection (3/3 — finale)  
> **Release:** v0.5.0+ (post-release)  
> **Commit:** follows `22d1341` (Sprint 73)  
> **Branch:** `main`

## Summary

Added a **first-person walkthrough mode** to the 3D BIM viewer — click the "Walk" button to enter eye-level navigation. WASD/Arrow keys move on the horizontal plane; click the canvas for pointer-lock mouse-look. Camera is clamped to the building footprint (prevents walking outside). Eye height is fixed at ~1.6m. An overlay guides the user when pointer is unlocked. Exit via the "Exit Walkthrough" button restores the previous view mode. This completes the interior inspection trio (Dollhouse → Room fly-in → Walkthrough).

## Controls

| Input | Action |
|-------|--------|
| **W** / **Arrow Up** | Move forward |
| **S** / **Arrow Down** | Move backward |
| **A** / **Arrow Left** | Strafe left |
| **D** / **Arrow Right** | Strafe right |
| **Click canvas** | Lock pointer (mouse-look) |
| **Mouse move** (while locked) | Look around (yaw + pitch) |
| **Esc** | Release pointer lock (does NOT exit walk mode) |
| **Exit Walkthrough** button | Return to previous view mode |

## Changes

### New files

| File | Purpose |
|------|---------|
| `src/components/bim/walkthrough.ts` | `computeWalkStart(plan)` → `{ position: [x,y,z] }` or null (largest room centre at 1.6m). `clampToFootprint(pos, bounds, margin?)` → clamped `[x,y,z]` (prevents leaving building footprint). |
| `src/__tests__/walkthrough.test.ts` | 16 pure-logic tests: 5 for `computeWalkStart` (null plan, empty rooms, single-room, largest-room, eye height always 1.6), 11 for `clampToFootprint` (all axes clamping, inside unchanged, custom margin, y preserved). |

### Modified files

| File | Changes |
|------|---------|
| `src/components/bim/viewMode.ts` | Added `'walk'` to `ViewMode` union. `computeVisibility` returns noRoof-like state for walk mode (no roof, opaque walls, ceilings visible). |
| `src/components/bim/BimModel3D.tsx` | Added `WalkController` component (renderless — lives inside Canvas, uses `useThree`/`useFrame`). Manages pointer lock, mouse look, WASD movement, footprint clamp, eye height fix, cleanup on unmount. Scene conditionally renders `WalkController` (walk mode) or `OrbitControls` (other modes). ViewMode camera-adjust effect bails out when `viewMode === 'walk'`. BimModel3D tracks `pointerLocked` state, shows semi-transparent overlay with instructions + Exit button when pointer is unlocked. Footer shows Exit Walkthrough button in walk mode. |
| `src/components/bim/LazyBimModel3D.tsx` | Added "Walk" button to `VIEW_MODES`. `handleViewModeChange` saves current viewMode/storey on walk entry, auto-sets noRoof + storey 0. `handleExitWalk` restores saved state or falls back to 'full'. |

### Behaviour

- **Walk mode entry**: places camera at largest room centre (or building centre if no rooms), at 1.6m eye height, facing the building centre.
- **Footprint clamp**: x clamped to `[0.5, bounds.width - 0.5]`, z clamped to `[0.5, bounds.depth - 0.5]`. y is forced to 1.6 every frame (no flying/no-clip).
- **Pointer lock**: activated by clicking the canvas. Released by Esc (browser default). The overlay shows instructions + Exit button when pointer is unlocked.
- **Exit**: restores previous viewMode and visibleStorey. Camera snaps to default position for the restored mode (via existing viewMode effect).
- **Cleanup**: all event listeners (keyboard, mousemove, pointerlockchange, canvas click) are cleaned up on unmount via useEffect return callbacks.
- All wrapped by existing `ErrorBoundary` — never crashes the page.

## Interior-wall Collision

**Deferred for v1.** The walkthrough only enforces the outer building footprint clamp. You can walk through interior walls. This keeps the controller simple, robust, and jitter-free. Interior-wall collision can be added in a future sprint using raycasting or a navmesh approach.

## Touch/Mobile

Desktop WASD + pointer-lock mouse-look is the primary target. The overlay shows "Walkthrough works best on desktop" context. Touch controls are not implemented for v1 — the Exit button remains accessible for touch users to leave walk mode.

## Validation

| Check | Result |
|-------|--------|
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 errors, 9 warnings |
| `vitest run` | 807 tests (46 files), all passed |
| `vite build` | Build succeeded (PWA 30 entries) |
| `text-stone-500` | 0 occurrences in `src/*.tsx` |
| Walkthrough pure helpers | 16 tests, all edge cases covered |
| WalkController | Cleanup verified (all listeners return functions) |
| Git | Pushed to `origin/main` |

## Files Changed (Summary)

```
A  src/components/bim/walkthrough.ts            (49 lines)
A  src/__tests__/walkthrough.test.ts            (103 lines)
M  src/components/bim/viewMode.ts               (+2 lines)
M  src/components/bim/BimModel3D.tsx            (~+150 lines)
M  src/components/bim/LazyBimModel3D.tsx        (~+40 lines)
M  CHANGELOG.md                                 (+25 lines)
A  docs/SPRINT_74_WALKTHROUGH_REPORT.md         (this file)
```
