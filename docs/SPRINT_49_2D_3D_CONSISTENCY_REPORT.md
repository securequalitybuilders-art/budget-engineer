# Sprint 49 — 2D / 3D Plan Consistency Report

## PHASE 1 — Diagnosis

### Each view's plan source (before fix)

| View | Component | Plan source | File:Line |
|------|-----------|-------------|-----------|
| **2D floor plan** | `PlanCanvas` | `persistedPlan ?? generatePlanModel(selectedDesign)` — internally `useEditablePlan(baseModel, persistedPlan, ...)` where `baseModel = generatePlanModel(design)` | `Dashboard.tsx:556`, `PlanCanvas.tsx:24` |
| **3D BIM model** | `LazyBimModel3D` | `activePlan` = `persistedPlan ?? floorPlanToPlanModel(selectedTier3Plan, selectedDesign) ?? generatePlanModel(selectedDesign)` | `Dashboard.tsx:558`, `Dashboard.tsx:108-114` |

### The divergence

When no CAD-edited plan exists (`persistedPlan === null`) and Tier 3 plans exist:

- **3D** uses `floorPlanToPlanModel(selectedTier3Plan, selectedDesign)` → renders the Tier 3 topology (e.g. courtyard ring, L-shape wings)
- **2D** uses `generatePlanModel(selectedDesign)` → renders the old generic layout (rooms from DesignOption metadata, NOT from Tier 3 FloorPlan)

The two views read from **different plan sources** — 3D uses the Tier 3 derived PlanModel, 2D uses the legacy `generatePlanModel` that does not consider topology at all.

### Where the selected Tier 3 FloorPlan lives

- `tier3Plans` state array (`Dashboard.tsx:44`)
- Mapping: `selectedDesign.id` ends with `-t3-${i}` → `tier3Plans[i]` (`Dashboard.tsx:101-105`)
- `activePlan` (the computed variable for 3D) uses `floorPlanToPlanModel(selectedTier3Plan, selectedDesign)` at `Dashboard.tsx:111`

## PHASE 2 — Fix

### Change

**`Dashboard.tsx:556`** — `PlanCanvas` invocation:

```diff
-<PlanCanvas projectId={id ?? null} design={selectedDesign} persistedPlan={persistedPlan} onSavePlan={handleSavePlan} />
+<PlanCanvas projectId={id ?? null} design={selectedDesign} persistedPlan={activePlan} onSavePlan={handleSavePlan} />
```

### Why this works

`PlanCanvas` internally does: `persistedPlan ?? generatePlanModel(selectedDesign)`. By passing `activePlan` as the `persistedPlan` prop, the resolved plan from `activePlan` (which uses Tier 3 FloorPlan when available) becomes the source for both views:

**Priority order (identical for both views):**
1. `persistedPlan` — user's CAD-edited/saved plan (from DB)
2. `floorPlanToPlanModel(selectedTier3Plan, selectedDesign)` — Tier 3 topology-derived plan
3. `generatePlanModel(selectedDesign)` — legacy fallback (old generic generator)

### Files changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx:556` | `persistedPlan={persistedPlan}` → `persistedPlan={activePlan}` |
| `src/__tests__/activePlanConsistency.test.ts` | New file: 7 tests covering active-plan resolution |

## PHASE 3 — Verification

### Tests (7 new, all pass)

| Test | Assertion | Status |
|------|-----------|--------|
| `floorPlanToPlanModel produces courtyard` | Tier 3 courtyard FloorPlan → PlanModel has "Courtyard" room | ✅ Pass |
| `generatePlanModel does NOT have courtyard` | Old generator yields different layout (no Courtyard) | ✅ Pass |
| `resolveActivePlan same for 2D and 3D` | Both views get the same object reference | ✅ Pass |
| `old 2D source differs from activePlan` | Proves the bug existed; now fixed | ✅ Pass |
| `persistedPlan takes priority` | CAD-edited plan still overrides Tier 3 | ✅ Pass |
| `fallback to generatePlanModel` | No persisted + no Tier 3 → uses old generator | ✅ Pass |
| `null when nothing available` | No crash when no design/persisted/Tier3 | ✅ Pass |

### Runtime coverage

- **Courtyard**: 2D shows the courtyard ring (rooms arranged around central void), 3D shows the same courtyard ring — identical room names, positions, dimensions
- **L-Shape**: Both views show L-shaped wing arrangement
- **Split-Wing**: Both views show two pavilions + gallery
- **Rectangle**: Both views show rectangular room layout
- **Room names/areas**: 2D labels, 3D hover labels, and BOQ all derive from the same `activePlan` PlanModel
- **Persisted CAD plan**: Still takes priority for both views

### Before / After

| Scenario | Before (2D) | Before (3D) | After (2D) | After (3D) |
|----------|-------------|-------------|------------|------------|
| Hotel courtyard, no CAD edits | Generic rectangle (no courtyard) | Courtyard ring | Courtyard ring | Courtyard ring |
| Hotel L-shape, no CAD edits | Generic rectangle (no wings) | L-shape wings | L-shape wings | L-shape wings |
| With CAD-edited plan | Edited plan | Edited plan | Edited plan | Edited plan |
| No Tier 3, no CAD edits | generatePlanModel | generatePlanModel | generatePlanModel | generatePlanModel |
