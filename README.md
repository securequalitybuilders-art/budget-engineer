# Dzenhare Budget Engineer Studio

[![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions)

> AI-powered computational design → 2D CAD → 3D BIM → engineering checks → quantities → BOQ → export.
> Offline-first, open-source, Africa-focused.
>
> **Local AI brief-to-design flow, 3D BIM viewer with 2D/3D toggle, BOQ dashboard panel with CSV/HTML export, engineering analysis panel with clash/solar/MEP, IndexedDB persistence, generated rooms/doors/windows/zones, regional rate card BOQ pricing, 58 automated tests across the full pipeline.** CI validates typecheck, lint, tests, and production build on every push.

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

**Pipeline:** Brief → AI Design → 2D CAD → 3D BIM → Engineering Checks → Quantities → BOQ → Export (CSV / HTML / PDF)

**Repository:** [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer)

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Deploy

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for Vercel, Netlify, and static hosting instructions.

## CI Status

Each push to `main` runs via GitHub Actions:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` (58 tests, 7 files)
5. `npm run build`

## Known Limitations

- **Approximate cost rates** — BOQ totals are based on regional rate cards with default assumptions. Not suitable for procurement or final budgeting.
- **No structural engineer sign-off** — generated designs are concept/feasibility only. Always engage a registered structural engineer for detailed design.
- **Early-stage CAD** — generated geometry is deterministic and grid-based. Manual editing in the 2D CAD canvas is recommended for real projects.
- **WebLLM not installed** — `@mlc-ai/web-llm` is opt-in. The app works fully offline without it using the deterministic local-rules engine.
- **Not a replacement for professional review** — this tool aids early-stage design and cost estimation. It does not replace qualified quantity surveyors, structural engineers, or architects.
- **Same room template per floor** — multi-floor designs use the same room layout for all levels (no ground/upper variation).
- **Finishes/services are estimates** — finishes and services line items are percentage-based allowances, not detailed takeoffs.

## License

MIT — aligned with the open-source tools it depends on.
