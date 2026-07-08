# Budget Engineer / DzeNhare OS

[![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions)
[![Version](https://img.shields.io/badge/version-0.9.0-blue)]()
[![Tests](https://img.shields.io/badge/tests-978-green)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![PWA](https://img.shields.io/badge/PWA-offline--first-purple)]()

**AI-assisted architectural design → 2D CAD → 3D BIM → engineering → BOQ. Making construction affordable for everyone.**

Free, open-source, local-first — works fully **offline**. Installed as a PWA, no backend, no paid APIs, no data leaves your machine.

**Live demo:** [budget-engineer.vercel.app](https://budget-engineer.vercel.app/) — install as an app (PWA) for offline use.

---

## Key Features

### Workflow
Six-stage workspace: **Brief · Concept · Design · Engineering · Docs & BIM · Cost & Deliver** — with guided onboarding tour and stage-based empty states.

### AI Design
Brief → 3-tier engine → design options. Fully offline (local rules engine; optional WebLLM via `@mlc-ai/web-llm`). Deterministic fallback when GPU is unavailable.

### 2D CAD Editor
Draw, move, resize, and delete rooms, doors, and windows. Snap-to-grid, keyboard nudge, live dimension readout, unlimited undo/redo. Touch editing works on mobile. All data persisted to IndexedDB.

### 3D BIM
Walls, slabs, multi-storey, doors, windows, and roof rendered in React Three Fiber. Dollhouse cutaway, click-a-room camera fly-in, first-person walkthrough (**desktop only**). GLB export.

### Parametric Canopy Roof
Optional biomimetic Voronoi-cell canopy with ETFE panels, structural spine ribs, and Section A-A drawing integration.

### Construction Drawings
Eleven drawing types: Plan, Site, Foundation, Roof, Reflected Ceiling, Electrical, Plumbing, HVAC, Front/Side Elevation, Section A-A — plus A1 presentation sheet. Export to PDF or PNG.

### Import
- **DXF** → editable plan (LINE + LWPOLYLINE)
- **Image/PDF** → backdrop with scale calibration for tracing
- **Offline wall detection** (OpenCV.js/WASM, lazy-loaded) — detect-then-correct floor plans from images

For AutoCAD or ArchiCAD: export to DXF.

### Engineering
Seven calculators (load combinations, footing sizing, rebar specification, etc.) plus clash detection, solar orientation analysis, and MEP takeoff.

**SADC Compliance** — approximate rule checks for Zimbabwe (ZBC), South Africa (SANS 10400), Zambia (CAP 295), and Botswana Building Control. **Verify locally.**

### BOQ + Cost
BOQ with geometry-derived quantities, regional rate cards (Zimbabwe, South Africa, Kenya, Global), rate source metadata. Export to CSV, HTML dossier, or PDF (print-to-PDF).

### Mobile + PWA
Responsive layout, touch interactions throughout review panels and canvas. Installable PWA — works fully offline.

### Missing Something?
See [Known Limitations](#known-limitations) below. Dashboard review works on all screen sizes; CAD editing is best on tablet/desktop.

**Live demo:** [budget-engineer.vercel.app](https://budget-engineer.vercel.app/)



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



## Screenshots

> Screenshots coming. Placeholder paths:

![Workspace](docs/screenshots/workspace.png "6-stage workspace with sidebar dashboard")

![CAD Editor](docs/screenshots/cad-editor.png "2D CAD editing canvas with rooms, doors, snap grid")

![3D BIM View](docs/screenshots/bim-view.png "3D model with dollhouse cutaway and fly-to-room")

![Construction Drawings](docs/screenshots/drawings.png "Construction-standard drawing set with A1 presentation sheet")

![BOQ Export](docs/screenshots/boq.png "Bill of Quantities with CSV/HTML/PDF export")

![Mobile](docs/screenshots/mobile.png "Mobile review of estimates and drawings")



## Tech Stack

| Layer | Technologies | License |
|---|---|---|
| UI | React 18, TypeScript, Tailwind CSS, shadcn/ui patterns | MIT |
| Build | Vite, vite-plugin-pwa | MIT |
| 2D CAD | MakerJS | MIT |
| 3D BIM | three.js, React Three Fiber, drei | MIT |
| Charts | Recharts | MIT |
| State | Zustand + Immer | MIT |
| Storage | Dexie (IndexedDB) | Apache 2.0 |
| AI (local) | Transformers.js (ONNX) | Apache 2.0 |
| AI (opt-in) | WebLLM (`@mlc-ai/web-llm`) | Apache 2.0 |
| CAD Parser | OpenCV.js (WASM) | Apache 2.0 |
| Exports | jsPDF, pdf-lib, SheetJS | MIT/Apache 2.0 |

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for full details.



## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production (TypeScript + Vite + PWA) |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lighthouse` | Build + Lighthouse audit |



## Quality / Lighthouse

Clean audit environment (headless, no extensions):

| Category | Score |
|---|---|
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| Performance | 76 (varies per machine) |

Audit notes in [docs/SPRINT_93_LIGHTHOUSE_REPORT.md](docs/SPRINT_93_LIGHTHOUSE_REPORT.md).



## Deploy

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for Vercel, Netlify, and static hosting instructions.

## CI Status

Each push to `main` runs via GitHub Actions:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` (978 across 53 files)
5. `npm run build` (PWA service worker generated)



## Release

| Detail | Value |
|---|---|
| Current version | v0.9.0 |
| Live demo | [budget-engineer.vercel.app](https://budget-engineer.vercel.app/) |
| GitHub | [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer) |
| CI status | [![CI](https://github.com/securequalitybuilders-art/budget-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/securequalitybuilders-art/budget-engineer/actions) |
| Tests | 978 across 53 files |
| Architecture | Local-first, no paid APIs, no backend, no cloud LLM |

See [CHANGELOG.md](CHANGELOG.md) for full release history. Release notes for each version (v0.1.0 through v0.9.0) are in `docs/RELEASE_NOTES_v*.md`. GitHub Release pages are created separately for distribution announcements.

## Feedback

Found a bug? Have a suggestion? Feedback is local-first and privacy-respecting:

- **File a GitHub issue** at [github.com/securequalitybuilders-art/budget-engineer/issues/new](https://github.com/securequalitybuilders-art/budget-engineer/issues/new)
- **Use the in-app form** at [/feedback](https://budget-engineer.vercel.app/feedback) — copy report, open GitHub issue, or send email
- **Email directly:** securequalitybuilders.art@gmail.com

No analytics, no telemetry, no data collection. You choose what to share.

## Contributing

Contributions welcome. See [project_constitution.md](project_constitution.md) for coding rules and constraints. All code is MIT. **No paid APIs may be added.**

## Known Limitations

- **Approximate compliance** — building code checks (ZBC, SANS 10400, Zambia, Botswana) are for early guidance only. Always verify with a local authority or registered professional.
- **No .dwg or .rvt import** — only DXF for import. Use DXF export from AutoCAD/ArchiCAD.
- **Walkthrough (first-person)** only on **desktop** with mouse + keyboard.
- **Wall detection is assistive** — it detects edges from uploaded images. You must review and correct results in the CAD editor.
- **Finishes and services** in the BOQ are percentage-based estimates, not detailed takeoffs.
- **Same room template per floor** — multi-floor designs use the same layout for all levels (no variation).
- **WebLLM opt-in** — `@mlc-ai/web-llm` must be installed separately. The app works fully offline without it.
- **Cost rates** are based on regional defaults. Not suitable for procurement.
- **Mobile review, CAD best on larger screen** — dashboard review works on phones; for best CAD editing experience, use a tablet or desktop.
- **Not a professional replacement** — this tool aids early-stage design and cost estimation but does not replace qualified architects or engineers.

## License

MIT — aligned with the open-source tools it depends on.