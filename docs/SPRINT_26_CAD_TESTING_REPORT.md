# Sprint 26 — CAD Persistence and Downstream Sync Tests

**Date:** 2026-07-02  
**Goal:** Add automated tests for the Sprint 24 CAD persistence/sync foundation.

---

## Files Tested

| File | Tests |
|------|-------|
| `src/services/cadPersistenceService.ts` | 16 tests (cadPersistenceService.test.ts) |
| `src/adapters/cadToDesignSyncAdapter.ts` | 17 tests (cadToDesignSyncAdapter.test.ts) |

## Tests Added

### cadPersistenceService.test.ts — 16 tests

| Test | What it verifies |
|------|-----------------|
| savePlanModel stores a PlanModel to IndexedDB | Record stored with correct key, fields preserved |
| savePlanModel overwrites existing record for same key | Upsert behavior — last write wins |
| loadPlanModel returns saved PlanModel without extra fields | projectId/designId/savedAt fields stripped |
| loadPlanModel returns null when no persisted CAD exists | Empty state handled |
| loadPlanModel returns null for empty projectId | Early return on missing input |
| loadPlanModel returns null for empty designId | Early return on missing input |
| Saves multiple designIds and loads the correct one | Independent per (projectId, designId) |
| hasSavedPlan returns true when plan exists | Positive detection |
| hasSavedPlan returns false when plan does not exist | Negative detection |
| hasSavedPlan returns false for empty projectId | Early return on missing input |
| deletePlanModel removes stored plan | Full delete cycle |
| deletePlanModel is safe for missing record | No crash on missing record |
| Handles missing/invalid inputs safely | Null plan, empty strings all safe |
| Does not throw if IndexedDB table is empty | Graceful empty state |
| Stored record includes savedAt timestamp | Timestamp is valid ISO date |
| loadPlanModel returns a copy, not the stored reference | Mutation isolation |

### cadToDesignSyncAdapter.test.ts — 17 tests

| Test | What it verifies |
|------|-----------------|
| buildCadSyncMetadata returns generated-design when no plan | Default metadata state |
| buildCadSyncMetadata returns generated-design when saved matches | Synced state |
| buildCadSyncMetadata returns persisted-cad when diverged | CAD edited state |
| deriveBimFromCadOrDesign returns BIM from design fallback when cad is null | Design fallback works |
| deriveBimFromCadOrDesign returns BIM when cad is provided | Graceful with plan |
| deriveBimFromCadOrDesign returns null when design is null | Null design handling |
| deriveBimFromCadOrDesign returns null when design has zero GFA | Invalid design handling |
| deriveBoqFromCadOrDesign returns BOQ with grand total > 0 from fallback | Design fallback, positive total |
| deriveBoqFromCadOrDesign returns BOQ when cad is provided | Graceful with plan |
| deriveBoqFromCadOrDesign returns null when design is null | Null design handling |
| deriveBoqFromCadOrDesign respects region parameter | Zimbabwe=USD, South Africa=ZAR |
| deriveBoqFromCadOrDesign has no NaN values in totals | All numeric fields valid |
| deriveBoqFromCadOrDesign source metadata reflects fallback-generated | Source passes through |
| deriveAnalysisFromCadOrDesign returns safe analysis from fallback | Full analysis with all results |
| deriveAnalysisFromCadOrDesign returns analysis when cad provided | Graceful with plan |
| deriveAnalysisFromCadOrDesign returns empty analysis when design is null | Null design handling |
| deriveAnalysisFromCadOrDesign minimal persisted CAD does not crash | No crash on minimal input |

## Bugs Fixed

- **None.** Tests revealed no bugs in the existing services/adapters. All tests passed against the current implementation.

## What Remains Untested

1. **PlanModel → CadDocument roundtrip** — `seedCadDocument` exists but is not tested or wired into the save/load flow.
2. **UI component tests** — GovernancePanel, PlanCanvas, Dashboard CAD integration have no component tests.
3. **Export sync** — CSV/HTML/PDF exports still use original design data, not CAD-edited data. No tests for export with CAD edits.
4. **Multi-plan workflow** — Only single (projectId, designId) pair tested.
5. **Manual save/restore UI** — No explicit "Save" button or "Revert to generated" action.

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 9 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (192 tests, 16 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS |

## Files Created

| File | Purpose |
|------|---------|
| `src/__tests__/fixtures/cadFixtures.ts` | Reusable test fixtures (PlanModel, DesignOption factories) |
| `src/__tests__/cadPersistenceService.test.ts` | 16 tests for CRUD operations |
| `src/__tests__/cadToDesignSyncAdapter.test.ts` | 17 tests for sync adapter fallback behavior |
| `docs/SPRINT_26_CAD_TESTING_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `FEATURE_MATRIX.md` | CAD persistence/sync tests marked as Present |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 26, test count → 192 |
| `MERGE_LOG.md` | Sprint 26 entry added |
| `README.md` | Test count updated to 192 |

## Remaining Limitations

1. **Downstream adapters still read from DesignOption** — BIM/BOQ/analysis do not yet consume persisted PlanModel.
2. **No PlanModel → CadDocument roundtrip** — `seedCadDocument` exists but is not called during save/load.
3. **No export sync** — CSV/HTML/PDF exports still use original design-based data, not CAD-edited data.
4. **Single-plan only** — One PlanModel per (projectId, designId) pair.
5. **No source metadata in exports** — `GeometrySource` not surfaced in CSV/HTML/PDF.
6. **No manual save/restore UI** — Auto-save only, no explicit "Save" or "Revert" action.
7. **No component tests** — PlanCanvas, GovernancePanel, Dashboard CAD integration untested.
