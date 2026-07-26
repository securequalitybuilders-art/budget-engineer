# Sprint 6 — Persistence (IndexedDB)

**Goal:** Persist AI-generated designs, BIM models, BOQs, and export actions to Dexie/IndexedDB so generated work survives page refresh.

## What was done

### New file: `src/services/projectPersistenceService.ts`
- `persistDesigns(projectId, options)` — converts `DesignOption[]` (domain types) to `Design[]` (store types) and upserts into `db.designs`
- `loadPersistedDesignOptions(projectId)` — reads `db.designs` back into `DesignOption[]` for initial population
- `persistBimModel(bim)` — upserts `BimModel` into `db.bimModels`
- `persistBoq(projectId, designId, ws3Boq)` — converts ws3 `BOQ` (line-item format) to store `BOQ` (section format) and upserts into `db.boqs`
- `logTransaction(projectId, action, entityType, entityId, reason, metadata)` — records audit trail in `db.transactions`
- `loadPersistedProjectWork(projectId)` — convenience loader returning designs, bims, and BOQ existence flag
- Type conversion helpers: `mapDesignOptionElementsToStore`, `mapStoreElementsToDesignOption`, `designOptionToStoreDesign`, `ws3BoqToStoreBoq`

### Modified: `src/components/dashboard/BoqExportPanel.tsx`
- Added `onExport?: (type: 'csv' | 'html' | 'print') => void` prop
- Fire `onExport` in `handleExportCsv`, `handleExportHtml`, `handlePrint`

### Modified: `src/pages/Dashboard.tsx`
- On mount: calls `loadPersistedProjectWork` to restore AI designs if no current designs exist
- On AI design generation (`handleAiDesignOptions`): calls `persistDesigns` + `logTransaction`
- On BIM model change (`useEffect` on `bimModel`): calls `persistBimModel` + `logTransaction` (guarded by `useRef` to fire once per design)
- On BOQ computation (`useEffect` on `selectedDesign`): calls `persistBoq` + `logTransaction`
- Export handler: calls `logTransaction` for CSV/HTML/Print exports

### Design decisions
| Decision | Rationale |
|---|---|
| Service layer over store | AI designs flow through the adapter, not store actions; a dedicated service with `try/catch` is cleaner |
| `db.put` (upsert) | Avoids duplicate-key errors on repeated generation; existing records with same id are overwritten |
| Type conversion in service | `@/domain/boq` and `@/types` define different `BuildingElement` shapes — service handles the mapping |
| `useRef` guard for BIM/BOQ persist | Prevents duplicate transaction logging when identity/reference doesn't change across renders |
| Migration-safe | Uses existing tables + v3 schema; no schema changes needed |

## Files changed
- `src/services/projectPersistenceService.ts` — **new**
- `src/components/dashboard/BoqExportPanel.tsx` — added `onExport` prop
- `src/pages/Dashboard.tsx` — wired persistence calls

## Verification
- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 errors
- [x] `npm run build` — builds to `dist/` successfully
