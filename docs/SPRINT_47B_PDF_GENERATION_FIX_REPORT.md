# Sprint 47B — Fix PDF Generation Failure (jspdf-autotable Plugin Registration + Field Guards)

## Overview

The PDF download button showed "Failed to generate PDF. Please try again." for ALL users, regardless of whether the 3D view was open. Sprint 47A had properly isolated the snapshot capture, but the core PDF generation itself was broken. This sprint fixes the root cause and adds resilience for edge data.

## PHASE 1 — Root Cause

### The Error

`TypeError: t.autoTable is not a function` (from browser console — `boqToPdf-CkOuJNbQ.js`)

### The Failing Code

`src/adapters/boqToPdf.ts:80` (Sprint 47):
```ts
await import('jspdf-autotable') // side-effect import — never attaches with ESM
// ...
(doc as any).autoTable({...})   // line 176 — doc.autoTable is undefined at runtime
```

### Why Code-Split Broke `doc.autoTable`

`jspdf-autotable` v5.0.8 ships a side-effect auto-attach that looks for `jsPDF` on the global `window` object:

```js
// node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs:2072-2078
var jsPDF = window.jsPDF || window.jspdf?.jsPDF;
if (jsPDF) { applyPlugin(jsPDF); }
```

But `jsPDF` v4.2.1 is loaded as **ESM** via `import('jspdf')` (`jspdf.es.min.js`), which does **not** set `window.jsPDF` or `window.jspdf`. Since both libraries are code-split into separate chunks (`jspdf.es.min-*.js`, `jspdf.plugin.autotable-*.js`), the side-effect auto-attach NEVER runs. Every PDF export throws.

### The Fix: Functional API

Use the module's exported `autoTable(doc, opts)` function directly instead of relying on `doc.autoTable`:

```ts
const [{ default: jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
const autoTable = autoTableMod.default
// ...
autoTable(doc, { ... })  // always works — independent of side-effect attachment
```

The `autoTable` function sets `doc.lastAutoTable` internally, so `(doc as any).lastAutoTable?.finalY` still resolves correctly. The optional chaining `?.finalY ?? y` provides a safe fallback if the table plugin somehow doesn't produce a finalY.

Additionally, several data fields had no null/undefined guards:
- `design.name` → `.toLowerCase()` would throw
- `design.buildingType` → could be undefined
- `design.grossFloorArea.toFixed(0)` → would throw
- `item.quantity.toLocaleString()` → would throw
- `boq.summary.subtotal` → would throw if summary undefined
- `boq.items` → would throw in `groupBoqItems` if undefined

## PHASE 2 — Fix

### 1. Use the functional API with `Promise.all` + default export

**Before:**
```ts
await import('jspdf-autotable')              // side-effect — never attaches with ESM
(doc as any).autoTable({...})                 // throws TypeError
```

**After:**
```ts
const [{ default: jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
const autoTable = autoTableMod.default
// ...
autoTable(doc, { ... })
```

Both modules load in parallel via `Promise.all`. The `autoTable` function is obtained from `autoTableMod.default` (the module's default export). It accepts `(doc, options)` as arguments and works with any jsPDF load method. It sets `doc.lastAutoTable` internally for `finalY` access.

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

### 4. Guarded finalY access

Every `(doc as any).lastAutoTable.finalY` was replaced with a guarded expression:

```ts
(doc as any).lastAutoTable?.finalY ?? y
```

This ensures that if the autoTable plugin somehow returns without setting `lastAutoTable` (edge case), the layout doesn't collapse — it falls back to the current y position.

### 5. Existing error handling preserved

The `BoqExportPanel` catch already logs `console.error(err)` — no change needed. The friendly red message appears only for genuine PDF failures, not snapshot failures (those are isolated since Sprint 47A).

## Files Changed

| File | Change |
|------|--------|
| `src/adapters/boqToPdf.ts` | Changed `await import('jspdf-autotable')` (side-effect) → `const [{ default: jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]); const autoTable = autoTableMod.default`; replaced all `(doc as any).autoTable({...})` → `autoTable(doc, {...})`; hardened `fmt()` with null guard; added field guards for projectName, buildingType, grossFloorArea, floors, currency, items, summary, item fields; guarded `lastAutoTable?.finalY ?? y` |
| `src/__tests__/boqToPdf.test.ts` | Updated `jspdf-autotable` mock to export `default` as `autoTable(doc, opts)` function that sets `doc.lastAutoTable`; added functional API test (asserts `autoTable` called with `(doc, opts)`) and finalY fallback test |
| `docs/SPRINT_47B_PDF_GENERATION_FIX_REPORT.md` | **New** — this report |
| `CHANGELOG.md` | Sprint 47B entry added under Unreleased |

## Validation

| Check | Before | After |
|-------|--------|-------|
| Typecheck | 0 errors | 0 errors |
| Lint | 0 errors, 9 warnings | 0 errors, 9 warnings |
| Tests | 445 passed, 31 files | **448 passed, 31 files** (+1 edge data + 2 functional API tests) |
| Build | success | success — code-split intact |
| `boqToPdf` chunk | 5.55 kB | 5.78 kB (+0.23 kB) |
| `jspdf.plugin.autotable` chunk | 30.99 kB | 31.10 kB (separate lazy chunk, same) |
| PDF with 3D snapshot | **FAILS** (`t.autoTable is not a function`) | WORKS |
| PDF without 3D snapshot | **FAILS** (same) | WORKS |
| PDF with edge/minimal data | **FAILS** (undefined fields) | WORKS |
| `autoTable(doc, opts)` called | N/A (was `doc.autoTable()`) | Functional API confirmed by test |
| `lastAutoTable.finalY` fallback | N/A | Guarded with `?? y` |
| Error resilience (autoTable/addImage throw) | N/A | Handled gracefully |
