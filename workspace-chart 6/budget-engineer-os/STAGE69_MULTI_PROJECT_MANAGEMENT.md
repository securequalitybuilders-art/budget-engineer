# Stage 69 — Multi-Project Management (Critical-Path #4)

Closes critical-path item #4: the OS is no longer single-project. You can **create, open,
archive, restore and rename** schemes, each with its **own isolated** CAD / BIM / BOQ /
revisions / transactions — the enterprise multi-scheme capability.

## What shipped

- **`src/store/appStore.ts`**:
  - New state: `projects: ProjectRecord[]`, `activeProjectId: string`.
  - New helper `loadProjectIntoState(set, get, projectId)` — loads (or seeds) a project's
    CAD/BIM/BOQ/revisions and makes it active; single source of switch logic.
  - New actions: `createProject(name)`, `openProject(id)`, `archiveProject(id)` (toggle +
    auto-switch away if archiving the active one), `renameProject(id, name)`.
  - `initialize` now ensures the demo exists, loads **all** projects, and opens the active.
  - Replaced every runtime `DEMO_ID` reference (`bumpRevision`, `generateFromBrief`) with
    `get().activeProjectId`, so revisions and AI generation target the open project.
  - The data layer was already per-project keyed (`cad-{id}`, `bim-{id}`, `boq-{id}`,
    revisions by `projectId`, transactions filtered by `projectId`) — this stage wires the
    UI/state to it.
- **`src/components/panels/ProjectSwitcherPanel.tsx`** — new-project input, project list
  with open / archive / restore, double-click rename, active highlight, show-archived toggle.
  Mounted at the top of the workspace left column.

## Verified isolation (real Dexie layer via fake-indexeddb)

| Check | Result |
|---|---|
| Two projects coexist | `proj-A`, `proj-B` in DB ✓ |
| Independent geometry | A wall end.x=12, B end.x=16 ✓ |
| Independent BOQ | A $106,884 vs B $113,598 ✓ |
| Transactions scoped | A:1, B:1 ✓ |
| No cross-bleed | distinct ids, correct `projectId` per record ✓ |

(`fake-indexeddb` was a test-only devDependency; nothing ships with it.)

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 174 KB (gzip 57), three still deferred.

## Honest scope note

Switching reloads the project from IndexedDB each time (no in-memory cache of multiple
open projects). Cross-project comparison/portfolio views are not in this slice — this is
the management layer (create/open/archive/rename) those would build on. Material/region/
rebar/load/soil settings remain app-level (shared), not yet per-project.

## Critical-path status

- ✅ #1 3D BIM viewer · ✅ #2 editable plan · ✅ #3 consolidation · ✅ #4 multi-project
- ⬜ #5 local-LLM brief parsing (last; `parseBriefAsync` seam ready)
