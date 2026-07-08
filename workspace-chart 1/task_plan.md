# task_plan.md — Budget Engineer Upgrade (BLAST Blueprint)

> Generated from the live audit of https://dzenhare-os.vercel.app/budget-engineer, the Dzenhare Master Plan 2026-2031, and the Dzenhare Project Constitution v6.0.  
> Vision: **AI-powered architectural design → 2D CAD → 3D BIM → engineering quantities → BOQ**, with charts, transaction history, and dark mode, using only free open-source GitHub code.

---

## Phase 0 — Blueprint (Memory & Planning)

**Goal:** Create the shared memory that every AntiGravity agent will use.

- [x] Audit live app and identify gaps.
- [x] Create/refresh `gemini.md`, `brandguidelines.md`, `project_constitution.md`, `task_plan.md`.
- [ ] Review and ratify the four context files with the user.
- [ ] Map the current 16-step journey to a concrete state machine.
- [ ] Define the open-source dependency matrix and integration points for the Amanbh997 skill repos.
- [ ] Set up `.cursorrules` or equivalent agent rules in the repo.
- [ ] Create a one-click Vercel deploy scaffold (single `npx` or Git import).

---

## Phase 1 — Link (Universal Remotes / Open-Source MCPs)

**Goal:** Replace any paid APIs with self-hosted or open-source alternatives and wire the open-source skill repos.

- [ ] **Audit current paid API usage.** Identify any Vercel AI SDK, OpenAI, Anthropic, Gemini, or proprietary CAD/BIM integrations in the current codebase.
- [ ] **AI:** Replace with local inference path (`transformers.js`, `WebLLM`, Ollama bridge).
- [ ] **Skills:** Import the Amanbh997 repos as local skill/knowledge sources:
  - `Amanbh997/Skills-Architects` → architectural theory, building codes, ZBC 1996 skill.
  - `Amanbh997/Claude-skills-for-Computational-Designers` → parametric modeling, structural check, solar analysis, material estimation, BOQ generation, BIM scripting.
  - `Amanbh997/Urban-Design-Skills-Claude` → site analysis, density/FAR, urban context.
- [ ] **Cost data:** Integrate or mirror the CWICR open cost database from `OpenConstructionEstimate-DDC-CWICR` [2](https://github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR). Add Zimbabwe override rates.
- [ ] **Database:** Use Dexie.js (IndexedDB) for local-first projects + SQLite (sql.js/OPFS) for cost catalogues.
- [ ] **Auth:** Use Auth.js or Lucia for local-first auth; support passphrase/offline mode.
- [ ] **Storage:** IndexedDB/File System Access API for drawings/exports; optional self-hosted MinIO.
- [ ] **Automation:** GitHub Actions for CI/CD, scheduled cost-catalogue updates, and backups.
- [ ] **Search:** Use Fuse.js or LanceDB for local cost-item and material search.

---

## Phase 2 — Architect (Logic & Computation)

**Goal:** Build the front-end and back-end computation graph in parallel.

### Front End (React + Vite + TypeScript + Tailwind)

- [ ] Implement global state machine (Zustand + Immer) for the 16-stage design journey.
- [ ] Build the **Bento dashboard layout**:
  - Left/center: 2D CAD canvas / 3D BIM viewer (switchable).
  - Right: property inspector + AI chat + layer tree.
  - Bottom: BOQ table + charts.
  - Top: command bar, stage breadcrumbs, project selector, theme toggle, sync status.
- [ ] Add dark mode toggle using Dzenhare tokens (`#0B0F19`, `#1a365d`, `#d4a574`) and `next-themes`.
- [ ] Create reusable shadcn/ui components: Button, Card, Input, Select, Table, Sheet, Dialog, Tabs, Command.
- [ ] Add transaction history sidebar with diff view (who/what/when for every BOQ/design change).
- [ ] Add charts using Recharts or Tremor: cost breakdown, cumulative budget, variance, quantity trends.
- [ ] Add export UI: DXF, SVG, IFC, XKT, GLB, PDF, CSV, JSON.
- [ ] Add offline indicator, auto-save toast, and sync status badge.
- [ ] Implement error boundaries and skeleton states for all async/compute-heavy routes.
- [ ] Mobile responsiveness: collapsible panels, bottom sheet for BOQ, touch canvas controls.

### Computational Engine (Web Workers + WASM)

- [ ] Define the data model from `project_constitution.md` in TypeScript + Zod.
- [ ] Build the **2D CAD kernel**:
  - Use `Maker.js` for parametric geometry and DXF/SVG export.
  - Use `Design-Core` for interactive canvas rendering, layers, snapping, dimensions.
- [ ] Build the **3D BIM kernel**:
  - Use `OpenJSCAD` + `Manifold` for solid modeling.
  - Use `three.js` for real-time viewing.
  - Use `That Open Engine` for IFC read/write and `xeokit-sdk` for lightweight XKT viewing.
- [ ] Build the **QTO engine**:
  - Input: 2D geometry + 3D mesh + element types + dimensions.
  - Output: volumes, areas, lengths, counts, with formulas.
- [ ] Build the **BOQ engine**:
  - Match quantities to CWICR/Zimbabwe rates.
  - Compute totals, contingencies, labor, equipment, sub-totals in integer cents.
  - Validate against standard formats (CSI MasterFormat / local ZBC classes).
- [ ] Build the **transaction log**: immutable append-only record for every mutation.
- [ ] Add AI brief-to-design pipeline: local LLM translates a brief into parametric geometry parameters.
- [ ] Add the 4-stage computational pipeline from Amanbh997 CD Skills:
  1. Structural check
  2. Solar analysis
  3. Material estimate
  4. BOQ generation
- [ ] Add validation rules: area checks, aspect ratios, unit conversion, currency formatting.
- [ ] Add ZBC 1996 compliance check using the Skills-Architects country dossier pattern.

### Backend (Optional / Self-Hosted)

- [ ] If a backend is needed, build a small FastAPI/Node service for heavy IFC conversion and model caching.
- [ ] Auth, project sync, and export generation endpoints.
- [ ] Keep it optional: the browser-only build must still work offline.

---

## Phase 3 — Style (UI/UX Pro Max)

**Goal:** Apply the 5-dimensional design vault.

- [ ] **Skeleton:** Convert landing page to Bento dashboard. Keep marketing page separate if needed.
- [ ] **Skin:** Apply dark-first theme with Dzenhare palette: `#0B0F19`, `#1a365d`, `#d4a574`, glass cards, aurora gradients.
- [ ] **Soul:** Add staggered reveal on route load, border-beam on active stage and AI cards, hover lift, shimmer during computation, smooth toast transitions.
- [ ] **Audit:** Run automated checks for:
  - WCAG 2.2 AA contrast.
  - Semantic HTML / heading order.
  - Keyboard navigation and focus traps.
  - Core Web Vitals (LCP, CLS, INP).
  - 50+ UI flaw checklist (broken labels, empty states, missing loading, etc.).
- [ ] Add empty states, tooltips, command palette (`Cmd+K`), and keyboard shortcuts.
- [ ] Add measure tool, section plane, explode view, and ortho/perspective toggle for CAD/BIM.

---

## Phase 4 — Trigger (Deploy & Automate)

**Goal:** Ship to production with automation.

- [ ] Deploy to Vercel (free tier) for the front end.
- [ ] Deploy optional backend to a free/self-hosted option (Railway, Fly.io, or VPS).
- [ ] Set up GitHub Actions: test → build → preview → deploy.
- [ ] Add scheduled jobs for CWICR cost-rate updates and nightly backups.
- [ ] Add monitoring: Sentry (or GlitchTip), Vercel Analytics.
- [ ] Add smoke tests for the critical path: brief → design → BOQ → export.
- [ ] Publish a public README with architecture diagrams and a one-click deploy button.
- [ ] Add a `CONTRIBUTING.md` and code-of-conduct aligned with the constitution.

---

## Milestones & Definition of Done

| Milestone | Deliverable | Acceptance Criteria |
|-----------|-------------|---------------------|
| M0 | Context files approved | `gemini.md`, `brandguidelines.md`, `project_constitution.md`, `task_plan.md` reviewed and signed off. |
| M1 | Layout & design system | Dark mode toggle, Bento layout, responsive, all Dzenhare design tokens applied. |
| M2 | Data model + persistence | Create project, save/load, offline-first, sync. |
| M3 | 2D CAD + 3D BIM viewer | Draw/view floor plans, pan/zoom, switch 2D/3D, export DXF/SVG/IFC/XKT. |
| M4 | BOQ engine + charts | Auto-generate BOQ from geometry, live totals, charts, Zimbabwe/CWICR rates. |
| M5 | Transaction history | Every change logged, diff view, undo to version, audit trail. |
| M6 | AI brief-to-design | Local LLM turns brief into parametric design options (3 options). |
| M7 | 4-stage computational pipeline | Structural check → solar → material estimate → BOQ, with events. |
| M8 | Export & tender docs | PDF, DXF, IFC, XKT, CSV, JSON exports validated. |
| M9 | Enterprise hardening | Auth, RLS, audit log, CSP, tests, deploy, no paid APIs. |

---

## Estimation

| Phase | Effort (one senior full-stack dev) | Notes |
|-------|-------------------------------------|-------|
| 0 Blueprint | 1–2 days | Mostly documentation. |
| 1 Link | 2–3 days | Replacing auth/DB/storage; wiring skill repos. |
| 2 Architect | 5–7 weeks | Biggest chunk: geometry + QTO + BOQ engine + WASM. |
| 3 Style | 1–2 weeks | Polish, motion, audit. |
| 4 Trigger | 3–5 days | CI/CD, deploy, tests. |

**Total realistic MVP: 10–14 weeks.**  
A vibe-coding “single prompt” build can produce the scaffold and dashboard in hours, but the **computational geometry, WASM integration, and BOQ engine** will still require careful design and testing.

---

## Open-Source Integration Checklist

| Source | Repo | Integration Point | Sprint |
|---|---|---|---|
| Skills-Architects | `Amanbh997/Skills-Architects` | Building code knowledge base, ZBC 1996 skill, architectural reasoning | S2 |
| CD Skills | `Amanbh997/Claude-skills-for-Computational-Designers` | 4-stage pipeline (structural, solar, material, BOQ), Python calculators | S3 |
| Urban Design Skills | `Amanbh997/Urban-Design-Skills-Claude` | Site analysis, density/FAR, urban context for larger projects | S4 |
| OpenConstructionEstimate | `datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR` | CWICR cost database, 55K+ items, regional pricing | S2 |
| OpenConstructionERP | `datadrivenconstruction/OpenConstructionERP` | BOQ/ERP reference patterns, validation rules | S3 |
| Maker.js | `microsoft/maker.js` | 2D geometry, DXF export | S2 |
| Design-Core | `dubstar-04/Design-Core` | Interactive 2D CAD canvas | S3 |
| OpenJSCAD | `jscad/OpenJSCAD.org` | 3D parametric modeling | S3 |
| Manifold | `elalish/manifold` | Robust mesh booleans (WASM) | S3 |
| That Open Engine | `IFCjs/web-ifc` | IFC parsing and writing | S3 |
| xeokit-sdk | `xeokit/xeokit-sdk` | Lightweight BIM viewer | S4 |
| Three.js | `mrdoob/three.js` | 3D rendering | S3 |
| Recharts | `recharts/recharts` | Cost charts | S2 |
| AG Grid | `ag-grid/ag-grid` | BOQ data grid | S3 |
| Dexie.js | `dexie/dexie` | Offline IndexedDB | S1 |
| sql.js | `sql-js/sql.js` | In-browser SQLite | S2 |
| transformers.js | `xenova/transformers.js` | Local LLM inference | S2 |
| WebLLM | `mlc-ai/web-llm` | WebGPU LLM inference | S2 |
| Ollama JS | `ollama/ollama-js` | Local Ollama bridge | S2 |

---

## Next Immediate Actions

1. Confirm the merged `gemini.md` + `brandguidelines.md` + `project_constitution.md` with the user.
2. Decide whether to start with **scaffold** (M1–M2) or **computational engine** (M3–M4) first.
3. Clone/inspect the Amanbh997 skill repos and extract the Python calculators for integration.
4. Set up the Vite/React/TypeScript repo with the context files committed.
5. Begin implementing the brief → design → BOQ data model and the Zustand state machine.
