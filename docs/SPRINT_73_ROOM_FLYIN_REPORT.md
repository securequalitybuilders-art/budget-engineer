# Sprint 73 — Room Fly-in Focus

> **Phase:** Interior Inspection (2/3)  
> **Release:** v0.5.0+ (post-release)  
> **Commit:** follows `c7211f9` (Sprint 72)  
> **Branch:** `main`

## Summary

Added **room fly-in focus** to the 3D BIM viewer — select a room from a dropdown to smoothly animate the camera to that room's centre at eye height (~1.5m above floor). A pure helper `computeRoomFocus()` calculates camera target/position from plan geometry; `BimModel3D` animates via `useFrame` lerp (0.6s smoothstep easing). The Lazy wrapper adds a room picker `<select>`, Back button, and auto-assist (switches to noRoof + storey 0 on focus, restores previous viewMode/storey on exit).

## Changes

### New files

| File | Purpose |
|------|---------|
| `src/components/bim/roomFocus.ts` | `computeRoomFocus(plan, roomId, storeyIndex?)` → `{ target: [x,y,z], cameraPos: [x,y,z] } \| null`. Centre at room centroid + storey offset, eye height 1.5m. Camera offset proportional to room size. |
| `src/__tests__/roomFocus.test.ts` | 13 pure-logic tests: valid room returns target/cameraPos with correct eye height, storey index shifts y, camera distance scales with room size, null/undefined/unknown inputs return null, empty plan returns null. |

### Modified files

| File | Changes |
|------|---------|
| `src/components/bim/BimModel3D.tsx` | Accepts `focusedRoomId` and `onBack` props. `Scene` runs a `useEffect` on `focusedRoomId` change that computes room focus and starts a `useFrame` lerp animation (0.6s smoothstep). On room blur, animates back to default viewMode position. Separate `useEffect` for viewMode camera adjustment (skipped while focused). Back button in footer bar (visible only during focus). |
| `src/components/bim/LazyBimModel3D.tsx` | Manages `focusedRoomId` state. Room picker `<select>` populated from `plan.rooms`. `handleRoomChange` saves current viewMode/storey on first focus, auto-switches to noRoof + storey 0. `handleBack` restores saved viewMode/storey. BimModel3DInner receives `focusedRoomId` and `onBack` props. |

### Behaviour

- **Room picker**: dropdown in the controls bar, populated from `plan.rooms`. Selecting a room animates camera to that room at eye height.
- **Camera animation**: `useFrame` lerp from current position to target over ~0.6s with smoothstep easing (`t*t*(3-2t)`). OrbitControls remain fully interactive during and after animation.
- **Back button**: appears in the footer bar when a room is focused. Animates camera back to the default viewMode position and restores previous viewMode/storey.
- **Auto-assist**: focusing a room auto-switches to noRoof + that room's storey (0 for single-storey). Previous viewMode/storey saved on first focus only (not overwritten when switching rooms). Back restores saved state.
- **OrbitControls**: no interference — camera animates by mutating `camera.position` and `controls.target` in `useFrame`. Controls remain responsive throughout.
- All wrapped by existing `ErrorBoundary` — never crashes the page.

## Validation

| Check | Result |
|-------|--------|
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 errors, 9 warnings |
| `vitest run` | 791 tests (45 files), all passed |
| `vite build` | Build succeeded (30 chunks + PWA manifest) |
| `text-stone-500` | 0 occurrences in `src/*.tsx` |
| Room focus pure helper | 13 tests, all edge cases covered |
| Back button | Only visible when `focusedRoomId` is set |
| Git | Pushed to `origin/main` |

## Files Changed (Summary)

```
A  src/components/bim/roomFocus.ts          (35 lines)
A  src/__tests__/roomFocus.test.ts          (91 lines)
M  src/components/bim/BimModel3D.tsx        (~+120 lines)
M  src/components/bim/LazyBimModel3D.tsx    (~+60 lines)
M  CHANGELOG.md                             (+20 lines)
A  docs/SPRINT_73_ROOM_FLYIN_REPORT.md      (this file)
```
