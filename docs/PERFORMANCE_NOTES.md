# Performance Baseline — Budget Engineer OS

## Current Measures

| Metric | Status | Details |
|--------|--------|---------|
| Lazy loading | All routes (`React.lazy`) | Home, Dashboard, Portfolio, Studio routes, Academy |
| Code splitting | Manual chunks in `vite.config.ts` | react-vendor, ui-vendor, state-vendor, cad-vendor |
| Bundle warnings | `chunkSizeWarningLimit: 512` (KB) | Vite warns on oversized chunks |
| Portfolio pagination | 12 items/page, "Load More" button | Prevents full-list re-render for 100+ projects |
| PWA caching | Service worker (vite-plugin-pwa) | Precaches static assets; `cleanupOutdatedCaches` |
| Lighthouse CI | Performance budget: min 0.76 | Runs on build via `lighthouserc.json` |

## Deferred (Not Implemented Today)

| Item | Reason |
|------|--------|
| Web Workers for heavy computation | Low current usage; AI adapters are lightweight JS |
| `react-window` / `tanstack-virtual` | Portfolio already paginated; add if 500+ projects |
| Streaming / progressive loading | No data source large enough to justify |
| Image optimization pipeline | No user-uploaded images at scale |
| Service worker data sync | Offline-first; not currently needed |

## Bundle Budget

The `lighthouserc.json` enforces:
- Performance: ≥ 0.76
- Accessibility: ≥ 1.0
- Best Practices: ≥ 1.0
- SEO: ≥ 1.0
