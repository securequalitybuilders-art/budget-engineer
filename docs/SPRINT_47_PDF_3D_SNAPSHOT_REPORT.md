# Sprint 47 — Embed 3D Model Snapshot into PDF Cost Report

## Overview

Sprint 43 added a client-side PDF cost report (`boqToPdf.ts` via jsPDF) with an optional `snapshotDataUrl` parameter — but the 3D snapshot was **deferred** because the WebGL canvas `preserveDrawingBuffer` flag was not set, so `toDataURL()` would return a blank/transparent image. Sprint 47 enables capture of the current 3D BIM model as a PNG and embeds it into the PDF.

## Root Cause

Three.js / r3f `<Canvas>` default behavior: the WebGL drawing buffer is discarded after each frame for performance. Without `preserveDrawingBuffer: true`, any call to `gl.domElement.toDataURL()` returns either a blank image or raises a security error. This is why the snapshot was deferred in Sprint 43 — the rendering infrastructure wasn't ready.

## Changes

### 1. Enable WebGL readback — `BimModel3D.tsx:392`

**Before:** `gl={{ antialias: true }}`  
**After:** `gl={{ antialias: true, preserveDrawingBuffer: true }}`

This tells the WebGL context to retain the drawing buffer after each render, making `toDataURL()` return the actual rendered frame. The performance cost is minimal (extra memory per pixel) and acceptable for the architecture review use case — the 3D view is not an interactive game running at 60 fps.

### 2. Snapshot capture component — `BimModel3D.tsx:213-225`

New `SnapshotCapture` component placed inside the r3f `<Canvas>`:

```tsx
function SnapshotCapture() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    registerSnapshotCapture(() => {
      gl.render(scene, camera) // force fresh frame
      return gl.domElement.toDataURL('image/png')
    })
    return () => unregisterSnapshotCapture()
  }, [gl, scene, camera])
  return null
}
```

The component uses `useThree()` (only available inside `Canvas`) to obtain the WebGL renderer, scene, and camera. Before capturing, it calls `gl.render(scene, camera)` to guarantee a fresh frame in the buffer. The resulting PNG data URL is registered via a module-level capture registry.

### 3. Module-level capture registry — `src/lib/3d-snapshot.ts` (new)

A simple singleton pattern with four functions:

| Function | Purpose |
|----------|---------|
| `registerSnapshotCapture(fn)` | Called by `SnapshotCapture` on mount (inside Canvas) |
| `unregisterSnapshotCapture()` | Called by `SnapshotCapture` on unmount |
| `captureSnapshot()` | Called by `BoqExportPanel` to get the PNG data URL |
| `isValidPngDataUrl(url)` | Guard that validates a string is a viable PNG data URL |

The module-level ref (`let _capture`) is safe because there is exactly **one 3D Canvas** mounted at any time (the `activeCanvasView` toggle in Dashboard ensures mutual exclusion between PlanCanvas and BimModel3D).

### 4. PDF embedding — `boqToPdf.ts:56-67`

Extracted the inline snapshot embedding logic into a standalone exported function:

```ts
export function embedSnapshotInPdf(doc, snapshotDataUrl, y, margin, contentW): number
```

This function:
- Returns the input `y` position unchanged if `snapshotDataUrl` is missing, invalid, or causes an error
- Calculates image dimensions at 70% of content width with 0.6 aspect ratio
- Calls `doc.addImage()` with center alignment
- Returns the advanced `y` position + gap
- The existing try/catch and the new `isValidPngDataUrl` guard double-protect against corrupt images

The `generatePdfReport` function now simply calls:
```ts
y = embedSnapshotInPdf(doc, snapshotDataUrl, y, margin, contentW)
```

No inline try/catch needed — the function handles all error cases internally.

### 5. PDF handler wiring — `BoqExportPanel.tsx:129-131`

**Before:** `await generatePdfReport(selectedDesign, boq)`  
**After:**
```ts
const snapshot = captureSnapshot()
const { generatePdfReport } = await import('@/adapters/boqToPdf')
await generatePdfReport(selectedDesign, boq, snapshot ?? undefined)
```

`captureSnapshot()` returns `null` if the 3D view was never mounted (2D-only users) or if the Canvas has been unmounted. The `?? undefined` converts `null` to `undefined` for the optional parameter — result: graceful skip, no error, PDF still generates.

### 6. Graceful-skip behavior

| Scenario | Capture result | PDF image |
|----------|---------------|-----------|
| User is on 3D view when clicking PDF | PNG data URL | Embedded in "3D Model Preview" section |
| User is on 2D view (plan), never opened 3D | `null` (no capture registered) | Skipped — PDF has everything else |
| User is on 2D view but opened 3D earlier, then switched back | `null` (capture unregistered on unmount) | Skipped — PDF has everything else |
| 3D view has a render error | `null` or throws inside capture | Skipped — no uncaught errors |
| PDF generation with invalid image data | try/catch in embed function | Skipped — no uncaught errors |

**Chosen approach:** graceful skip (option 5a). No attempt is made to briefly mount the 3D view to force a capture. This avoids complexity, WebGL context creation overhead, and potential timing issues.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/3d-snapshot.ts` | **New** — capture registry + `isValidPngDataUrl` guard |
| `src/components/bim/BimModel3D.tsx` | Added `preserveDrawingBuffer: true` to Canvas `gl`; added `SnapshotCapture` component inside Canvas; added `useEffect`/`useThree` imports |
| `src/adapters/boqToPdf.ts` | Extracted `embedSnapshotInPdf` function with `isValidPngDataUrl` guard; call it from `generatePdfReport` |
| `src/components/dashboard/BoqExportPanel.tsx` | Calls `captureSnapshot()` before `generatePdfReport`, passes result as third argument |
| `src/__tests__/boqToPdf.test.ts` | **New** — 16 tests for `isValidPngDataUrl`, `embedSnapshotInPdf`, capture registry |
| `docs/SPRINT_47_PDF_3D_SNAPSHOT_REPORT.md` | **New** — this report |
| `CHANGELOG.md` | Sprint 47 entry under Unreleased |

## Validation

| Check | Before | After |
|-------|--------|-------|
| Typecheck | 0 errors | 0 errors |
| Lint | 0 errors, 9 warnings | 0 errors, 9 warnings |
| Tests | 414 passed, 30 files | **430 passed, 31 files** (+16 tests) |
| Build | Success | Success — code-split chunks preserved |
| `boqToPdf` chunk | 5.45 kB | 5.55 kB (+0.10 kB) |
| `BimModel3D` chunk | 865.88 kB | 866.28 kB (+0.40 kB) |
| `captureSnapshot()` null | N/A | Returns `null` gracefully when 3D view never mounted |
| PDF with 3D snapshot | N/A (was blank/error) | PNG embedded after project summary |
| PDF without 3D snapshot | Works (no image) | Works (no image — same behavior) |
