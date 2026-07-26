# Sprint 21 — Feedback and Issue Reporting Workflow

**Date:** 2026-07-01  
**Goal:** Add a simple local-first feedback and issue reporting workflow so public demo users can report bugs, confusing steps, cost inaccuracies, mobile layout issues, missing building types, export problems, and feature requests.

---

## Feedback Workflow

Users can submit feedback through three channels — all initiated by explicit user action:

1. **Copy report** — generates a structured markdown report and copies it to clipboard
2. **Open GitHub Issue** — opens `https://github.com/securequalitybuilders-art/budget-engineer/issues/new` with pre-filled title, body, and labels
3. **Send email** — opens default email client with `mailto:` link to `securequalitybuilders.art@gmail.com`

**No data is ever sent automatically.** The user chooses which action to take.

---

## Privacy Stance

- No analytics, no tracking, no telemetry
- No data collected without explicit user action
- No backend or database server
- Optional "Include browser and page information" checkbox (default: checked)
- Privacy note displayed in every FeedbackPanel:
  "Do not include confidential project data."

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/feedback/feedback-utils.ts` | `buildIssueReport()`, `buildGitHubIssueUrl()`, `buildMailToUrl()`, `copyTextToClipboard()`, `getBrowserInfo()`, `FeedbackCategory` type + `FEEDBACK_CATEGORIES` constant |
| `src/components/feedback/FeedbackPanel.tsx` | Reusable feedback form with category select, title, description, steps, include-info checkbox, Copy/GitHub/Email buttons, status messages, privacy note |
| `src/pages/FeedbackPage.tsx` | Full-page `/feedback` route rendering FeedbackPanel with header and back button |
| `src/__tests__/feedbackUtils.test.ts` | 10 tests covering issue report format, GitHub URL encoding, mailto URL, all categories, optional fields, special character safety |
| `docs/SPRINT_21_FEEDBACK_WORKFLOW_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/app/router.tsx` | Added `/feedback` lazy-loaded route |
| `src/pages/Home.tsx` | Added "Send feedback" link at bottom of page |
| `src/pages/Dashboard.tsx` | Added collapsible FeedbackPanel in right sidebar after SnapshotHistoryPanel |
| `src/pages/PortfolioPage.tsx` | Added Feedback button (Bug icon) in header next to project badges |
| `FEATURE_MATRIX.md` | Added Feedback workflow row |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 21; added feedback section |
| `MERGE_LOG.md` | Added Sprint 21 entry |
| `README.md` | Added Feedback section with `/feedback` URL and GitHub issues link |

---

## Route

- `/feedback` — full-page FeedbackPanel with back-to-home navigation
- Lazy-loaded via React Suspense

---

## Feedback Actions

| Action | Implementation |
|--------|----------------|
| **Copy report** | `navigator.clipboard.writeText()` with fallback status message |
| **Open GitHub Issue** | `window.open()` to GitHub issues/new with URL-encoded title/body/labels |
| **Send email** | `mailto:` link to `securequalitybuilders.art@gmail.com` with subject and body |

---

## Tests Added (10 tests)

### `buildIssueReport`
- Includes category, title, version, live URL, privacy note
- Includes optional fields (page, project, browser, steps) when provided
- Does not crash when optional fields are missing
- Accepts all 8 category types

### `buildGitHubIssueUrl`
- Returns valid URL pointing to correct repo
- Includes labels when provided
- Works without labels
- Encodes special characters safely (no crash)

### `buildMailToUrl`
- Returns mailto URL with subject and body
- Handles empty title gracefully

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (6 pre-existing warnings) |
| `npm test` | 127 passed, 13 files |
| `npm run build` | 20 precache entries, success |

---

## Remaining Limitations

- GitHub Issues requires a GitHub account — users without one can use email
- `navigator.clipboard` may fail in non-HTTPS or restricted contexts (fallback status shown)
- No in-app notification system for issue status tracking
- No screenshot attachment (GitHub Issues supports drag-and-drop after opening)
- No offline feedback queue — requires internet for GitHub/email
