# Dzenhare Budget Engineer Studio

[![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions)
**Current release:** v0.4.0 — [View on GitHub](https://github.com/securequalitybuilders-art/budget-engineer/releases/tag/v0.4.0)

> AI-powered computational design → 2D CAD → 3D BIM → engineering checks → quantities → BOQ → export.
> Offline-first, open-source, Africa-focused.
>
> **Local AI brief-to-design flow, 3D BIM viewer with walls/slabs/multi-storey/doors/windows/roof and GLB export, BOQ dashboard panel with CSV/HTML export, engineering analysis panel with clash/solar/MEP, IndexedDB persistence, generated rooms/doors/windows/zones, regional rate card BOQ pricing, geometry-derived BOQ quantities (door/window/partition/finish quantities from actual CAD geometry — not GFA estimates), guided first-time builder journey with 6-step progress and template briefs, governance/audit readiness panel with approval checklist and RBAC roles, local governance approval workflow with submit/approve/request-changes/comments/timeline, snapshot history panel with save/compare/cost and quantity deltas, portfolio dashboard with executive metrics and cross-project overview, portfolio filters (search, active/archived, sort by cost/name), archive/restore actions on project cards, mobile review support (review, estimates, exports on phone — CAD editing best on tablet/desktop), per-building-type room layout strategies (single-storey/duplex/clinic/shop) with circulation corridors and wet-core grouping, CAD editing persisted to IndexDB with auto-save and downstream sync metadata, PlanModel→CadDocument roundtrip for downstream analysis, BOQ/export source traceability (geometry source, CAD-edited labels, warnings in CSV/HTML), manual CAD save/restore controls with status messages, feedback and issue reporting workflow, 306 automated tests across the full pipeline, 11 construction-standard drawing types (Elevations, Section, Site, Foundation, Roof, RCP, Electrical, Plumbing, HVAC) + A1 presentation sheet + PDF/PNG export.** CI validates typecheck, lint, tests, and production build on every push.

**Live demo:** [budget-engineer.vercel.app](https://budget-engineer.vercel.app/)

## Quick start

```bash
git clone https://github.com/securequalitybuilders-art/budget-engineer
cd budget-engineer
npm install
npm run dev
```

Then open http://localhost:5173.

## What is built so far

**All 5 BLAST Blueprint phases merged from 5 workspaces (WS1–WS6).** Full pipeline:

| Phase | Scope | Source |
|-------|-------|--------|
| Base + UX | Vite/React 18, Tailwind, PWA, Zustand, Dexie, routing, command palette, themes, project wizard, pipeline UI | WS1 |
| 2D CAD | PlanCanvas, WallFirstCanvas, DXF/SVG/MakerJS export, undo/redo, multi-floor, block library, dimensions | WS2 |
| BIM + IFC | React Three Fiber 3D viewer, BIM legend/inspector, IFC4 STEP import/export, governance/RBAC types, versioning, zones, cross-project, export package | WS3 |
| Advanced Eng | Wall corner solver (intersection math), clash detection (3 BIM rules), solar analysis, MEP takeoff, executive dossier (HTML print-to-PDF) | WS4 |
| Structural | Column/beam/footing placement algorithms, rebar calculator, material rates, clash auto-healing | WS5 |
| AI + Drawings + Engineering Studio | Deterministic brief parser, design engine, WebLLM adapter (opt-in), SVG plan/section/title-block generators, drawing register, regional rate cards, load analysis, footing sizing, rebar spec, design fingerprint, 6 wired panel components in Engineering Studio tabbed section **+ local AI brief-to-design flow wired into Dashboard** | WS6 |
| **Sprint 4: BOQ & Export** | designToBoq adapter, BoqExportPanel sidebar, CSV export, HTML dossier export, print-to-PDF, roof type fix in designToBim | Sprint 4 |
| **Sprint 5: Engineering Analysis** | designToAnalysis adapter, EngineeringAnalysisPanel sidebar, clash detection, solar orientation, MEP takeoff, recommendation cards | Sprint 5 |
| **Sprint 6: IndexedDB Persistence** | projectPersistenceService, AI designs/BIM/BOQ/export persisted to Dexie, survives page refresh | Sprint 6 |
| **Sprint 7: Generated CAD Detail** | designGeometryAdapter with rooms, doors, windows, internal walls, zones; richer BIM/CAD/BOQ output | Sprint 7 |
| **Sprint 8: Regional BOQ Pricing** | rateCardAdapter, region selector in BoqExportPanel, rate assumptions in CSV/HTML export | Sprint 8 |
| **Sprint 9: Automated Tests + CI** | 58 tests across 7 files, vitest, fake-indexeddb, GitHub CI workflow | Sprint 9 |
| **Sprint 10: Deployment polish** | DEPLOYMENT_GUIDE.md, RELEASE_CHECKLIST.md, vercel.json, _redirects, README updates | Sprint 10 |
| **Sprint 11: Live deployment** | Verified Vercel deployment, updated live URL | Sprint 11 |
| **Sprint 12: Public demo audit** | SEO meta tags, accessibility fixes, mobile polish, bundle audit | Sprint 12 |
| **Sprint 13: Geometry-derived BOQ quantities** | geometryQuantitiesAdapter, external wall line item, quantity-basis UI section + CSV headers, 73 tests | Sprint 13 |
| **Sprint 14: Builder journey guide** | Home page 6-step journey, Project Wizard template briefs, BuilderJourneyGuide dashboard panel, beginner-friendly empty states | Sprint 14 |
| **Sprint 15: Mobile polish** | Right sidebar horizontal scroll, BOQ table scroll, engineering tabs scroll, BuilderJourneyGuide collapsed by default, design option truncation, mobile note in canvas, Home button wrap | Sprint 15 |
| **Sprint 16: Governance & audit panel** | GovernanceAdapter with buildGovernanceSummary, GovernancePanel in Dashboard sidebar, approval readiness checklist, RBAC roles, audit trail, design fingerprint, 86 tests | Sprint 16 |
| **Sprint 17: Snapshot history & comparison** | projectSnapshotService (save/load/compare), SnapshotHistoryPanel in Dashboard sidebar, cost/quantity deltas, 99 tests | Sprint 17 |
| **Sprint 18: Portfolio dashboard** | PortfolioPage at `/portfolio`, executive summary stats, category distribution bar chart, project cards, Home page button | Sprint 18 |
| **Sprint 19: Portfolio filters & archive** | Search, status filter (All/Active/Archived), sort (newest/name/cost), archive/restore buttons, status messages, 117 tests | Sprint 19 |
| **Sprint 20: v0.1.0 public MVP release** | Package version → 0.1.0, CHANGELOG.md, release notes, tag v0.1.0, final validation | Sprint 20 |
| **Sprint 21: Feedback & issue reporting** | FeedbackPanel, `/feedback` route, copy/GitHub/email actions, privacy-first, 127 tests | Sprint 21 |
| **Sprint 22: Mobile UX deep polish** | Hero text sizes, mobile messages, always-visible archive/restore on touch, larger tap targets | Sprint 22 |
| **Sprint 23: Better CAD room layout** | Per-building-type layout strategies (single-storey, duplex/2-storey, clinic, commercial/shop), circulation corridors, wet-core grouping, improved opening placement | Sprint 23 |
| **Sprint 24: CAD editing persistence & export sync** | PlanModel saved/loaded from IndexedDB (Dexie v4), auto-save on edit commit, CAD sync status in toolbar, fallback sync adapter for BIM/BOQ/analysis with GeometrySource metadata | Sprint 24 |
| **Sprint 25: Governance approval actions & comments** | Local-first approval workflow: submit for review, approve, request changes, add reviewer comments with type selector, governance timeline, role selector (Owner/Reviewer/Viewer), permission-based controls, transaction logging | Sprint 25 |
| **Sprint 26: CAD persistence & sync tests** | 33 tests for cadPersistenceService (CRUD) and cadToDesignSyncAdapter (fallback adapters), test fixtures, bug-free validation | Sprint 26 |
| **Sprint 27: PlanModel→CadDocument roundtrip** | PlanModel→CadDocument converter (planModelToCadAdapter.ts), sync adapter fallback in deriveAnalysisFromCadOrDesign, 22 new tests (13 converter + 9 sync) | Sprint 27 |
| **Sprint 28: Export source metadata & CAD-edited BOQ sync** | Source metadata in BOQ/CSV/HTML, CAD-edited labels, cadQuantitiesAdapter, 21 new tests | Sprint 28 |
| **Sprint 29: Manual CAD save/restore UI** | CadSyncControls dropdown (save/restore/reset), loadPlanModelMeta service, status messages, 3 new tests | Sprint 29 |
| **Sprints 56–63: Professional Drawings v0.4.0** | 11 drawing types (Elevations, Section, Site, Foundation, Roof, RCP, Electrical, Plumbing, HVAC) + A1 presentation sheet + PDF/PNG export | Sprints 56–63 |

**Pipeline:** Brief → AI Design → 2D CAD → 3D BIM → Engineering Checks → Quantities → BOQ → Export (CSV / HTML / PDF)

**Repository:** [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer)

## Feedback

Found a bug? Have a suggestion? Feedback is local-first and privacy-respecting:

- **File a GitHub issue** at [github.com/securequalitybuilders-art/budget-engineer/issues/new](https://github.com/securequalitybuilders-art/budget-engineer/issues/new)
- **Use the in-app form** at [/feedback](https://budget-engineer.vercel.app/feedback) — copy report, open GitHub issue, or send email
- **Email directly:** securequalitybuilders.art@gmail.com

No analytics, no telemetry, no automatic data collection. You choose what to share.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lighthouse` | Build + audit with Lighthouse CI (requires Chrome) |

## Quality / Lighthouse

Repeatable Lighthouse audits can be run locally against the production build:

```bash
npm run lighthouse
```

This builds the app, serves it via `vite preview` on port 4173, and runs Lighthouse CI (3 runs per route, median). Reports are saved to `./lighthouse-report/` as HTML files.

Audited routes: `/`, `/portfolio`, `/feedback` (static routes that render without project data). All assertions are set to `"warn"` (baseline mode) — the command reports scores without failing. See [docs/SPRINT_51_LIGHTHOUSE_TOOLING_REPORT.md](docs/SPRINT_51_LIGHTHOUSE_TOOLING_REPORT.md) for full details.

## Deploy

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for Vercel, Netlify, and static hosting instructions.

## CI Status

Each push to `main` runs via GitHub Actions:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` (681 tests, 41 files)
5. `npm run build`

## Release

| Detail | Value |
|--------|-------|
| Current version | v0.4.0 |
| Live demo | https://budget-engineer.vercel.app/ |
| GitHub | https://github.com/securequalitybuilders-art/budget-engineer |
| CI status | [![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions) |
| Tests | 681 across 41 files |
| Architecture | Local-first, no paid APIs, no backend, no cloud LLM |

See [CHANGELOG.md](CHANGELOG.md) for full release history.

## Known Limitations

- **Approximate cost rates** — BOQ totals are based on regional rate cards with default assumptions. Not suitable for procurement or final budgeting.
- **No structural engineer sign-off** — generated designs are concept/feasibility only. Always engage a registered structural engineer for detailed design.
- **Early-stage CAD** — generated room layouts are deterministic with per-building-type strategies (residential, clinic, commercial). Manual editing in the 2D CAD canvas is recommended for real projects.
- **WebLLM not installed** — `@mlc-ai/web-llm` is opt-in. The app works fully offline without it using the deterministic local-rules engine.
- **Not a replacement for professional review** — this tool aids early-stage design and cost estimation. It does not replace qualified quantity surveyors, structural engineers, or architects.
- **Same room template per floor** — multi-floor designs use the same room layout for all levels (no ground/upper variation).
- **Finishes/services are estimates** — finishes and services line items are percentage-based allowances, not detailed takeoffs.
- **Mobile review, not CAD editing** — the Dashboard supports reviewing estimates and exports on mobile. For best CAD drawing experience, use a tablet or desktop.

## License

MIT — aligned with the open-source tools it depends on.
