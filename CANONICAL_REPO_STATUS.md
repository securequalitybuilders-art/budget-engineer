# Canonical Repo Status — Budget Engineer OS

> **Date:** 2026-06-30  
> **Base:** WS1 (`workspace-chart 1/budget-engineer-os`)  
> **Status:** Pre-merge — Phase A foundation ready

---

## Why WS1 Was Chosen as Canonical Base

Per the WORKSPACE_MERGE_AUDIT.md (Section 4.1), WS1 was selected because:

1. **Best architecture** — React Router routing, Tailwind design system, PWA scaffold, ESLint, proper Dexie schema, typed Zustand stores, shadcn-style UI primitives
2. **Complete pipeline** — 6-stage UI pipeline (Brief → Concept → Design → Engineering → Docs → Cost)
3. **Design system** — Only workspace with full DzeNhare brand tokens in Tailwind CSS
4. **Store architecture** — Zustand + Immer + persist = cleanest state management
5. **DB schema** — Dexie with 6 tables, rate seeding, transaction logging
6. **Validation** — Zod schemas for all AI pipeline data
7. **PWA** — `vite-plugin-pwa` configured for offline-first
8. **Component system** — CVA + clsx + tailwind-merge (industry standard shadcn/ui pattern)

---

## Current package.json Dependencies

### Runtime (`dependencies`)
| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | React DOM renderer |
| `react-router-dom` | ^6.24.1 | Client-side routing |
| `zustand` | ^4.5.4 | Lightweight state management |
| `immer` | ^10.1.1 | Immutable state updates |
| `dexie` | ^4.0.8 | IndexedDB wrapper |
| `zod` | ^3.23.8 | Runtime schema validation |
| `lucide-react` | ^0.400.0 | Icon library |
| `class-variance-authority` | ^0.7.0 | Component variant API |
| `clsx` | ^2.1.1 | Conditional classnames |
| `tailwind-merge` | ^2.4.0 | Tailwind class merging |
| `framer-motion` | ^11.2.12 | Declarative animations |
| `recharts` | ^2.12.7 | Charting library |
| `makerjs` | ^0.18.1 | 2D CAD geometry library |
| `convert-units` | ^2.3.4 | Unit conversion |
| `@xenova/transformers` | ^2.17.2 | On-device ML inference (Transformers.js) |

### Dev Dependencies (`devDependencies`)
| Package | Version | Purpose |
|---|---|---|
| `@types/react` | ^18.3.3 | React type definitions |
| `@types/react-dom` | ^18.3.0 | React DOM type definitions |
| `@typescript-eslint/eslint-plugin` | ^7.15.0 | TypeScript ESLint rules |
| `@typescript-eslint/parser` | ^7.15.0 | TypeScript ESLint parser |
| `@vitejs/plugin-react` | ^4.3.1 | Vite React plugin |
| `autoprefixer` | ^10.4.19 | PostCSS autoprefixer |
| `eslint` | ^8.57.0 | Linter |
| `eslint-plugin-react-hooks` | ^4.6.2 | React Hooks ESLint rules |
| `eslint-plugin-react-refresh` | ^0.4.7 | HMR ESLint rules |
| `postcss` | ^8.4.39 | CSS processor |
| `tailwindcss` | ^3.4.4 | Utility-first CSS framework |
| `typescript` | ^5.5.3 | TypeScript compiler |
| `vite` | ^5.3.3 | Build tool |
| `vite-plugin-pwa` | ^0.20.0 | PWA support |

---

## Current Routes

| Path | Page Component | Description |
|---|---|---|
| `/` | `Home.tsx` | Landing page with hero, feature cards, recent projects |
| `/new` | `ProjectWizard.tsx` | 3-step wizard: profile → region/currency → brief |
| `/project/:id` | `Dashboard.tsx` | Main project workspace with BentoShell layout |
| `*` | — | Catch-all redirects to `/` |

Route architecture: `createBrowserRouter` with `GlobalLayout` wrapper (CommandBar, CommandPalette, ShortcutsHelp via `Outlet`).

---

## Current Major Features

### Pipeline & UX
- Full 6-stage pipeline UI (Brief → Concept → Design → Engineering → Docs → Cost)
- 3-step project wizard (profile, region/currency, brief input)
- Bento dashboard layout with sidebar, properties panel, command bar
- Command palette (Cmd+K) with stage navigation
- Keyboard shortcuts system (help, theme, sidebar, AI chat, BOQ, navigation)
- Theme toggle (dark/light/system) with system preference detection
- Offline indicator component
- Page loader with Suspense fallback for lazy-loaded routes
- Glass morphism UI with aurora background effects

### Data Persistence
- Dexie/IndexedDB with 6 tables: `projects`, `briefs`, `designs`, `boqs`, `transactions`, `rates`
- Rate seeding with Zimbabwe construction rates (12 seed rates)
- Zustand store with Immer + persist middleware for UI state
- Project store with full CRUD and IndexedDB sync
- Transaction logging on every mutation

### AI Pipeline (Deterministic)
- AI brief parser: regex-based extraction of bedrooms, bathrooms, floors, area, budget, location, building type
- AI design engine: generates 3 options (compact/standard/spacious) with rooms, dimensions, building elements
- AI BOQ engine: element-to-rate mapping, quantity computation, 10% contingency
- Zod validation schemas for all AI pipeline data

### Components
- 7 UI primitives (Button, Card, Badge, Input, Label, Select, Textarea) with CVA variants
- 12 layout components (BentoShell, Sidebar, CommandBar, CommandPalette, etc.)
- Cost breakdown chart (Recharts bar chart)
- Transaction history panel
- AI chat panel
- BOQ panel
- Properties panel

### PWA
- `vite-plugin-pwa` with auto-update service worker
- Web app manifest with icons (192x192, 512x512)
- Theme color, standalone display, apple-touch-icon

### Build & Code Quality
- TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint configured with TypeScript + React Hooks + React Refresh plugins
- Vite code-splitting: react-vendor, ui-vendor, state-vendor manual chunks
- Path alias `@/*` → `src/*`

---

## Current Known Gaps

| Gap | Details | Source to Merge |
|---|---|---|
| **2D CAD canvas** | Placeholder only — `"CAD canvas coming next sprint"` | WS2 |
| **3D BIM viewer** | Absent entirely | WS3 |
| **Interactive plan editing** | No room/wall drawing or manipulation | WS2 |
| **WebLLM inference** | `@xenova/transformers` installed but not wired to real inference | WS6 |
| **Web Workers** | No off-main-thread processing | All |
| **Tests** | No unit or integration tests | None |
| **IFC Import/Export** | Not present | WS3/4 |
| **DXF Export** | Not present | WS2 |
| **Governance workflow** | Not present | WS3 |
| **RBAC** | Not present | WS3 |
| **Project snapshots** | Not present | WS3 |
| **Cross-project analytics** | Not present | WS3/4 |
| **Portfolio analytics** | Not present | WS3/4 |
| **Zone cost traceability** | Not present | WS3 |
| **Section/elevation views** | Not present | WS6 |
| **Drawing register** | Not present | WS6 |
| **Structural engineering** | No column/beam/footing gen, load analysis, rebar | WS5/6 |
| **Clash detection** | Not present | WS4 |
| **Solar analysis** | Not present | WS4 |
| **MEP takeoff** | Not present | WS4 |
| **Multi-floor support** | Not present | WS2/6 |
| **Undo/redo** | Not present | WS2 |
| **Layer management** | Not present | WS2 |
| **Parametric floor plan gen** | Not present | WS2/6 |
| **Regional cost database** | Zimbabwe only, not editable | WS6 |
| **PDF/HTML dossier export** | Not present | WS4/6 |
