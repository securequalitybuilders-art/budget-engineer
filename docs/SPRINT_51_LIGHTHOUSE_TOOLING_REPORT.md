# Sprint 51 — Repeatable Lighthouse Auditing Tooling

**Date:** 2026-07-05
**Tool:** `@lhci/cli` v0.15.1 (Apache-2.0, free/permissive)
**Config:** `lighthouserc.json` at repo root

## Goal

Add repeatable, local Lighthouse CI (LHCI) tooling so production-quality audits can be run on demand against a production build. This provides a baseline for tracking performance, accessibility, best-practices, SEO, and PWA quality over time — without requiring a paid service.

## What was done

1. **Installed `@lhci/cli`** as a devDependency (Apache-2.0).
2. **Created `lighthouserc.json`** at repo root.
3. **Added npm script** `npm run lighthouse`.
4. **Updated `.gitignore`** to exclude generated report artefacts.
5. **Documentation** in this file.

## Configuration

### Routes audited

| Route | Notes |
|-------|-------|
| `/` | Home / landing page — renders full marketing layout; project section gracefully hides when no projects exist |
| `/portfolio` | Portfolio dashboard — renders empty-state messaging when no projects exist |
| `/feedback` | Feedback form — fully static, no data dependency |

The project route `/project/:id` is **not** audited because it requires an existing project in IndexedDB, which Lighthouse cannot easily create.

### How it serves the app

`lhci autorun` uses `startServerCommand: "npm run preview"`, which starts `vite preview` on port **4173** serving the production build from `dist/`. This ensures the service worker, PWA manifest, code-split chunks, and all production assets are audited as a real user would experience them.

### Scoring / assertions

- **Preset:** `lighthouse:recommended` (all recommended audits run)
- **All category assertions are set to `"warn"`** — the audit runs, scores are recorded, reports are saved, but the CLI exits with code 0. This is **baseline mode** — we can see scores without breaking CI.
- To enable error-gating later, change the desired category assertions from `"warn"` to `["error", {"minScore": 0.9}]` etc.

### Report output

- **Target:** `filesystem`
- **Output directory:** `./lighthouse-report`
- Generated artefacts include `.html` reports per route per run, plus a summary manifest. Open any `.html` file in a browser for the full Lighthouse report.

Also generates `.lighthouseci/` (temporary processing data) — both are gitignored.

## How to run

```bash
# Full audit: build production app + run Lighthouse (3 runs per route, median)
npm run lighthouse
```

**Prerequisites:**
- Google Chrome or Chromium must be installed (LHCI launches it headlessly).
- No dev server should be running on port 4173.

**Expected duration:** 2–5 minutes (build + 3 runs × 3 routes = 9 Lighthouse audits).

## Reading the report

After `npm run lighthouse` completes:

```bash
# Open the HTML report for each route
open lighthouse-report/http_localhost-4173_/chrome.lighthouse.report.html
open lighthouse-report/http_localhost-4173_portfolio/chrome.lighthouse.report.html
open lighthouse-report/http_localhost-4173_feedback/chrome.lighthouse.report.html
```

Each HTML report contains full Lighthouse results: scores, opportunities, diagnostics, and passed audits.

## Notes

- **NO_FCP fix (Sprint 31A)** is already deployed — the "project not found" route shows meaningful text, not a CSS-only spinner, so real FCP/MPFID scores should now be produced.
- The service worker (PWA) registers with `skipWaiting: true` and `clientsClaim: true` (Sprint 39D), so PWA audit checks for installability and offline support are meaningful.
- Audits are **opt-in / manual** — they do not run during `npm test`, `npm run build`, or CI by default. Add `npm run lighthouse` to CI when ready to gate on scores.
