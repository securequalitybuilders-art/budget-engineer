# Sprint 35 — Clear, Grouped, Trustworthy BOQ Cost View

## Problem

After Sprint 34 made the 2D floor plan readable, the BOQ export panel remained
hard to scan and lacked visual grouping:

1. BOQ items were listed in a flat, unsorted table — users had to mentally group
   by trade to compare subtotals.
2. No subtotals per category (e.g. "Walling subtotal"), making it hard to see
   cost breakdown at a glance.
3. The grand total was the same size as subtotals — no visual prominence.
4. Three separate inline `money`/`sym` formatting functions existed across
   adapters and the panel, leading to drift risk.
5. The source-of-truth badge (generated vs CAD-edited) was present but not
   integrated into the panel UI.

## What Changed

### BoqExportPanel.tsx — grouped table with subtotals and grand total

**Before:** Flat list of items in a single table body, no grouping markers.

**After:**

```
┌─────────────────────────────────────┐
│ Item                    Qty Rate  Total │
├─────────────────────────────────────┤
│ ── SUBSTRUCTURE ──                   │  ← group header (cyan)
│  Strip footing      1   $2,500  $2,500 │
│  150mm slab         1   $3,200  $3,200 │
│  Substructure subtotal        $5,700 │  ← dimmed row
├─────────────────────────────────────┤
│ ── WALLING ──                        │
│  Brick wall 230mm  48   $1,800 $86,400 │
│  Brick wall 115mm  12     $900 $10,800 │
│  Walling subtotal           $97,200 │
├─────────────────────────────────────┤
│ ── ROOFING ──                        │
│  Roof trusses       1   $4,500  $4,500 │
│  Roof sheeting     75      $85  $6,375 │
│  Roofing subtotal            $10,875 │
├─────────────────────────────────────┤
│ ── GRAND TOTAL ──                    │
│  (emerald-500/30 container) $130,000│
└─────────────────────────────────────┘
```

**Key changes:**
- Items grouped by `category` field (Slabs→Substructure, Walls→Walling,
  Roof→Roofing, Openings→Openings, Finishes→Finishes, MEP→Services,
  Objects→Fittings)
- Explicit `CATEGORY_ORDER` array ensures consistent sorting
- `CATEGORY_DISPLAY` map controls human-readable group names
- Per-group subtotal row rendered after each group's items
- Grand total rendered in a prominent `border-emerald-500/30 bg-emerald-500/10`
  container with bold text

### Currency formatting unified

**Three inline implementations replaced with shared helper:**

| Where | Before | After |
|-------|--------|-------|
| `BoqExportPanel.tsx` | `sym()` + `money()` local functions | `makeMoney(currency)` from `currency.ts` |
| `designToBoq.ts` | `fmtCents` local helper | (already used separate helper) |
| `export` builders | inline `Intl.NumberFormat` | (unchanged — presentation layer) |

- `makeMoney(currency)` returns a `(n, dp?) => string` formatter
- `currencySymbol(currency)` returns the symbol string
- Both live in `src/lib/utils/currency.ts` — single source of truth

### Source badge integrated

The existing `sourceMetadata.quantitySourceLabel` is now rendered as a
collapsible badge at the top of the panel:
- Green `Generated` / amber `Edited CAD` / red `Fallback` pill
- Expandable section with source type, timestamp, design/CAD IDs, warnings
- Uses `Shield` icon from lucide-react

## Files Changed

### Modified
- `src/components/dashboard/BoqExportPanel.tsx` — grouped table, subtotals,
  grand total container, source badge, `makeMoney()` usage

### Added
- `src/__tests__/boqCostView.test.ts` — 10 tests covering grouping, totals,
  currency formatting, source metadata, `currencySymbol`

## Validation

| Check | Result |
|-------|--------|
| Typecheck | 0 errors |
| Lint | 0 errors (9 pre-existing warnings) |
| Tests | 273 passed, 23 files |
| Build | 3390 modules |
