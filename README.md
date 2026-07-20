# Budget Engineer — Professional Architecture, Engineering & Construction Lifecycle Platform

[![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions)
[![Version](https://img.shields.io/badge/version-4.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![PWA](https://img.shields.io/badge/PWA-offline--first-purple)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

**Budget Engineer** is a **local-first architecture, engineering, preconstruction, procurement, delivery, and handover platform** designed for professional use with **human review and signoff in the loop**.

It combines 18 capability groups across the full design-to-delivery lifecycle:

- AI-assisted architectural brief-to-plan generation
- Interactive 2D CAD editing with undo/redo and touch support
- 3D BIM viewing with dollhouse, walkthrough, and parametric canopy
- Interior design studio with 62 fixtures and 14 room templates
- Environmental site analysis (heliodon, shadow, wind)
- Image-to-floor-plan import with offline wall detection
- 11 construction drawing types with PDF/PNG export
- Professional DXF pipeline (AIA layers, A4–A0, roundtrip tested)
- Presentation board editor on A1/A0 sheets
- Engineering analysis with 7 calculators and clash detection
- Geometry-derived BOQ with 4 regional rate cards
- Building code compliance checks for 4 SADC jurisdictions
- Procurement, delivery, assurance, and handover workflows
- Lifecycle project tracking with status transitions and health dashboards
- Package export and submission packaging with deterministic numbering
- Validation and pilot-readiness evaluation with calibration transparency
- Plugin SDK for build-time extension

---

## Commercial Positioning

### What It Is

> **A professional-grade, local-first architecture, engineering, and construction lifecycle platform with human review in the loop.**

Budget Engineer supports professionals across the full project lifecycle — from brief and concept through design, engineering, documentation, BOQ/cost, procurement, delivery, and handover — while keeping all data local, all processing offline, and all decisions under human professional control.

### Who It Is For

- Architects and architectural technologists
- Engineers (structural, MEP) in early-stage pre-design
- Quantity surveyors and cost consultants
- Contractors preparing preconstruction packages
- Developers evaluating project feasibility
- Students learning the design-to-construction pipeline
- Organizations evaluating or piloting the platform

### What Requires Human Review

Budget Engineer is an assistive professional tool, not an automated replacement for licensed professionals. Every capability group that produces decision-grade output is clearly flagged with human review requirements. See the in-app **Product Package** panel for the complete capability manifest with review annotations.

### What It Does Not Claim

Budget Engineer does **not** position itself as:
- A full licensed architect replacement
- Final structural engineering signoff software
- Automatic certified building code approval
- A native proprietary CAD/BIM suite replacement (DWG, RVT)
- A fully cloud-native, multi-tenant collaboration platform
- A construction management, ERP, or accounting system

The platform is designed to **compress professional workflow time while keeping human expertise and signoff firmly in the loop**.

---

## Quality Snapshot

- **TypeScript:** 0 errors (strict mode)
- **Lint:** 0 errors (warnings within policy)
- **Test files:** 130+ test files
- **Build:** green
- **PWA:** offline-capable after first load
- **Architecture principles:** zero paid APIs, no backend, no telemetry, privacy by architecture

---

## Core Capabilities

### 🏗️ Design Pipeline

Six-stage workspace: **Brief → Concept → Design → Engineering → Docs & BIM → Cost & Deliver**

- Guided onboarding tour with stage-based empty states and contextual CTAs
- Multi-discipline switching across 8 disciplines: Architecture, Structural, Mechanical, Electrical, Plumbing, Interior, Landscape, Civil
- Each discipline sees only its relevant stages

### 🤖 AI-Assisted Design

- **Brief parser** → 3-tier design engine → parametric design options
- Fully offline — deterministic rules engine with optional WebLLM via `@mlc-ai/web-llm`
- Building-type-aware room programs, climate knowledge base, heritage patterns
- Deterministic fallback when GPU is unavailable — no paid API required

### ✏️ 2D CAD Editor

- Draw, move, resize, and delete rooms, doors, and windows
- Snap-to-grid, keyboard nudge (arrow keys), live dimension readout
- Unlimited undo/redo with full history timeline
- Touch editing on tablets and phones (tap, drag, pinch-zoom)
- All data persisted to IndexedDB automatically

### 🏠 3D BIM Viewer

- Walls, slabs, floors, doors, windows, and roof rendered in React Three Fiber
- **Dollhouse cutaway** — full, dollhouse, or no-roof view modes with storey selector
- **Click-a-room fly-in** — smooth camera animation to selected rooms
- **First-person walkthrough** — WASD + mouse-look with pointer-lock (desktop)
- **Parametric canopy roof** — optional biomimetic Voronoi-cell canopy with ETFE panels, spine ribs, and Section A-A integration
- GLB export for external 3D tools

### 🛋️ Interior Design Studio

- **62 fixtures** — sanitary, kitchen, lighting, furniture, appliances
- **14 room templates** — bathroom, kitchen, bedroom, living room, office, and more
- Material & finish scheduling per surface (wall, floor, ceiling)
- Interior canvas with pointer/touch editing
- Automatic BOQ integration — finishes and fixtures flow into cost estimates

### ☀️ Environmental & Site Analysis

- **Heliodon engine** — sun-path computation for any latitude/longitude/date (pure trig)
- **Shadow casting** — shadow polygons from building footprint + sun position
- **Wind analysis** — wind exposure computation from wind-rose data
- **Composite site analysis** — orientation optimization, solar exposure, wind impact
- SVG sun-path diagrams and shadow overlays on plan views

### 📸 Image-to-Floor-Plan

- Guided import: upload → calibrate scale → detect walls → review → edit
- **Offline wall detection** via OpenCV.js/WASM (lazy-loaded, not in main bundle)
- Per-wall confidence tracking with manual clean-up tools
- Also supports DXF import (LINE + LWPOLYLINE) and image backdrop tracing

### 📐 Construction Drawings

Eleven drawing types, all SVG-rendered:

| Drawing | Content |
|---|---|
| Floor Plan | Rooms, walls, doors, windows, dimensions |
| Site Plan | Building footprint, setbacks, north arrow |
| Foundation Plan | Strip/pad footings with dimensions |
| Roof Plan | Ridge, hip, valley lines |
| Reflected Ceiling Plan | Ceiling grid, light fixtures |
| Electrical Plan | Socket, switch, circuit layout |
| Plumbing Plan | Supply/drain routing |
| HVAC Plan | Duct routing, diffusers |
| Front Elevation | Front facade with materials |
| Side Elevation | Side facade with materials |
| Section A-A | Cut section with structural detail |

Plus **A1 presentation sheet** with title block. Export to PDF or PNG.

### 📐 Professional DXF Pipeline

- AIA-standard layer naming (`A-WALL`, `A-DOOR`, `S-COLS`, `M-PLMB`, etc.)
- Dimension styles with configurable text height, arrow type, and precision
- Sheet sizes A4, A3, A1, A0 with correct viewBox scaling
- Paper-space layout with viewport and title block
- Block INSERT entities for doors, windows, fixtures
- **DXF roundtrip tested** — export → re-import → geometry comparison

### 🎨 Presentation Boards

- Board editor with 1–9 cell grid layouts on A1/A0 sheets
- Text annotations, arrow callouts, freehand markup
- Capture 2D/3D snapshots into board cells
- Templates: Concept, Design Development, Planning submission
- Export to SVG, PNG, or PDF

### 🔬 Engineering Analysis

- **7 calculators** — load combinations, footing sizing, rebar specification, beam analysis, and more
- **Clash detection** — 3 BIM rules for spatial conflicts
- **Solar orientation analysis** — cardinal heat gain assessment
- **MEP takeoff** — service points per zone
- **SADC building-code compliance** — 28 rules across 4 jurisdictions:
  - Zimbabwe (ZBC)
  - South Africa (SANS 10400, 10 rules)
  - Zambia (Public Health Act CAP 295, 9 rules)
  - Botswana (Building Control Regulations, 9 rules)

> ⚠️ Compliance checks are **approximate** — always verify with a local authority or registered professional.

### 💰 BOQ, Planning & Cost Estimation

- **Schedules** — automated door and window schedules
- **Construction Programme** — interactive Gantt chart with critical path generation
- **Cashflow Analysis** — weekly/monthly cost curves and peak funding calculations
- BOQ with geometry-derived quantities from 2D CAD and 3D BIM
- **Regional rate cards** — Zimbabwe, South Africa, Kenya, Global
- Rate source metadata and assumption tracking
- Export to **CSV**, **HTML dossier** (self-contained, with print-to-PDF), or **PDF**
- Interior finishes and fixtures included via adapter pipeline

### 🎓 Architecture Academy

- 5+ skill paths with 3+ lessons each
- Markdown-based lesson engine
- Persistent progress tracking per skill path
- Context tips linking studio tools to relevant lessons

### 📱 Mobile & PWA

- Responsive layout for all screen sizes (1366×768 minimum for full editing)
- Touch interactions throughout: tap-select, drag-move, pinch-zoom, two-finger pan
- Installable PWA — works fully offline after first load
- Dashboard review works on phones; CAD editing best on tablet/desktop

---

## Quick Start

```bash
git clone https://github.com/securequalitybuilders-art/budget-engineer
cd budget-engineer
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

For production build + preview:
```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── app/                    # App root, providers, routing
├── adapters/               # Data transformation adapters
├── ai/                     # Brief parser, design engine
├── components/
│   ├── academy/            # Skill paths, context tips
│   ├── analysis/           # Heliodon, site analysis panels
│   ├── bim/                # 3D viewer, canopy mesh, walkthrough
│   ├── cad/                # 2D plan canvas, editing tools
│   ├── charts/             # Cost breakdown charts
│   ├── dashboard/          # Stage panels, BOQ, governance
│   ├── drawings/           # 11 SVG drawing views
│   ├── import/             # Image, DXF, calibration workflow
│   ├── interior/           # Interior canvas, material palette
│   ├── layout/             # Sidebar, command bar, shell
│   ├── onboarding/         # First-run tour
│   ├── presentation/       # Board editor, annotations
│   ├── rates/              # Rate card panel
│   └── ui/                 # Shared primitives
├── data/                   # Fixtures, templates, taxonomy
├── db/                     # Dexie schema + migrations
├── domain/                 # Type models (BIM, BOQ, CAD, interior, site, presentation)
├── engine/
│   ├── analysis/           # Heliodon, shadow, wind, site
│   ├── calculators/        # Structural calculators
│   ├── canopy/             # Parametric canopy geometry
│   └── compliance/         # ZBC, SANS, Zambia, Botswana
├── hooks/                  # Custom React hooks
├── lib/
│   ├── drawing/            # Sun-path, shadow overlay SVG
│   ├── export/             # DXF, PDF, CSV, SVG, ZIP exporters
│   ├── import/             # DXF importer
│   ├── interior/           # Fixtures, room templates, finish schedules
│   ├── learning/           # Lesson engine
│   ├── presentation/       # Board layout, render overlay
│   ├── rates/              # Regional rate cards
│   └── structural/         # Load, footing, rebar engines
├── pages/
│   ├── studio/             # Interior, Presentation studio pages
│   ├── Academy.tsx
│   ├── Dashboard.tsx
│   ├── Home.tsx
│   ├── PortfolioPage.tsx
│   └── ProjectWizard.tsx
├── services/               # Persistence, sync, governance services
├── stores/                 # Zustand stores (project, UI, discipline, interior, presentation, academy)
└── types/                  # Shared TypeScript definitions
```

---

## Routes

| Route | Page |
|---|---|---|
| `/` | Home — product landing page |
| `/new` | Project wizard — 3-step project creation |
| `/project/:id` | Dashboard — 7-stage discipline-aware project workspace |
| `/project/:id/studio/interior` | Interior Design Studio |
| `/project/:id/studio/presentation` | Presentation board studio |
| `/project/:id/studio/site-analysis` | Site Analysis Studio (heliodon, wind, shadow) |
| `/site-analysis` | Standalone Site Analysis (no project context) |
| `/portfolio` | Portfolio — multi-project management |
| `/academy` | Academy — skill path browser |
| `/academy/:skillPath/:lessonId` | Individual lesson |
| `/feedback` | Feedback & issue reporting |

---

## Tech Stack

| Layer | Technologies | License |
|---|---|---|
| UI | React 18, TypeScript (strict), Tailwind CSS, Framer Motion | MIT |
| Build | Vite, vite-plugin-pwa | MIT |
| 2D CAD | MakerJS | MIT |
| 3D BIM | three.js, React Three Fiber, drei | MIT |
| Charts | Recharts | MIT |
| State | Zustand + Immer | MIT |
| Storage | Dexie (IndexedDB) | Apache 2.0 |
| AI (local) | Transformers.js (ONNX) | Apache 2.0 |
| AI (opt-in) | WebLLM (`@mlc-ai/web-llm`) | Apache 2.0 |
| CAD Parser | OpenCV.js (WASM, lazy-loaded) | Apache 2.0 |
| Validation | Zod | MIT |
| Icons | Lucide React | ISC |
| Exports | jsPDF, pdf-lib, SheetJS, fflate | MIT/Apache 2.0 |

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for full details.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Vite HMR) |
| `npm run build` | TypeScript check + production build + PWA generation |
| `npm run build:only` | Production build without typecheck (for CI) |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `npm run lint` | ESLint with max 25 warnings |
| `npm test` | Run fast-path unit/component tests (single thread) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:fast` | Alias for `npm test` (fast-path only) |
| `npm run test:shard1` | Fast-path shard 1/3 (for CI parallel execution) |
| `npm run test:shard2` | Fast-path shard 2/3 |
| `npm run test:shard3` | Fast-path shard 3/3 |
| `npm run test:integration` | Run heavy three.js / page-mount integration tests |
| `npm run test:ci` | CI simulation: typecheck + 3 shards + integration (sequential) |
| `npm run test:release` | Full release gate: typecheck → build → fast tests → integration |
| `npm run lighthouse` | Build + Lighthouse CI audit |

## Validation Lanes

Tests are organized into explicit lanes for clear CI and local verification:

| Lane | Coverage | Wall Time | When to Run |
|------|----------|-----------|-------------|
| **typecheck** | `tsc --noEmit` — 0 errors | ~20s | Always before commit |
| **fast shard 1** | ~45 test files (unit + component) | ~2-3 min | CI parallel runner 1 |
| **fast shard 2** | ~45 test files (unit + component) | ~2-3 min | CI parallel runner 2 |
| **fast shard 3** | ~46 test files (unit + component) | ~2-3 min | CI parallel runner 3 |
| **integration** | 2 files, 7 heavy page-mount tests | ~15s | CI parallel runner 4; before merging |
| **build** | `vite build` | ~2-3 min | CI after typecheck passes |

**Sharding**: Vitest `--shard` splits test files deterministically by path. Each shard pays its own module-loading cost. In CI, all 3 fast shards + integration run in parallel, reducing wall time from ~8 min to ~3 min. Locally, `npm test` runs all fast-path files in a single thread (simplest).

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request targeting `main`. It also runs on version tags (`v*`) for release verification.

### Job structure

```
push / pull_request
        │
   ┌────┴────┐
   │ typecheck│  ← Gate 1 (fail-fast)
   └────┬────┘
        │
   ┌────┼────┬────┬────┬────┐
   │    │    │    │    │    │
   ▼    ▼    ▼    ▼    ▼    ▼
 lint shard-1 shard-2 shard-3 integration build
   │    │     │      │      │         │
   └────┴─────┴──────┴──────┴─────────┘
                  │
                  ▼
           release-gate  ← Aggregate check for branch protection
```

### Commands → Jobs

| Job | Script | Purpose |
|-----|--------|---------|
| `typecheck` | `npm run typecheck` | TypeScript strict check — 0 errors required |
| `lint` | `npm run lint` | ESLint — max 25 warnings |
| `shard-1` | `npm run test:shard1` | Fast-path tests shard 1/3 |
| `shard-2` | `npm run test:shard2` | Fast-path tests shard 2/3 |
| `shard-3` | `npm run test:shard3` | Fast-path tests shard 3/3 |
| `integration` | `npm run test:integration` | Heavy three.js / page-mount tests |
| `build` | `npm run build:only` | Production build (typecheck already passed) |
| `release-gate` | (aggregate check) | Passes only if all above lanes pass |

### Release gate definition

A **release** is any tag matching `v*` pushed to the repository. The workflow runs the same set of lanes for both PRs and tags. The `release-gate` job aggregates results from all parallel lanes and:

- **Passes** — every lane succeeded → the commit is fit for release
- **Fails** — one or more lanes failed → the release must not proceed

There is no separate "light" release path. Every release must pass typecheck, lint, all test shards, integration tests, and a production build.

---

## Quality

| Metric | Value |
|---|---|---|
| Tests | 1,500+ across 136 fast-path + 2 integration test files |
| TypeScript | 0 errors (strict mode) |
| Lighthouse A11y | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Lighthouse Performance | 74–76 (varies by machine) |

---

## Export Formats

| Format | Use Case |
|---|---|
| **DXF** | CAD interoperability (AIA layers, dimensions, blocks, paper space) |
| **PDF** | BOQ dossier, presentation sheets, board export, drawings (print-to-PDF) |
| **CSV** | BOQ spreadsheet with regional pricing and rate metadata |
| **HTML** | Self-contained BOQ dossier (opens in any browser, print-to-PDF) |
| **SVG** | Drawings, sun-path diagrams, shadow overlays, board cells |
| **PNG** | Board export, drawing snapshots |
| **GLB** | 3D model for external viewers |
| **IFC** | IFC4 STEP format for BIM software |
| **ZIP** | Project archive package with manifest |

> **No DWG export.** DWG is a proprietary Autodesk format — it cannot be fully implemented in-browser. For AutoCAD or ArchiCAD workflows, use **DXF** as the interchange format.

---

## Architecture Principles

| Principle | Implementation |
|---|---|
| **Local-first** | All data in IndexedDB. No server, no cloud storage. |
| **Zero paid APIs** | No OpenAI, Anthropic, or Gemini API calls — ever. |
| **Fully offline** | PWA with service worker. Works without network after first load. |
| **Privacy by architecture** | No telemetry, no analytics, no data collection, no data leaves the device. |
| **Modular** | Domain models → stores → adapters → components. Clean separation. |
| **Test-first** | Full suite passing. Every feature phase includes dedicated test coverage. |
| **Honest UX** | All limitations documented in-app. No false claims about capabilities. |

---

## Deploy

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for the full deployment lifecycle:
hosting setup, preview vs production, release process, smoke-test checklist, and
rollback guidance.

Quick reference:

| Deploy target | Command / Trigger | Result |
|---------------|-------------------|--------|
| Local dev | `npm run dev` | Vite HMR dev server |
| PR preview | Push to PR branch (Vercel/Netlify auto-deploy) | Preview URL |
| Production | Push to `main` (Vercel/Netlify auto-deploy) | Live URL |
| Production | `npm run build && upload dist/` | Any static host |

SPA fallback is configured via `vercel.json` and `public/_redirects` for Netlify.

---

## CI Pipeline

Two GitHub Actions workflows run in parallel:

**CI** (`.github/workflows/ci.yml`) — quality validation on every PR, main push,
and tag push:

```
push / pull_request / tag v*
        │
   ┌────┴────┐
   │ typecheck│  ← Gate 1 (fail-fast)
   └────┬────┘
        │
   ┌────┼────┬────┬────┬────┐
   │    │    │    │    │    │
   ▼    ▼    ▼    ▼    ▼    ▼
 lint shard-1 shard-2 shard-3 integration build
   │    │     │      │      │         │
   └────┴─────┴──────┴──────┴─────────┘
                  │
                  ▼
           release-gate  ← Aggregate check for branch protection
```

| Job | What it runs | Purpose |
|-----|--------------|---------|
| `typecheck` | `npm run typecheck` | TypeScript strict check — 0 errors required |
| `lint` | `npm run lint` | ESLint — max 25 warnings |
| `shard-1/2/3` | `npm run test:shard{1,2,3}` | Fast-path tests split into 3 parallel shards |
| `integration` | `npm run test:integration` | Heavy three.js / page-mount tests |
| `build` | `npm run build:only` | Production build (typecheck already passed in gate) |
| `release-gate` | Aggregate check | Passes only when all 6 lanes pass — single check for branch protection |

**Deploy** (`.github/workflows/deploy.yml`) — build artifact validation and
deployment signal:

| Job | Runs on | Purpose |
|-----|---------|---------|
| `validate-build` | PRs, main, tags | Builds the app and verifies dist/ artifact structure |
| `preview` | PRs only | Reports preview deployment readiness |
| `production-ready` | main only | Confirms build is valid for production deploy |
| `release-ready` | tags only | Provides release checklist for operator sign-off |

---

## Release

| Detail | Value |
|---|---|
| Current version | v4.0.0 |
| Release | Professional Architecture, Engineering & Construction Lifecycle Platform |
| Live demo | [budget-engineer.vercel.app](https://budget-engineer.vercel.app/) |
| GitHub | [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer) |
| Deployment | Local-first, Docker, Vercel, Netlify, static hosting |
| Architecture | Local-first, zero paid APIs, no backend, no cloud LLM |

See [CHANGELOG.md](CHANGELOG.md) for full release history. Releases are published on [GitHub Releases](https://github.com/securequalitybuilders-art/budget-engineer/releases).

---

## Known Limitations

**Be honest about what this tool does and doesn't do:**

- **Approximate compliance** — building code checks (ZBC, SANS 10400, Zambia, Botswana) are for early guidance only. **Always verify with a local authority or registered professional.**
- **No .dwg or .rvt import/export** — only DXF for CAD interoperability. Use DXF export from AutoCAD/ArchiCAD.
- **Wall detection is assistive** — detects edges from uploaded images. You must review and correct results in the CAD editor.
- **Door/window detection approximate** — no offline OCR for room labels. Manual naming required.
- **Walkthrough (first-person)** only on **desktop** with mouse + keyboard (pointer-lock required).
- **Same room template per floor** — multi-floor designs use the same layout for all levels.
- **WebLLM opt-in** — `@mlc-ai/web-llm` must be installed separately. The app works fully without it.
- **Cost rates are regional defaults** — not suitable for procurement or tendering.
- **BOQ finishes and services** — percentage-based estimates, not detailed takeoffs.
- **Board export on large sheets** — A1/A0 with many cells may stress weaker devices.
- **No multi-user sync** — single-user, local-first only. No real-time collaboration.
- **Mobile: review yes, edit on larger screens** — dashboard review works on phones; CAD editing best on tablet or desktop.
- **Not a professional replacement** — aids early-stage design and cost estimation but does not replace qualified architects or engineers.

---

## Feedback

Found a bug? Have a suggestion?

- **File a GitHub issue** at [github.com/securequalitybuilders-art/budget-engineer/issues/new](https://github.com/securequalitybuilders-art/budget-engineer/issues/new)
- **Use the in-app form** at [/feedback](https://budget-engineer.vercel.app/feedback) — copy report, open GitHub issue, or send email
- **Email directly:** securequalitybuilders.art@gmail.com

No analytics, no telemetry, no data collection. You choose what to share.

---

## Contributing

Contributions welcome. See [project_constitution.md](project_constitution.md) for coding rules and constraints. All code is MIT.

**Hard rules:**
- No paid APIs may be added — ever
- TypeScript strict mode — no `any`
- Every data mutation must log a transaction event
- All features must work offline

---

## License

MIT — aligned with the open-source tools it depends on.

---

> **Budget Engineer — Making Construction Affordable for Everyone.**
