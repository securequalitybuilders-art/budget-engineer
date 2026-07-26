# Sprint 43 — Print-Friendly PDF BOQ + Cost Report (Free/Offline)

## Goal
Add a "Download PDF Report" button on the Cost & Deliver panel that generates a clean, professional, shareable PDF entirely client-side (no server, no paid API). The PDF is for showing a builder, bank, or NGO.

## Implementation

### Library choice: jsPDF + jspdf-autotable
- Both MIT-licensed (confirmed via package.json).
- jsPDF provides core PDF generation; jspdf-autotable provides grouped table support.
- Dynamically imported (`await import()`) on button click — no initial bundle bloat.

### Architecture
- **New file**: `src/adapters/boqToPdf.ts` — PDF generation logic.
  - `generatePdfReport(design, boq, snapshotDataUrl?)` — async function that:
    1. Lazy-imports jsPDF + autotable
    2. Builds the PDF with structured sections
    3. Triggers browser download
  - `groupBoqItems(boq)` — pure function reusing same category ordering as `BoqExportPanel.tsx` (Substructure, Walling, Roofing, Openings, Finishes, Services, Fittings).
  - `fmt(n, sym)` — currency formatting helper using `currencySymbol`.
- **Modified file**: `src/components/dashboard/BoqExportPanel.tsx`
  - Added `handleExportPdf` with async dynamic import
  - Added `Download PDF Report` button (with `Preparing PDF…` state)
  - Uses `FilePieChart` icon from lucide-react

### PDF Contents

1. **Header bar** (Deep Cobalt brand `#1e2952` fill): "Budget Engineer — Cost Report", generation date
2. **Project summary**: project name, building type, area (m2), storeys, currency, quantity source label
3. **Optional 3D snapshot**: `snapshotDataUrl` param accepted but currently not wired from the 3D canvas (requires WebGL context ref exposure — deferred; PDF generates without it)
4. **Disclaimer**: "Early estimate — consult a registered professional for final construction." (amber italic)
5. **BOQ table grouped by trade**: per-group items with quantities, rates, totals, group subtotal row highlighted
6. **Grand total breakdown**: subtotal, contingency, professional fees, VAT, grand total (green highlight)
7. **Footer**: page numbers + repo URL on every page

### Code-split chunks (from build output)
| Chunk | Size | Type |
|---|---|---|
| `boqToPdf-*.js` | 5.45 kB | Application logic |
| `jspdf.plugin.autotable-*.js` | 31.10 kB | Table plugin |
| `jspdf.es.min-*.js` | 390.55 kB | jsPDF core |
| `BimModel3D-*.js` | 865.88 kB | 3D (unchanged, still code-split) |

## Data re-use
- **Grouping logic**: Same `CATEGORY_ORDER` and `CATEGORY_DISPLAY` mapping as on-screen `BoqExportPanel.tsx`
- **Currency**: Uses `currencySymbol` from `@/lib/utils/currency`
- **Project summary**: `DesignOption` type already has `name`, `buildingType`, `grossFloorArea`, `floors`
- **Quantity source**: `BoqResult.sourceMetadata.quantitySourceLabel`
- **Totals**: `BoqResult.summary` (subtotal, contingency, professionalFees, vat, grandTotal)

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (baseline unchanged) |
| Tests (`vitest run`) | **346 passed** (26 files) |
| Build (`npm run build`) | Success — 3D code-split preserved, PDF libs separate chunks |
| Existing CSV export | Unchanged |
| Existing HTML export | Unchanged |
| Existing Print-to-PDF | Unchanged |
