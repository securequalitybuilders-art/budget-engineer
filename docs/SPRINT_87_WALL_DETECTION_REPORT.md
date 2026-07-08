# Sprint 87 — Offline Floor-Plan Wall/Room Detection (OpenCV.js/WASM)

> **Pipeline:** grayscale → adaptive threshold → morphology → HoughLinesP → collinear merge → axis snap → room derivation → PlanModel

---

## Architecture

### Files Created

| File | Purpose |
|---|---|
| `src/lib/import/wallDetection.ts` | Core detection pipeline + pure helpers |
| `src/__tests__/wallDetection.test.ts` | 17 unit tests for pure helpers |
| `src/components/cad/WallDetectionPanel.tsx` | UI button + loading state (created but not used directly; inline button is in DesignStage) |

### Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/stages/DesignStage.tsx` | Added "Detect walls" button to toolbar, `handleDetectWalls` handler, detection status bar |
| `vite.config.ts` | Added `globIgnores: ['**/opencv-*']` to PWA workbox config |
| `ATTRIBUTIONS.md` | Added OpenCV.js credit |
| `CHANGELOG.md` | Sprint 87 entry |
| `package.json` / `package-lock.json` | Added `@techstark/opencv-js` dependency |

---

## OpenCV.js Integration

### Lazy Loading

OpenCV.js is loaded via dynamic `import('@techstark/opencv-js')` only when the user clicks "Detect walls". Vite generates a separate chunk (`assets/opencv-*.js`, ~14.5 MB) that is:

- **Not in the main bundle** — the main `index-*.js` chunk stays at 94 kB
- **Not in PWA precache** — excluded via `globIgnores` (15.5 MB exceeds the 2 MB precache limit)
- **Same-origin** — served from the app's own build output, not a CDN
- **Browser-cached** — after first load, cached by the browser's HTTP cache

### WASM Memory Management

OpenCV.js uses `cv.Mat` objects that sit in WASM heap memory. Every `Mat` must be explicitly `.delete()`'d to avoid leaking the fixed WASM memory pool. The pipeline uses this pattern:

```ts
const src = cv.imread(canvas)
const gray = new cv.Mat()
// ... operations ...
src.delete()
gray.delete()
// etc.
```

All paths in `detectWallsFromImage` (including error paths) delete Mats before returning. The `try/catch` wrapper ensures that if OpenCV throws during processing, the error is caught and a friendly fallback message is returned instead of crashing.

### OpenCV Pipeline Steps

1. **cv.imread** — read image data from canvas into `cv.Mat`
2. **cv.cvtColor** — RGBA → grayscale
3. **cv.adaptiveThreshold** — ADAPTIVE_THRESH_GAUSSIAN_C + THRESH_BINARY_INV, block size 11
4. **cv.morphologyEx** — MORPH_CLOSE with 3×3 kernel to remove noise
5. **cv.HoughLinesP** — probabilistic Hough transform with configurable threshold/minLength/maxGap

### Post-Processing (Pure JS, No OpenCV)

6. **mergeCollinearSegments** — iterative pairwise merge of colinear, overlapping/nearby segments
7. **snapToAxis** — snap segments within 8° of horizontal/vertical to exact axis alignment
8. **pixelsToMetresSegment** — convert pixel coordinates to metres via `pxPerMetre`
9. **deriveRooms** — find rectangular enclosed regions from horizontal + vertical wall intersections
10. **segmentsToPlan** — assemble walls + bounding room into a `PlanModel`

---

## Accuracy Caveat

Wall detection is **approximate**. Results are labelled "Auto-detected N walls (confidence: X) — review and correct."

Factors affecting accuracy:
- Image quality, lighting, and scan resolution
- Whether the floor plan uses thick or thin lines
- Presence of furniture, dimensions, or text on the plan
- The HoughLinesP parameter defaults (tunable as options to `detectWallsFromImage`)

The confidence metric is a simple line-density heuristic:
- `ratio = detectedLines / (imageWidth × imageHeight)`
- `> 0.001` → high
- `> 0.0003` → medium
- else → low

---

## Offline Behavior

OpenCV.js is loaded from the same origin. After first use, the browser caches the 14.5 MB chunk. If the chunk fails to load (e.g., first visit while offline), the error is caught and the user sees "Wall detection unavailable. Trace walls manually over the backdrop." — the app never crashes.

---

## Test Strategy

17 unit tests in `src/__tests__/wallDetection.test.ts` cover the pure helper functions that don't require OpenCV:

- **mergeCollinearSegments** (5 tests): overlapping segments, colinear merge, perpendicular separation, empty input
- **snapToAxis** (3 tests): near-horizontal snap, near-vertical snap, diagonal left unchanged
- **pixelsToMetresSegment** (3 tests): conversion, zero pxPerMetre throws, negative throws
- **segmentsToPlan** (3 tests): builds PlanModel with walls/room, empty returns null, no throw
- **computeConfidence** (3 tests): high/medium/low based on line density

OpenCV integration is tested only at the build/integration level (the dynamic import + WASM pipeline is not run in jsdom).

---

## Validation Results

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **exactly 9 warnings** |
| `npm test` | **949 passed** (52 files) |
| `npm run build` | Build green, **32 PWA entries** (OpenCV excluded from precache) |
| `grep text-stone-500` | None |

### Full Lint Warnings (9)

```
src/components/ui/Badge.tsx         38  react-refresh/only-export-components
src/components/ui/Button.tsx        53  react-refresh/only-export-components
src/hooks/useCadDocument.ts         20  react-hooks/exhaustive-deps
src/hooks/useCadHistory.ts          40  react-hooks/exhaustive-deps
src/hooks/useEditablePlan.ts        62  react-hooks/exhaustive-deps
src/hooks/usePlanHistory.ts         40  react-hooks/exhaustive-deps
src/services/cadPersistenceService.ts 26  @typescript-eslint/no-unused-vars (×3)
```

*SPRINT_87_WALL_DETECTION_REPORT.md — July 2026*
