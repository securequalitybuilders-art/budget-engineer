# Budget Engineer — Task Plan

> **Version:** 1.0.0  
> **Status:** Phase 0 — Blueprint Complete

---

## 1. FULL ROADMAP

### Phase 0: Blueprint (DONE)
```
- [x] gemini.md
- [x] brandguidelines.md
- [x] task_plan.md
- [x] project_constitution.md
- [x] Project initialized
```

### Phase 1: Foundation — Skeleton & Data Layer
```
Goal: Buildable app with persistence, no UI chrome yet.
```
**Priority: HIGH**

- [ ] `npm init` monorepo with workspaces
- [ ] Vite + React + TypeScript + Tailwind setup
- [ ] Dexie/IndexedDB schema and database class
- [ ] Core TypeScript types (Project, Building, BOQ, Transaction, Money, Geometry)
- [ ] Zustand stores (project, transaction, ui)
- [ ] Web Worker harness (loader pattern, messaging)
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

### Phase 2: BLAST — App Shell & Navigation
```
Goal: Navigable app shell with bento-grid landing.
```
**Priority: HIGH**

- [ ] App shell layout (sidebar, header, main content area)
- [ ] Bento grid dashboard (project overview widget grid)
- [ ] Dark mode shell with DzeNhare styling
- [ ] Left sidebar navigation (Projects, CAD, BIM, BOQ, Settings)
- [ ] Create/Open/Delete project flows
- [ ] Project list view with search and filter
- [ ] Responsive layout (desktop-first, tablet acceptable)

### Phase 3: CAD Engine — 2D Drawing
```
Goal: Draw, edit, view 2D architectural plans.
```
**Priority: HIGH**

- [ ] HTML Canvas + React component for CAD viewport
- [ ] Zoom, pan, grid display
- [ ] Draw tools (wall, line, rectangle, circle, arc)
- [ ] Select, move, rotate, delete tools
- [ ] Snapping (endpoint, midpoint, grid intersection)
- [ ] Dimension annotations
- [ ] Layers (walls, dimensions, annotations, grid)
- [ ] Undo/redo stack
- [ ] Web Worker: geometry calculations off main thread
- [ ] CAD data persisted to IndexedDB

### Phase 4: BIM Engine — 3D Model
```
Goal: Generate and view 3D model from CAD data.
```
**Priority: HIGH**

- [ ] Three.js viewer component
- [ ] Extrude 2D CAD plans to 3D walls
- [ ] Floor separation and multi-story support
- [ ] Camera controls (orbit, zoom, pan)
- [ ] Material/color assignment per element type
- [ ] Toggle layers/visibility
- [ ] Section cut tool
- [ ] Web Worker: mesh generation off main thread
- [ ] BIM data persisted to IndexedDB

### Phase 5: Quantity Engine — Takeoffs
```
Goal: Automatic quantity takeoffs from BIM/CAD data.
```
**Priority: HIGH**

- [ ] Wall area/volume calculations
- [ ] Slab area calculations
- [ ] Opening (door/window) deductions
- [ ] Linear measurements (beams, pipes, conduits)
- [ ] Count-based quantities (doors, windows, fixtures)
- [ ] Material catalog (default rates)
- [ ] Unit-aware output (m, m², m³, each, kg)
- [ ] Web Worker: all calculations off main thread
- [ ] Results persisted to IndexedDB

### Phase 6: BOQ Engine — Bill of Quantities
```
Goal: Generate itemized BOQ with pricing.
```
**Priority: HIGH**

- [ ] BOQ items generated from quantities
- [ ] Rate library (material, labor, equipment)
- [ ] Currency handling (integer cents, configurable currency)
- [ ] Tax calculation (configurable rates)
- [ ] Contingency and overhead markup
- [ ] BOQ preview with grouped/sorted items
- [ ] BOQ item editing (override quantity/rate)
- [ ] Multiple currencies/conversion
- [ ] Web Worker: BOQ computation off main thread
- [ ] BOQ data persisted to IndexedDB

### Phase 7: Charting & Analytics
```
Goal: Visual analytics of project data.
```
**Priority: MEDIUM**

- [ ] Cost breakdown chart (donut/bar)
- [ ] Material quantity chart
- [ ] Floor-by-floor cost comparison
- [ ] Cost trend over edits (transaction history)
- [ ] Category grouping (structure, finish, MEP)
- [ ] Export chart as PNG

### Phase 8: Transaction History
```
Goal: Full audit trail of every project mutation.
```
**Priority: MEDIUM**

- [ ] Transaction log store
- [ ] Every mutation generates a transaction event
- [ ] `before`/`after` snapshots with JSON diff
- [ ] Checksum for tamper detection
- [ ] Time-travel restore (revert to any transaction)
- [ ] Transaction history viewer panel
- [ ] Filter/search transactions

### Phase 9: Exports
```
Goal: Export project data in multiple formats.
```
**Priority: MEDIUM**

- [ ] PDF report (project summary + BOQ)
- [ ] XLSX export (BOQ + quantities)
- [ ] DXF export (CAD drawings)
- [ ] IFC export (BIM model)
- [ ] CSV export (quantities, BOQ items)
- [ ] PNG export (CAD viewport, chart)
- [ ] Print layout for CAD drawings
- [ ] Batch export (all formats at once)

### Phase 10: AI Integration
```
Goal: AI-assisted brief-to-plan pipeline (local-only).
```
**Priority: LOW (FUTURE)**

- [ ] Transformers.js integration (local NLP)
- [ ] Brief analysis: extract building dimensions, rooms, stories
- [ ] Auto-generate initial CAD layout from brief
- [ ] AI suggestions for materials and rates
- [ ] Cost estimation from brief before full model
- [ ] Fallback: template-based generation when GPU unavailable

### Phase 11: Polish & Deploy
```
Goal: Production-ready deployment.
```
**Priority: MEDIUM**

- [ ] Error boundaries throughout
- [ ] Loading skeletons for all async content
- [ ] Keyboard shortcuts
- [ ] PWA support (service worker, manifest)
- [ ] Offline-first: full operation with zero network
- [ ] Performance audit (Lighthouse target: 90+)
- [ ] Security audit (no secrets, no XSS vectors)
- [ ] Documentation (ARCHITECTURE.md, CONTRIBUTING.md)
- [ ] Vercel deployment config
- [ ] `npm run build` — clean production build

---

## 2. MVP REQUIREMENTS

### MVP Must-Have (Phase 1-6)
```
1. Create a project from scratch
2. Draw 2D floor plan (walls, dimensions)
3. View 3D model extruded from CAD
4. Auto-calculate quantities (wall area, volume)
5. Generate BOQ with rates and totals
6. Export PDF report and XLSX
7. Every action auditable in transaction history
8. Full offline operation (IndexedDB)
9. Dark-first DzeNhare design
10. npm install + npm run build passes
```

### MVP Nice-to-Have
```
- AI brief analysis (Phase 10)
- IFC/DXF export (Phase 9)
- Charting (Phase 7)
- Multi-story buildings
```

---

## 3. VALIDATION CHECKLIST

### Build & Type
```
[ ] npm install — zero errors
[ ] npm run typecheck — zero TS errors
[ ] npm run build — produces dist/
[ ] npm run lint — zero warnings
```

### Offline
```
[ ] Load app with no network
[ ] Create project, draw, calculate, export offline
[ ] Data persists across page reloads
```

### Audit
```
[ ] Every mutation creates a transaction event
[ ] Transaction events have before/after/diff
[ ] Transaction events have valid checksums
[ ] Can revert to any previous transaction
```

### Money
```
[ ] All values in integer cents
[ ] No floating point in money math
[ ] Currency ISO code displayed
[ ] Tax calculation is correct
[ ] Grand total = subtotal + tax + contingency
```

### UI/UX
```
[ ] All text meets WCAG AA contrast
[ ] All interactive elements are keyboard accessible
[ ] Focus indicators visible on all elements
[ ] No horizontal scroll on 1366×768
[ ] Loading states visible for all async operations
[ ] Error states handled gracefully
```

---

## 4. DEPLOYMENT CHECKLIST

```
[ ] PWA manifest configured
[ ] Service worker registered
[ ] All routes are client-side (no SSR needed)
[ ] Vite config optimized for production
[ ] Assets are cached and versioned
[ ] No API keys or secrets in source
[ ] IndexedDB works in deployed environment
[ ] Web Workers work in deployed environment
[ ] `npm run build` produces deployable dist/
[ ] `vercel deploy` or `npm run deploy` works
[ ] Compression enabled (gzip/brotli)
[ ] Source maps configured (or disabled for prod)
```
