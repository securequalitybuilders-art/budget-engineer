# Sprint 17 — Snapshot History and Comparison

**Date:** 2026-07-01  
**Goal:** Add visible local-first project history: save snapshots of design/BOQ state, list project snapshots, compare current vs previous with cost and quantity deltas.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/services/projectSnapshotService.ts` | Snapshot save/load/compare service using existing `db.snapshots` table |
| `src/components/dashboard/SnapshotHistoryPanel.tsx` | Collapsible Dashboard sidebar panel for snapshot management |
| `src/__tests__/projectSnapshotService.test.ts` | 13 tests covering save/load/compare |
| `docs/SPRINT_17_SNAPSHOT_HISTORY_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Imported SnapshotHistoryPanel; added memoized `currentBoq`; rendered panel after GovernancePanel |
| `FEATURE_MATRIX.md` | Snapshots → wired; Snapshot History Panel row; Sprint 17 count |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 17; Versioning section updated; 99 tests |
| `MERGE_LOG.md` | Sprint 17 entry |
| `README.md` | Description + table row + CI badge → 99 tests |

---

## Snapshot Storage Approach

**Table:** `db.snapshots` (existing v3 Dexie schema)  
**Type:** `ProjectSnapshot` from `@/domain/versioning`  
**Payload:** JSON string in `notes` field — no schema changes

| `ProjectSnapshot` field | Stored value |
|---|---|
| `id` | `uuid()` |
| `projectId` | From input |
| `name` | User label or auto-generated `v2026-07-01` |
| `timestamp` | ISO 8601 |
| `cadId` | Design ID |
| `bimId` | Empty |
| `boqId` | BOQ ID if available |
| `notes` | `JSON.stringify({designName, fingerprint, grossFloorArea, floors, grandTotal, currency, externalWallArea, partitionArea, doorCount, windowCount, finishFloorArea, serviceZoneArea, roomCount})` |

---

## Service Functions

### `saveProjectSnapshot(input)`
- Guards: returns `null` if no `projectId` or no `design`
- Computes deterministic fingerprint (djb2 from design id/name/GFA/floors/elements)
- Computes quantity summary from `extractGeometryQuantities()`
- Writes `ProjectSnapshot` to `db.snapshots.put()`
- Logs `'CREATE'/'project'` transaction via `logTransaction()`
- Reads back and returns `ProjectSnapshotRecord`

### `loadProjectSnapshots(projectId)`
- Queries `db.snapshots.where({projectId}).reverse().sortBy('timestamp')`
- Returns `ProjectSnapshotRecord[]` sorted newest first
- Returns `[]` for empty/null projectId or DB errors

### `compareCurrentToSnapshot({currentDesign, currentBoq, snapshot})`
- Returns `{hasComparison: false}` if no snapshot or no current design
- Computes: costDelta, costDeltaPercent, areaDelta, floorDelta, wallAreaDelta, doorCountDelta, windowCountDelta
- All values clamped to finite non-negative where applicable
- Warns if no current BOQ available

---

## Panel Behavior

### Empty State
- "Save a snapshot to compare future design changes." with camera icon
- Save button disabled until design exists

### Save Snapshot
- Text input for optional label
- Camera button saves current design + BOQ state
- Auto-generates label as `v2026-07-01` format if empty
- Button disabled when saving (spinner shown)

### Snapshot List
- Shows all saved snapshots sorted newest first
- Each entry: label + date + cost (if > 0)
- Selected snapshot highlighted with cyan background
- Count badge in header

### Comparison Cards
- Appears when a snapshot is selected and a current design exists
- Shows delta rows: Cost (with %), Floor area, Floors, Walls, Doors, Windows
- Green arrow up = increase, Red arrow down = decrease, Gray minus = unchanged
- Warning if no current BOQ

### Local-Only Note
- "Stored in this browser." with database icon

---

## Tests Added

**File:** `src/__tests__/projectSnapshotService.test.ts` — 13 tests

| Test | What it verifies |
|------|-----------------|
| Saves a snapshot from design and boq | Label, designId, grandTotal, fingerprint length |
| Returns null when no design | Null guard |
| Returns null when no projectId | Empty projectId guard |
| Loads snapshots for a project | Loaded array length, newest first sort |
| Returns empty array for unknown project | No crash, returns [] |
| Returns empty array for empty projectId | Empty string guard |
| Returns hasComparison false when no snapshot | Safe null comparison |
| Returns hasComparison false when no current design | Safe null design |
| Computes cost delta correctly | 66000 → 78100 = 28100 delta, 56.2% |
| No NaN when totals missing | All delta fields finitely defined |
| Computes quantity deltas correctly | Area +50, floors +1 |
| Warns when no current BOQ | Warning message present |
| Save/load roundtrip preserves data | All fields: label, designName, GFA, floors, grandTotal, currency, fingerprint |

---

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (99 tests, 10 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3375 modules, 16 precache) |

---

## Remaining Limitations

| Limitation | Details |
|------------|---------|
| **No full BIM diff** | `snapshot-diff.ts` uses BimModel/BOQ types not available in dashboard flow |
| **No snapshot delete** | Snapshots accumulate; no UI to remove old ones |
| **No snapshot rename** | Labels set at save time only |
| **No auto-version labeling** | Labels are manual or date-based; no incrementing version number |
| **No multi-snapshot comparison** | Compare only current vs one selected snapshot |
| **No cross-project snapshot portfolio** | All snapshots per-project only |
| **No component tests** | SnapshotHistoryPanel render tests deferred |
