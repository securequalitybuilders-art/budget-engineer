# Release Checklist — DzeNhare Budget Engineer Studio

> Run this checklist before every public demo or production release.

---

## Pre-Release

- [ ] `git checkout main && git pull`
- [ ] `npm install`
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors (warnings allowed if pre-existing)
- [ ] `npm test` — 58 tests, 7 files, all passing
- [ ] `npm run build` — succeeds (3369 modules, 16 precache)
- [ ] CI badge shows green at https://github.com/securequalitybuilders-art/budget-engineer/actions
- [ ] README.md is up to date
- [ ] No secrets or API keys in source (run grep: API_KEY, SECRET, TOKEN, PRIVATE_KEY, PASSWORD, OPENAI, ANTHROPIC, GEMINI)
- [ ] No paid API dependencies in `package.json`
- [ ] `LICENSE` file present (MIT)
- [ ] `public/icon-192.png` and `public/icon-512.png` exist
- [ ] `public/favicon.svg` exists
- [ ] `vercel.json` has SPA fallback rewrite
- [ ] `public/_redirects` has SPA fallback rule (Netlify)
- [ ] `version` in `package.json` is bumped (if releasing new version)
- [ ] Deployment guide is up to date (`docs/DEPLOYMENT_GUIDE.md`)

---

## Post-Deploy Smoke Test

- [ ] Home page loads (http://localhost:5173 or deployed URL)
- [ ] Project Wizard creates a new project
- [ ] Dashboard loads with empty state
- [ ] AI Brief panel generates 3 design options (enter brief text, click Generate)
- [ ] 2D plan view renders (default view)
- [ ] 3D BIM view loads (click 3D toggle)
- [ ] Engineering Analysis panel shows clash/solar/MEP results
- [ ] Regional BOQ shows correct currency (try ZWL, ZAR, KES, USD)
- [ ] CSV export downloads a `.csv` file
- [ ] HTML export downloads or renders an HTML dossier
- [ ] Page refresh preserves project data (IndexedDB persistence)
- [ ] PWA install prompt appears (or "Add to Home Screen" works)
- [ ] Offline mode: load once online, go offline, page is accessible
- [ ] Dark theme is default and toggleable
- [ ] No console errors on any route

---

## Known Limitations (to document in README)

- [ ] Cost rates are approximate and vary by region; not suitable for procurement.
- [ ] No professional structural engineer sign-off — designs are for concept/feasibility only.
- [ ] Generated CAD is deterministic and early-stage — manual editing recommended for detailed design.
- [ ] WebLLM parser is opt-in and `@mlc-ai/web-llm` is NOT pre-installed.
- [ ] This tool is not a replacement for professional quantity surveyor or engineering review.
- [ ] Multi-floor room layout uses same template for all floors (no variation yet).
- [ ] Finishes and services allowances are percentage-based estimates.
