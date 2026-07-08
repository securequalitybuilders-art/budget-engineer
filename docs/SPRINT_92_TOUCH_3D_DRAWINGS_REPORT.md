# Sprint 92 — Touch Support for 3D Viewer + Drawings / A1 Sheets

## 3D Viewer (OrbitControls)

The two 3D scene components (`BimModel3D.tsx` and `BimViewer.tsx`) now configure `OrbitControls` with touch-appropriate mapping:

| Gesture | Mapping |
|---|---|
| One finger drag | Rotate |
| Two finger pinch | Dolly (zoom) + Pan |
| Two finger pan | Dolly + Pan |

`touch-action: none` is set on both Canvas elements to prevent browser gesture interception.

**Walkthrough** (pointer-lock) is disabled on touch devices — the Walk button shows `disabled` with `cursor-not-allowed` and a tooltip explaining "Walkthrough is best on desktop (pointer-lock not available on touch)".

**Files changed:**
- `src/components/bim/BimModel3D.tsx` — `touches` prop, `touchAction: 'none'`
- `src/components/bim/BimViewer.tsx` — `import * as THREE`, `touches` prop, `touchAction: 'none'`
- `src/components/bim/LazyBimModel3D.tsx` — walk button `disabled` on touch + `isTouchDevice` import

## Drawings / A1 Presentation Sheets (Pinch-Zoom / Pan)

A new generic `<ZoomableDrawing>` wrapper component handles all touch interaction for any SVG drawing or A1 sheet.

### Interaction Model

| Gesture | Behavior |
|---|---|
| One finger drag | Pan (move the viewport) |
| Two finger pinch | Zoom toward midpoint |
| Mouse wheel | Zoom toward cursor |
| Zoom In / Zoom Out buttons (visible on touch) | ±0.25 step, clamped to [0.5, 5] |
| Reset button | Restores zoom=1, pan=(0,0) |

### Implementation

`src/components/drawings/ZoomableDrawing.tsx` wraps an `<svg>` child in a `<div>` with:

- `touch-action: none` to prevent browser gestures
- `onWheel` handler with `event.preventDefault()` + `deltaY`-based zoom toward cursor
- Touch gesture tracking (`onTouchStart`/`onTouchMove`/`onTouchEnd`) with two-pointer pinch-zoom and one-pointer pan
- CSS `transform: translate(${panX}px, ${panY}px) scale(${zoom})` on the inner SVG container
- Zoom control buttons (In, Out, Reset) shown only on touch devices (`isTouchDevice()`)

**Pure helpers** in `src/lib/drawingZoom.ts`:
- `clamp(value, min, max)` — unconstrained pinching never goes out of [0.5, 5]
- `DRAWING_ZOOM_MIN = 0.5`, `DRAWING_ZOOM_MAX = 5`

**10 drawing views wrapped:**
- `ElevationView.tsx`
- `SectionView.tsx`
- `SitePlanView.tsx`
- `FoundationPlanView.tsx`
- `RoofPlanView.tsx`
- `CeilingPlanView.tsx`
- `ElectricalPlanView.tsx`
- `PlumbingPlanView.tsx`
- `HvacPlanView.tsx`
- `PresentationSheetView.tsx`

## Shared Utilities

**`src/lib/isTouchDevice.ts`** — checks `'ontouchstart' in window || navigator.maxTouchPoints > 0`.

**`src/lib/drawingZoom.ts`** — exports `clamp`, `DRAWING_ZOOM_MIN`, `DRAWING_ZOOM_MAX`.

## Test Results

- **typecheck**: 0 errors
- **lint**: 0 errors, 9 warnings (unchanged baseline)
- **test**: 976 passed (53 files, +10 new tests)
- **build**: success, PWA — 32 precache entries
- **text-stone-500**: none
