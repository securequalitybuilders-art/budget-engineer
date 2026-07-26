# Sprint 12 — Public Demo Audit and Polish

**Date:** 2026-07-01  
**Live URL:** https://budget-engineer.vercel.app/  
**Repo:** https://github.com/securequalitybuilders-art/budget-engineer  
**Previous commit:** `df81d06` — Document live demo deployment

---

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 6 pre-existing warnings |
| `npm test` | ✅ 58 passed (7 files) |
| `npm run build` | ✅ 3369 modules, 16 precache |

---

## SEO / Meta Audit

### Changes Made to `index.html`

| Tag | Before | After |
|-----|--------|-------|
| `<title>` | "Dzenhare OS — Budget Engineer Studio" | "Budget Engineer — AI CAD BIM BOQ Construction Cost OS" |
| `<meta description>` | "Build Smart. Build Together. Build Africa." | "Local-first Budget Engineering OS for AI-powered building briefs, 2D CAD, 3D BIM, engineering checks, regional BOQs, and construction cost exports." |
| `og:title` | ❌ Missing | ✅ Added |
| `og:description` | ❌ Missing | ✅ Added |
| `og:type` | ❌ Missing | ✅ Added (`website`) |
| `og:url` | ❌ Missing | ✅ Added |
| `twitter:card` | ❌ Missing | ✅ Added (`summary_large_image`) |
| `twitter:title` | ❌ Missing | ✅ Added |
| `twitter:description` | ❌ Missing | ✅ Added |
| `<link rel="canonical">` | ❌ Missing | ✅ Added |

No external image dependencies were added.

---

## Accessibility Audit

### Files Fixed

**`EngineeringStudioPanel.tsx` — Tab ARIA attributes**

| Issue | Fix |
|-------|-----|
| Tab container missing `role="tablist"` | Added `role="tablist"` to the flex wrapper |
| Tab buttons missing `role="tab"` and `aria-selected` | Added `role="tab"` and `aria-selected={activeTab === tab.id}` to each button |
| Tab buttons missing `aria-controls` | Added `aria-controls` pointing to panel id |
| Tab content panels missing `role="tabpanel"` and `aria-labelledby` | Added `role="tabpanel"` and `aria-labelledby` matching the tab button id |
| Tab content panels not hidden from screen readers when inactive | Added `hidden` attribute based on `activeTab` |

**`BoqExportPanel.tsx` — Form label + toggle ARIA**

| Issue | Fix |
|-------|-----|
| "Pricing Region" `<label>` missing `htmlFor` | Added `htmlFor="pricing-region"` |
| `<select>` missing `id` | Added `id="pricing-region"` |
| "Rate Assumptions" toggle missing `aria-expanded` | Added `aria-expanded={showAssumptions}` |
| "Rate Assumptions" toggle missing `aria-controls` | Added `aria-controls="rate-assumptions-content"` |
| Collapsible assumptions container missing `id` | Added `id="rate-assumptions-content"` |

### Files Already Accessible (no changes needed)

| File | Notes |
|------|-------|
| `Button.tsx` | Native `<button>`, extends `ButtonHTMLAttributes`, keyboard focus visible, disabled state handled |
| `Home.tsx` | Semantic landmarks, accessible action buttons with visible text |
| `ProjectWizard.tsx` | All form inputs properly labeled with `<Label htmlFor>` |
| `Dashboard.tsx` | All icon-only toolbar buttons have `aria-label` |
| `EngineeringAnalysisPanel.tsx` | All data presented with visible text labels |

---

## Mobile / Responsive Polish

| Issue | Fix |
|-------|-----|
| BOQ table could overflow on small screens | Changed `overflow-y-auto` to `overflow-auto` on the table wrapper to allow horizontal scroll |

No layout redesigns were made. The Dashboard sidebar panels are designed for desktop-first use.

---

## Performance / Bundle Audit

| Metric | Value |
|--------|-------|
| Total modules built | 3369 |
| PWA precache entries | 16 (~2.15 MB) |

### Largest Chunks

| Chunk | Size (uncompressed) | Gzip | Notes |
|-------|-------------------|------|-------|
| `BimViewer-CcqW4ywL.js` | 866 KB | 234 KB | Lazy loaded via `React.lazy` — not in critical path |
| `Dashboard-CGfq5RAC.js` | 727 KB | 194 KB | Loaded on `/project/:id` route |
| `react-vendor-DQSCNBI9.js` | 206 KB | 67 KB | React, ReactDOM, React Router |
| `ui-vendor-iyht0qsF.js` | 157 KB | 49 KB | Framer Motion, Lucide, Tailwind Merge |
| `state-vendor-DF-d8d6i.js` | 109 KB | 37 KB | Zustand, Immer, Dexie |
| `index-xuhUWzyf.js` | 91 KB | 24 KB | Main entry, route definitions, shared logic |

### Bundle Splitting

- **BimViewer is lazy loaded** — 866 KB chunk only fetched when user clicks 3D toggle
- **WebLLM is externalized** — 0.92 KB stub chunk, excluded from main bundle via `vite.config.ts`
- **Manual chunks configured** — react-vendor, ui-vendor, state-vendor split in `rollupOptions.output.manualChunks`

### Recommendations

- Dashboard and BimViewer chunks are large (727 KB + 866 KB) but acceptable for a desktop engineering tool
- Future: code-split analysis adapters, move Three.js to dynamic import only
- No regressions introduced in this sprint

---

## Live Route Checks

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ 200 | Home page with project wizard CTA |
| `/new` | ✅ 200 | SPA fallback, 3-step wizard loads |
| `/project/demo` | ✅ 200 | SPA fallback, Dashboard loads |
| `/manifest.webmanifest` | ✅ 200 | PWA manifest served |
| `/sw.js` | ✅ 200 | Service worker with 16 precached entries |
| `/registerSW.js` | ✅ 200 | SW registration script |
| `/icon-192.png` | ✅ 200 | PWA icon |
| `/icon-512.png` | ✅ 200 | PWA icon |
| `/favicon.svg` | ✅ 200 | SVG favicon |
| `/assets/*.js` | ✅ All 200 | All JS chunks resolve without errors |

The live site is currently serving the Sprint 11 build (`df81d06`). SEO and accessibility fixes from this sprint will be deployed after the next push.

---

## Issues Fixed

| Area | Issue | Fix |
|------|-------|-----|
| SEO | Missing OG/Twitter/canonical meta tags | Added 8 meta tags to `index.html` |
| SEO | Generic description | Updated to descriptive SEO-friendly text |
| SEO | Non-descriptive title | Updated to keyword-rich title |
| A11y | Tab widget missing ARIA roles | Added `role="tablist"`, `role="tab"`, `role="tabpanel"` with states |
| A11y | Form label not associated with select | Added `htmlFor` / `id` |
| A11y | Toggle button missing expanded state | Added `aria-expanded` and `aria-controls` |
| Mobile | BOQ table overflow on small screens | Changed to `overflow-auto` for horizontal scroll |
| Docs | Sprint 11 report stale commit hash | Updated to `df81d06` |

---

## Issues Deferred

| Issue | Reason |
|-------|--------|
| Image for `og:image` | Would require a screenshot or generated preview image |
| Large Dashboard chunk (727 KB) | Bundle splitting would require module-level code changes |
| Large BimViewer chunk (866 KB) | Already lazy loaded; further splitting would require refactoring Three.js usage |
| Component-level tests | Out of scope (pure function tests already exist) |
| Mobile-first responsive layout | Dashboard sidebar panels are desktop-optimized by design |
| Keyboard navigation for CAD canvas | PlanCanvas uses custom pointer events; complex to retrofit |

---

## Next Sprint Recommendation

Consider for Sprint 13 or later:
- Add `og:image` (generated screenshot of the app)
- Improve Dashboard chunk size by splitting analysis adapters
- Add end-to-end smoke test using Playwright or Cypress
- Wire remaining staged WS6 panels (ExportPanel, TransactionHistoryPanel)
- Add floor variation for multi-floor designs
- Investigate `npm audit` warnings (8 vulnerabilities, pre-existing)
