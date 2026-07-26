# Release v0.1.0 — Budget Engineer Public MVP

**Date:** 2026-07-01  
**Tag:** `v0.1.0`  
**Live demo:** https://budget-engineer.vercel.app/  
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Release Summary

Budget Engineer OS is an AI-powered computational design tool that turns a plain-language building brief into 2D CAD drawings, a 3D BIM model, engineering checks, and a tender-ready Bill of Quantities (BOQ). Everything runs in the browser with no paid APIs, no cloud dependencies, and no backend.

This is the first public MVP release (v0.1.0), built from 5 merged workspaces (WS1–WS6) over 20 sprints.

---

## What Works

| Feature | Status |
|---------|--------|
| AI brief-to-design pipeline (local, deterministic) | ✅ |
| 2D plan canvas with wall/room editing | ✅ |
| 3D BIM viewer (React Three Fiber) | ✅ |
| Engineering analysis (clash, solar, MEP) | ✅ |
| Geometry-derived BOQ with regional rates | ✅ |
| CSV/HTML/PDF export | ✅ |
| IndexedDB persistence (survives refresh) | ✅ |
| Design snapshot history with cost/quantity deltas | ✅ |
| Governance/audit panel with approval checklist | ✅ |
| Portfolio Dashboard with search, filters, sort, archive | ✅ |
| Guided first-time builder journey | ✅ |
| PWA offline support | ✅ |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (6 pre-existing warnings) |
| `npm test` | 117 passed, 12 files |
| `npm run build` | 18 precache entries, success |
| CI pipeline | Green |
| SPA fallback (vercel.json / _redirects) | ✅ |
| PWA manifest + icons | ✅ |

---

## Live Smoke Test Summary

- Home page loads at https://budget-engineer.vercel.app/
- `/new` project wizard creates projects
- `/portfolio` portfolio dashboard renders
- `/project/:id` Dashboard loads with SPA fallback
- PWA manifest loads
- No critical asset 404s
- Dark theme default, toggleable

---

## Known Limitations

- Cost rates are approximate and vary by region — not suitable for procurement or final budgeting
- No professional structural engineer sign-off — designs are for concept/feasibility only
- Generated CAD is deterministic and early-stage — manual editing recommended for detailed design
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)
- Not a replacement for professional quantity surveyor or engineering review
- Multi-floor room layout uses same template for all floors (no ground/upper variation)
- Finishes and services allowances are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
- Single-user, local-first architecture

---

## Roadmap

### v0.2.0 (Next)
- Improve mobile dashboard layout and responsiveness
- Improve CAD editing persistence (save/restore canvas state)
- Real quantity takeoff improvements (detailed finishes, services, preliminaries)
- Governance approval actions (wire approve/reject workflow)
- Portfolio analytics charts (cost trends, comparisons)

### Future
- Multi-user project sharing
- Structural engine integration (load analysis, footing sizing)
- Drawing register + section views in export
- WebLLM opt-in for enhanced local AI
- IFC import/export improvements
