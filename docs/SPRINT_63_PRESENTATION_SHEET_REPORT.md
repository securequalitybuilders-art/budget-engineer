# Sprint 63 — A1 Presentation Sheet + PDF/PNG Export

## Summary

Composes all 11 drawing types onto a single A1 landscape presentation sheet (1682×1188 viewBox) with a 3×3 grid of drawing cells and a master title block. Export toolbar delivers PNG (canvas render at 2×) and PDF (jsPDF A1 landscape) downloads. All downloads triggered client-side, offline, free.

## Architecture

### Model — `src/components/drawings/presentationSheetModel.ts`
- Pure layout function `computePresentationLayout()` → `{ sheetW, sheetH, cells[] }`
- 9 cells: Front Elevation, Side Elevation, Section A-A, Floor Plan, Site Plan, Foundation Plan, Roof Plan, RCP, MEP Overview
- Non-overlapping, margins/gaps accounted for

### View — `src/components/drawings/PresentationSheetView.tsx`
- Accepts `activePlan`, `design`, `floors`, `storeyHeight`, `pitchHeight`
- For each cell, calls the existing rendering builder and scales/translates the result into the cell
  - Elevations (front/side/section): `computeFrontElevation` / `computeSideElevation` / `computeSection` → SVG primitives
  - Roof/RCP: `renderRoofPlan` / `renderCeilingPlan` → embed sheet elements with scale
  - Site/Foundation: simplified builders preserving y-flip
  - Floor Plan: wall outlines + room labels from PlanModel geometry
  - MEP: `placeElectrical` / `placePlumbing` / `placeHvac` → discipline-coloured symbols
- Null drawing → framed "N/A" caption
- Master title block: project name, scale, date, sheet A1, disclaimer, DzeNhare OS credit
- Export toolbar with `aria-label` on buttons

### Export — `src/adapters/sheetExport.ts`
- `serializeSvg(svgEl)` → XMLSerializer to string (null guard)
- `svgToDataUrl(svgEl, scale)` → offscreen canvas draw at 2× → PNG data URL
- `exportSheetPng(svgEl)` → download `presentation-sheet.png`
- `exportSheetPdf(svgEl)` → dynamic import jsPDF → A1 landscape → `addImage` → `presentation-sheet.pdf`
- Error handling: try/catch at every step, user-visible error message

### Integration — `DrawingsPanel.tsx`
- Added `presentation` tab after Section A-A
- Renders `PresentationSheetView` with same props

## Tests — `src/__tests__/presentationSheet.test.ts`
- `computePresentationLayout`: 9 non-overlapping cells, expected ids, valid dimensions
- `PresentationSheetView`: null-plan fallback, SVG rendered, master title block (project + A1), ≥3 captions
- Export buttons: accessible `aria-label` assertions
- `serializeSvg`: null input → null; valid SVG → string containing `<svg`

## Validation

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 9 warnings |
| `npm test` | 41 files, 681 passed |
| `npm run build` | Success, PWA 30 precache |
| `grep text-stone-500` | No matches |

## Files

**Created:**
- `src/components/drawings/presentationSheetModel.ts`
- `src/components/drawings/PresentationSheetView.tsx`
- `src/adapters/sheetExport.ts`
- `src/__tests__/presentationSheet.test.ts`
- `docs/SPRINT_63_PRESENTATION_SHEET_REPORT.md`

**Modified:**
- `src/components/drawings/DrawingsPanel.tsx`
- `src/__tests__/cadDrawings.test.ts`
- `vitest.config.ts`
- `CHANGELOG.md`
