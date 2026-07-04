# Sprint 46B — Unify Design Options: Remove Stale Panel, Fix Duplicate Accumulation

## Overview

After Sprint 46A wired Tier 3 topology names into the prominent "Choose your design" card selector at the top of the canvas area, a **second**, stale "Design Options" panel remained in the right-hand Properties sidebar. It showed old "Compact/Standard/Spacious Option" labels and accumulated 6+ cards on every "Regenerate" click. This report documents the root cause, the fixes, and the before/after.

## Phase 1 — Diagnosis: Two Option Sources + Duplicate Cause

### Source 1: Top prominent selector (working)

**File:** `src/pages/Dashboard.tsx:436-460` — renders `visibleDesignOptions`
```tsx
{visibleDesignOptions.map((option) => {
  const isSelected = selectedDesignId === option.id;
  ...
  <span>{option.name}</span>  // topology name from Tier 3
})}
```

Where `visibleDesignOptions` is `aiDesignOptions` when populated (Tier 3 topology names) or falls back to `designOptions` (from store).

### Source 2: Stale side panel

**File:** `src/components/layout/PropertiesPanel.tsx:81-115` — renders `currentDesigns` directly from the Zustand store:
```tsx
const { currentProject, currentBrief, currentDesigns } = useProjectStore();
// ...
{currentDesigns.map((design) => (
  <span>{design.name}</span>  // old "Compact Option" from @/ai/designEngine
))}
```

This panel had **no selection state**, no link to `selectedDesignId`, and read directly from the accumulating Dexie store.

### Duplicate cause: append-not-replace

**File:** `src/stores/projectStore.ts:203`
```typescript
await db.designs.bulkAdd(designs);
```

Every "Regenerate" click appended 3 new records to the Dexie `designs` table **without deleting old ones**. Then `loadProject` (line 221) read **all** records back, so `currentDesigns` grew by 3 each time: 3, 6, 9, 12...

The `persistDesigns` function (`projectPersistenceService.ts:48-56`) correctly used `db.designs.put(d)` which upserts by ID. But `generateDesigns` in the store used `bulkAdd`.

## Phase 2 — Fix: One Unified Source, No Duplicates

### Fix 1: Replace-not-append in store (`projectStore.ts:203`)

**Before:**
```typescript
await db.designs.bulkAdd(designs);
```

**After:**
```typescript
await db.designs.where({ projectId }).delete();
await db.designs.bulkAdd(designs);
```

Deletes all previous designs for the project before adding the new 3. Always exactly 3 records.

### Fix 2: Remove stale panel (`PropertiesPanel.tsx`)

The "Design Options" section (lines 81-115) was removed entirely. The top prominent selector (Dashboard.tsx:436-460) is the single source of truth — it's interactive (selection state, click-to-select), shows topology names, and drives the 2D/3D/BOQ/PDF pipeline.

The unused `currentDesigns` destructure and unused imports (`Box`, `Ruler`, `Layers` from lucide-react) were also removed.

## Phase 3 — Distinct Plans Verified

Tests confirm each topology produces a unique room layout signature:

```
Rectangle:  Bedroom 1@0.0,0.0|Bedroom 2@3.5,5.5|Bedroom 3@6.0,5.5|Circulation@0.0,3.5
L-Shape:    Bedroom 1@0.0,0.0|Bedroom 2@0.0,3.5|Circulation@3.0,0.0|Bedroom 3@5.0,4.2|Courtyard@5.0,0.0
Split-Wing: Bedroom 1@0.0,0.0|Bedroom 2@0.0,3.5|Gallery@8.0,0.0|Bedroom 3@10.0,0.0
```

Each has distinct x/y coordinates, not just different overall width.

## Before / After

| Aspect | Before | After |
|--------|--------|-------|
| Top card selector | Rectangle/L-Shape/Split-Wing ✓ | Same ✓ |
| Side panel labels | "Compact Option", "Standard Option", "Spacious Option" + duplicates | Removed (no stale panel) |
| Total options after 2 regens | 6+ cards (accumulating) | Always exactly 3 |
| Properties sidebar | Shows duplicate stale list | No design options section (refers user to top selector) |

## Files Changed

| File | Change |
|------|--------|
| `src/stores/projectStore.ts` | Added `delete()` before `bulkAdd` to prevent duplicate accumulation |
| `src/components/layout/PropertiesPanel.tsx` | Removed stale "Design Options" section + unused imports |
| `src/__tests__/tier3LayoutEngine.test.ts` | +3 tests: regenerate idempotency, distinct layouts per topology, finite coords |
| `docs/SPRINT_46B_UNIFY_OPTIONS_REPORT.md` | New |
| `CHANGELOG.md` | Updated |

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (baseline) |
| Tests (`vitest run`) | **414 passed** (30 files, +3 new) — was 411 |
| Build (`npm run build`) | Success — code-split chunks preserved |
