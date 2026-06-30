# Canonical Repo Status — Budget Engineer OS

> **Date:** 2026-06-30  
> **Base:** WS1 (`workspace-chart 1/budget-engineer-os`)  
> **Status:** Phase C (WS4 Advanced Engineering) merged — `npm run typecheck` (0 errors), `npm run build` (success)

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
- Unchanged from WS1 base

---

## Current Routes (unchanged from WS1)

| Path | Page Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Landing page |
| `/new` | `ProjectWizard.tsx` | 3-step wizard |
| `/project/:id` | `Dashboard.tsx` | Main workspace with PlanCanvas |

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

### AI Pipeline (WS1)
- Deterministic brief parser, design engine, BOQ engine
- Zod validation schemas

### 2D CAD (WS2 Phase A)
- Interactive PlanCanvas with pan/zoom/viewport
- Parametric floor plan generation
- Room move/resize with undo/redo
- Dimension annotations and room labels
- Wall-first CAD authoring (WallFirstCanvas)
- Wall editing: draw, move endpoints, split, join, offset, trim
- Opening editing: add/delete/move doors and windows
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

### Versioning & Snapshots (WS3 Phase B)
- Project snapshot types
- Snapshot diff computation (wall, opening, zone, BOQ deltas)
- Portfolio metric builder

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

### Components
- **7 UI primitives** (Button, Card, Badge, Input, Label, Select, Textarea)
- **12 layout components** (BentoShell, Sidebar, CommandBar, CommandPalette, etc.)
- **12 CAD components** (PlanCanvas, WallFirstCanvas, PlanComparison, PlanLegend, panels)
- **5 BIM components** (BimViewer, BimLegend, BimInspector, FloorVisibilityPanel, LazyBimViewer)

---

## Current Known Gaps

| Gap | Details | Source to Merge |
|---|---|---|
| **Governance/RBAC/Snapshot panels** | Types/lib merged; UI panels deferred | WS3 |
| **Cross-Project/Portfolio/Zone panels** | Lib merged; UI panels deferred | WS3 |
| **Export/Standards panels** | Lib merged; UI panels deferred | WS3 |
| **WebLLM inference** | `@xenova/transformers` installed but not wired | WS6 |
| **Web Workers** | No off-main-thread processing | All |
| **Tests** | No unit or integration tests | None |
| **3D BIM viewer in Dashboard** | BimViewer exists but not integrated into Dashboard page | Future |
| **Section/elevation views** | Not present | WS6 |
| **Drawing register** | Not present | WS6 |
| **Structural engineering** | No column/beam/footing gen, load analysis, rebar | WS5/6 |
| **Regional cost database** | Zimbabwe only, not editable | WS6 |
| **WS4 panel components** | 4 panels (Clash, Solar, MEP, Executive) deferred — need Tailwind re-theme | WS4 |
| **WebLLM inference** | `@xenova/transformers` installed but not wired | WS6 |
| **Section/elevation views** | Not present | WS6 |
| **Drawing register** | Not present | WS6 |
| **Structural engineering** | No column/beam/footing gen, load analysis, rebar | WS5/6 |
