# Sprint 25 — Governance Approval Actions and Comments

**Date:** 2026-07-02  
**Goal:** Turn governance from display-only into a local-first approval workflow with submit, approve, request changes, comments, timeline, and transaction logging.

---

## Workflow States

| State | Description |
|-------|-------------|
| `draft` | Initial state. Owner can submit for review. |
| `in-review` | Submitted by Owner. Reviewer can approve or request changes. |
| `approved` | Approved by Reviewer. No further actions except reset. |
| `changes-requested` | Reviewer requested changes. Owner can reset to draft. |

## Permissions

| Role | Can Submit | Can Approve | Can Request Changes | Can Reset | Can Comment |
|------|-----------|-------------|--------------------|-----------|-------------|
| **Owner** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Reviewer** | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ |

- Viewer sees disabled controls with explanation: "Viewers cannot perform governance actions."
- Owner cannot approve or request changes (must select Reviewer role).
- Reviewer cannot submit or reset (must select Owner role).

## Storage Behavior

- **Persistence:** Uses existing `db.governance` table (Dexie/IndexedDB, v3 schema) via `governance-db.ts`.
- **Schema compatible:** No destructive schema changes. Uses existing `GovernanceRecord` with `approvalState` mapping:
  - `draft` → `draft`
  - `in-review` → `in_review`
  - `approved` → `approved`
  - `changes-requested` → `rejected`
- **Transaction logging:** Each action calls `logTransaction()` from `projectPersistenceService` with action `UPDATE`, entity type `project`, and reason describing the governance action.
- **Local only:** All data stored in browser IndexedDB. No backend, no sync.

## Comments & Timeline Behavior

- **Comments:** Added via `addGovernanceCommentAction()` with type selector: `general`, `review`, `approval`, `change-request`.
- **Timeline:** Built from the `GovernanceRecord.comments` array. Each status change event and comment appears as a timeline entry, sorted newest-first.
- **Event types:** `status-change` (submit, approve, request-changes, reset) and `comment`.
- **Authorship:** Each event includes the actor's name (Owner/Reviewer/Viewer) and role label.

## Files Created

| File | Purpose |
|------|---------|
| `src/services/governanceWorkflowService.ts` | Workflow service: load, submit, approve, request changes, reset, add comment with permission checks and transaction logging |
| `src/__tests__/governanceWorkflowService.test.ts` | 15 tests covering all states, permissions, comments, edge cases |
| `docs/SPRINT_25_GOVERNANCE_WORKFLOW_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/GovernancePanel.tsx` | Added role selector, workflow action buttons, comment box with type selector, timeline section, local-only note; preserved all existing checklist, roles, audit, recommendations, warnings |
| `src/pages/Dashboard.tsx` | Passed `projectId` prop to `GovernancePanel` |
| `FEATURE_MATRIX.md` | Governance approval workflow marked as Present; Sprint 25 row added |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 25; Governance section updated; test count updated |
| `MERGE_LOG.md` | Sprint 25 entry added |
| `README.md` | Local governance approval/comments workflow mentioned |

## Tests Added

**File:** `src/__tests__/governanceWorkflowService.test.ts` — 15 tests

| Test | What it verifies |
|------|-----------------|
| Default state is draft | status = draft, timeline empty, warnings contain demo notice |
| Owner can submit for review | status = in-review, timeline has submit event with author Owner |
| Reviewer can approve | status = approved, timeline has approve event with message |
| Reviewer can request changes | status = changes-requested, timeline has request-changes event |
| Viewer cannot approve | status unchanged, warning about viewer restriction |
| Viewer cannot submit | status stays draft, warning about viewer restriction |
| Comment added appears in timeline | timeline has comment event with correct message and author |
| Reset returns draft | status = draft, timeline has reset event |
| No crash on missing project id | Returns valid state object |
| No crash on unknown project id | Returns draft state |
| Owner cannot approve | Warning about owner restriction |
| Owner cannot request changes | Warning about owner restriction |
| Empty comment returns warning | Warning about empty comment |
| Load after reset has draft state | Status = draft after full workflow cycle |
| Transaction logging does not break service | All actions succeed even if transaction logging is unavailable |

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 9 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (159 tests, 14 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS |

## Limitations

- **Local-only demo governance:** No backend, no real auth, no persistent role assignment.
- **Role selection is manual:** User must manually select Owner/Reviewer/Viewer; no real authentication flow.
- **No email notifications:** Approvals and change requests are in-app only.
- **No multi-reviewer workflow:** Single reviewer model; no sequential or parallel review chains.
- **No cross-project governance dashboard:** Per-project only.
- **No signature/evidence capture:** Comments are free text; no digital signature or evidence attachment.
