# DzeNhare Budget Engineer — Gemini System Prompt

> **Version:** 1.0.0  
> **Purpose:** AI System Prompt / Agent Constitution for all LLM agents working on this codebase  
> **Applies to:** Antigravity agents, Gemini agents, opencode agents, Cursor agents, Copilot agents

---

## 1. PRODUCT MISSION

**One-liner:** *Making Construction Affordable for Everyone.*

We build the **Budget Engineering Computational Design OS** — an enterprise-grade, local-first, open-source application that transforms an AI-powered architectural brief into:

```
Brief → 2D CAD Drawings → 3D BIM Model → Engineering Quantities → BOQ → Charts → Transaction History → Exports
```

The OS is designed for:
- Architects & engineers in low-infrastructure environments
- DIY builders and homeowner-developers
- NGOs and government housing programs
- Small to mid-size construction firms

---

## 2. HARD POLICY: NO PAID APIS

**This is a non-negotiable rule.**

| ❌ Never use | ✅ Use instead |
|---|---|
| OpenAI API | Local Transformers.js, WebLLM, or deterministic calculation |
| Anthropic API | Local rule-based or template engine |
| Gemini API | Client-side WASM computation |
| Vercel AI SDK | Custom inference with local models |
| Paid cloud AI of any kind | IndexedDB + Web Workers + deterministic JS |

**Why:** The app must work fully offline, with zero ongoing API costs, and zero data leaving the user's machine. AI features (brief analysis, quantity takeoffs, cost estimation) must use:
- **Transformers.js** (HuggingFace, runs in-browser via ONNX)
- **WebLLM** (runs LLMs locally via WebGPU)
- **Deterministic fallback** (if no GPU, fall back to rule-based engines)
- **Template-based generation** (for structured outputs like BOQ, reports)

---

## 3. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer (React)                      │
│  Bento Grid Dashboard | CAD Canvas | BIM Viewer | Charts │
├─────────────────────────────────────────────────────────┤
│                 State Layer (Zustand)                     │
│  Project Store | Selection Store | UI Store | Auth Store │
├─────────────────────────────────────────────────────────┤
│               Engine Layer (Web Workers)                  │
│  CAD Engine | BIM Engine | Quantity Engine | BOQ Engine  │
├─────────────────────────────────────────────────────────┤
│              Persistence Layer (Dexie/IndexedDB)          │
│  Projects | Transactions | Geometry | Settings | Cache   │
├─────────────────────────────────────────────────────────┤
│              Export Layer (Client-Side)                    │
│  PDF | XLSX | IFC | DXF | CSV | PNG | Print             │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Monorepo with npm workspaces** — one package for engines, one for UI
2. **React 18+ with TypeScript** — strict mode, no `any`
3. **Vite** — build tool, fast HMR
4. **Zustand** — lightweight state management
5. **Dexie.js** — IndexedDB wrapper for offline persistence
6. **Web Workers** — all heavy computation off the main thread
7. **React Router v6** — client-side routing
8. **Tailwind CSS v4** — utility-first styling, dark mode built-in
9. **Recharts / D3** — charts and visualization
10. **PDF-lib / SheetJS / jsZip** — exports (free tier only)

---

## 4. CODING RULES

### 4.1 TypeScript Rules
- `strict: true` in tsconfig
- No `any` — use `unknown` and narrow
- Prefer `interface` over `type` for objects
- Use `const` over `let` everywhere possible
- All functions must have explicit return types
- All React components must have explicit props interface

### 4.2 File Structure Convention
```
src/
├── app/                    # App root, providers, routing
│   ├── App.tsx
│   ├── providers.tsx
│   └── router.tsx
├── components/             # Shared UI components
│   ├── ui/                 # Primitive components (Button, Card, etc.)
│   ├── layout/             # Layout components (Sidebar, Header, etc.)
│   ├── cad/                # CAD canvas components
│   ├── bim/                # BIM viewer components
│   ├── charts/             # Chart components
│   └── forms/              # Form components
├── engines/                # Computational engines (pure functions)
│   ├── cad-engine.ts
│   ├── bim-engine.ts
│   ├── quantity-engine.ts
│   ├── boq-engine.ts
│   └── cost-engine.ts
├── stores/                 # Zustand stores
│   ├── project-store.ts
│   ├── ui-store.ts
│   └── transaction-store.ts
├── db/                     # Dexie database definitions
│   ├── schema.ts
│   ├── db.ts
│   └── migrations/
├── workers/                # Web Worker scripts
│   ├── cad.worker.ts
│   ├── quantity.worker.ts
│   └── boq.worker.ts
├── lib/                    # Utility libraries
│   ├── currency.ts
│   ├── geometry.ts
│   ├── units.ts
│   └── validation.ts
├── hooks/                  # Custom React hooks
│   ├── use-project.ts
│   ├── use-transaction.ts
│   └── use-offline.ts
├── types/                  # Shared TypeScript definitions
│   ├── project.ts
│   ├── geometry.ts
│   ├── boq.ts
│   └── transaction.ts
└── exports/                # Export generators
    ├── pdf-export.ts
    ├── xlsx-export.ts
    ├── ifc-export.ts
    └── dxf-export.ts
```

### 4.3 Naming Conventions
- Files: `kebab-case.ts`, `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Stores: `camelCase` with `Store` suffix
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS classes: Tailwind utility classes only (no custom CSS files)

### 4.4 Component Rules
- Every component must be the default export of its file
- Props interface must be defined in the same file, exported
- Use React.memo for expensive renders (CAD, BIM, charts)
- Use `useCallback` and `useMemo` for computed values
- No class components — functional only
- No inline styles — Tailwind classes only

### 4.5 Import Order
1. React / framework imports
2. Third-party library imports
3. Internal engine imports
4. Store imports
5. Component imports
6. Type imports
7. Style/asset imports

---

## 5. DATA MODEL EXPECTATIONS

### 5.1 Core Entities
```
Project
├── id: string
├── name: string
├── brief: string (raw AI brief)
├── location: { lat, lng, address }
├── settings: ProjectSettings
├── createdAt: Date
├── updatedAt: Date
└── version: number

Building
├── id: string
├── projectId: string
├── floors: Floor[]
├── materials: Material[]
├── dimensions: BuildingDimensions
└── components: BuildingComponent[]

BOQ (Bill of Quantities)
├── id: string
├── projectId: string
├── items: BOQItem[]
├── currency: string
├── exchangeRate: number
├── subtotal: Money
├── taxes: Money
├── grandTotal: Money
└── generatedAt: Date

Transaction
├── id: string
├── projectId: string
├── action: string
├── entityType: string
├── entityId: string
├── before: json
├── after: json
├── diff: json
├── userId: string
├── timestamp: Date
└── checksum: string
```

### 5.2 Money Model
```
Money {
  amount: number        // in smallest unit (cents/satoshis)
  currency: string      // ISO 4217
  precision: number     // decimal places
}
```
- All calculations in integer smallest units (e.g., cents)
- No floating-point money math — use `BigInt` or integer arithmetic
- Currency conversion must use stored rates with timestamps

### 5.3 Geometry Model
```
Point2D { x: number; y: number }
Line2D { start: Point2D; end: Point2D }
Polygon2D { vertices: Point2D[]; closed: boolean }

Point3D { x: number; y: number; z: number }
Mesh3D { vertices: Point3D[]; faces: Face[]; normals: Vector3D[] }
Face { indices: number[]; normal: Vector3D }
```
- All angles in radians
- All lengths in millimeters (mm) — convert on export
- Use integer geometry where possible for precision

---

## 6. ACCEPTANCE CRITERIA

All features must pass these checks:

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm run build` — produces publishable build
- [ ] `npm run lint` — zero ESLint violations
- [ ] Offline: full operation with no network
- [ ] Audit: every mutation has a transaction event
- [ ] Money: deterministic, integer-based, currency-aware
- [ ] No paid API calls in any code path
- [ ] All user-facing text is in English (i18n-ready structure)
- [ ] Responsive: works on 1366×768 minimum

---

## 7. HOW FUTURE AGENTS MUST CONTINUE WORK

1. **Read gemini.md** first — understand the mission and constraints
2. **Read project_constitution.md** — understand the hard rules
3. **Read task_plan.md** — find your current task and its phase
4. **Read brandguidelines.md** — apply consistent styling
5. **Never add paid API integrations** — this will be rejected
6. **Every PR must include:**
   - TypeScript passing (`npm run typecheck`)
   - Build passing (`npm run build`)
   - New transactions for any data mutation
   - Updated or added unit tests
7. **Commit messages:** `type(scope): description` (e.g., `feat(cad): add wall drawing tool`)
8. **When in doubt:** ask the user, do not guess

---

## 8. LINKED EXTERNAL INTERFACES (Future)

The architecture exposes these interfaces for future integration:

| Interface | Protocol | Purpose |
|---|---|---|
| MCP `project:*` | stdio/JSON-RPC | Project CRUD from external tools |
| MCP `boq:*` | stdio/JSON-RPC | BOQ generation and export |
| MCP `cad:*` | stdio/JSON-RPC | CAD operations |
| Supabase Realtime | WebSocket | Multi-user sync (optional future) |
| NotebookLM Source API | REST | Export project data as notebook sources |
| Webhook Export | HTTP POST | Push exports to external storage |

For now, all interfaces are **stub-ready** — define the contract but implement locally.
