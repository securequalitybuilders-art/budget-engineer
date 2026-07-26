# Sprint 95 — Clean Lighthouse Audit + Performance Fixes

**Date:** 2026-07-08
**Tool:** Lighthouse CI v12.6.1 (headless Chrome, **no browser extensions**)

## The Problem: Extension-Distorted Audit

The prior Lighthouse run (part of Sprint 93) showed **Performance 0.34** — an artifact of the **Sider** browser extension (`chrome-extension://difoiogjjojoaoomphldepapgpbgkhkb`) injecting ~3.1s CPU time and ~9MB JavaScript. That extension's scripts exceeded the entire app's byte weight and singlehandedly destroyed the performance score.

## Clean Baseline (This Sprint)

Audit against local production build via `vite preview` on port 4173. Confirmed **zero `chrome-extension://` entries** in `bootup-time` or `long-tasks`.

| Category        | Sprint 93 (extension-distorted) | Sprint 95 (clean) | Change |
| --------------- | ------------------------------- | ----------------- | ------ |
| Performance     | 34 (distorted)                  | **74**            | +40    |
| Accessibility   | 53 (distorted)                  | **100**            | +47    |
| Best Practices  | N/A                             | **100**            | N/A    |
| SEO             | 100                             | **100**            | 0      |

### Key Metrics

| Metric | Value |
|--------|-------|
| FCP (First Contentful Paint) | 2.2 s |
| LCP (Largest Contentful Paint) | 7.7 s |
| TBT (Total Blocking Time) | 50 ms |
| CLS (Cumulative Layout Shift) | 0 |

The LCP is driven by large JS bundle evaluation on mobile-throttled CPU — expected for a feature-rich offline app.

## Fixes Applied

### 1. Self-Hosted Fonts (Part 2)

**Before:** Render-blocking `@import url('https://fonts.googleapis.com/css2?...')` in `src/styles/index.css` fetched 3 font families (Inter, Space Grotesk, JetBrains Mono) over the network — fails offline, causes render-block, adds CLS on load.

**After:** All 10 font weight variants (Inter 400/500/600/700, Space Grotesk 500/600/700, JetBrains Mono 400/500/600) downloaded as TTF from Google Fonts CDN, stored in `public/fonts/`, declared with `@font-face` + `font-display: swap` in `index.css`. Added `<link rel="preload" as="font">` for Inter 400 in `index.html`.

**Benefits:**
- Zero render-blocking font requests
- Fonts work **offline** (auto-precached by PWA service worker)
- No CLS from web font swap (font-display: swap already handles it gracefully)

### 2. Code-Splitting the Dashboard Bundle (Part 2)

**Before:** The `Dashboard.tsx` eagerly imported `BOQPanel` (includes `recharts` chart library, ~361 KB) and `DocsBimStage` (which eagerly pulled in `DrawingsPanel` with all 11 SVG drawing views).

**After:**
- `LazyBOQPanel` — wraps `BOQPanel` in `React.lazy` + `<Suspense>` with skeleton fallback. Defers `recharts` and BOQ logic until the Cost & Deliver stage is opened.
- `LazyDocsBimStage` — wraps `DocsBimStage` in `React.lazy` + `<Suspense>`. Defers all drawing SVG views (Elevation, Section, Site, Foundation, Roof, RCP, Electrical, Plumbing, HVAC, PresentationSheet) until the Docs & BIM stage is opened.

**Chunk size impact:**
| Chunk | Before | After |
|---|---|---|
| Main workspace (Dashboard) | ~1 MB (lumped) | **575 KB** |
| BOQPanel (deferred) | — | 362 KB (lazy) |
| DocsBimStage (deferred) | — | ~2 KB wrapper |

The initial workspace paint is now leaner. Heavy sub-features load only when the user navigates to their stage.

## Audit Confidence

This audit is clean: no extension interference, real scores, real metrics. The 74 Performance score reflects a genuine feature-rich app with large JS bundles (makerjs, three.js, recharts, OpenCV) — all loaded on demand. Further improvement would require tree-shaking those libraries or replacing with smaller alternatives, which is out of scope for v1.0.0 polish.

## Files Changed

| File | Change |
|------|--------|
| `public/fonts/*.ttf` | 10 new self-hosted font files |
| `src/styles/index.css` | Replaced `@import` Google Fonts with `@font-face` rules |
| `index.html` | Added `<link rel="preload" as="font" crossorigin>` for Inter 400 |
| `src/components/layout/LazyBOQPanel.tsx` | New lazy wrapper for BOQPanel |
| `src/components/dashboard/stages/LazyDocsBimStage.tsx` | New lazy wrapper for DocsBimStage |
| `src/pages/Dashboard.tsx` | Switched BOQPanel → LazyBOQPanel, DocsBimStage → LazyDocsBimStage |
| `docs/SPRINT_95_CLEAN_PERF_REPORT.md` | This report |
| `CHANGELOG.md` | Updated |