# Sprint 16 — Governance, RBAC, Audit Trail Dashboard Panel

**Date:** 2026-07-01  
**Goal:** Wire the existing governance/RBAC/versioning/audit foundations into a visible dashboard panel for enterprise and institutional credibility.

---

## Governance Modules Inspected

| Module | File | Used? |
|--------|------|-------|
| GovernanceRecord / ApprovalState types | `src/domain/governance.ts` | Yes — status naming aligned (draft/in_review/reviewed/exported) |
| UserRecord / UserRole types | `src/domain/rbac.ts` | Yes — role descriptions use owner/reviewer/viewer |
| ProjectSnapshot type | `src/domain/versioning.ts` | Yes — snapshotCount tracked (0 until snapshot UI built) |
| TransactionEvent type | `src/domain/transaction.ts` | No — project uses `@/types` ProjectTransaction instead |
| canReview/canApprove/canReject helpers | `src/lib/auth/rbac.ts` | Yes — used for role permission descriptions |
| session persistence | `src/lib/auth/session.ts` | Not directly used; demo-mode disclaimer shown |
| governance-db (getGovernance, setGovernanceState) | `src/lib/db/governance-db.ts` | Not wired to UI; staged for future approval flow |
| SnapshotDiff | `src/lib/versioning/snapshot-diff.ts` | Not wired; full diff UI deferred |
| designFingerprint | `src/lib/versioning/fingerprint.ts` | Yes — adapter uses same djb2 algorithm |
| designMetrics / summarizeChanges | `src/lib/versioning/design-metrics.ts` | No — adapter creates simpler fingerprint |
| ProjectTransaction (store type) | `src/types/index.ts` | Yes — read from projectStore for audit trail |
| governance/snapshots tables (Dexie) | `src/db/db.ts` | Tables exist in v3 schema; available for future mutation |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/adapters/governanceAdapter.ts` | `buildGovernanceSummary()` — pure function producing GovernanceSummary from design/BIM/BOQ/analysis state + transactions |
| `src/components/dashboard/GovernancePanel.tsx` | Collapsible Dashboard sidebar panel with 6 sections: status badge/fingerprint, created date, approval readiness checklist, RBAC roles & permissions, recent activity audit trail, recommendations, local-demo warnings |
| `src/__tests__/governanceAdapter.test.ts` | 13 tests covering all states and edge cases |
| `docs/SPRINT_16_GOVERNANCE_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Imported GovernancePanel; rendered at end of right sidebar after EngineeringAnalysisPanel; passes selectedDesign, hasBim, hasBoq, hasAnalysis |
| `FEATURE_MATRIX.md` | Governance/RBAC/Snapshot features marked as wired; Governance Dashboard Panel row added; Sprint 16 summary count |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 16; Governance & RBAC section updated; known gap closed; 8 adapters listed; GovernancePanel in component list; 86 tests |
| `MERGE_LOG.md` | Sprint 16 entry with all files, decisions, build results, deferred items |
| `README.md` | Description updated; Sprint 16 row added in table; CI badge updated to 86 tests |

---

## Panel Behavior

### Governance Status
- **Draft** — 0–4 checklist items satisfied (no design, or missing BIM/analysis/BOQ)
- **Ready for Review** — 5 items satisfied (design + BIM + BOQ, missing analysis or export)
- **Reviewed** — 6 items satisfied (design + BIM + analysis + BOQ + export available)
- **Exported** — any EXPORT transaction detected in audit trail

### Approval Readiness Checklist (7 items)
1. Design option generated
2. 2D plan available
3. 3D BIM available
4. Engineering analysis available
5. BOQ generated
6. Export available
7. Professional review required (always unsatisfied — safety disclaimer)

### RBAC Roles Displayed
- **Owner** — can generate designs, edit, export, manage project
- **Reviewer** — can review designs and export documents
- **Viewer** — can view project data only
- Always shows: "Local demo mode — no real authentication."

### Design Fingerprint
- Deterministic djb2 hash from: `id|name|GFA|floors|elements(type:quantity...)`
- Truncated to 8 characters for compact display
- Stable for same design; different for different designs

### Audit Trail
- Shows latest 5 transactions from IndexedDB (via projectStore.transactions)
- Each entry: action + entityType + timestamp
- Empty state: "No activity yet. Generate a design to see events."

### Recommendations
- Conditional suggestions: generate design, switch to 3D BIM, generate BOQ, run analysis

### Warnings
- Always shown when design exists: local demo notice + professional review reminder

---

## RBAC Limitations
- **No real authentication** — all actions permitted; roles displayed as reference only
- **No login screen, no user switching** — single "local-user" owner
- **Authorization functions exist** but not enforced in UI — staged for future
- **Role descriptions are static** — not derived from actual user session

---

## Local-Only Audit Behavior
- Transactions loaded from IndexedDB via `projectStore.loadProject()`
- Sorted by `createdAt` descending (newest first)
- Latest 5 shown in GovernancePanel
- Transaction types: CREATE, UPDATE, DELETE, EXPORT, AI_GENERATE
- Entity types: project, brief, design, boq, export
- Already triggered by: project creation, brief update, design generation, BOQ generation, BIM model creation, export

---

## Snapshot/Fingerprint Behavior
- **Snapshot count**: always 0 (snapshot table exists but not populated by current flows)
- **Fingerprint**: computed from design metadata — changes when design id/name/GFA/floors/elements change
- **Full snapshot diff**: deferred — `snapshot-diff.ts` exists but not wired to UI

---

## Tests Added

**File:** `src/__tests__/governanceAdapter.test.ts` — 13 tests

| Test | What it verifies |
|------|-----------------|
| Draft status when no design | status = 'draft', fingerprint = null, all checklist items unsatisfied |
| Ready for Review (5 of 6 items) | status = 'ready_for_review' with design + BIM + BOQ, no analysis |
| Reviewed (6 of 6 items) | status = 'reviewed' with all items satisfied |
| Exported (has EXPORT transaction) | status = 'exported' when any transaction has EXPORT action |
| Stable fingerprint for same design | Two calls with same design produce identical hash |
| Different fingerprints for different designs | Different name/GFA produce different hash |
| Role descriptions include all 3 roles | Owner, Reviewer, Viewer present |
| Recent transactions limited to 5 | 10 transactions passed → 5 returned |
| Recommendations when design is missing | First recommendation: "Start by generating a design" |
| Warnings when design exists | Contains "local demo" warning |
| No throw on null/undefined | Null design, false bools, undefined transactions |
| No NaN in any field | Design with NaN GFA → JSON.stringify does not contain 'NaN' |
| Timestamps passed through | projectCreatedAt and projectUpdatedAt appear in output |

---

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (86 tests, 9 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3373 modules, 16 precache) |

---

## Deferred Enterprise Items

| Item | Reason | Staged In |
|------|--------|-----------|
| **Governance state mutations** (set approval state, add comments) | Requires UI controls + local-demo guard; governance-db functions exist | `src/lib/db/governance-db.ts` |
| **Full snapshot diff viewer** | `snapshot-diff.ts` exists; complex diff UI deferred to future sprint | `src/lib/versioning/snapshot-diff.ts` |
| **Real RBAC auth backend** | Requires backend; current scope is local-first only | `src/lib/auth/rbac.ts` |
| **Role enforcement in UI** (disable buttons by role) | Requires real auth; current scope is display-only | `src/lib/auth/rbac.ts` |
| **Persist active view preference** (canvas view) | Low priority; localStorage already available | Future |
| **User switching / impersonation** | Requires auth system | Future |
| **Cross-project governance dashboard** | Multi-project view deferred | `src/lib/portfolio/` modules |
| **Email notifications** (review requested, approved) | Requires backend | Future |
| **Snapshot creation / compare UI** | Full versioning workflow deferred | `src/domain/versioning.ts` |
| **Component tests** (GovernancePanel render) | Requires jsdom + @testing-library/react | Future |
