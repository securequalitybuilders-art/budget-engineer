# Sprint 19 — Portfolio Filters, Search, Sort, and Archive/Restore

**Date:** 2026-07-01  
**Goal:** Make the portfolio dashboard practical by adding project search, active/archived/all filters, sort controls, archive/restore actions, and comprehensive documentation updates.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/services/projectArchiveService.ts` | `archiveProject()` / `restoreProject()` — sets `isArchived` field on project via `db.projects.update()`, logs transaction |
| `src/adapters/portfolioFiltersAdapter.ts` | `filterAndSortPortfolioProjects()` — pure function for search/status filter/sort |
| `src/__tests__/portfolioFiltersAdapter.test.ts` | 11 tests covering search, active/archived filter, sort, combination, immutability, edge cases |
| `src/__tests__/projectArchiveService.test.ts` | 7 tests covering archive/restore, no-throw on missing project, empty ID, transaction logging |
| `docs/SPRINT_18_PORTFOLIO_DASHBOARD_REPORT.md` | Sprint 18 documentation (previously missing) |
| `docs/SPRINT_19_PORTFOLIO_FILTERS_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | Added optional `isArchived?: boolean` to `Project` interface |
| `src/lib/portfolio/executive-portfolio.ts` | Uses `p.isArchived ?? (p.status === 'draft')` for backward-compatible archive detection |
| `src/pages/PortfolioPage.tsx` | Added search input with clear button, status filter (All/Active/Archived), sort selector (Newest/Name/Highest Cost/Lowest Cost), archive/restore buttons on project card hover, status message toast, no-match empty state, "clear filters" button |
| `FEATURE_MATRIX.md` | Added Portfolio Dashboard + Filters/Archive rows |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 19; added Portfolio page + archive/filter features; 117 tests |
| `MERGE_LOG.md` | Added Sprint 18 + 19 entries |
| `README.md` | Description + table row + CI badge → 117 tests |

---

## Filter/Sort Behavior

| Control | Options | Behavior |
|---------|---------|----------|
| Search | Text input | Filters by project name (case-insensitive substring) |
| Status | All / Active / Archived | Active = `isArchived === false`; Archived = `isArchived === true` |
| Sort | Newest / Name / Highest Cost / Lowest Cost | Cost sorts use `grandTotal` safely (no NaN) |

All filtering is local-first, no network calls. The original array is never mutated.

---

## Archive/Restore Behavior

| Action | DB Change | Transaction Logged |
|--------|-----------|-------------------|
| Archive | `db.projects.update(id, { isArchived: true, updatedAt })` | `UPDATE / project / Project archived` |
| Restore | `db.projects.update(id, { isArchived: false, updatedAt })` | `UPDATE / project / Project restored` |

- No destructive delete
- No-throw on missing or empty project ID
- Portfolio metrics refresh automatically after archive/restore via `loadProjects()`
- Status message shown for 3 seconds after action

---

## Data Fields Used

| Field | Source | Purpose |
|-------|--------|---------|
| `Project.isArchived` | `src/types/index.ts` (new) | Archive state |
| `SchemePortfolioItem.isArchived` | `executive-portfolio.ts` | Computed from `isArchived` with `status === 'draft'` fallback |
| `SchemePortfolioItem.grandTotal` | BOQ aggregation | Cost sort |
| `SchemePortfolioItem.name` | Project name | Search and name sort |

---

## Tests Added

### `portfolioFiltersAdapter.test.ts` (11 tests)

- Returns all when no filters active
- Search by name (case-insensitive)
- Active filter excludes archived
- Archived filter only archived
- Highest cost sort
- Lowest cost sort
- Name sort (localeCompare)
- Combined search + status + sort
- Original array not mutated
- Empty projects array
- Zero grandTotal handled safely

### `projectArchiveService.test.ts` (7 tests)

- Archive sets isArchived true
- Restore sets isArchived false
- No throw on missing project
- No throw on empty project ID
- Transaction logged on archive
- Transaction logged on restore

---

## Build Result

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors (6 pre-existing warnings) |
| `npm test` | ✅ 117 passed, 12 files |
| `npm run build` | ✅ 18 precache entries |

## Remaining Limitations

- No `isArchived` IndexedDB index — full-table scan for archive filter (acceptable at local scale)
- Archive is local-only — no cloud sync
- Single-user only — no multi-user archive scoping
- Home page still lists archived projects without archive badge
- No bulk archive/restore
