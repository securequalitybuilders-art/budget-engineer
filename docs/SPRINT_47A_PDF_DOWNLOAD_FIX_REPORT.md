# Sprint 47A — Fix PDF Download Regression (3D Snapshot Isolation)

## Overview

Sprint 47 added a 3D model snapshot to the PDF cost report. A regression was introduced: if `captureSnapshot()` threw (e.g. WebGL context loss, disposed canvas, render error), the entire `handleExportPdf` handler would abort before `generatePdfReport` could run — the user clicked "Download PDF Report" and nothing happened.

Sprint 47A isolates snapshot capture from PDF generation so that a failed capture never blocks the download.

## Root Cause

In `BoqExportPanel.tsx` (Sprint 47), `captureSnapshot()` was called on line 129, directly before the dynamic import of `generatePdfReport`:

```ts
const snapshot = captureSnapshot()             // <-- can throw
const { generatePdfReport } = await import(...) // <-- never reached if throw
await generatePdfReport(design, boq, snapshot ?? undefined)
```

The outer try/catch only had `console.error` — no user-facing feedback, no fallback. The user saw the button flash and nothing else.

## Changes

### 1. Isolate snapshot capture — `BoqExportPanel.tsx:129`

**Before:**
```ts
const snapshot = captureSnapshot()
const { generatePdfReport } = await import(...)
await generatePdfReport(design, boq, snapshot ?? undefined)
```

**After:**
```ts
let snapshot: string | undefined
try { snapshot = captureSnapshot() ?? undefined }
catch (e) { console.warn('Failed to capture 3D snapshot:', e) }

const { generatePdfReport } = await import(...)
await generatePdfReport(design, boq, snapshot)
```

Each concern has its own try/catch:
- **Capture** caught separately — PDF always proceeds regardless of WebGL state
- **PDF generation** already had error handling — preserved unchanged

### 2. Visible error feedback — `BoqExportPanel.tsx:35,159-175`

Added `pdfError` state (`useState<string | null>(null)`) that displays a red error banner above the PDF button when `generatePdfReport` itself fails:

```tsx
{pdfError && (
  <div className="text-red-500 text-sm mb-2">{pdfError}</div>
)}
```

The error auto-clears after 6 seconds via `setTimeout`. Only genuine PDF failures show this message — snapshot failures are silent (console.warn only).

### 3. Resilient embedding — `boqToPdf.ts:62`

Added `console.warn` inside the `embedSnapshotInPdf` catch block so addImage failures are visible in dev tools:

```ts
catch (e) {
  console.warn('Failed to embed 3D snapshot in PDF', e)
}
```

### 4. Test coverage — `boqToPdf.test.ts` (+15 tests)

| Area | Tests | What it validates |
|------|-------|-------------------|
| `embedSnapshotInPdf` resilience | 7 | never throws for any input: undefined, null, empty string, invalid string, random object, number, and when addImage throws |
| Capture isolation | 4 | undefined, valid capture, snapshot stays undefined after capture failure |
| `generatePdfReport` always saves | 4 | doc.save is always called even with undefined/null/invalid snapshot or addImage throw |

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/BoqExportPanel.tsx` | Isolated capture in own try/catch; added `pdfError` state + red error message with 6s auto-clear |
| `src/adapters/boqToPdf.ts` | Added `console.warn` inside `embedSnapshotInPdf` catch |
| `src/__tests__/boqToPdf.test.ts` | +15 tests (embed resilience, capture isolation, generatePdfReport always saves) |
| `docs/SPRINT_47A_PDF_DOWNLOAD_FIX_REPORT.md` | **New** — this report |
| `CHANGELOG.md` | Sprint 47A entry added under Unreleased |

## Validation

| Check | Before | After |
|-------|--------|-------|
| Typecheck | 0 errors | 0 errors |
| Lint | 0 errors, 9 warnings | 0 errors, 9 warnings |
| Tests | 430 passed, 31 files | **445 passed, 31 files** (+15 tests) |
| Build | Success | (verified) |
| Capture throws → PDF still downloads | NO — handler aborted | YES — PDF generates without snapshot |
| Capture succeeds → PDF has snapshot | YES | YES (unchanged) |
| No 3D view → PDF downloads | YES | YES (unchanged) |
| `generatePdfReport` throws → visible error | console.error only | red inline message + console.error |
| `embedSnapshotInPdf` addImage throws | silent | console.warn |

## Future Considerations

- If WebGL context loss is frequent, consider a retry or warm-up for capture
- The `pdfError` message could be internationalised with the i18n system (when added)
- For users who always download without the 3D view, the console.warn for capture is invisible — no action needed
