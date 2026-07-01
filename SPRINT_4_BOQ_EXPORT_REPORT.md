# Sprint 4 — BOQ & Export Workflow

**Date:** 2026-07-01  
**Goal:** Connect the selected design option to quantity/BOQ/export workflow so the visible product journey becomes: Brief → AI design options → 2D CAD → 3D BIM → quantities → BOQ → export.

## Files Inspected

| File | Purpose |
|------|---------|
| `src/adapters/designToBim.ts` | DesignOption → BimModel adapter (Sprint 2) — roof type fixed from BimWall to BimRoof |
| `src/adapters/designToBoq.ts` | DesignOption → BOQ adapter (Sprint 4, new) |
| `src/components/dashboard/BoqExportPanel.tsx` | Dashboard panel for BOQ display + export buttons (Sprint 4, new) |
| `src/pages/Dashboard.tsx` | Dashboard page — already wired to import and render BoqExportPanel |
| `src/engine/boq-generator.ts` | BIM → BOQ generator |
| `src/domain/boq.ts` | Canonical BOQ types (DesignOption, BuildingElement) |
| `src/domain/bim.ts` | Canonical BIM types (BimModel, BimRoof, BimWall, BimSlab) |
| `src/lib/boq/boq-types.ts` | BOQ bridge types used by boq-generator and exports |
| `src/lib/rates/rate-card.ts` | Regional rate cards (Zimbabwe, SA, Kenya, Global) |
| `src/lib/export/boq-export.ts` | WS6 CSV + HTML dossier export |
| `src/lib/export/pdf-dossier.ts` | WS4 PDF dossier (HTML print-to-PDF) |
| `src/stores/projectStore.ts` | Zustand store with currentDesigns, generateBOQ |
| `src/stores/uiStore.ts` | UI state (boqPanelOpen) |
| `src/components/layout/BOQPanel.tsx` | Existing BOQ panel (unchanged) |

## BOQ Type Chosen

The `BOQ` type from `src/lib/boq/boq-types.ts` was selected as the canonical BOQ type for the export workflow because:

1. It is already used by `src/engine/boq-generator.ts` (the BIM→BOQ engine)
2. It matches the `BOQ` shape consumed by `src/lib/export/pdf-dossier.ts`
3. It is compatible with the `BOQ` shape in `src/domain/ws6-types.ts` (same fields: `items: BoqLineItem[]`, `summary: BoqSummary`)
4. It avoids conflict with `src/domain/boq.ts` (which has `lineItems: BOQLineItem[]` and `totals: BOQTotals` — different shape)

**Selected BOQ type:**
```ts
type BOQ = {
  id: string
  projectId: string
  currency: string
  items: BOQLineItem[]
  summary: { subtotal, contingency, professionalFees, vat, grandTotal }
}
```

## Adapter Behavior

`src/adapters/designToBoq.ts` exposes:

| Function | Purpose |
|----------|---------|
| `buildBoqFromDesignOption(design, region?)` | DesignOption → BOQ or null. Uses `designOptionToBimModel()` then `generateBoqFromBim()`. Sets currency from rate card. |
| `getCostPerM2(boq, areaM2)` | Computes grandTotal / areaM2 |
| `buildExportCsv(boq)` | Generates CSV string with header, line items, and summary rows |
| `buildExportHtml(designName, boq, areaM2, floors)` | Self-contained HTML dossier with cover, meta, BOQ table, summary, and print-to-PDF button |
| `downloadTextFile(filename, content, mime)` | Downloads a text/blob file via `<a>` click |

**Safety:** All functions guard against null/NaN with `safe()` wrapper and `<= 0` checks. No NaN outputs.

## Export Functions Used

### CSV Export (`buildExportCsv`)
- Generates: `Category, Description, Quantity, Unit, Rate, Total` per line item
- Adds subtotal, contingency, professional fees, VAT, grand total rows
- Download via `downloadTextFile()` with `text/csv` MIME type

### HTML Dossier (`buildExportHtml`)
- Self-contained HTML document with:
  - Cover banner (gradient header)
  - Design metadata (name, area, floors, cost/m², line count)
  - BOQ table with category tags
  - Summary box (subtotal, contingency %, fees %, VAT %, grand total)
  - Print/Save as PDF button
  - CSS print media rules for clean A4 page breaks
- Download via `downloadTextFile()` with `text/html` MIME type

### Print / Save as PDF (`handlePrint`)
- Opens the HTML dossier in a new window via `window.open('', '_blank')`
- User can use browser's native print dialog to save as PDF
- No server, no paid PDF API

## Sample BOQ Generated

For a 150 m² single-storey house (AI-generated "Compact Plan"):

| Category | Qty | Unit | Rate | Total |
|----------|-----|------|------|-------|
| Walls | 164.32 | m² | $85.00 | $13,967.20 |
| Slabs | 150.00 | m² | $110.00 | $16,500.00 |
| Roof | 150.00 | m² | $75.00 | $11,250.00 |
| **Subtotal** | | | | **$41,717.20** |
| Contingency (5%) | | | | $2,085.86 |
| Professional Fees (7%) | | | | $2,920.20 |
| VAT (15%) | | | | $7,008.49 |
| **Grand Total** | | | | **$53,731.75** |
| **Cost per m²** | | | | **$358.21** |

## No-Paid-API Statement

**This sprint introduces zero paid API dependencies.** All code is pure TypeScript/React:
- `designToBoq.ts` — pure functions, no imports beyond existing types + engines
- `BoqExportPanel.tsx` — React component with useMemo, no fetch/axios
- Export helpers — `buildExportCsv`, `buildExportHtml` are pure string generators
- `downloadTextFile` — plain browser Blob + `<a>` download
- Print/PDF — browser `window.print()` only
- No OpenAI, Anthropic, Gemini, Vercel AI, cloud LLM, or paid cloud services
- No `@mlc-ai/web-llm`

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` (tsc --noEmit) | ✅ PASS (0 errors) |
| `npm run lint` (eslint) | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm run build` (tsc && vite build) | ✅ PASS (3361 modules, 16 precache) |

### Manually Verified Flows

1. **No design selected** → `buildBoqFromDesignOption` returns null → BoqExportPanel shows "Generate or select a design option to create a BOQ." empty state
2. **AI-generated design** → `designOptionToBimModel()` converts DesignOption to BimModel → `generateBoqFromBim()` produces BOQ with wall, slab, roof items
3. **2D/3D toggle** still works after BOQ generation — no interference with `activeCanvasView` state or PlanCanvas/LazyBimViewer
4. **CSV export** — `buildExportCsv()` produces valid CSV with header + data rows + summary block
5. **HTML dossier** — `buildExportHtml()` produces self-contained HTML with cover, table, totals, print button
6. **No NaN totals** — all quantities/rates guarded by `safe()` wrapper and `<= 0` checks
7. **No crash on missing fields** — optional chaining and null coalescing throughout

## Known Limitations

| Limitation | Details | Resolution |
|------------|---------|------------|
| **Approximate BOQ** | Quantities derived from GFA and floor count only; no actual wall/opening/block positions used | Full Design→CadDocument→BimModel→BOQ pipeline needed for accurate quantities |
| **Fixed rates** | BOQ generator uses hardcoded rates ($85 wall, $110 slab, $75 roof) instead of querying the regional rate card | `boq-generator.ts` could be extended to accept rate card override |
| **No openings/doors/windows** | designToBim.ts doesn't create opening elements from DesignOption; BOQ only includes walls, slabs, roof | Add opening generation when DesignOption includes opening data |
| **No finishes allowance** | No finishes, services, or preliminaries line items | Could be added as percentage allowances in the adapter |
| **AI designs not persisted** | AI-generated design options are local state only; store integration deferred | Future sprint |
| **Transaction/audit logging** | Export buttons show "BOQ exported locally." toast but don't write to Dexie transaction table | Future sprint |
| **Existing BOQPanel unchanged** | `BOQPanel.tsx` at bottom of canvas is undisturbed; BoqExportPanel is a separate sidebar panel | Two BOQ display paths coexist |
