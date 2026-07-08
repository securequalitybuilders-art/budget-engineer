# Budget Engineer — Workspace Merge Audit

> **Date:** 2026-06-30  
> **Auditor:** DzeNhare Budget Engineer OS  
> **Status:** Pre-merge analysis — do not merge or rewrite yet.

---

## 1. ENVIRONMENT SUMMARY

| # | Folder | Subfolder | Files | Lines (est.) | Version |
|---|---|---|---|---|---|
| 1 | `workspace-chart 1` | `budget-engineer-os/` | 43 src + 9 config | ~3,500 | 0.0.0 |
| 2 | `workspace-chart 2` | `budget-engineer-os/` | 58 src + 19 markdown | ~3,800 | 0.1.0 |
| 3 | `workspace-chart 3` | `budget-engineer-os/` | 68 src + 25 markdown | ~3,700 | 0.1.0 |
| 4 | `workspace- chart 4` | `budget-engineer-os/` | 53 src + 9 markdown | ~3,500 | 1.0.0 |
| 5 | `workspace-chart 5` | `budget-engineer-os/` | 62 src + 7 markdown | ~2,000 | 0.0.0 |
| 6 | `workspace-chart 6` | `budget-engineer-os/` | 34 src + 29 markdown | ~4,200 | **0.42.0** |

All workspaces are independent React 18 + Vite + TypeScript SPAs with **no backend**, **no paid APIs**, and **no server dependencies**. They share the same `budget-engineer-os` npm package name and domain concepts (CadDocument, BimModel, BOQ, transactions), but each evolved different aspects in isolation.

---

## 2. PER-WORKSPACE AUDIT

---

### WORKSPACE 1 — "The Complete OS Shell"

| Field | Value |
|---|---|
| **package.json** | Yes (React 18, Zustand, Dexie, Recharts, MakerJS, Transformers.js, Framer Motion, Tailwind, CVA, PWA) |
| **src/** | Yes (43 files) |
| **tsconfig** | Yes — strict |
| **npm install** | Untested (assume works — has lockfile) |
| **npm run build** | Untested |
| **TailwindCSS** | Yes — v3.4 with custom brand tokens |
| **ESLint** | Yes — configured in package.json |
| **PWA** | Yes — vite-plugin-pwa configured |

**Major Features:**
- Full 6-stage pipeline UI (Brief → Concept → Design → Engineering → Docs → Cost)
- 3-step project wizard (profile, region/currency, brief)
- AI brief parser (deterministic regex-based)
- AI design engine (3 options: compact, standard, spacious)
- AI BOQ engine with rate catalogue and Zimbabwe rates
- Bento dashboard layout with sidebar, command bar, panels
- Command palette (Cmd+K)
- Keyboard shortcuts system
- Theme toggle (dark/light/system)
- Offline indicator
- Transaction log
- AI chat panel
- Project CRUD with Dexie/IndexedDB persistence (5 tables)
- Cost breakdown chart (Recharts)

**Best Modules to Keep:**
| Module | Reason |
|---|---|
| `src/styles/index.css` | Complete Tailwind config with DzeNhare design tokens, animations |
| `src/types/index.ts` | Comprehensive types (172 lines, well-organized) |
| `src/stores/projectStore.ts` | Zustand store with Immer, persist, transaction logging |
| `src/stores/uiStore.ts` | UI state management (theme, panels, stages) |
| `src/db/db.ts` | Dexie schema with 5 tables, rate seeding |
| `src/ai/briefParser.ts` | Deterministic NLP parser |
| `src/ai/designEngine.ts` | Parametric design generator (3 options) |
| `src/ai/boqEngine.ts` | BOQ generation from elements |
| `src/ai/schema.ts` | Zod validation schemas |
| `src/components/ui/*` | shadcn-style primitives (Button, Card, Input, Badge, etc.) |
| `src/components/layout/*` | BentoShell, Sidebar, CommandBar, panels, CommandPalette |
| `src/pages/*` | Home, ProjectWizard, Dashboard |
| `src/lib/utils.ts` | cn(), fmtCents(), toCents(), uuid(), clone() |
| `src/hooks/useKeyboardShortcuts.ts` | Global shortcut system |

**Broken or Risky Areas:**
- CAD canvas is a placeholder (`"CAD canvas coming next sprint"`)
- BIM viewer is absent
- AI modules use `@xenova/transformers` but not yet wired to real inference
- No Web Workers
- No tests

**Verdict:** **CANONICAL BASE CANDIDATE** — best UI architecture, full Tailwind design system, proper DB schema, complete stores, pipeline UX, PWA scaffolded.

---

### WORKSPACE 2 — "CAD & Geometry Engine"

| Field | Value |
|---|---|
| **package.json** | Yes (React 18, Zustand, MakerJS — NO Tailwind, NO Dexie) |
| **src/** | Yes (58 files) |
| **tsconfig** | Yes — strict |
| **npm install** | Untested |
| **npm run build** | Untested |
| **TailwindCSS** | No — custom CSS |
| **ESLint** | No |
| **Dexie** | No — uses localStorage |

**Major Features:**
- Full CAD document model (CadDocument: walls, openings, floors, layers, annotations, blocks)
- Parametric floor plan generator (algorithmic room layout from gross area)
- Interactive 2D SVG plan canvas (zoom, pan, room move/resize)
- Wall-first CAD editing (draw walls, add doors/windows)
- Block library (sofa, bed, table, wc, stair, core)
- Layer management (grid, walls, openings, annotations, rooms, dimensions)
- Floor management (multi-storey)
- Topology tools (split/join walls, heal endpoints, trim at intersection, offset chains)
- Dimension annotations (auto-generate)
- Professional DXF layer semantics (AIA standard)
- IFC-like / COBie-like JSON export
- SVG / DXF / MakerJS export
- BOQ engine (rate matching, line items, totals)
- Quantity takeoffs from plan geometry
- Undo/redo (50-60 levels)
- Transaction event logging

**Best Modules to Keep:**
| Module | Reason |
|---|---|
| `src/domain/cad.ts` | Complete CadDocument model (best in any workspace) |
| `src/domain/plan.ts` | PlanModel with rooms, walls, openings geometry |
| `src/domain/boq.ts` | BOQ types with sections |
| `src/engine/planGenerator.ts` | Best parametric floor plan generator |
| `src/engine/boqEngine.ts` | BOQ generation with contingency, fees, VAT |
| `src/lib/planGeometry.ts` | Room area, wall length, perimeter calculations |
| `src/lib/planTransforms.ts` | Move/resize rooms with boundary clamping |
| `src/lib/planConstraints.ts` | Snap, collision detection |
| `src/lib/planTopology.ts` | Rebuild walls from rooms |
| `src/lib/quantityFromPlan.ts` | Derive building elements from plan |
| `src/lib/cadSeed.ts` | Seed CadDocument from PlanModel |
| `src/lib/cadCommands.ts` | Add/delete walls, openings, annotations |
| `src/lib/cadEditing.ts` | Tool management, endpoint editing |
| `src/lib/cadTopology.ts` | Split/join walls, reconstruct rooms |
| `src/lib/cadIntersections.ts` | Trim at intersections, offset chains |
| `src/lib/cadHealing.ts` | Snap endpoints |
| `src/lib/cadDimensions.ts` | Auto-dimension annotations |
| `src/lib/cadBlocks.ts` | Furniture block library |
| `src/lib/cadMultiFloor.ts` | Floor projection |
| `src/lib/cadProfessional.ts` | Offset, trim, annotation editing |
| `src/lib/cadDxfSemantics.ts` | AIA DXF layer naming |
| `src/lib/cadExchange.ts` | IFC/COBie JSON export |
| `src/lib/makerExport.ts` | MakerJS model, JSON, DXF |
| `src/lib/svgExport.ts` | SVG plan export |
| `src/lib/money.ts` | Currency helpers |
| `src/lib/fileExport.ts` | Browser download utility |
| `src/data/seedRates.ts` | Rate card data |
| `src/components/cad/PlanCanvas.tsx` | Editable 2D plan SVG canvas |
| `src/components/cad/WallFirstCanvas.tsx` | Wall-first CAD editor |
| `src/components/cad/PlanComparison.tsx` | Design option comparison |
| `src/components/cad/*` | All CAD panels (LayerPanel, FloorPanel, CadToolbar, etc.) |
| `src/hooks/*` | usePlanViewport, usePlanHistory, useEditablePlan, useCadHistory, useCadDocument |

**Broken or Risky Areas:**
- No Dexie/IndexedDB (localStorage only — fragile)
- No Tailwind (custom CSS — harder to merge)
- No PWA
- No proper routing (single-page Dashboard)
- No tests
- BOQ panel is simple, no charting

**Verdict:** **MERGE SOURCE (CAD)** — best pure CAD engine across all workspaces. Must extract geometry libraries and canvas into the base.

---

### WORKSPACE 3 — "BIM, Enterprise & Governance"

| Field | Value |
|---|---|
| **package.json** | Yes (React 18, Three.js, R3F, drei, Dexie, Zustand, fflate — NO Tailwind) |
| **src/** | Yes (68 files) |
| **tsconfig** | Yes — strict |
| **npm install** | Untested |
| **npm run build** | Untested |
| **TailwindCSS** | No — inline CSS objects |
| **Dexie** | Yes — 7 tables |

**Major Features:**
- Full 3D BIM viewer (React Three Fiber + drei + Three.js)
- Lazy-loaded BIM viewer (1MB deferred)
- IFC4 STEP import and export (lossless round-trip with custom Dzenhare_CAD property sets)
- CAD-to-BIM generator (walls, slabs, roofs, openings, blocks, room zones)
- BIM-to-BOQ generator with rate-based costing
- 31 panel components (governance, RBAC, snapshots, comparison, cross-project, zone tracking, etc.)
- Governance workflow (draft → in_review → approved/rejected)
- RBAC (owner, reviewer, viewer)
- Project snapshots and versioning
- Snapshot diff computation (wall delta, opening delta, zone delta, BOQ delta)
- Cross-project analytics and portfolio management
- Zone costing and traceability
- BOQ comparison (category totals, share analysis, delta charts)
- Room program editor, room schedule
- Export package (IFC JSON, BOQ CSV, room schedule CSV/HTML, standards manifest)
- Standards manifest (IFC class mapping, COBie mapping, BOQ mapping)
- BimInspector, BimLegend, FloorVisibilityPanel

**Best Modules to Keep:**
| Module | Reason |
|---|---|
| `src/domain/bim.ts` | BimModel types (best BIM domain in any workspace) |
| `src/domain/governance.ts` | Governance workflow types |
| `src/domain/rbac.ts` | Role-based access types |
| `src/domain/transaction.ts` | Audit event types |
| `src/domain/versioning.ts` | Snapshot types |
| `src/engine/bimGenerator.ts` | CAD-to-BIM conversion |
| `src/engine/boqGenerator.ts` | BIM-to-BOQ conversion |
| `src/lib/ifc/ifcImport.ts` | IFC4 STEP parser (205 lines) |
| `src/lib/ifc/ifcExport.ts` | IFC4 STEP writer (202 lines) |
| `src/lib/governanceDb.ts` | Governance CRUD on Dexie |
| `src/lib/snapshotDiff.ts` | Snapshot comparison diff |
| `src/lib/boqCompare.ts` | BOQ line item comparison |
| `src/lib/boqShare.ts` | Cost composition %-share analysis |
| `src/lib/zoneCost.ts` | Zone cost estimation |
| `src/lib/zoneGrouping.ts` | Zone BOQ grouping |
| `src/lib/zoneReconstruction.ts` | Room zone reconstruction from walls |
| `src/lib/zoneTrace.ts` | Zone-to-BOQ traceability |
| `src/lib/crossProjectMetrics.ts` | Cross-project metric builder |
| `src/lib/portfolioMetrics.ts` | Portfolio metric builder |
| `src/lib/exporters.ts` | Download helpers |
| `src/lib/printExport.ts` | HTML schedule export |
| `src/lib/scheduleExport.ts` | CSV schedule export |
| `src/lib/standardsManifest.ts` | IFC/COBie/BOQ standards |
| `src/lib/rbac.ts` | Authorization functions |
| `src/lib/session.ts` | User session persistence |
| `src/components/bim/BimViewer.tsx` | 3D BIM viewer (R3F) |
| `src/components/bim/LazyBimViewer.tsx` | Lazy loading wrapper |
| `src/components/bim/BimInspector.tsx` | Element property inspector |
| `src/components/bim/BimLegend.tsx` | Color legend |
| `src/components/bim/FloorVisibilityPanel.tsx` | Floor toggle |
| `src/components/panels/*` | 31 panel components |

**Broken or Risky Areas:**
- No Tailwind — all inline styles (hard to maintain, no dark mode consistency)
- Many panels are stubs or thin wrappers
- No Web Workers
- No tests
- Dexie schema overlaps with WS1 but different table design

**Verdict:** **MERGE SOURCE (BIM)** — best BIM viewer, IFC interop, governance, RBAC, snapshot system. Must extract into base Tailwind system.

---

### WORKSPACE 4 — "Advanced Engineering & Enterprise Analytics"

| Field | Value |
|---|---|
| **package.json** | Yes (same stack as WS3 + Tailwind CSS 3.4 + autoprefixer + postcss) |
| **src/** | Yes (53 files) |
| **tsconfig** | Yes — **strict: false** (RISK) |
| **npm install** | Untested |
| **npm run build** | Untested |
| **TailwindCSS** | Yes — v3.4 with custom brand config |
| **Dexie** | Yes — 7 tables |

**Major Features:**
- Everything from WS3, plus Stages 26-34:
- Wall trim/join corner solver (cadSolver.ts)
- Parametric BIM opening families (parameterized door/window families)
- Multi-project executive portfolio charts
- Structural column grid generator (auto-place columns on grid)
- Client-ready PDF executive dossier (HTML-to-Print)
- Parametric solar orientation heat gain analyzer (cardinal facade cooling)
- Automated MEP services points takeoff (plumbing, electrical, data points)
- Automated BIM IFC clash interference checker (3 rules: opening-corner, opening-overlap, object-wall)
- ExecutivePortfolioDashboardPanel with bar charts, KPI grid, stacked procurement bars

**Best Modules to Keep:**
| Module | Reason |
|---|---|
| `src/lib/cadSolver.ts` | Wall intersection solver |
| `src/lib/clashChecker.ts` | IFC clash detection (3 rules) |
| `src/lib/solarAnalyzer.ts` | Solar heat gain analysis |
| `src/lib/mepTakeoff.ts` | MEP points takeoff |
| `src/lib/pdfDossier.ts` | HTML PDF dossier generator |
| `src/lib/executivePortfolio.ts` | Portfolio aggregation |
| `src/components/panels/ExecutivePortfolioDashboardPanel.tsx` | Executive dashboard |
| `src/components/panels/ClashCheckerPanel.tsx` | Clash detection UI |
| `src/components/panels/SolarOrientationPanel.tsx` | Solar analysis UI |
| `src/components/panels/MepTakeoffPanel.tsx` | MEP takeoff UI |

**Broken or Risky Areas:**
- `strict: false` in tsconfig — must enable strict mode
- Same inline style problem as WS3 for many panels
- Tailwind is present but only partially used
- No Web Workers

**Verdict:** **MERGE SOURCE (ADVANCED)** — best advanced engineering features. Cherry-pick the solver, clash, solar, MEP, and portfolio modules.

---

### WORKSPACE 5 — "Structural Engineering"

| Field | Value |
|---|---|
| **package.json** | Yes (React 18, Three.js, R3F, drei, Dexie, Zustand, fflate — NO Tailwind) |
| **src/** | Yes (62 files) |
| **tsconfig** | Yes — strict |
| **npm install** | Untested |
| **npm run build** | Untested |
| **TailwindCSS** | No |
| **Dexie** | Yes — 7 tables |

**Major Features:**
- Structural element generators (auto columns, beams, footings from plan)
- Material system switch (concrete/steel/timber) with color-coded rendering
- Load path diagram with kN force-flow arrows (wall→column→beam→footing)
- Load magnitude labels (computed from material density, tributary width)
- Rebar specification (diameter Y10/Y12/Y16, spacing 150/200/250, layers 1/2)
- Slab reinforcement takeoff panel (area, mesh density, tonnage, cost)
- Batch selection (Shift-click multi-select)
- Interactive 2D CAD plan with structural overlays

**Best Modules to Keep:**
| Module | Reason |
|---|---|
| `src/store/appStore.ts` | Structural generation actions |
| Structural generation code in store | Auto columns, beams, footings |
| Material switch logic | Concrete/steel/timber system |
| Load path & magnitude computation | Structural analysis |

**Broken or Risky Areas:**
- ~30 of 40 panel files are 4-line stubs (placeholder)
- No Tailwind
- Very limited feature set outside structural
- Many structural features are embedded in store rather than extracted into lib/

**Verdict:** **DISCARD (cherry-pick structural)** — most value is in the structural generation algorithms. Extract those and leave the stub panels behind.

---

### WORKSPACE 6 — "Latest: AI + Sections + Drawing Management"

| Field | Value |
|---|---|
| **package.json** | Yes (React 18, Three.js **direct**, Dexie, Zustand, **@mlc-ai/web-llm** — NO R3F, NO Tailwind) |
| **src/** | Yes (34 files) |
| **tsconfig** | Yes — strict |
| **npm install** | Untested |
| **npm run build** | Untested |
| **TailwindCSS** | No — but has well-designed CSS design tokens |
| **Dexie** | Yes — 6 tables |
| **WebLLM** | Yes — @mlc-ai/web-llm (Llama-3.2-1B-Instruct) |
| **Version** | **0.42.0** — most mature version |

**Major Features (Stages 42-70):**
- Local LLM brief parsing (WebLLM with Llama-3.2-1B-Instruct, automatic fallback to rules)
- AI design engine (multi-floor parametric from brief)
- Rebar spec override (diameter/spacing/layers)
- Load combination factors (SLS service / ULS ultimate)
- Regional cost database (Zimbabwe, South Africa, Kenya, Global — editable rates)
- Footing sizing from design load + soil bearing (4 soil classes)
- Sized footings integrated into BOQ
- Currency-aware BOQ export (CSV, self-contained HTML dossier)
- Plan SVG generator (pure string, non-interactive)
- **Section elevation SVG generator** with interactive section marker (A-A / B-B slider)
- Multi-floor support (2 storeys demonstrated)
- Stairwell slab void + trimmer beams in BIM
- Drawing title blocks (SVG)
- Drawing register (A-101, A-201...) with sheet management
- Revision history with auto-bump suggestion (design fingerprint hash)
- Change summary (headline metrics diff)
- Interactive section marker on plan
- 3D BIM viewer (**Three.js direct**, no R3F — lighter but less React-integrated)
- Editable persisted plan (drag walls/blocks)
- Multi-project management (CRUD with rename/archive)
- Transaction history panel

**Best Modules to Keep:**
| Module | Reason |
|---|---|
| `src/domain/types.ts` | Single-file types (183 lines, clean) |
| `src/ai/aiProvider.ts` | AI engine abstraction with fallback |
| `src/ai/briefParser.ts` | Deterministic brief parser |
| `src/ai/designEngine.ts` | Multi-floor parametric design generator |
| `src/ai/webllmParser.ts` | WebLLM adapter (Llama-3.2-1B-Instruct) |
| `src/lib/planSvg.ts` | Pure SVG plan generator |
| `src/lib/sectionSvg.ts` | Section elevation SVG generator |
| `src/lib/titleBlock.ts` | Drawing title block SVG |
| `src/lib/drawingRegister.ts` | Drawing register/sheet list |
| `src/lib/rateCard.ts` | Regional cost database (4 regions) |
| `src/lib/rebarSpec.ts` | Rebar parametrics |
| `src/lib/loadEngine.ts` | Load combination factors |
| `src/lib/footingSizer.ts` | RC pad footing sizing |
| `src/lib/boqExport.ts` | CSV + HTML dossier export |
| `src/lib/currency.ts` | Currency symbols |
| `src/lib/fingerprint.ts` | Design content hash |
| `src/lib/designMetrics.ts` | Change metrics/summary |
| `src/components/cad/SectionView.tsx` | Interactive section cutter |
| `src/components/panels/AiBriefPanel.tsx` | AI brief input UI |
| `src/components/panels/RateCardPanel.tsx` | Editable rate card UI |
| `src/components/panels/FootingSizingPanel.tsx` | Footing sizing UI |
| `src/components/panels/LoadAnalysisPanel.tsx` | Load analysis UI |
| `src/components/panels/RebarSpecPanel.tsx` | Rebar spec UI |
| `src/components/panels/ExportPanel.tsx` | Export UI with revision bump |
| `src/components/panels/ProjectSwitcherPanel.tsx` | Multi-project CRUD |

**Broken or Risky Areas:**
- Three.js 0.160.1 used directly (no @react-three/fiber — less idiomatic React)
- No Tailwind (uses custom CSS — well-designed but needs porting)
- No IFC import/export (unlike WS3/4)
- No governance/RBAC
- No Web Workers (WebLLM runs on main thread)
- No tests

**Verdict:** **MERGE SOURCE (AI + DRAWING)** — best AI integration, section views, drawing management, revision system, and dossier export. Must port AI modules and lib/ to base.

---

## 3. CROSS-WORKSPACE COMPARISON

### Stack Comparison

| Feature | WS1 | WS2 | WS3 | WS4 | WS5 | WS6 |
|---|---|---|---|---|---|---|
| React 18 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TypeScript Strict | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Vite | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tailwind CSS | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Zustand | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dexie/IndexedDB | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Three.js 3D | ❌ | ❌ | ✅(R3F) | ✅(R3F) | ✅(R3F) | ✅(direct) |
| MakerJS CAD | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| IFC Import/Export | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| WebLLM/AI | ✅(xenova) | ❌ | ❌ | ❌ | ❌ | ✅(mlc-ai) |
| PWA | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ESLint | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Framer Motion | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Recharts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Zod validation | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Routing (React Router) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Unit tests | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Web Workers | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Feature Coverage by Workspace

```
Feature                          WS1  WS2  WS3  WS4  WS5  WS6
──────────────────────────────────────────────────────────────
Project CRUD                     ✅   ✅   ✅   ✅   ✅   ✅
Brief Input                      ✅   ❌   ❌   ❌   ❌   ✅
AI Brief Parsing (determ)        ✅   ❌   ❌   ❌   ❌   ✅
AI Brief Parsing (WebLLM)        ❌   ❌   ❌   ❌   ❌   ✅
AI Design Generator              ✅   ✅   ❌   ❌   ❌   ✅
Parametric Floor Plan Gen        ❌   ✅   ❌   ❌   ❌   ✅
2D CAD Plan View (SVG)           ❌   ✅   ✅   ✅   ✅   ✅
Wall Editing (draw/move/delete)  ❌   ✅   ✅   ✅   ✅   ✅
Opening Editing (door/window)    ❌   ✅   ✅   ✅   ✅   ✅
Layer Management                  ❌   ✅   ❌   ❌   ❌   ❌
Block Library (furniture)        ❌   ✅   ✅   ❌   ✅   ❌
Dimension Annotations             ❌   ✅   ❌   ❌   ❌   ❌
Topology (split/join/heal)       ❌   ✅   ❌   ✅   ✅   ❌
Undo/Redo                        ❌   ✅   ❌   ❌   ❌   ❌
Multi-Floor Support              ❌   ✅   ❌   ❌   ❌   ✅
3D BIM Viewer                    ❌   ❌   ✅   ✅   ✅   ✅
BIM Generator (CAD→BIM)          ❌   ❌   ✅   ✅   ✅   ✅
BOQ Generator                    ✅   ✅   ✅   ✅   ✅   ✅
BOQ Editing                      ❌   ❌   ❌   ❌   ❌   ❌
Rate Card / Cost Database        ✅   ✅   ❌   ❌   ❌   ✅
Cost Chart                       ✅   ❌   ✅   ✅   ❌   CSS
Transaction / Audit Log          ✅   ✅   ✅   ✅   ❌   ✅
Governance Workflow              ❌   ❌   ✅   ✅   ❌   ❌
RBAC                             ❌   ❌   ✅   ✅   ❌   ❌
Project Snapshots                ❌   ❌   ✅   ✅   ❌   ❌
Cross-Project Analytics          ❌   ❌   ✅   ✅   ❌   ❌
Zone Cost / Trace                ❌   ❌   ✅   ❌   ❌   ❌
IFC Import                       ❌   ❌   ✅   ✅   ❌   ❌
IFC Export                       ❌   ❌   ✅   ✅   ❌   ❌
DXF Export                       ❌   ✅   ❌   ✅   ❌   ❌
SVG Export                       ❌   ✅   ✅   ✅   ❌   ✅
CSV Export                       ❌   ❌   ✅   ❌   ❌   ✅
HTML Dossier Export              ❌   ❌   ❌   ✅   ❌   ✅
PDF Export                       ❌   ❌   ❌   ✅   ❌   Print
Section/Elevation View           ❌   ❌   ❌   ❌   ❌   ✅
Drawing Register / Title Blocks  ❌   ❌   ❌   ❌   ❌   ✅
Revision History / Bump          ❌   ❌   ❌   ❌   ❌   ✅
Structural Col/Beam/Foot Gen     ❌   ❌   ❌   ✅   ✅   ✅
Material System Switch           ❌   ❌   ❌   ❌   ✅   ✅
Load Path Diagram                ❌   ❌   ❌   ❌   ✅   ❌
Load Combination Factors         ❌   ❌   ❌   ❌   ❌   ✅
Footing Sizing                   ❌   ❌   ❌   ❌   ❌   ✅
Rebar Spec / Takeoff             ❌   ❌   ❌   ❌   ✅   ✅
Clash Detection                  ❌   ❌   ❌   ✅   ❌   ❌
Solar Analysis                   ❌   ❌   ❌   ✅   ❌   ❌
MEP Takeoff                      ❌   ❌   ❌   ✅   ❌   ❌
Command Palette                  ✅   ❌   ❌   ❌   ❌   ❌
Keyboard Shortcuts               ✅   ❌   ❌   ❌   ❌   ❌
Theme Toggle                     ✅   ❌   ❌   ❌   ❌   ❌
Offline Indicator                ✅   ❌   ❌   ❌   ❌   ❌
AI Chat Panel                    ✅   ❌   ❌   ❌   ❌   ❌
PWA                              ✅   ❌   ❌   ❌   ❌   ❌
```

---

## 4. RECOMMENDATIONS

### 4.1 Canonical Base Repository

**→ WORKSPACE 1 (`workspace-chart 1`)**

**Rationale:**
1. **Best architecture:** Has proper routing (React Router), Tailwind design system, PWA, ESLint, proper DB schema, typed stores, shadcn-style UI primitives
2. **Complete pipeline:** 6-stage UI pipeline from Brief through Cost — the product vision
3. **Design system:** Only workspace with full DzeNhare brand in Tailwind (the new `brandguidelines.md` was modeled after this)
4. **Store architecture:** Zustand + Immer + persist is the cleanest state management pattern
5. **DB schema:** Dexie with 5 tables, rate seeding, transaction log — closest to the constitution requirements
6. **Validation:** Zod schemas for all AI pipeline data
7. **PWA:** vite-plugin-pwa configured — aligns with offline-first requirement
8. **Component system:** CVA + clsx + tailwind-merge — industry standard pattern

### 4.2 Features to Merge from Each Workspace

#### From Workspace 2 (CAD Engine)
```
Merge order: 1st (after base)
Priority: HIGH — core feature
Files to port:
  ├── src/domain/plan.ts        → src/domain/plan.ts
  ├── src/domain/cad.ts         → src/domain/cad.ts (merge with WS1 types)
  ├── src/engine/planGenerator.ts → src/engine/plan-generator.ts
  ├── src/lib/planGeometry.ts   → src/lib/geometry/plan-geometry.ts
  ├── src/lib/planTransforms.ts → src/lib/geometry/plan-transforms.ts
  ├── src/lib/planConstraints.ts → src/lib/geometry/plan-constraints.ts
  ├── src/lib/planTopology.ts   → src/lib/geometry/plan-topology.ts
  ├── src/lib/quantityFromPlan.ts → src/lib/quantities/quantity-from-plan.ts
  ├── src/lib/cadSeed.ts        → src/lib/cad/cad-seed.ts
  ├── src/lib/cadCommands.ts    → src/lib/cad/cad-commands.ts
  ├── src/lib/cadEditing.ts     → src/lib/cad/cad-editing.ts
  ├── src/lib/cadTopology.ts    → src/lib/cad/cad-topology.ts
  ├── src/lib/cadIntersections.ts → src/lib/cad/cad-intersections.ts
  ├── src/lib/cadHealing.ts     → src/lib/cad/cad-healing.ts
  ├── src/lib/cadDimensions.ts  → src/lib/cad/cad-dimensions.ts
  ├── src/lib/cadBlocks.ts      → src/lib/cad/cad-blocks.ts
  ├── src/lib/cadMultiFloor.ts  → src/lib/cad/cad-multi-floor.ts
  ├── src/lib/cadProfessional.ts → src/lib/cad/cad-professional.ts
  ├── src/lib/cadDxfSemantics.ts → src/lib/cad/cad-dxf-semantics.ts
  ├── src/lib/cadExchange.ts    → src/lib/cad/cad-exchange.ts
  ├── src/lib/makerExport.ts    → src/lib/export/maker-export.ts
  ├── src/lib/svgExport.ts      → src/lib/export/svg-export.ts
  ├── src/lib/money.ts          → src/lib/utils/money.ts (merge with WS1)
  ├── src/lib/fileExport.ts     → src/lib/export/file-export.ts
  ├── src/lib/cadPlanSync.ts    → src/lib/cad/cad-plan-sync.ts
  ├── src/lib/cadProjection.ts  → src/lib/cad/cad-projection.ts
  └── src/components/cad/*      → src/components/cad/* (re-theme with Tailwind)
```

#### From Workspace 3 (BIM + Enterprise)
```
Merge order: 2nd
Priority: HIGH — core feature
Files to port:
  ├── src/domain/bim.ts         → src/domain/bim.ts
  ├── src/domain/governance.ts  → src/domain/governance.ts
  ├── src/domain/rbac.ts        → src/domain/rbac.ts
  ├── src/domain/versioning.ts  → src/domain/versioning.ts
  ├── src/engine/bimGenerator.ts → src/engine/bim-generator.ts
  ├── src/engine/boqGenerator.ts → src/engine/boq-generator.ts (merge with WS1)
  ├── src/lib/ifc/ifcImport.ts  → src/lib/ifc/ifc-import.ts
  ├── src/lib/ifc/ifcExport.ts  → src/lib/ifc/ifc-export.ts
  ├── src/lib/governanceDb.ts   → src/lib/db/governance-db.ts
  ├── src/lib/snapshotDiff.ts   → src/lib/versioning/snapshot-diff.ts
  ├── src/lib/boqCompare.ts     → src/lib/boq/boq-compare.ts
  ├── src/lib/boqShare.ts       → src/lib/boq/boq-share.ts
  ├── src/lib/rbac.ts           → src/lib/auth/rbac.ts
  ├── src/lib/session.ts        → src/lib/auth/session.ts
  ├── src/lib/crossProject*.ts  → src/lib/portfolio/
  ├── src/lib/portfolio*.ts     → src/lib/portfolio/
  ├── src/lib/zone*.ts          → src/lib/zones/
  ├── src/lib/standardsManifest.ts → src/lib/export/standards-manifest.ts
  ├── src/lib/exporters.ts      → src/lib/export/exporters.ts
  ├── src/lib/printExport.ts    → src/lib/export/print-export.ts
  ├── src/lib/scheduleExport.ts → src/lib/export/schedule-export.ts
  ├── src/lib/zipPackage.ts     → src/lib/export/zip-package.ts
  ├── src/lib/archiveExport.ts  → src/lib/export/archive-export.ts
  ├── src/components/bim/*      → src/components/bim/* (Tailwind-pass)
  ├── src/components/panels/*   → cherry-pick (Governance, RBAC, Snapshots,
  │                                Comparison, CrossProject, Zone, Standards)
  └── src/lib/db.ts             → merge Dexie schema into WS1's db.ts
```

#### From Workspace 4 (Advanced Engineering)
```
Merge order: 3rd
Priority: MEDIUM
Files to port:
  ├── src/lib/cadSolver.ts      → src/lib/cad/cad-solver.ts
  ├── src/lib/clashChecker.ts   → src/lib/analysis/clash-checker.ts
  ├── src/lib/solarAnalyzer.ts  → src/lib/analysis/solar-analyzer.ts
  ├── src/lib/mepTakeoff.ts     → src/lib/quantities/mep-takeoff.ts
  ├── src/lib/pdfDossier.ts     → src/lib/export/pdf-dossier.ts
  ├── src/lib/executivePortfolio.ts → src/lib/portfolio/executive-portfolio.ts
  └── src/components/panels/*   → cherry-pick (Clash, Solar, MEP, Executive,
                                    Portfolio panels; re-theme with Tailwind)
```

#### From Workspace 5 (Structural)
```
Merge order: 4th
Priority: LOW-MEDIUM
Files to port (cherry-pick only):
  ├── Structural generation algorithms from appStore.ts
  ├── Load path computation logic
  └── Slab reinforcement takeoff logic
Note: Most panels are stubs — extract algorithms into lib/ files,
      discard stub panels.
```

#### From Workspace 6 (AI + Drawing Management)
```
Merge order: 5th
Priority: HIGH
Files to port:
  ├── src/ai/aiProvider.ts      → src/ai/ai-provider.ts
  ├── src/ai/briefParser.ts     → src/ai/brief-parser.ts (merge with WS1)
  ├── src/ai/designEngine.ts    → src/ai/design-engine.ts (merge with WS1)
  ├── src/ai/webllmParser.ts    → src/ai/webllm-parser.ts
  ├── src/lib/planSvg.ts        → src/lib/export/plan-svg.ts
  ├── src/lib/sectionSvg.ts     → src/lib/export/section-svg.ts
  ├── src/lib/titleBlock.ts     → src/lib/export/title-block.ts
  ├── src/lib/drawingRegister.ts → src/lib/export/drawing-register.ts
  ├── src/lib/rateCard.ts       → src/lib/rates/rate-card.ts
  ├── src/lib/rebarSpec.ts      → src/lib/structural/rebar-spec.ts
  ├── src/lib/loadEngine.ts     → src/lib/structural/load-engine.ts
  ├── src/lib/footingSizer.ts   → src/lib/structural/footing-sizer.ts
  ├── src/lib/boqExport.ts      → src/lib/export/boq-export.ts
  ├── src/lib/currency.ts       → src/lib/utils/currency.ts
  ├── src/lib/fingerprint.ts    → src/lib/versioning/fingerprint.ts
  ├── src/lib/designMetrics.ts  → src/lib/versioning/design-metrics.ts
  ├── src/components/cad/SectionView.tsx → src/components/cad/section-view.tsx
  └── src/components/panels/*   → cherry-pick (AI, RateCard, Footing, Load,
                                    Rebar, Export, ProjectSwitcher)
```

### 4.3 Exact Merge Order

```
PHASE A — Foundation (Base from WS1 + Merge WS2 CAD)
  1. Initialize canonical repo from WS1's package.json, tsconfig, vite.config,
     tailwind.config, postcss.config, index.html, src/main.tsx
  2. Port WS1's src/styles/, src/types/, src/db/, src/stores/, src/lib/utils.ts
  3. Port WS2's CAD domain types + merge with WS1 types
  4. Port WS2's CAD engine (planGenerator, all cad-*.ts lib files)
  5. Port WS2's CAD components (PlanCanvas, WallFirstCanvas, all panels)
  6. Re-theme WS2 components with WS1's Tailwind design system
  7. Build & typecheck must pass

PHASE B — BIM (Merge WS3)
  1. Port WS3's BIM domain types
  2. Port WS3's BIM generator + BOQ generator
  3. Port WS3's IFC import/export
  4. Port WS3's BIM viewer components (re-theme with Tailwind)
  5. Port WS3's governance, RBAC, snapshot, zone modules
  6. Port WS3's panel components (cherry-pick non-stubs)
  7. Merge WS3's Dexie schema into WS1's db.ts
  8. Build & typecheck must pass

PHASE C — Advanced Engineering (Merge WS4 + WS5 cherry-pick)
  1. Port WS4's cadSolver, clashChecker, solarAnalyzer, mepTakeoff
  2. Port WS4's pdfDossier, executivePortfolio
  3. Port WS4's panel components
  4. Extract structural algorithms from WS5's store into lib/ files
  5. Build & typecheck must pass

PHASE D — AI + Drawing Management (Merge WS6)
  1. Port WS6's AI modules (aiProvider, briefParser, designEngine, webllmParser)
  2. Port WS6's drawing modules (planSvg, sectionSvg, titleBlock, drawingRegister)
  3. Port WS6's structural lib (rebarSpec, loadEngine, footingSizer)
  4. Port WS6's export modules (boqExport, currency, fingerprint, designMetrics)
  5. Port WS6's panel components (AI, RateCard, Footing, Load, Rebar, Export, ProjectSwitcher)
  6. Integrate WebLLM with proper lazy-loading
  7. Build & typecheck must pass

PHASE E — Polish
  1. Ensure all 4 project memory files (gemini.md, brandguidelines.md,
     task_plan.md, project_constitution.md) are in root
  2. Verify npm install, npm run typecheck, npm run build
  3. Run validation checklist from task_plan.md
```

### 4.4 Files to Discard (Do Not Port)

| Workspace | File(s) | Reason |
|---|---|---|
| WS2 | `src/index.css` | Replaced by WS1's Tailwind design system |
| WS3 | All inline `style={}` objects | Must be converted to Tailwind |
| WS4 | `tsconfig.json` (strict:false) | Must use strict mode from WS1 |
| WS5 | 30 stub panel files (4-line placeholders) | No content to port |
| WS5 | `src/index.css` | Inline style approach |
| WS6 | `src/index.css` | Custom CSS — replace with Tailwind |
| All | `src/lib/db.ts` | All merged into single WS1 schema |
| All | `src/store/appStore.ts` | All merged into single WS1 store |
| All | `src/domain/types.ts` | All merged into single type system |
| All | Markdown plans (*.md) | Already captured in new project files |
| All | `samples/` | Test data — optional |

---

## 5. FINAL VERDICT

| Question | Answer |
|---|---|
| **Canonical base** | **workspace-chart 1** (best architecture, Tailwind, DB, stores, PWA) |
| **CAD engine source** | **workspace-chart 2** (best geometry library, plan gen, editing) |
| **BIM source** | **workspace-chart 3** (best 3D viewer, IFC interop, governance) |
| **Advanced engineering** | **workspace-chart 4** (clash, solar, MEP, solver, dossier) |
| **Structural cherry-pick** | **workspace-chart 5** (auto columns/beams/footings) |
| **AI + Drawing management** | **workspace-chart 6** (WebLLM, sections, drawing register, revision) |
| **Merge phases** | **A→B→C→D→E** (5 sequential phases) |
| **Do not merge yet** | ✅ Confirmed — audit only |

## 6. NEXT STEPS

1. Read this full report
2. Review recommendations with team
3. Confirm canonical base choice
4. Begin **Phase A** merge
5. Run `npm run typecheck` after each module ported
6. Run `npm run build` after each phase
7. Do not copy entire `src/` folders — port module by module
