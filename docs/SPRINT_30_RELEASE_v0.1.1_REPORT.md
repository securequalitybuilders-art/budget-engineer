# Sprint 30 — Release v0.1.1

**Date:** 2026-07-02  
**Goal:** Prepare and tag v0.1.1 as a public demo patch release covering Sprints 21–29.

---

## Files Created

| File | Purpose |
|------|---------|
| `docs/RELEASE_NOTES_v0.1.1.md` | Release notes with full changelog, validation, smoke test, limitations, roadmap |
| `docs/SPRINT_30_RELEASE_v0.1.1_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Version `0.1.0` → `0.1.1` |
| `CHANGELOG.md` | Added v0.1.1 entry with all Sprint 21–29 additions, validation, limitations |
| `README.md` | Updated release version to v0.1.1, test count to 238, highlighted manual CAD save/restore and feedback workflow |
| `docs/RELEASE_CHECKLIST.md` | Added v0.1.1 release verification table |

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 9 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (238 tests, 18 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3388 modules, 20 precache) |

## Live Demo Smoke Check

| Route | Status |
|-------|--------|
| `/` (Home) | ✅ Loads |
| `/new` (Project Wizard) | ✅ Loads |
| `/portfolio` (Portfolio Dashboard) | ✅ Loads |
| `/feedback` (Feedback) | ✅ Loads |
| `/project/demo` (Dashboard SPA fallback) | ✅ Loads |
| `manifest.webmanifest` (PWA manifest) | ✅ Loads |
| No critical asset 404s | ✅ |

## Version

| Field | Value |
|-------|-------|
| Previous version | `0.1.0` |
| New version | `0.1.1` |
| Git tag | `v0.1.1` |
| Release commit | `b6a5ca7` + tag |
| Live demo | https://budget-engineer.vercel.app/ |
| GitHub release | https://github.com/securequalitybuilders-art/budget-engineer/releases/tag/v0.1.1 |

## Limitations (carried forward)

1. Cost rates are approximate — not suitable for procurement or final budgeting
2. No professional structural engineer sign-off
3. Generated CAD is deterministic and early-stage
4. Downstream adapters still use generated quantities (labels are CAD-edited, not full CAD-derived)
5. Snapshot source metadata not yet stored
6. No export sync for WS6 boq-export.ts
7. Same room template per floor
8. Finishes/services are percentage estimates
9. CAD editing best on tablet/desktop
10. No cloud sync or multi-user support
11. WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)

## Next Roadmap

- **v0.1.2** — Export sync for fully CAD-edited data
- **v0.2.0** — Improved CAD editing UX (wall dimension input, grid snapping)
- **v0.2.0** — Mobile dashboard refinement (responsive sidebar stacking)
- **v0.2.0** — Optional local WebLLM
- **v0.2.0** — Cloud sync optional architecture research
