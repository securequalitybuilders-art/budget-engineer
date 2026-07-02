# Sprint 29 — Manual CAD Save/Restore UI

**Date:** 2026-07-02  
**Goal:** Add user-facing manual save, restore, and reset controls for CAD plan persistence in the Dashboard toolbar, complementing the existing auto-save-on-edit flow.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/dashboard/CadSyncControls.tsx` | Compact dropdown card with Save CAD Now, Restore Saved CAD, Reset to Generated buttons, last-saved timestamp, source label badge, and auto-dismissing status messages |
| `docs/SPRINT_29_CAD_SAVE_RESTORE_UI_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/services/cadPersistenceService.ts` | Added `loadPlanModelMeta()` — returns `{ hasSavedPlan, savedAt }` without stripping `savedAt` from the returned PlanModel (existing `loadPlanModel` contract unchanged) |
| `src/pages/Dashboard.tsx` | Added CadSyncControls rendered in toolbar replacing static status badges; added `lastSavedAt`, `statusMessage`, `statusType`, `isManualSaving` state; added manual save/restore/reset handlers with auto-dismiss status; loads metadata on mount/selection change |
| `src/__tests__/cadPersistenceService.test.ts` | 3 new tests for `loadPlanModelMeta` (returns timestamp when plan exists, false when absent, false for empty projectId) |

## Manual Save Behavior

1. **Save CAD Now** — Manually persists the current `persistedPlan` to IndexedDB via `savePlanModel`, updates `lastSavedAt` timestamp, shows green success status (3-second auto-dismiss).
2. **Restore Saved CAD** — Re-loads the latest saved plan from IndexedDB via `loadPlanModel`, replaces `persistedPlan`, refreshes timestamp via `loadPlanModelMeta`.
3. **Reset to Generated** — Sets `persistedPlan` to null, resets source to `generated-design`, calls `deletePlanModel` (safe — catches errors), shows info status.

All actions log to transaction history.

## Status Message System

- `showStatus(msg, type)` — sets message + type, clears any existing timer, sets 3-second auto-dismiss via `setTimeout`
- Status types: `'success'` (emerald), `'error'` (red), `'info'` (cyan)
- Uses `useRef` for the timer to prevent stale closure issues

## UI Component (`CadSyncControls.tsx`)

- Compact "CAD" button in toolbar toolbar — shows `Save` icon, expands to dropdown on click
- **Source label badge** — color-coded: amber for Edited CAD, emerald for Generated, red for Fallback
- **Last saved time** — `Clock` icon + formatted date (e.g. "Saved Jul 2, 02:30 PM")
- **Save CAD Now button** — cyan accent, shows "Saving..." when `isSaving` is true
- **Restore Saved CAD button** — neutral style
- **Reset to Generated button** — neutral style, red hover
- **Status message area** — only visible when `statusMessage` is set
- All buttons disabled when no project/design selected
- Accessible labels on all buttons

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors) |
| `npm test` (`vitest run`) | ✅ PASS (238 tests, 18 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3379 modules, 16 precache) |

## Remaining Limitations

1. **Auto-save on edit commit still primary** — Manual Save CAD Now is a secondary/user-triggered action alongside the existing auto-save wired via `useEditablePlan` → `onSavePlan`.
2. **Single-plan per (projectId, designId)** — Only one PlanModel stored per key, matching existing `savePlanModel` behavior.
3. **No full-snapshot comparison** — SnapshotHistoryPanel provides versioning; CadSyncControls only stores the current plan.
4. **No persistence for `loadPlanModelMeta`** — `savedAt` is retrieved from the stored DB record; the `lastSavedAt` state is local and lost on page reload (re-read on mount).
5. **No mobile-specific CAD controls** — The dropdown works on mobile but CAD editing itself remains desktop/tablet-oriented.
