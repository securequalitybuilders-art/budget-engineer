# Stage 47 — Currency-Aware BOQ Export (CSV + Printable PDF)

Continues from Stage 46 (Sized Footings into BOQ). Adds the first **shareable
deliverable**: the BOQ exported as a spreadsheet-ready CSV and a brand-styled,
print-to-PDF HTML dossier — both in the active region's currency.

## What shipped

- **`src/lib/boqExport.ts`** — pure, dependency-free builders:
  - `buildBoqCsv(boq)` — CSV with currency-tagged Rate/Total headers, all line items,
    and the full summary (subtotal, contingency, fees, VAT, grand total). Proper CSV
    escaping for commas/quotes/newlines.
  - `buildBoqDossierHtml(boq, cad, project)` — self-contained A4 HTML dossier with the
    Dzenhare cover gradient, metadata strip, line-item table, summary block, a
    sticky **Print / Save as PDF** button, and `@page` print rules.
  - `downloadText`, `openDossierForPrint` — browser download / new-tab print helpers.
- **`src/components/panels/ExportPanel.tsx`** — Print/PDF · CSV · HTML Dossier buttons
  with status feedback; mounted at the top of the right column.

## Verified output (real engine, seed model, ULS + medium soil)

- **CSV (USD):** headers `Rate (USD)` / `Total (USD)`; Footings line carries the
  Stage 46 sized description *"RC pad footings 1.55×1.55×0.55 m on Medium clay (150 kPa)"*;
  grand total **$55,669.83** matches the engine.
- **CSV (ZAR):** headers switch to `Rate (ZAR)` / `Total (ZAR)` — currency flows through. ✓
- **HTML dossier:** 5.3 KB self-contained, includes the `window.print()` button. ✓

Sample deliverables saved:
- `samples/demo-boq.csv` (USD)
- `samples/demo-boq-zar.csv` (ZAR)
- `samples/demo-boq-dossier.html` (printable)

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 141.14 kB (gzip 46.49), no 500 kB warning

## Honest scope note

The PDF is produced via the browser's native print-to-PDF (no PDF library, no paid
service), so it depends on the user's print dialog. The CSV is plain UTF-8. Both are
clearly footnoted as budgeting aids, not a tendered contract sum.

## Next candidates

1. **Footing reinforcement** — rebar tonnage for the pads (extends Stage 42 beyond slabs).
2. **Embed the 2D plan SVG into the dossier** — visual + BOQ in one document.
3. **Excavation & formwork line items** — fuller foundation takeoff.
