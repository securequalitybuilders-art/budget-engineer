# Sprint 20 — Public Release v0.1.0

**Date:** 2026-07-01  
**Goal:** Prepare and tag the first official public MVP release: v0.1.0.

---

## Files Created

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Full changelog from v0.1.0 with all features, known limitations |
| `docs/RELEASE_NOTES_v0.1.0.md` | Public release notes — summary, what works, validation, smoke test, roadmap |
| `docs/SPRINT_20_PUBLIC_RELEASE_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Version bumped from `0.0.0` to `0.1.0` |
| `CANONICAL_REPO_STATUS.md` | Status paragraph cleaned — Sprint 20 release-prep, removed duplicated Sprint 17 text |
| `README.md` | Added version badge, release table (version/demo/GitHub/CI/tests/architecture), Sprint 20 row |
| `docs/RELEASE_CHECKLIST.md` | Added v0.1.0 release verification table, portfolio/archive steps to smoke test |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (6 pre-existing warnings) |
| `npm test` | 117 passed, 12 files |
| `npm run build` | 18 precache entries, success |

---

## Version

- **package.json:** `0.1.0`
- **Git tag:** `v0.1.0` (annotated)
- **Commit:** TBD (after final push)
- **Push result:** TBD (after push)

---

## Live Demo

- **URL:** https://budget-engineer.vercel.app/
- Home page loads
- `/new` wizard works
- `/portfolio` dashboard renders
- `/project/:id` SPA fallback works
- PWA manifest accessible

---

## Documentation

- `CHANGELOG.md` — complete v0.1.0 entry with all feature areas and known limitations
- `docs/RELEASE_NOTES_v0.1.0.md` — public-facing release summary, what works, validation grid, smoke test results, roadmap to v0.2.0
- `README.md` — version badge, release table, Sprint 20 row
- `docs/RELEASE_CHECKLIST.md` — v0.1.0 verification table added

---

## Remaining Limitations (v0.1.0)

- Cost rates are approximate — not suitable for procurement
- No structural engineer sign-off — concept/feasibility only
- Generated CAD is deterministic — manual editing recommended
- WebLLM parser opt-in (`@mlc-ai/web-llm` not pre-installed)
- Not a replacement for professional QS/engineering review
- Multi-floor uses same room template for all levels
- Finishes/services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
