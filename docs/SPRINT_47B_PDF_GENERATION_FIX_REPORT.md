# Sprint 47B — Fix PDF Generation Failure (jspdf-autotable Plugin Registration + Field Guards)

## Overview

The PDF download button showed "Failed to generate PDF. Please try again." for ALL users, regardless of whether the 3D view was open. Sprint 47A had properly isolated the snapshot capture, but the core PDF generation itself was broken. This sprint fixes the root cause and adds resilience for edge data.

## PHASE 1 — Root Cause

### The Error

`TypeError: doc.autoTable is not a function`

### The Failing Code

`src/adapters/boqToPdf.ts:80` (Sprint 47, unchanged):
```ts
await import('jspdf-autotable') // side-effect import
// ...
(doc as any).autoTable({...})   // line 176 — doc.autoTable is undefined
```

### Why It Fails

`jspdf-autotable` v5.0.8 ships a side-effect auto-attach that looks for `jsPDF` on the global `window` object:

```js
// node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs:2072-2078
var jsPDF = window.jsPDF || window.jspdf?.jsPDF;
if (jsPDF) { applyPlugin(jsPDF); }
```

But `jsPDF` v4.2.1 is loaded as **ESM** via `import('jspdf')` (using `jspdf.es.min.js`), which does **not** set `window.jsPDF` or `window.jspdf`. So `applyPlugin` is never called, `doc.autoTable` is never defined, and every PDF export crashes.

Additionally, several data fields had no null/undefined guards:
- `design.name` → `.toLowerCase()` would throw
- `design.buildingType` → could be undefined
- `design.grossFloorArea.toFixed(0)` → would throw
- `item.quantity.toLocaleString()` → would throw
- `boq.summary.subtotal` → would throw if summary undefined
- `boq.items` → would throw in `groupBoqItems` if undefined

## PHASE 2 — Fix

### 1. Use the exported `autoTable` function directly

**Before:**
```ts
await import('jspdf-autotable')              // side-effect — never attaches
(doc as any).autoTable({...})                 // throws TypeError
```

**After:**
```ts
const { autoTable } = await import('jspdf-autotable')  // named export
autoTable(doc, { ... })                                 // works with any jsPDF load
```

The module also exports `autoTable` as a function (`jspdf.plugin.autotable.mjs:2059`) that sets `doc.lastAutoTable` internally, so `(doc as any).lastAutoTable.finalY` still works correctly.

### 2. Null/undefined field guards

| Field | Guard |
|-------|-------|
| `design.name` | `|| 'Project'` for display; `|| 'project'` for slug |
| `design.buildingType` | `|| 'N/A'` |
| `design.grossFloorArea` | `?? 0` |
| `design.floors` | `?? 1` |
| `boq.currency` | `|| 'USD'` |
| `boq.items` | `|| []` |
| `boq.summary` | `|| { subtotal: 0, ... }` |
| `item.description` | `|| ''` |
| `item.quantity` | `?? 0` |
| `item.rate` / `item.total` | `fmt()` handles null/undefined/non-finite → 0 |

### 3. `fmt()` hardened

```ts
function fmt(n: number | null | undefined, sym: string, dp = 2): string {
  if (n == null || typeof n !== 'number' || !Number.isFinite(n)) n = 0
  return sym + n.toLocaleString(...)
}
```

### 4. Existing error handling preserved

The `BoqExportPanel` catch already logs `console.error(err)` — no change needed. The friendly red message appears only for genuine PDF failures, not snapshot failures (those are isolated since Sprint 47A).

## Files Changed

| File | Change |
|------|--------|
| `src/adapters/boqToPdf.ts` | Changed `await import('jspdf-autotable')` → `const { autoTable } = await import('jspdf-autotable')`; replaced all `(doc as any).autoTable({...})` → `autoTable(doc, {...})`; hardened `fmt()` with null guard; added field guards for projectName, buildingType, grossFloorArea, floors, currency, items, summary, item fields |
| `src/__tests__/boqToPdf.test.ts` | Updated `jspdf-autotable` mock to provide `autoTable` as named export that sets `doc.lastAutoTable`; added edge data test (empty design + boq) |
| `docs/SPRINT_47B_PDF_GENERATION_FIX_REPORT.md` | **New** — this report |
| `CHANGELOG.md` | Sprint 47B entry added under Unreleased |

## Validation

| Check | Before | After |
|-------|--------|-------|
| Typecheck | 0 errors | 0 errors |
| Lint | 0 errors, 9 warnings | 0 errors, 9 warnings |
| Tests | 445 passed, 31 files | **446 passed, 31 files** (+1 edge data test) |
| Build | success | success — code-split intact |
| `boqToPdf` chunk | 5.55 kB | 5.82 kB (+0.27 kB) |
| `jspdf.plugin.autotable` chunk | 30.99 kB | 30.99 kB (separate lazy chunk, same) |
| PDF with 3D snapshot | **FAILS** (doc.autoTable TypeError) | WORKS |
| PDF without 3D snapshot | **FAILS** (same) | WORKS |
| PDF with edge/minimal data | **FAILS** (undefined fields) | WORKS |
| `autoTable` mock sets `doc.lastAutoTable` | N/A (was side-effect import) | Mock function modifies doc correctly |
| Error resilience (autoTable/addImage throw) | N/A | Handled gracefully |
