# Sprint 85 — Unified Multi-Format Import (DXF + Image + PDF Backdrop)

## What Changed

### New feature: Unified Import Entry
A single "Import (DXF / image / PDF)" button is now **always reachable**:
- **BriefStage** — import button in the top header area
- **ConceptStage** — import button in the empty state (existing location, updated)
- **DesignStage** — import button in the toolbar AND the empty state
- **Home.tsx** — updated from "Import DXF/IFC" to "Import (DXF / image / PDF)"

All import points share `importRouter.ts` which routes files by extension to the correct handler.

### Image / PDF Trace Backdrop
When an image (PNG/JPG/WebP) is imported, it is loaded as a **traceable backdrop** on the 2D PlanCanvas:

- The image renders as an SVG `<image>` element behind the walls at configurable opacity.
- **Scale calibration**: user enters the known width/height of the space in metres; the system computes px-per-metre to scale the backdrop accurately.
- **Opacity slider** + **show/hide toggle** + **remove button**.
- The user traces rooms using the existing editor (Add Room / Move / Resize) over the backdrop — no auto-vectorization, human-assisted tracing.
- Bad image files → friendly error, never crash.

### PDF Import
PDF files are detected and show a guidance message: "PDF import as backdrop is not yet available. Take a screenshot or export your PDF page as an image, then import that."

### Honest Format Handling
| Format | Handling |
|---|---|
| `.dxf` | Parse → walls + rooms → editable PlanModel |
| `.png/.jpg/.webp` | Load as traceable backdrop with scale calibration |
| `.pdf` | Guidance message (not yet available as backdrop) |
| `.dwg` | Guidance: "Export to DXF from AutoCAD first" |
| `.pln` | Guidance: "Export to DXF from ArchiCAD first" |
| Other/unknown | Generic unsupported message |

No libraries were added. The DXF parser continues to be pure-TS (no npm dependency). No pdfjs-dist was added because bundling its worker offline in a PWA is complex and risks build integrity — images + DXF provide the core workflow.

### Implementation Details
- **`src/lib/import/importRouter.ts`** — `routeImportFile(file)` returns typed result
- **`src/lib/import/backdropUtils.ts`** — `calibrateScale`, `pixelsToMetres`, `metresToPixels`, `computeScaleCalibration`
- **`src/lib/import/backdropUtils.ts`** — `BackdropState` type
- **`src/components/cad/TraceBackdrop.tsx`** — SVG backdrop renderer + controls (opacity slider, scale calibration, visibility toggle)
- **`src/components/cad/PlanCanvas.tsx`** — accepts backdrop props, renders TraceBackdrop
- **`src/components/dashboard/stages/BriefStage.tsx`** — import button added
- **`src/components/dashboard/stages/ConceptStage.tsx`** — updated accept to `.dxf,image/*,application/pdf`, uses `onImportFile`
- **`src/components/dashboard/stages/DesignStage.tsx`** — import button in toolbar, backdrop props
- **`src/pages/Dashboard.tsx`** — backdrop state management, `handleImportFile` universal handler
- **`src/pages/Home.tsx`** — updated button label, accept expanded

## Why Not pdf.js?
pdfjs-dist (Apache-2.0) was considered but not added because:
1. It requires bundling a separate worker file for offline/PWA use — complex and risky for build integrity.
2. PDF page → canvas rendering adds complexity for a secondary use case.
3. The core workflow (image backdrop + DXF import) works without it.
4. The guidance message is honest and actionable.

## Why Not .dwg / .pln?
AutoCAD (.dwg) and ArchiCAD (.pln) are proprietary binary formats with no free, offline, browser-based parser. The app shows clear guidance to export to DXF.

## Tests
- `src/__tests__/importRouter.test.ts` — 13 tests covering routing, unsupported formats, scale calibration
- All 909 existing tests remain green (909 total)
- Typecheck: 0 errors
- Lint: 0 errors, exactly 9 warnings
- Build: PWA 30, successful
- `text-stone-500`: 0 matches in `.tsx` files
