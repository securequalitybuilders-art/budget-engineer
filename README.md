# Budget Engineer — Premium Architectural Studio

[![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions)
[![Version](https://img.shields.io/badge/version-1.3.0-blue)]()
[![Tests](https://img.shields.io/badge/tests-1503-green)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![PWA](https://img.shields.io/badge/PWA-offline--first-purple)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

**The open-source, local-first architectural design OS.**  
Brief → 2D CAD → 3D BIM → engineering analysis → construction drawings → BOQ → presentation boards — all offline, with no paid APIs and no data leaving your machine.

> *Making Construction Affordable for Everyone.*

**Live demo:** [budget-engineer.vercel.app](https://budget-engineer.vercel.app/) — install as a PWA for full offline use.

---

## Release Snapshot

**Budget Engineer v1.3.0** is the **Enterprise Platform MVP** release with full release-gate integrity.

It preserves the original core workflow:

- Brief
- Concept
- Design
- Engineering
- Docs & BIM
- Cost & Deliver

And adds enterprise deployment infrastructure:

- Docker & nginx production deployment
- CSP security hardening & sanitization utilities
- Project backup/import (.beproj) with Home Export All
- Local RBAC with RoleGuard and RoleSwitcher
- Plugin SDK with lifecycle hooks
- i18n framework with locale switching
- Portfolio pagination & performance budgets
- Diagnostics panel (Ctrl+Shift+D)

### Quality Baseline

| Metric | Value |
|---|---|---|
| Version | v1.3.0 |
| Tests | 1,503 |
| Test files | 87 |
| TypeScript | 0 errors (strict mode) |
| Build | tsc + vite, green |
| Lint | 0 errors, max 25 warnings |
| PWA | Enabled |
| Deployment | Docker / Vercel / static hosting |

### Architecture Principles

- **Local-first** — data is stored in IndexedDB on the user's device
- **Offline-first** — works as a PWA after first load
- **Zero paid APIs** — no OpenAI, Anthropic, Gemini, or paid SDK dependency
- **No backend required** — deployable as a static web app
- **Privacy by architecture** — no telemetry, no analytics, no forced cloud sync

---

## What is Budget Engineer?

Budget Engineer is a **multi-discipline architectural design operating system** that runs entirely in your browser. It takes a project from an AI-assisted architectural brief through 2D drafting, 3D modelling, engineering analysis, environmental studies, construction documentation, and cost estimation — without ever requiring a server, a paid subscription, or an internet connection.

**Built for:**
- Architects & engineers in low-infrastructure environments
- DIY builders and homeowner-developers
- NGOs and government housing programs
- Small to mid-size construction firms
- Architecture students learning the design pipeline

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
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `npm run lint` | ESLint with max 25 warnings |
| `npm test` | Run all 1,503 tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lighthouse` | Build + Lighthouse CI audit |

---

## Quality

| Metric | Value |
|---|---|---|
| Tests | 1,503 across 87 test files |
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
| **Test-first** | 1,503 tests. Every feature phase includes dedicated test coverage. |
| **Honest UX** | All limitations documented in-app. No false claims about capabilities. |

---

## Deploy

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for Vercel, Netlify, and static hosting instructions.

Quick deploy to Vercel:

```bash
npm run build    # generates dist/
# Upload dist/ to any static host
```

SPA fallback is configured via `vercel.json` and `_redirects` for Netlify.

---

## CI Pipeline

Each push to `main` runs via GitHub Actions:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` (1,503 tests across 87 test files)
5. `npm run build` (PWA service worker generated)

---

## Release

| Detail | Value |
|---|---|
| Current version | v1.3.0 |
| Codename | Enterprise Platform MVP |
| Live demo | [budget-engineer.vercel.app](https://budget-engineer.vercel.app/) |
| GitHub | [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer) |
| Tests | 1,503 across 87 test files |
| Architecture | Local-first, no paid APIs, no backend, no cloud LLM |

See [CHANGELOG.md](CHANGELOG.md) for full release history. Release notes for each version are in `docs/RELEASE_NOTES_v*.md`.

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
