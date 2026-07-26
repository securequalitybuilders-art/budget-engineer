# Sprint 54 — Surface Enterprise Calculators in the UI

**Date:** July 2026
**Commit:** (to be filled after push)

## Overview

Surface Sprint 53's 7 enterprise design calculators in the UI: a new **Analysis** tab in Engineering Studio, a **"Design Analysis" section in the PDF** cost report. All additive — no regression of 3-tier pipeline, 2D/3D, BOQ, PDF, PWA, or a11y.

## Changes

### 1. Analysis Assembly Helper (`src/engine/calculators/analysisAssembly.ts`) — NEW

Pure input-assembly function that orchestrates all 7 calculators:

- **`assembleAnalysis(plan, design, boq, buildingType)`** — computes area schedule, envelope U-values, daylight factors, egress, structural gravity loads, energy demand, and cost summary from PlanModel + DesignOption + BOQ.
- **`emptyAnalysis()`** — returns safe zero-value `DesignAnalysis` for empty states.
- **Default envelope assemblies** defined per building type:
  - `house`/`apartment`: wall 0.45 W/m²K, roof 0.35 W/m²K (brick-cavity-block-plaster + tile-insulation-ceiling)
  - `office`/`school`/`clinic`/`retail`: wall 0.50 W/m²K, roof 0.40 W/m²K
  - `industrial`/`storage`: wall 0.55 W/m²K, roof 0.45 W/m²K
- All 7 calculators wrapped in individual try/catch blocks — never crashes the app on individual calculator failure.
- `OCCUPANCY_MAP` / `USE_TYPE_MAP` map building types to `StructuralOccupancy` and `UseType` enums.

### 2. Analysis Panel (`src/components/dashboard/AnalysisPanel.tsx`) — NEW

React component rendering analysis results as branded cards:

| Card | Values Shown |
|---|---|
| **Area Schedule** | Gross floor area, net usable, circulation %, efficiency ratio |
| **Envelope U-Values** | Wall U-value, roof U-value, target U-values, PASS/FAIL per target |
| **Daylight** | Average DF %, rooms below 2% (if any), PASS/FAIL against 2% target |
| **Egress** | Occupant load, exit width (m), number of exits, travel distance check |
| **Structural Loads** | Dead load (kN/m²), live load (kN/m²), total (kN) — flagged PRELIMINARY |
| **Energy Demand** | Annual heating (kWh), cooling (kWh), kWh/m²/yr — flagged PRELIMINARY |
| **Cost Summary** | Cost per m², total estimated cost (reuses existing `estimateCost`) |

- Each value shows its unit.
- Structural loads and energy demand include: *"Preliminary estimate — consult a registered professional for final design."*
- **Empty state:** "Generate a design to see analysis" when no plan/design exists.
- Uses `text-stone-400` tokens (WCAG AA compliant per Sprint 52).

### 3. Engineering Studio Tab (`src/components/dashboard/EngineeringStudioPanel.tsx`) — MODIFIED

- Added `'analysis'` to `TabId` union and `TABS` array (new `TAB_LABELS` entry: `'Analysis'`).
- Tab button + tab panel rendered in same pattern as existing tabs (role=tablist, role=tab, role=tabpanel).
- Component now accepts `activePlan` and `boq` props in addition to `selectedDesign`.

### 4. Dashboard Wiring (`src/pages/Dashboard.tsx`) — MODIFIED

- Line ~624: passes `activePlan={activePlan}` and `boq={currentBoq}` to `EngineeringStudioPanel`.

### 5. PDF Design Analysis Section (`src/adapters/boqToPdf.ts`) — MODIFIED

- Added `PdfAnalysisSummary` interface with `hasData: boolean` and 8 text lines (area, envelope, daylight, egress, structural loads, energy demand, cost sum, cost total).
- `generatePdfReport` accepts optional `analysis?: PdfAnalysisSummary`.
- When `analysis` is provided and `hasData === true`, renders a **"Design Analysis"** header + 3 lines of text between the disclaimer and the BOQ table.
- Gracefully skips when `analysis` is null or `hasData === false`.

### 6. Supporting Type Changes (`src/engine/calculators/structuralLoad.ts`) — MODIFIED

- Added `'educational'` and `'institutional'` to `StructuralOccupancy` union type, with corresponding dead/live load values:
  - `educational`: DL 4.5 kN/m², LL 2.40 kN/m²
  - `institutional`: DL 4.5 kN/m², LL 2.40 kN/m²

### 7. Tests — MODIFIED

**`src/__tests__/calculators.test.ts`** — added `analysisAssembly` describe block (2 tests):
- "produces non‑zero values for a sample design" — asserts all 7 calculator outputs return > 0.
- "emptyAnalysis returns safe zero values" — asserts all outputs are exactly 0.

**`src/__tests__/boqToPdf.test.ts`** — added "Design Analysis section in PDF" describe block (3 tests):
- "includes Design Analysis text when analysis data provided" — asserts PDF output string contains "Design Analysis".
- "still generates PDF without analysis data" — asserts no throw and string length > 100.
- "still generates PDF when hasData is false" — asserts no throw and string length > 100.

**Total tests before/after:** 541 → 546 (5 new tests).

### Typecheck / Lint / Build
- `tsc --noEmit`: 0 errors
- `eslint src --max-warnings 9`: 0 errors, 9 baseline warnings (unchanged)
- `npm run build`: success, code-split intact, PWA 30 precache entries

## Key Decisions

| Decision | Rationale |
|---|---|
| **New "Analysis" tab in Engineering Studio** | Engineering Studio already groups engineering tools; follows existing tab pattern; `selectedDesign`, `activePlan`, `boq` already available at Dashboard level |
| **Default envelope assemblies** | Standard brick-cavity-block-plaster wall and tile-insulation-ceiling roof with targets per building type; flagged as "preliminary" — overridable in a future Sprint |
| **PdfAnalysisSummary as plain strings** | Pre-formatted text lines keep PDF rendering code simple and avoid tight coupling between analysis engine and PDF layout |
| **StructuralOccupancy extended** | `educational`/`institutional` added for school/clinic building types which exist in the app's building-type taxonomy |

## Files Changed

| File | Status |
|---|---|
| `src/engine/calculators/analysisAssembly.ts` | NEW |
| `src/components/dashboard/AnalysisPanel.tsx` | NEW |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | MODIFIED |
| `src/pages/Dashboard.tsx` | MODIFIED |
| `src/adapters/boqToPdf.ts` | MODIFIED |
| `src/engine/calculators/structuralLoad.ts` | MODIFIED |
| `src/__tests__/calculators.test.ts` | MODIFIED |
| `src/__tests__/boqToPdf.test.ts` | MODIFIED |
