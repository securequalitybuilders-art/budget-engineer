# Sprint 36A — Make the 3D BIM View Reachable and the Toggle Unmissable

## Root Cause

In `Dashboard.tsx:465`, the 3D BIM model (`LazyBimModel3D`) was gated behind the
`persistedPlan` (CAD-edited plan) conditional:

```tsx
// BEFORE (Dashboard.tsx ~line 463-469)
{activeCanvasView === 'plan' ? (
  <PlanCanvas ... />
) : persistedPlan ? (                    // ← 3D hidden when no CAD edits
  <LazyBimModel3D plan={persistedPlan} ... />
) : (
  <LazyBimViewer model={bimModel} ... />  // ← fallback to old blocky BIM
)}
```

For a normal user flow (select design → generate floor plan), `persistedPlan` is
`null` until the user explicitly saves CAD edits. This meant clicking the 3D
toggle button showed the **old block-based `LazyBimViewer`** instead of the new
wall-thickness 3D BIM model introduced in Sprint 36.

Additionally, the caption (line 471) was also hidden when `!persistedPlan`:
```tsx
{activeCanvasView === 'bim' && persistedPlan && ( ... )}
```

The 2D/3D toggle buttons (lines 341-358) were **always rendered** in the DOM,
but used icon-only `size="icon"` buttons with no visible text label, making
them hard to discover on first visit.

## What Changed

### 1. Generated PlanModel feeds 3D when no persistedPlan exists

The 2D floor plan (`PlanCanvas.tsx:24`) already generates a PlanModel from the
DesignOption via `generatePlanModel(design)` when no persistedPlan exists.

**Dashboard.tsx** now replicates the same logic:

```tsx
const activePlan = useMemo<PlanModel | null>(
  () => persistedPlan ?? (selectedDesign ? generatePlanModel(selectedDesign) : null),
  [persistedPlan, selectedDesign],
);
```

The 3D view now renders:
```tsx
{activeCanvasView === 'plan' ? (
  <PlanCanvas ... />
) : (
  <LazyBimModel3D plan={activePlan} design={selectedDesign} height={480} />
)}
```

When `persistedPlan` is present (CAD-edited), it takes priority. Otherwise,
`generatePlanModel(selectedDesign)` produces the PlanModel — same one the 2D
view uses. 2D and 3D stay consistent because they share the same source.

### 2. 2D/3D toggle buttons with visible labels

Before: icon-only `size="icon"` buttons (hard to discover)

After: `size="sm"` buttons with:
- `LayoutGrid` icon + "2D" label (hidden on narrow via `hidden sm:inline`)
- `Boxes` icon + "3D" label (hidden on narrow via `hidden sm:inline`)
- `title="View 2D floor plan"` / `title="View 3D BIM model"` tooltips
- Active state uses `variant="default"` (brand-colored via Button)
- `text-[11px] font-semibold` for readability at 100% zoom

### 3. Caption always shows in 3D view

Changed from `persistedPlan &&` to `activePlan &&`, so the BIM caption
("Storey height 3.0 m, wall thickness X.XX m...") appears for both CAD-edited
and generated plans.

### 4. Empty state

`BimModel3D.tsx` already had an empty-state message. Updated to include a
helpful hint: "Use the AI Brief panel to describe your project, then select
a design option".

## Tests Added

Five tests added to `src/__tests__/planTo3d.test.ts`:

| Test | What it verifies |
|------|------------------|
| `pickActivePlan returns persistedPlan when present` | Selector prefers CAD-edited plan |
| `pickActivePlan generates from design when no persistedPlan` | Fallback to generated PlanModel works |
| `pickActivePlan returns null when no persistedPlan and no design` | Empty guard |
| `planTo3d produces non-empty scene from generated PlanModel` | Generated PlanModel feeds 3D successfully |
| `planTo3d empty when pickActivePlan returns null (no crash)` | No crash on empty |

## Files Changed

### Modified
- `src/pages/Dashboard.tsx` — removed persistedPlan gating, added `activePlan`
  memo, updated 3D view rendering, updated toggle buttons with labels/tooltips,
  updated caption condition
- `src/__tests__/planTo3d.test.ts` — added `pickActivePlan` selector + 5 new tests
- `src/components/bim/BimModel3D.tsx` — enhanced empty state with hint text
- `CHANGELOG.md` — Sprint 36A entry

### Removed import
- `LazyBimViewer` import from Dashboard (no longer referenced)

## Validation

| Check | Result |
|-------|--------|
| Typecheck | 0 errors |
| Lint | 0 errors (9 pre-existing warnings) |
| Tests | 289 passed, 24 files (284 + 5 new) |
| Build | 3391 modules, 20 precache entries |
| 3D still lazy chunk? | Yes — `assets/BimModel3D-D0LxTprR.js` (859.50 kB) separate |
