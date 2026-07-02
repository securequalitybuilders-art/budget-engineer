# Sprint 24 — CAD Editing Persistence and Export Sync

> **Date:** 2026-07-02
> **Goal:** Make the generated/editable CAD workflow more reliable by persisting CAD edits locally and enabling downstream outputs (BIM, BOQ, analysis) to reflect the current CAD/design state. No paid APIs, no schema-destructive changes.

## CAD State Audit

Prior to Sprint 24, the CAD editing flow had no persistence layer:
- **PlanCanvas** rendered a `PlanModel` generated from `DesignOption` via `generatePlanModel()`
- **useEditablePlan** provided move/resize/undo/redo on rooms but edits were lost on page refresh
- **seedCadDocument(projectId, designId, plan)** could convert `PlanModel` → `CadDocument` but was not wired into any save flow
- **Downstream adapters** (BIM, BOQ, analysis) always read from `DesignOption`, ignoring any CAD edits

## Files Created

| File | Purpose |
|------|---------|
| `src/services/cadPersistenceService.ts` | CRUD for `PlanModel` in IndexedDB `planModels` table |
| `src/adapters/cadToDesignSyncAdapter.ts` | Fallback wrappers for BIM/BOQ/analysis with `GeometrySource` metadata |

## Files Modified

| File | Change |
|------|--------|
| `src/db/db.ts` | Added v4 migration: new `planModels` table (`id, projectId, designId, savedAt`) |
| `src/pages/Dashboard.tsx` | Load persisted PlanModel on design selection; auto-save on edit commit; CAD sync status badges in toolbar |

## What Is Persisted

| Entity | Storage | Table | Key |
|--------|---------|-------|-----|
| PlanModel (rooms, walls, openings, width/height) | IndexedDB (Dexie) | `planModels` | `plan-{projectId}-{designId}` |

Each `planModels` record stores the full `PlanModel` plus `projectId`, `designId`, and `savedAt` timestamp. No schema break — the v4 migration is additive.

## Persistence API (`cadPersistenceService.ts`)

```
savePlanModel(projectId, designId, plan)   → Promise<void>
loadPlanModel(projectId, designId)          → Promise<PlanModel | null>
hasSavedPlan(projectId, designId)           → Promise<boolean>
deletePlanModel(projectId, designId)        → Promise<void>
```

All functions are safe — missing/null inputs return null/no-op, exceptions are caught.

## Downstream Sync Behavior

The `cadToDesignSyncAdapter.ts` provides three fallback functions that wrap the existing design-to-* adapters:

| Function | Wraps | Returns |
|----------|-------|---------|
| `deriveBimFromCadOrDesign(input)` | `designOptionToBimModel` | `BimModel \| null` |
| `deriveBoqFromCadOrDesign(input)` | `buildBoqFromDesignOption` | `BoqResult \| null` |
| `deriveAnalysisFromCadOrDesign(input)` | `buildAnalysisFromDesignOption` | `AnalysisResult` |

Currently all three delegate to the design adapters. Full PlanModel → BIM/BOQ/analysis rewriting is deferred to a future sprint.

### GeometrySource Metadata

```
export type GeometrySource = 'generated-design' | 'persisted-cad' | 'fallback-generated'
```

Each function receives a `source` field that documents whether the data came from the generated design or a persisted CAD edit. This enables UI indicators (e.g. "CAD edited" badge).

## Fallback Rules

1. If no saved PlanModel exists → all downstream outputs read directly from `DesignOption` (same as before)
2. If a saved PlanModel exists and loading succeeds → outputs still read from `DesignOption` (full PlanModel sync is not yet implemented)
3. Exceptions in load/save are caught and logged — no crash, no data loss
4. `seedCadDocument` remains separate and unused (available for future full CadDocument roundtrip)

## Dashboard Integration

- **On mount + design selection change:** `loadPlanModel(projectId, designId)` is called and the result is passed as `persistedPlan` to `<PlanCanvas>`
- **On edit commit:** `useEditablePlan` fires `onSavePlan(projectId, designId, plan)` → `savePlanModel()` persists to IndexedDB
- **Toolbar badges:**
  - `"Synced"` (green) — saved PlanModel exists, no edits pending
  - `"CAD edited"` (amber) — persisted PlanModel diverges from generated design

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 9 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (145 tests, 13 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (20 precache entries) |

## Remaining Limitations

1. **Downstream adapters still read from DesignOption** — BIM/BOQ/analysis do not yet consume the persisted PlanModel. The sync adapter is wired but delegates to the design-based adapters.
2. **No PlanModel → CadDocument roundtrip** — `seedCadDocument` exists but is not called during save/load. CadDocument versioning is separate from PlanModel persistence.
3. **No test coverage** — `cadPersistenceService.test.ts` and `cadToDesignSyncAdapter.test.ts` have not been written yet. Dexie/fake-indexeddb setup is needed.
4. **No export sync** — CSV/HTML/PDF exports still use the original design-based data, not CAD-edited data.
5. **Single-plan only** — the Dashboard persists one PlanModel per `(projectId, designId)` pair. Multi-plan workflows are not supported.
6. **No source metadata in exports** — the `GeometrySource` field is available but not surfaced in CSV/HTML/PDF exports.
7. **No manual save/restore UI** — auto-save fires on every edit commit, but there is no explicit "Save" button or "Revert to generated" action.
