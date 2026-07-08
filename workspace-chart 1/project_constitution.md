# project_constitution.md — Budget Engineer OS
## Technical Governance & AI Constitution for the Budget Engineer Upgrade
> Version: 1.0.0 | Ratified: June 2026 | Source: live audit + Dzenhare Master Plan 2026-2031 + Dzenhare Project Constitution v6.0

---

## PREAMBLE

This document is the **supreme technical law** for the upgraded Budget Engineer application. It overrides personal preferences and rapid workarounds. Every agent and engineer must align with these standards to build a platform that serves African builders.

> *"We build for the African builder with a $200 phone, on 2G internet, who speaks ChiShona or English. Every line of code must respect their battery, data, and offline reality."*

**Full reference:** The complete Dzenhare Project Constitution (v6.0) is in `uploads/project_constitution.md`. This file focuses on the **Budget Engineer Studio** upgrade: AI-powered design → 2D CAD → 3D BIM → QTO → BOQ.

---

## 1. VISION & NORTH STAR

**Mission:** Make construction affordable for everyone by turning a plain-language brief into a complete, cost-optimized building package:

```text
User Brief → AI Reasoning → 2D CAD Drawings → 3D BIM Model → Engineering Quantities → BOQ → Tender Docs
```

**Product:** Dzenhare OS — Budget Engineer Studio.

**Target users:** First-Time Home Builders, Aspirational Builders, Institutions/NGOs, Business/Developers, Professionals/Architects.

**North Star Metric:** Percentage of projects completing within 5% of the locked budget.

---

## 2. NON-NEGOTIABLE CONSTRAINTS

1. **No paid API dependency.** Production must be runnable with only open-source code and free/self-hosted services. LLMs, databases, auth, storage, and cost data must have a free/self-hosted path.
2. **Local-first by default.** A user can create a project, model a building, and generate a BOQ offline. Sync is optional and opt-in.
3. **Open formats.** Drawings export to DXF/SVG; models to IFC/XKT/GLB; BOQ to CSV/XLSX/PDF/JSON; projects to JSON.
4. **Integer cents for money.** All monetary values stored and computed as integer cents (`bigint` or `number` integer). No floating-point currency anywhere in the app.
5. **Accessible.** WCAG 2.2 AA minimum. Keyboard navigation, screen-reader labels, focus visible, reduced-motion support.
6. **Dark-first.** Default dark mode (`#0B0F19`). Light mode is an alternative toggle.
7. **Auditable.** Every mutation on Brief, Design, Element, or BOQ creates an immutable `Transaction` record before the UI updates.
8. **One codebase.** Prefer a single Vite/React/TypeScript frontend plus one optional backend service. Avoid microservices for the MVP.
9. **Type-safe.** TypeScript everywhere. Use Zod for runtime validation of AI/geometry/inputs.
10. **Africa-first.** Default currency ZWG/USD, Zimbabwe/ZBC material rates, Shona/English localization; support additional regional catalogues via CWICR.

---

## 3. THE 6-LAYER TOPOLOGY (Simplified for Budget Engineer)

```
┌──────────────────────────────────────────────────────────────┐
│ LAYER 0: CLIENT (Offline-First, Mobile-First)                │
│ • React + Vite PWA • Dexie.js / IndexedDB • RxDB-style sync  │
├──────────────────────────────────────────────────────────────┤
│ LAYER 1: EDGE (Optional)                                     │
│ • Kong / Cloudflare for CDN • WebSocket for real-time sync   │
├──────────────────────────────────────────────────────────────┤
│ LAYER 2: APPLICATION / COMPUTE                               │
│ • FastAPI/Node microservice or Vercel edge functions         │
│ • Pipeline: structural check → solar → material → BOQ        │
├──────────────────────────────────────────────────────────────┤
│ LAYER 3: AI/ML (Local-First)                                  │
│ • transformers.js / WebLLM / Ollama bridge                  │
│ • Amanbh997 skill repos: Skills-Architects, CD Skills, Urban  │
├──────────────────────────────────────────────────────────────┤
│ LAYER 4: DATA (Polyglot, Local-First)                        │
│ • SQLite (sql.js / OPFS) for cost catalogues & standards     │
│ • Dexie.js for projects, BOQs, events, transaction history   │
│ • Event log: immutable append-only design/boq events         │
├──────────────────────────────────────────────────────────────┤
│ LAYER 5: EXTERNAL (Optional, Free)                          │
│ • CWICR open cost data • ZBC building codes • EcoCash/Paynow  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. TECH STACK

### Core Frontend

| Layer | Tool | Why |
|-------|------|-----|
| Framework | React 18 + Vite | Existing stack; fast HMR; PWA-friendly. |
| Language | TypeScript | Safety and agent-friendly. |
| Styling | Tailwind CSS | Existing design tokens already in CSS. |
| Components | shadcn/ui + Radix | Accessible, headless, customizable. |
| State | Zustand + Immer | Simple, fast, transaction-friendly. |
| Routing | React Router / TanStack Router | Stage-based routing. |
| Theming | `next-themes` or custom hook | Dark-first, system-aware. |
| Animation | Framer Motion | Already loaded as `vendor-motion`. |
| Icons | Lucide React | Already in vendor bundle. |
| Charts | Recharts / Tremor | Free, React-native. |
| i18n | i18next / react-i18next | Already in vendor bundle. |
| Data grid | AG Grid Community | Free, professional BOQ table. |

### Computational Engine (Browser or Backend)

| Layer | Tool | Why |
|-------|------|-----|
| 2D Geometry | `maker.js` + `Design-Core` | Programmatic CAD in JS/TS. |
| 3D Viewer | `three.js` + `xeokit-sdk` | Existing three.js; IFC/XKT viewing. |
| 3D CSG | `OpenJSCAD` + `Manifold` | Parametric solid modeling. |
| DXF | `maker.js` (browser) or `ezdxf` (Python) | Industry standard open format. |
| IFC | `That Open Engine` / `web-ifc` | BIM interoperability. |
| QTO/BOQ | Custom engine + `math.js` / `convert-units` | Domain-specific; no vendor lock-in. |
| Cost data | `OpenConstructionEstimate-DDC-CWICR` + Zimbabwe overrides | Open, multilingual, regional. [2](https://github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR) |
| AI skills | `Amanbh997/Skills-Architects`, `Amanbh997/Claude-skills-for-Computational-Designers`, `Amanbh997/Urban-Design-Skills-Claude` | Domain knowledge + Python calculators. |
| ERP reference | `OpenConstructionERP` | Full open-source construction ERP with BOQ/BIM patterns. [4](https://github.com/datadrivenconstruction/OpenConstructionERP) |
| PDF Export | `react-pdf` or `PDFKit` | Free, deterministic. |
| Vector search | `Fuse.js` or `LanceDB` | Free local search. |

### Backend / Persistence (Optional)

| Layer | Tool | Why |
|-------|------|-----|
| Auth | Auth.js / Lucia | Free, open source. |
| DB | SQLite (LibSQL) / PocketBase | Self-hosted, local-first, file-based. |
| Sync | Electric SQL or simple CRDT | Offline-first sync. |
| Storage | MinIO or filesystem | S3-compatible, self-hosted. |
| CI/CD | GitHub Actions | Free automation. |

---

## 5. DATA MODEL

```typescript
// Project — the root entity
interface Project {
  id: string;          // UUID
  slug: string;
  name: string;
  ownerId: string;
  profile: "first-time" | "aspirational" | "institution" | "business" | "professional";
  region: "zimbabwe" | "south-africa" | "zambia" | "...";
  currency: "ZWG" | "USD";
  status: "draft" | "concept" | "design" | "engineering" | "costing" | "tender";
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Brief — plain-language requirements + structured parameters
interface Brief {
  projectId: string;
  rawText: string;
  parsed: {
    buildingType: string;
    floors: number;
    bedrooms?: number;
    areaM2?: number;
    budgetCents?: bigint;
    location: string;
    standards: string[]; // e.g., ZBC 1996
  };
  aiReasoning?: string; // trace of local LLM reasoning
}

// Design — parametric geometry + 2D/3D artifacts
interface Design {
  id: string;
  projectId: string;
  name: string;
  optionIndex: number; // A, B, C
  parameters: Record<string, number>; // width, depth, floorHeight, etc.
  floorPlans: FloorPlan[];
  elements: BuildingElement[];
  generatedAt: Date;
}

interface FloorPlan {
  id: string;
  level: number;
  svg?: string;
  dxf?: string;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  polygon: number[][]; // [x,y] points
  areaM2: number;
  perimeterM: number;
}

interface BuildingElement {
  id: string;
  category: "wall" | "slab" | "roof" | "foundation" | "opening" | "fixture" | "column" | "beam";
  material: string;
  dimensions: { length?: number; width?: number; height?: number; count?: number };
  quantity: Quantity;
}

interface Quantity {
  value: number;
  unit: "m" | "m2" | "m3" | "kg" | "each" | "l" | "hr";
  formula: string; // human-readable formula for audit
}

// BOQ — bill of quantities
interface BOQ {
  id: string;
  projectId: string;
  designId: string;
  sections: BOQSection[];
  totalCents: bigint;
  contingencyCents: bigint;
  currency: string;
  generatedAt: Date;
}

interface BOQSection {
  id: string;
  code: string; // CSI MasterFormat or local standard
  title: string;
  items: BOQItem[];
  subtotalCents: bigint;
}

interface BOQItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rateCents: bigint; // integer cents per unit
  totalCents: bigint;
  elementIds: string[]; // trace back to design elements
  source: "auto" | "manual" | "ai-suggested";
  aiConfidence: number; // 0-100
}

// Transaction / Audit log
interface Transaction {
  id: string;
  projectId: string;
  userId?: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "EXPORT" | "AI_GENERATE";
  entityType: "brief" | "design" | "element" | "boq" | "rate" | "export";
  entityId: string;
  before?: object;
  after?: object;
  diff?: object;
  reason?: string; // user note or AI reasoning
  createdAt: Date;
}

// Rate library
interface Rate {
  id: string;
  region: string;
  code: string;
  description: string;
  unit: string;
  baseRateCents: bigint; // integer cents per unit
  source: "cwicr" | "zimbabwe" | "custom";
  year: number;
}

// User (if multi-user)
interface User {
  id: string;
  email: string;
  role: "owner" | "editor" | "viewer" | "admin";
  org?: string;
}
```

---

## 6. COMPUTATIONAL PIPELINE

```
User Brief (text + structured params)
       ↓
Local LLM parses brief → structured parameters (Zod validated)
       ↓
Parametric geometry kernel (Maker.js / Design-Core) generates 3 floor-plan options
       ↓
Each option is converted to:
   - 2D SVG/DXF (Maker.js)
   - 3D IFC/XKT (OpenJSCAD / That Open Engine / xeokit)
       ↓
QTO engine extracts rooms, walls, slabs, openings, roof → quantities
       ↓
BOQ engine matches quantities to rate library (Zimbabwe or CWICR)
       ↓
Dashboard: charts + cost breakdown + transaction history
       ↓
Export: DXF / IFC / XKT / PDF / CSV / JSON
```

### Pipeline Stages (from Amanbh997 CD Skills)

1. **Structural Check** — load paths, beam deflection, column slenderness, foundation bearing.
2. **Solar Analysis** — annual insolation, panel placement, shading, roof pitch.
3. **Material Estimate** — concrete, steel, brick, timber, roofing, finishes quantities.
4. **BOQ Generation** — map quantities to CWICR/Zimbabwe rates, add contingency, validate.

Every stage produces an immutable `design_pipeline` event before the result is shown.

---

## 7. EVENT-SOURCING RULES

1. **No direct mutation.** Client views must never update state directly without dispatching an event.
2. **Append before update.** Every state change is appended to the local event log (Dexie.js) before the UI projection updates.
3. **Offline queue.** When offline, events are queued with `synced: false`. On reconnect, flush in chronological order with exponential backoff.
4. **No backend state before event.** If a backend exists, the event must be persisted before any projection update.
5. **Transaction log.** Every user/AI/system action on a project creates a `Transaction` record.

---

## 8. ARCHITECTURAL DECISIONS

### 8.1 Mobile-First Layout
All interfaces must align to a **375px baseline**. Viewports must scale *up*, never down. All tap targets must be **44px** minimum.

### 8.2 Offline-First Event-Sourcing
Reads/writes occur locally. Changes are queued as events. Reconciliation flushes queued events on reconnect.

### 8.3 Strict Financial Data Types
Floating-point arithmetic is strictly prohibited for monetary calculations. Use `bigint` cents or a `Decimal` library (e.g., `decimal.js`). Database columns for money use `BIGINT` or `INTEGER` cents.

### 8.4 Web Workers for Computation
CAD, BIM, QTO, and AI inference must run in Web Workers to avoid blocking the UI. WASM modules (Manifold, OpenJSCAD, sql.js, ONNX) are loaded in workers.

---

## 9. CONSTITUTIONAL PROHIBITIONS (Anti-Patterns)

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-001 | Floating-point for currency | ESLint rejects variables matching `*price*`, `*amount*`, `*budget*`, `*rate*` typed as `number` (float). Use integer cents or `Decimal`. |
| AP-002 | Update state before event persistence | State managers throw if mutated outside event actions. |
| AP-003 | Offline finalized payments | Escrow/payout actions require online confirmation; offline actions queued. |
| AP-004 | Desktop-first breakpoints | CSS defaults to mobile; media queries use `min-width` starting at 375px. |
| AP-005 | Bypassing the event log | Every mutation must create a `Transaction` or `design_event`. |
| AP-006 | Hardcoded localized content | All UI text uses `i18n.t("key")`. |
| AP-007 | Plaintext secrets in repos | Pre-commit hooks run `gitleaks`; secrets load from environment or Vault. |
| AP-008 | Unbounded database queries | All queries default `LIMIT 50` unless explicit. |
| AP-009 | Paid API dependency | No OpenAI/Anthropic/Gemini/AutoCAD/Revit APIs. Use open-source alternatives. |
| AP-010 | Monolithic components > 300 lines | Split by pipeline stage or responsibility. |
| AP-011 | Light-mode-only design | Dark mode is default. |
| AP-012 | Unvalidated AI output | Zod parse required before any AI output is used. |

---

## 10. QUALITY GATES

Before any PR is merged:

- `tsc --noEmit` passes.
- `eslint` + `prettier` pass.
- Unit tests cover QTO, BOQ, and currency math.
- Component tests cover the critical path: brief → design → BOQ.
- Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices, SEO).
- WCAG contrast checker passes for all color pairs.
- No new paid API dependency introduced.
- All monetary fields use integer cents.
- All state changes are event-sourced.

---

## 11. DEFINITION OF DONE (MVP)

- [ ] User can create a project, fill a brief, and get 3 AI-generated design options.
- [ ] Each option renders as a 2D CAD canvas with layers and dimensions.
- [ ] Each option can be viewed as a 3D BIM model (IFC/XKT/GLB).
- [ ] QTO engine extracts quantities from geometry.
- [ ] BOQ engine generates a line-item bill with live Zimbabwe/CWICR rates.
- [ ] Dashboard shows cost charts, budget health, and variance.
- [ ] Transaction history logs every change with a diff view.
- [ ] Dark mode is default; light mode is an option.
- [ ] Exports work: DXF, IFC, PDF, CSV, JSON.
- [ ] App works offline; sync is optional.
- [ ] No paid API dependency.
- [ ] Lighthouse ≥ 90, WCAG AA, TypeScript strict, tests pass.

---

## 12. OPEN-SOURCE SOURCES OF TRUTH

- **Amanbh997/Skills-Architects** — architectural design theory, building codes, country dossiers [https://github.com/Amanbh997/Skills-Architects](https://github.com/Amanbh997/Skills-Architects)
- **Amanbh997/Claude-skills-for-Computational-Designers** — parametric modeling, generative design, structural/environmental computation, BIM scripting [https://github.com/Amanbh997/Claude-skills-for-Computational-Designers](https://github.com/Amanbh997/Claude-skills-for-Computational-Designers)
- **Amanbh997/Urban-Design-Skills-Claude** — site analysis, density, urban planning calculators [https://github.com/Amanbh997/Urban-Design-Skills-Claude](https://github.com/Amanbh997/Urban-Design-Skills-Claude)
- **OpenConstructionEstimate-DDC-CWICR** — open cost database [2](https://github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR)
- **OpenConstructionERP** — full open-source construction ERP with BOQ/BIM [4](https://github.com/datadrivenconstruction/OpenConstructionERP)
- **That Open Engine / IFC.js** — open BIM [https://thatopen.com](https://thatopen.com)
- **OpenJSCAD** — parametric CAD [https://openjscad.xyz](https://openjscad.xyz)
- **Maker.js** — 2D geometry [https://maker.js.org](https://maker.js.org)
- **xeokit-sdk** — web BIM viewer [https://xeokit.github.io/xeokit-sdk](https://xeokit.github.io/xeokit-sdk)
- **Manifold** — robust mesh booleans [https://github.com/elalish/manifold](https://github.com/elalish/manifold)

---

*project_constitution.md | Dzenhare Budget Engineer Technical Governance*
*Version 1.0 | Based on Dzenhare Project Constitution v6.0*
