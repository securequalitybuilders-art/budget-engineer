# Canonical Repo Status — Budget Engineer OS

> **Date:** 2026-07-08 (v0.9.0)  
> **Base:** WS1 (`workspace-chart 1/budget-engineer-os`)  
> **Status:** v0.9.0 — Workspace UX, Import & Offline Extraction Phase. First-run onboarding tour (S81), 6-stage workflow navigation rail + stage-based Dashboard (S82), unified left sidebar dashboard with project tools (S83), DXF import (S84), multi-format image/PDF backdrop with scale calibration (S85), backdrop canvas fix (S86), offline floor-plan image wall/room detection via OpenCV.js/WASM with detect-then-correct flow (S87). Builds on all prior phases: SADC Building-Code Compliance (4 jurisdictions, 28 rules), Parametric Biomimetic Canopy (Voronoi-cell, ETFE, spine ribs), Interior Inspection (dollhouse/fly-in/walkthrough), Interactive 2D CAD Editor, Professional Drawings (11 types + A1 sheet), Governance approval workflow, Snapshot history, Portfolio dashboard, and all earlier features. Lint baseline at 9 warnings. All 978 unit tests pass (53 files). `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm test` (978 passed, 53 files).

---

## Why WS1 Was Chosen as Canonical Base

Per the WORKSPACE_MERGE_AUDIT.md (Section 4.1), WS1 was selected because:

1. **Best architecture** — React Router routing, Tailwind design system, PWA scaffold, ESLint, proper Dexie schema, typed Zustand stores, shadcn-style UI primitives
2. **Complete pipeline** — 6-stage UI pipeline (Brief → Concept → Design → Engineering → Docs → Cost)
3. **Design system** — Only workspace with full DzeNhare brand tokens in Tailwind CSS
4. **Store architecture** — Zustand + Immer + persist = cleanest state management
5. **DB schema** — Dexie with 10 tables, rate seeding, transaction logging
6. **Validation** — Zod schemas for all AI pipeline data
7. **PWA** — `vite-plugin-pwa` configured for offline-first
8. **Component system** — CVA + clsx + tailwind-merge (industry standard shadcn/ui pattern)

---

## Current package.json Dependencies

### Runtime (`dependencies`)
| Package | Version | Purpose | Source |
|---|---|---|---|
| `react` | ^18.3.1 | UI framework | WS1 |
| `react-dom` | ^18.3.1 | React DOM renderer | WS1 |
| `react-router-dom` | ^6.24.1 | Client-side routing | WS1 |
| `zustand` | ^4.5.4 | State management | WS1 |
| `immer` | ^10.1.1 | Immutable state updates | WS1 |
| `dexie` | ^4.0.8 | IndexedDB wrapper | WS1 |
| `zod` | ^3.23.8 | Runtime schema validation | WS1 |
| `lucide-react` | ^0.400.0 | Icon library | WS1 |
| `class-variance-authority` | ^0.7.0 | Component variant API | WS1 |
| `clsx` | ^2.1.1 | Conditional classnames | WS1 |
| `tailwind-merge` | ^2.4.0 | Tailwind class merging | WS1 |
| `framer-motion` | ^11.2.12 | Animations | WS1 |
| `recharts` | ^2.12.7 | Charting | WS1 |
| `makerjs` | ^0.18.1 | 2D CAD geometry | WS1/WS2 |
| `convert-units` | ^2.3.4 | Unit conversion | WS1 |
| `@xenova/transformers` | ^2.17.2 | On-device ML | WS1 |
| `three` | ^0.179.1 | 3D rendering engine | WS3 |
| `@react-three/fiber` | ^8.17.10 | React renderer for Three.js | WS3 |
| `@react-three/drei` | ^9.122.0 | R3F utilities | WS3 |
| `fflate` | ^0.8.2 | ZIP compression | WS3 |

### Dev Dependencies (`devDependencies`)
- `vitest` ^4.1.9 (Sprint 9 — test runner)
- `fake-indexeddb` ^6.0.0 (Sprint 9 — IndexedDB polyfill for Node)

### Phase E Dependencies
- **No new npm packages added** — all WS6 modules use pure TypeScript
- `@mlc-ai/web-llm` NOT installed (opt-in — run `npm install @mlc-ai/web-llm` to enable WebLLM parser)
- `md5` NOT added — WS6 fingerprint.ts uses djb2 hash (deterministic, zero deps)

---

## Current Routes (unchanged from WS1)

| Path | Page Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Landing page |
| `/new` | `ProjectWizard.tsx` | 3-step wizard |
| `/project/:id` | `Dashboard.tsx` | Main workspace with PlanCanvas |
| `/portfolio` | `PortfolioPage.tsx` | Executive portfolio dashboard |
| `/feedback` | `FeedbackPage.tsx` | Feedback form |

---

## Current Major Features

### Pipeline & UX (WS1)
- Full 6-stage pipeline UI
- 3-step project wizard
- Bento dashboard layout
- Command palette (Cmd+K)
- Keyboard shortcuts
- Theme toggle (dark/light/system)
- Offline indicator
- Lazy loading / code splitting

### Data Persistence (WS1 + WS3 merged)
- Dexie/IndexedDB with 10 tables: `projects`, `briefs`, `designs`, `boqs`, `transactions`, `rates`, `cadDocs`, `bimModels`, `governance`, `snapshots`
- Rate seeding with Zimbabwe rates (12 seed rates)
- Zustand stores with Immer + persist
- Transaction logging on every mutation

### AI Pipeline (WS1 — Sprint 3: wired end-to-end)
- Deterministic brief parser (`src/ai/briefParser.ts`) — regex-based, zod-validated, extracts building type, bedrooms, bathrooms, floors, area, budget, location, features
- Design engine (`src/ai/designEngine.ts`) — generates 3 options (compact/standard/spacious) with full BuildingElement quantities
- BOQ engine (`src/ai/boqEngine.ts`)
- Zod validation schemas (`src/ai/schema.ts`)
- **Sprint 3 adapter** (`src/adapters/aiDesignAdapter.ts`) — connects parser + engine to Dashboard UI
- **User flow:** Enter brief in AiBriefPanel → parsed locally → 3 design options appear in Dashboard selector → view in 2D Plan or 3D BIM
- No paid APIs, no cloud dependencies, no WebLLM required

### AI Modules — Staged (WS6 Phase E, `src/lib/ai/`, not wired to UI)
- WS6 deterministic brief parser (`lib/ai/brief-parser.ts`) — regex-based, runs offline
- WS6 multi-floor parametric design engine (`lib/ai/design-engine.ts`) — generates CadDocument from brief
- AI provider abstraction (`lib/ai/ai-provider.ts`) — `local-rules` / `webllm` engine with fallback chain
- WebLLM adapter (`lib/ai/webllm-parser.ts`) — lazy-imported, opt-in (`@mlc-ai/web-llm`), guarded with `@ts-ignore`
- All 5 AI modules are pure TypeScript, no paid API, no store dependencies

### 2D CAD (WS2 Phase A + Sprints 67–70 Interactive Editor)
- Interactive PlanCanvas with pan/zoom/viewport
- Parametric floor plan generation
- Room add/delete/move/resize with undo/redo (history stack + TimelinePanel)
- Room selection outline with 8 resize handles
- Door and window add/move/delete (offset clamped to wall, undo/redo, persistence)
- Snap-to-grid (`snapToGrid` in `src/lib/geometry/snap.ts`) with user-selectable step (default 0.1m)
- Keyboard nudge: Arrow keys by snap step, Shift+Arrow = 10×
- Live dimension readout: W×H for rooms, offset‑% for openings
- SVG-root pointer capture with `data-room-id`/`data-opening-id`/`data-resize` routing via `closest()`
- Absolute clientX/Y deltas (frame-independent, reliable under capture)
- Dimension annotations and room labels
- Wall-first CAD authoring (WallFirstCanvas)
- Wall editing: draw, move endpoints, split, join, offset, trim
- Layer management with visibility toggle
- Multi-floor support
- Block library (stairs, cores)
- Topology healing (snap endpoints)
- Export: MakerJS JSON, DXF, SVG

### BIM & IFC (WS3 Phase B)
- 3D BIM viewer via React Three Fiber (lazy-loadable)
- BIM legend, inspector, floor visibility panel
- CAD-to-BIM generator (adapted for WS2 CadDocument)
- BIM-to-BOQ generator with fixed rates
- Real IFC4 STEP import/export (pure string, no library)
- IFC-like JSON export

### Governance & RBAC (WS3 Phase B — types & lib)
- Governance workflow types (draft → in_review → approved/rejected)
- RBAC types (owner, reviewer, viewer)
- Governance comment/timeline
- Authorization functions with explicit unauthorized messaging
- **Sprint 16 GovernancePanel** — collapsible sidebar panel showing project status (draft/ready/reviewed/exported), 7-item approval readiness checklist, role descriptions (Owner/Reviewer/Viewer), compact version/fingerprint info, recent audit trail from local IndexedDB transactions, actionable recommendations, and local-demo warnings
- **Sprint 25 Governance approval workflow** — local-first approval actions (submit for review, approve, request changes, reset to draft), comment box with type selector (general/review/approval/change-request), governance timeline, role selector (Owner/Reviewer/Viewer), permission-based disabled controls, transaction logging, all stored in existing governance IndexedDB table

### Versioning & Snapshots (WS3 Phase B)
- Project snapshot types
- Snapshot diff computation (wall, opening, zone, BOQ deltas)
- Portfolio metric builder
- **Sprint 17 SnapshotHistoryPanel** — collapsible sidebar panel with Save button + label input, project snapshot list (latest first), selected snapshot comparison showing cost delta (with %), floor area delta, floor count delta, wall area delta, door count delta, window count delta, local-storage note

### Portfolio (Sprint 18 + Sprint 19)
- **Portfolio Dashboard page** (`/portfolio`) — executive summary across all projects: total portfolio value, avg scheme cost, active/archived counts, category distribution (Walls/Slabs/Roof/Openings/Objects), per-project cost cards
- **Project search** — case-insensitive name search in portfolio
- **Status filter** — All / Active / Archived toggle
- **Sort** — Newest / Name / Highest Cost / Lowest Cost
- **Archive/Restore** — hover button on project card, local-first via IndexedDB, transaction logging, instant metric refresh

### Improved CAD Room Layout (Sprint 23)
- Replaced grid-based room templates with per-building-type layout strategies
- **Residential single-storey:** 3-zone layout (public left, private right, centre passage), lounge/dining/kitchen wet-core, bathrooms grouped near bedrooms
- **Duplex/2-storey:** Different ground and upper floor layouts, staircase zone, ground has lounge/kitchen/guest WC, upper has bedrooms/bathrooms/retreat
- **Clinic:** Reception + waiting at front, 4 consultation rooms off corridor, pharmacy/toilets/storage at back
- **Shop/commercial:** Open sales area at front, storage/office/Staff WC at back, shopfront windows
- **Opening placement:** Main entrance on front wall, doors on passage walls connecting rooms, windows on external walls of key room types, shopfront display windows, all offsets clamped ≥0.3m from corners
- **192 tests, 33 new** for CAD persistence/sync

### Feedback & Issue Reporting (Sprint 21)
- **FeedbackPanel** — reusable form with category select (8 types), title, description, steps-to-reproduce, optional browser info
- **Three output actions:** Copy report to clipboard, Open GitHub Issue, Send email (`mailto:`)
- **Privacy-first:** no analytics, no telemetry, no automatic data collection, explicit privacy note
- **Surface points:** Home page footer, Dashboard right sidebar, Portfolio header, dedicated `/feedback` route

### BOQ Analysis (WS3 Phase B)
- BOQ line item comparison (before/after)
- Cost composition %-share analysis (scale-independent)
- Category totals aggregation

### Zone Costing (WS3 Phase B)
- Room zone reconstruction from wall grid (auto-generated rooms)
- Zone cost estimation (proportional by area)
- Zone-to-BOQ traceability
- Zone BOQ grouping by category

### Cross-Project & Portfolio (WS3 Phase B)
- Cross-project metrics (snapshot counts, avg grand totals)
- Portfolio loading from IndexedDB
- Project filters (snapshots, transactions, portfolio)
- Live state included in portfolio

### Export Package (WS3 Phase B)
- ZIP archive via fflate
- Export package assembly (IFC JSON, BOQ CSV, room schedule CSV/HTML, standards manifest)
- Standards manifest (IFC classes, COBie mappings, BOQ mappings)
- Download helpers

### Advanced Engineering (WS4 Phase C)
- Wall corner solver (`cad-solver.ts`) — pure line-intersection math for wall trim/join
- 3-rule BIM clash detection (`clash-checker.ts`):
  - Rule 1: Opening near structural wall corner (< 20cm) → high severity
  - Rule 2: Opening overlap collision on same wall → high severity
  - Rule 3: Object AABB overlap with wall strip → moderate severity
- Cardinal solar orientation heat gain analysis (`solar-analyzer.ts`):
  - North/East/South/West wall + window area calculation
  - Peak irradiance (280–450 W/m²) and cooling load estimation
  - Efficiency rating with recommendations
- MEP services points takeoff (`mep-takeoff.ts`):
  - Per-zone electrical, lighting, plumbing point counts
  - Program-based density rules (kitchen, bath, bedroom, open plan)
  - Cost estimation at $65/point (elec/light) and $180/point (plumbing)
- PDF executive dossier (`pdf-dossier.ts`):
  - Full project report as HTML document with print-to-PDF support
  - BOQ cost breakdown table, governance signoff audit trail
  - Per-floor CAD SVG floor plan renderings
- Executive portfolio aggregation (`executive-portfolio.ts`):
  - Load projects from IndexedDB, aggregate BOQ by category
  - Total portfolio value, avg scheme cost, category distribution
  - Active vs archived counts

### Drawings & SVG Export (WS6 Phase E, `src/lib/drawings/`)
- Static plan SVG generator (`plan-svg.ts`) — pure string, no DOM, for dossiers
- Section elevation SVG generator (`section-svg.ts`) — AA/BB cut planes, opening filtering
- SVG title block (`title-block.ts`) — DZENHARE OS branded bottom strip
- Drawing register (`drawing-register.ts`) — A-1xx/A-201 sheet list with revision history
- All 4 modules are pure SVG string generators — safe for Node.js verification and browser export

### Rate Cards (WS6 Phase E, `src/lib/rates/`)
- Regional cost database (`rate-card.ts`) — 4 regions: Zimbabwe (USD), South Africa (ZAR), Kenya (KES), Global (USD)
- Full RateCard interface with wall/beam/column rates per material system, plus slab, roof, rebar, excavation, formwork
- Editable in the UI (RateCardPanel), cloned before mutation
- Preserves existing canonical `seedRates` for backward compatibility

### Rebar Specification (WS6 Phase E, `src/lib/structural/rebar-spec.ts`)
- Parametric rebar from first principles: bar diameter (Y10/Y12/Y16), spacing (150/200/250), layers (1/2)
- `barMassPerMetre()` — steel density × cross-sectional area
- `rebarKgPerM2()` — two-way mesh kg/m²
- `rebarTonnage()` — total slab tonnage

### Load Analysis (WS6 Phase E, `src/lib/structural/load-engine.ts`)
- SLS/ULS load combination factors (1.0G+1.0Q / 1.2G+1.5Q)
- Element-wise load computation (slab, roof, wall)
- Material self-weight scaling (concrete 1.0, steel 0.55, timber 0.4)
- Total vertical load to footings

### Footing Sizing (WS6 Phase E, `src/lib/structural/footing-sizer.ts`)
- RC pad footing sizing from design load + soil bearing capacity
- 4 soil classes: soft clay (75 kPa) → weathered rock (600 kPa)
- 50 mm module rounding, min 600 mm pad
- Excavation/formwork takeoff + reinforcement tonnage

### Versioning & Change Detection (WS6 Phase E, `src/lib/versioning/`)
- Design fingerprint (`fingerprint.ts`) — djb2 content hash of geometry + cost (no md5 dep)
- Design metrics (`design-metrics.ts`) — headline metrics snapshot + `summarizeChanges()` diff
- Currency symbols (`src/lib/utils/currency.ts`) — USD, ZAR, KES, GBP, EUR, NGN

### BOQ Export (WS6 Phase E, `src/lib/export/boq-export.ts`)
- CSV export with currency-aware formatting
- Self-contained HTML dossier with cover, drawing register, revision history, per-floor plan SVGs, section SVG, BOQ table
- Browser download + print/save-as-PDF helpers

### Structural Algorithms — Staged (WS5 Phase D + WS6 Phase E, not wired to UI)

All algorithm modules are pure TypeScript, no side effects, no store dependencies. Staged for future integration.

#### WS5 Algorithms (Phase D)
| Module | File | Purpose |
|---|---|---|
| **Structural Generator** | `src/lib/structural/structural-generator.ts` | `computeColumnPositions()` — deduplicates structural wall nodes; `computeBeamConnections()` — links columns not on walls; `computeFootingPlacements()` — places pad footings under columns |
| **Rebar Calculator** | `src/lib/structural/rebar-calculator.ts` | Slab reinforcement mass from area + Y10/Y12/Y16 bar spec |
| **Material Rates** | `src/lib/structural/material-rates.ts` | 3 materials × 11 categories; material→IFC class mapping |
| **Clash Healer** | `src/lib/structural/clash-healer.ts` | Auto-repair opening proximity and block-wall overlap |
| **Structural Types** | `src/lib/structural/structural-types.ts` | `RebarSpec`, `StructuralMaterial`, placement types |

#### WS6 Algorithms (Phase E)
| Module | File | Purpose |
|---|---|---|
| **Rebar Spec** | `src/lib/structural/rebar-spec.ts` | Parametric bar diameter/spacing/layers, kg/m² from first principles |
| **Load Engine** | `src/lib/structural/load-engine.ts` | SLS/ULS load combos, element-wise kN, material self-weight scaling |
| **Footing Sizer** | `src/lib/structural/footing-sizer.ts` | RC pad footing sizing from design load + 4 soil classes |

### Components
- **7 UI primitives** (Button, Card, Badge, Input, Label, Select, Textarea)
- **12 layout components** (BentoShell, Sidebar, CommandBar, CommandPalette, etc.)
- **12 CAD components** (PlanCanvas, WallFirstCanvas, PlanComparison, PlanLegend, panels)
- **5 BIM components** (BimViewer, BimLegend, BimInspector, FloorVisibilityPanel, LazyBimViewer) + interior inspection helpers (viewMode, roomFocus, walkthrough)
- **6 WS6 panel components** (AiBriefPanel, RateCardPanel, RebarSpecPanel, FootingSizingPanel, LoadAnalysisPanel, SectionView) — ✅ wired into Engineering Studio
- **Engineering Studio section** (EngineeringStudioPanel) — tabbed accordion panel in dashboard right sidebar
- **BOQ Export Panel** (BoqExportPanel) — sidebar panel for BOQ display, CSV export, HTML dossier, print-to-PDF
- **Engineering Analysis Panel** (EngineeringAnalysisPanel) — sidebar panel for clash detection, solar analysis, MEP takeoff with recommendation cards
- **Governance Panel** (GovernancePanel) — sidebar panel for project governance status, approval readiness, RBAC roles, audit trail, fingerprint, approval workflow actions, comment box, timeline
- **Governance Workflow Service** (governanceWorkflowService) — workflow service with load, submit, approve, request changes, reset, add comment, permission checks, transaction logging
- **CAD Persistence Service** (cadPersistenceService) — save/load/has/delete/metadata PlanModel from IndexedDB planModels table
- **CAD Sync Controls** (CadSyncControls) — toolbar dropdown for manual save/restore/reset with status messages and timestamp
- **CAD Sync Adapter** (cadToDesignSyncAdapter) — fallback adapters for BIM/BOQ/analysis with GeometrySource metadata, PlanModel→CadDocument conversion path for analysis
- **PlanModel→CadDocument Adapter** (planModelToCadAdapter) — converts persisted PlanModel to canonical CadDocument with NaN clamping, default floor, offsetRatio mapping
- **Snapshot History Panel** (SnapshotHistoryPanel) — sidebar panel for saving/listing/comparing design snapshots with cost and quantity deltas
- **10 adapters** (`designGeometryAdapter.ts` + `geometryQuantitiesAdapter.ts` + `designToBim.ts` + `aiDesignAdapter.ts` + `designToBoq.ts` + `designToAnalysis.ts` + `rateCardAdapter.ts` + `governanceAdapter.ts` + `planModelToCadAdapter.ts` + `cadQuantitiesAdapter.ts`) — building geometry, geometry quantities, BIM model, AI design, BOQ generation, engineering analysis, rate card resolution, governance summary from DesignOption, PlanModel→CadDocument roundtrip, CAD document quantity extraction
- **2D/3D toggle** in Dashboard toolbar — switches between PlanCanvas and LazyBimViewer

---

## Current Known Gaps

| Gap | Details | Resolution |
|---|---|---|
| **Governance/RBAC/Snapshot panels** | GovernancePanel + SnapshotHistoryPanel wired in Dashboard | ✅ DONE (Sprint 16 + 17) |
| **Governance approval workflow** | Local-first approval actions, comments, timeline, role selector | ✅ DONE (Sprint 25) |
| **Portfolio Dashboard** (executive summary page) | ✅ Present | Sprint 18 — `/portfolio` route with summary stats, category distribution, project cards |
| **Portfolio Filters** (search, active/archived, sort) | ✅ Present | Sprint 19 — search box, status filter, sort selector, archive/restore actions on card hover |
| **Cross-Project/Portfolio/Zone panels** | Lib merged; UI panels deferred | Port from WS3 panels |
| **Export/Standards panels** | Lib merged; UI panels deferred | Port from WS3 panels |
| **WS4 panel components** | 4 panels (Clash, Solar, MEP, Executive) deferred | Tailwind re-theme from WS4 |
| **WS6 panels formerly not wired** | 6 panels now wired into Engineering Studio | ✅ DONE (Sprint 1) |
| **WS6 WebLLM** | `@mlc-ai/web-llm` not installed | `npm install @mlc-ai/web-llm` then enable `webllm-parser.ts` |
| **3D BIM viewer in Dashboard** | BimViewer exists now integrated | ✅ DONE (Sprint 2 — 2D/3D toggle + adapter) |
| **Wire WS5 structural algorithms** | 5 algorithm modules staged | Connect to store + UI |
| **Wire WS6 structural libs** | Load engine, footing sizer, rebar spec | ✅ DONE (Sprint 1 — via Engineering Studio with sample data) |
| **Wire SectionView into Dashboard** | SectionView exists, not routed | ✅ DONE (Sprint 1 — Engineering Studio tab with sample CAD) |
| **Wire drawing register into export** | Register lib exists, not tied to export pipeline | Integrate with boq-export and pdf-dossier |
| **Wire BOQ into Dashboard export workflow** | designToBoq adapter + BoqExportPanel created | ✅ DONE (Sprint 4 — BOQ display, CSV/HTML export, print-to-PDF) |
| **Wire engineering analysis into Dashboard** | designToAnalysis adapter + EngineeringAnalysisPanel created | ✅ DONE (Sprint 5 — clash, solar, MEP display) |
| **Openings/doors/windows in BOQ** | designToBim didn't create opening elements | ✅ DONE (Sprint 7 — designGeometryAdapter generates doors/windows → BIM openings → BOQ items) |
| **Finishes allowance in BOQ** | No finishes, services, or preliminaries line items | Add as percentage allowances in adapter |
| **External wall area missing in BOQ** | External walls were not costed separately | ✅ DONE (Sprint 13 — added as line item) |
| **Partition/opening estimates in BOQ** | Used fixed m² estimates, not actual geometry | ✅ DONE (Sprint 13 — geometryQuantitiesAdapter provides derived quantities) |
| **Web Workers** | No off-main-thread processing | Future |
| **Tests** | 864 unit tests across 47 files | ✅ DONE (Sprint 9 + Sprints 16–29 + Sprints 36–49 + Sprints 65–70 + Sprints 72–74 + Sprints 76–77 + Sprints 79–80 — vitest, all adapters tested, CI pipeline) |
| **Deployment docs** | DEPLOYMENT_GUIDE.md, RELEASE_CHECKLIST.md, vercel.json, _redirects | ✅ DONE (Sprint 10 — Vercel/Netlify/static hosting, SPA fallback, release checklist) |
| **Load path analysis** | UI-rendered in WS5, not a reusable algorithm | Extract from WS5 store into lib/ |
| **Room layout optimization** | Grid-based layout may produce self-intersecting wall rings | Improve geometry adapter with proper floorplan algorithm |
| **Multi-floor layout variation** | All floors use same room template | Add floor-specific templates (ground vs upper) |
| **Furniture/blocks in generated rooms** | No furniture placement in rooms | Add CadBlockInstance generation in geometry adapter |
| **Persist AI-generated designs** | AI designs were local-state only | ✅ DONE (Sprint 6 — projectPersistenceService + Dashboard wiring) |
| **Persist BIM, BOQ, export actions** | No persistence for BIM/BOQ/export | ✅ DONE (Sprint 6 — projectPersistenceService + Dashboard wiring) |
