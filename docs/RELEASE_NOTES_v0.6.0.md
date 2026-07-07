# v0.6.0 — Interior Inspection: Walk Through Your Design

> **Release date:** 2026-07-07  
> **Phase:** Interior Inspection (complete)

## Headline

**Walk through your building design in first person.** Three new ways to inspect your 3D BIM model — dollhouse cutaway, click-a-room camera fly-in, and full first-person walkthrough — all reflecting your **edited active plan**.

## What's New

### 1. Dollhouse / Cutaway View
- Three view-mode toggles: **Full**, **Dollhouse** (translucent walls, no roof, ceilings hidden, camera tilted), **No Roof** (roof removed, opaque walls)
- **Storey selector** for multi-storey plans (All / G / 1 / 2…)
- All modes are immediately responsive; OrbitControls remain fully interactive

### 2. Click-a-Room Camera Fly-in
- **Room picker dropdown** lists every room in the plan
- Selecting a room animates the camera to that room's centre at **eye height** (~1.5m above floor)
- Smooth 0.6s lerp animation via `useFrame` — OrbitControls remain interactive during and after
- **Auto-assist:** switches to No Roof + room's storey on focus; **Back** button restores previous view

### 3. First-Person Walkthrough
- **Walk mode button** in the view-mode bar
- Camera spawns in the **largest room** at 1.6m eye height
- **WASD / Arrow keys** to move (3 m/s)
- **Click canvas** for pointer-lock mouse-look; **Esc** releases lock
- **Footprint clamp** prevents walking outside the building (0.5m margin)
- **Exit Walkthrough** button restores previous view mode
- Overlay with instructions when pointer is unlocked

## Quality & Stability

- **807 tests** across 46 files — all passing
- **0 TypeScript errors**, **0 ESLint errors** (exactly 9 warnings, baseline)
- **Production build** green with PWA (30 precached entries)
- **WCAG AA** compliant — no `text-stone-500` in source
- Every mode is wrapped by `ErrorBoundary` — crash-safe

## Known Limitations

- **Interior-wall collision deferred for v1.** The walkthrough clamps to the building footprint only. You can walk through interior walls — this keeps the controller robust and jitter-free.
- **Walkthrough is desktop-focused** (WASD + pointer lock). On touch devices the Exit button is available; a note indicates desktop is recommended.

## Technical

- Reuses existing `BimModel3D.tsx`, `planTo3d.ts`, and `@react-three/fiber` / `three` / `@react-three/drei`
- Pure-logic helpers in separate `.ts` modules (`viewMode.ts`, `roomFocus.ts`, `walkthrough.ts`) for testability
- Camera animation uses `useFrame` with smoothstep easing; walk controller runs on each animation frame
- All event listeners (keyboard, mousemove, pointerlockchange) are cleaned up on unmount

## Files

```
A src/components/bim/viewMode.ts
A src/components/bim/roomFocus.ts
A src/components/bim/walkthrough.ts
A src/__tests__/bimViewMode.test.ts
A src/__tests__/roomFocus.test.ts
A src/__tests__/walkthrough.test.ts
M src/components/bim/BimModel3D.tsx
M src/components/bim/LazyBimModel3D.tsx
```

## Previous Release

[v0.5.0 — Interactive 2D CAD Editor](RELEASE_NOTES_v0.5.0.md)
