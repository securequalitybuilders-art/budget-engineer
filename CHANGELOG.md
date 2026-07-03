# Changelog

## Unreleased

### Sprint 39D — Fix PWA service worker auto-update so deployments reach users (not stale cached app)

**Root cause:** The service worker registration script (`registerSW.js`) was a bare-bones `navigator.serviceWorker.register(...)` call with **no `updatefound` listener**. When a new deployment produced a new `sw.js`, the browser detected it but the new SW stayed in "waiting" state forever — the old SW continued serving the old cached `index.html` and JS bundles indefinitely. Users never received any deployed fixes until they manually unregistered the SW and cleared site data.

**Fix:**
1. Added explicit `workbox` options in `vite.config.ts`: `skipWaiting: true`, `clientsClaim: true`, `cleanupOutdatedCaches: true`.
2. Imported `registerSW` from `virtual:pwa-register` in `src/main.tsx` and called `registerSW({ immediate: true })`. This replaces the generated bare‑bones `registerSW.js` with the plugin's client template that:
   - Listens for the `activated` event → auto‑reloads the page when a new SW takes over
   - Fires `onOfflineReady` on first install
   - Preserves offline-first caching
3. Added `src/pwa-register.d.ts` — TypeScript declaration for the virtual module.
4. Added 5 documented‑config tests (`src/__tests__/pwaConfig.test.ts`) asserting critical SW settings.

**Impact:** Future deployments will auto‑update within one page-reload cycle. The `workbox-window` library (5.71 kB) is now bundled for registration lifecycle management.

**Note:** This explains why prior clinic‑fix deployments (Sprint 39A/B/C) appeared to fail live — the old SW cached the app shell before the fixes, and users never received the updated JavaScript.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre‑existing warnings)
- Tests: 325 passed (26 files) — +5 PWA config tests +1 file
- Build: success (3396 modules, 21 precache entries, `sw.js` emitted, no `registerSW.js`)

**Documentation:** `docs/SPRINT_39D_SERVICE_WORKER_UPDATE_REPORT.md`

### Sprint 39C — Fix building-type dropdown stale closure in async handler, remove debug panel

**Fixed (root cause):** The AiBriefPanel dropdown's selected `buildingType` was not reliably reaching plan generation. The `handleGenerate` handler is `async` and calls `await parseWithEngine(...)` before reading `buildingType`. In certain React 18 batching scenarios, the `buildingType` state variable was captured in a stale closure by the time execution resumed after the `await`, so `generateDesignOptionsFromBriefText` received the stale initial value (`'house'`) instead of the user's selection.

**Fix:** Added a `useRef` that stays synchronised with the `buildingType` state via `useEffect`. The async `handleGenerate` now reads `buildingTypeRef.current` instead of the closure-captured `buildingType`, guaranteeing the latest value.

```ts
const [buildingType, setBuildingType] = useState('house');
const buildingTypeRef = useRef(buildingType);
useEffect(() => { buildingTypeRef.current = buildingType }, [buildingType]);
// in handleGenerate:
const optionsResult = generateDesignOptionsFromBriefText(briefText, 'zimbabwe', buildingTypeRef.current);
```

**Cleanup:** Removed the temporary Sprint 39B runtime debug panel (`BuildingTypeDebugPanel`, `buildingTypeTrace.ts`) and all 11 `BT-DEBUG` instrumentation points across 4 files.

**Test:** Added `SPRINT 39C: clinic buildingType flows from generateDesignOptions → DesignOption.buildingType → generatePlanModel → clinic rooms` — validates the complete pure-function chain.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 320 passed, 25 files (+1 from Sprint 39B)

**Documentation:** `docs/SPRINT_39C_DROPDOWN_STATE_FIX_REPORT.md`

### Sprint 39B — Temporary runtime debug panel to trace buildingType through the live flow

**Temporary on-screen debug panel** (`BuildingTypeDebugPanel`) mounted in the Dashboard overlay (top-left, z-index 99999) that shows the live buildingType value at each of 7 stages:
1. `dropdownValue` — the current dropdown selection
2. `briefBuildingType` — parsed buildingType after override
3. `optionsBuildingTypes` — buildingType on each generated DesignOption
4. `selectedDesignBuildingType` — buildingType on the currently selected design
5. `planGenBuildingType` — value inside `generatePlanModel()` right before room layout
6. `programKeyUsed` — which ROOM_PROGRAMS key getRoomProgram resolved to
7. `firstThreeRoomNames` — first 3 room names from the resulting PlanModel

Each stage also `console.log`s with prefix `[BT-DEBUG]`.

**Integration test** added: `REAL FLOW: generateDesignOptionsFromBriefText with clinic override + generatePlanModel yields clinic rooms` — calls the exact same chain as the live button click (`parseWithEngine` → `generateDesignOptionsFromBriefText` with override → `generatePlanModel`). **This test PASSES**, confirming the pure function chain is correct — the bug lies in React state wiring, persistence, or timing, not in the adapter/engine functions.

**Documentation:** `docs/SPRINT_39B_RUNTIME_DEBUG_REPORT.md`

### Sprint 39A — Brief wiring fix: selected building type reaches plan generation (clinic != house)

**Fixed (persistence):** Building type was lost during IndexedDB save/load — all persisted designs loaded as `'house'`.
- Added `buildingType` field to `Design` type so it is stored and retrieved correctly
- `loadPersistedDesignOptions` now reads `d.buildingType || 'house'` instead of hardcoding `'house'`

**Fixed (wiring):** The AI Brief Panel's `onParsed` callback was not connected, so the store's `currentBrief.buildingType` was never updated from the dropdown selection.
- `EngineeringStudioPanel` now passes `onParsed` prop through to `AiBriefPanel`
- Dashboard tracks `latestBuildingType` from the AI parse result

**Fixed (default):** Project store's `updateBrief` default `buildingType: 'residential'` fell through to house in `getRoomProgram` because `ROOM_PROGRAMS` has no 'residential' key.
- Changed default `buildingType` from `'residential'` to `'house'`

**Added:** Shared `BUILDING_TYPES` constant in `src/engine/buildingTypes.ts` so dropdown values, room program keys, and residential-check all reference the same canonical enum.

**Tests:** +4 tests (318 total, 25 files) — persistence round-trip preserves clinic buildingType, every BUILDING_TYPE has a ROOM_PROGRAMS entry, isResidential() correctly classifies all types, programFromArea routes non-residential correctly.

**Files:**
- `src/engine/buildingTypes.ts` (new)
- `src/types/index.ts`, `src/ai/designEngine.ts`, `src/services/projectPersistenceService.ts`
- `src/stores/projectStore.ts`, `src/engine/plan-generator.ts`
- `src/components/dashboard/EngineeringStudioPanel.tsx`, `src/pages/Dashboard.tsx`
- `src/components/ai/AiBriefPanel.tsx`, `src/engine/roomPrograms.ts`
- `src/__tests__/briefDrivenDesign.test.ts`, `src/__tests__/projectPersistenceService.test.ts`

## [0.2.0] - 2026-07-02

- Restore lint baseline to 9 warnings by typing the Sprint 38 test value (Sprint 38A)
- Roof, multi-storey polish, and GLB export for the 3D BIM model (Sprint 38):
  - Pitched gable roof on topmost storey: ridge along the longer axis, pitch
    height 1.5 m, overhang 0.3 m, terracotta material (#a0522d)
  - Roof geometry computed in pure adapter (planTo3d.ts: RoofParams,
    ridgeAxis, eaveY/apexY) with 9 unit tests
  - RoofMesh component builds custom BufferGeometry (gable: 8 vertices,
    6 triangles) — no CSG, no new deps
  - All building meshes wrapped in a &lt;group ref&gt; for serialisation
  - "Download 3D model (.glb)" button below the Canvas with "Preparing model..."
    state; dynamically imports GLTFExporter (35 kB) on click, producing a
    binary glTF for Blender / Windows 3D Viewer
  - Caption updated: mentions roof + model downloadable as .glb
  - 3D chunk +2.71 kB; GLTFExporter is a separate lazy-loaded chunk
- Real doors and windows as pierced openings in 3D BIM model (Sprint 37):
  - Walls are now split into pier segments around door/window openings (split-box approach, no CSG dependency)
  - Door mesh with Warm Sand leaf (#d4a574) + frame jambs and header, positioned per opening
  - Window mesh with semi-transparent AI Cyan glass pane (#06b6d4, opacity 0.35) + frame sill/jambs/header at sillHeight
  - Opening type extended with optional height/sillHeight fields; defaults applied by kind (door 2.1 m, window 1.5 m, sill 0.9 m) from planTo3d constants
  - Openings repeat per storey with correct y-offset stacking
  - Caption updated to list doors and windows as included
  - 8 new tests: opening position resolution, wall splitting, multi-storey opening offset, defaults, empty guard
- 3D BIM view always reachable: 2D/3D toggle always visible, 3D model generated from design when no CAD edits exist (Sprint 36A)
  - Removed `persistedPlan`-only gating that hid the new 3D BIM model behind saved CAD edits
  - `activePlan` derived as `persistedPlan ?? generatePlanModel(selectedDesign)` so the 3D view works immediately after design selection
  - 2D/3D toggle buttons now show visible "2D" and "3D" labels + "View 3D BIM model" tooltip
  - BIM caption (storey height / wall thickness) shows for both generated and CAD-edited plans
  - Empty state enhanced with hint to use AI Brief panel
- 3D BIM shell with thick walls, slabs, multi-storey, PBR materials and shadows (Sprint 36):
  - New pure adapter `planTo3d.ts` converts PlanModel wall segments into 3D wall solids + floor slabs per storey (zero three.js imports, fully testable)
  - New `BimModel3D.tsx` component using @react-three/fiber Canvas: walls with real thickness (BoxGeometry along segments), floor slabs, multi-storey stacking from DesignOption.floors
  - PBR MeshStandardMaterial per element type (external walls #94a3b8, internal walls #cbd5e1, slabs #475569, BIM Violet #8B5CF6 accent edges)
  - Ambient + directional light with 2048² shadow map, hemisphere light, ground plane receiving shadows, grid helper
  - OrbitControls with damping, dynamic camera framing based on building size
  - Lazy-loaded via React.lazy + Suspense with "Loading 3D BIM model..." text fallback (preserves Sprint 31A NO_FCP fix)
  - Empty state: "Select a design and generate a floor plan to view the 3D BIM model"
  - Caption with storey height, wall thickness, and note about doors/windows/roof in later stages
  - 11 tests for planTo3d (perimeter walls, internal partitions, multi-storey stacking, bounds, edge cases)
  - Storey height 3.0 m (DEFAULT_STOREY_HEIGHT constant), wall thickness from PlanModel or 0.23 m fallback, slab thickness 0.15 m
- Grouped BOQ cost view with trade subtotals and grand total (Sprint 35):
  - BOQ items grouped by category (Substructure, Walling, Roofing, Openings, Finishes, Services, Fittings)
  - Per-group subtotal rows calculated and displayed after each group
  - Prominent grand total in emerald-500 branded container
  - Collapsible geometry source badge (Generated / Edited CAD / Fallback) with metadata details
  - All currency formatting unified to `makeMoney()` from `src/lib/utils/currency.ts` (replaced 3 inline implementations)
  - 10 tests covering grouping, totals, currency, source metadata
- Readable 2D floor plan labels (Sprint 34):
  - Room labels now render each room's name centered inside its footprint with area in m² below
  - Labels use Body Text (#e2e8f0) for names and Muted Text (#94a3b8) for areas
  - Font sizes adjust automatically for very small rooms
  - Fallback to "Room N" label if name is empty
  - Overall building width shown as dimension text along the top edge
  - Overall building height shown as dimension text along the left edge
  - Dimension lines use dashed style with tick marks
  - "Dimensions in metres" caption added below the scale label
  - Uses the existing `roomArea()` helper for all area calculations (no duplicate formula)
- Prominent "Choose your design" section in main content area (Sprint 33):
  - Full-width branded section with cyan border/shadow at the top of the canvas area
  - Larger option cards with name, area, element count, and "Select this design" / "Selected" badge
  - After selection: confirmation bar with "View 2D floor plan →" CTA button
  - Regenerate options button at the bottom of the section
  - Responsive grid: stacks vertically on mobile, 2–3 columns on larger screens
- Design option selection gating and stage progression UX:
  - Design options are now clickable card-shaped selectors with area/floors info and Select/Selected badge
  - High-visibility "Select a design option to continue" prompt in brand cyan when no option selected
  - Design stage tab in top nav is locked (dotted line-through + tooltip) until a design option is selected
  - Auto-scroll to design options after generation
  - Removed automatic selection of first option — user must explicitly click a card
  - `selectedDesignId` moved from local Dashboard state to central uiStore for cross-component access
- Diagnosed Lighthouse NO_FCP audit failure on project route — root cause was a CSS-only spinner with no visible text rendered indefinitely for non-existent project IDs
- Hardened Dashboard first paint: loading state now shows "Loading project…" text; non-existent projects show "Project not found" fallback with create-project link

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 306 passed, 24 files
- Build: success (3392 modules, 21 precache entries)
- 3D BIM model code-split as separate lazy chunk; GLTFExporter is a separate dynamic chunk (35 kB, loaded on click)

---

## v0.1.1 — Public Demo Patch Release

**Date:** 2026-07-02

**Live demo:** https://budget-engineer.vercel.app/
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

### Added since v0.1.0
- Feedback workflow and `/feedback` route (Sprint 21)
- Mobile UX deep polish — hero text sizes, tap targets, always-visible archive/restore, mobile messages (Sprint 22)
- Better CAD room layout algorithm — per-building-type strategies (single-storey, duplex, clinic, commercial) with circulation corridors and wet-core grouping (Sprint 23)
- CAD editing persistence — PlanModel saved/loaded from IndexedDB, auto-save on edit commit, CAD sync status in toolbar (Sprint 24)
- Governance approval workflow — submit/approve/request-changes with comments, timeline, role selector, transaction logging (Sprint 25)
- CAD persistence and sync tests — 33 tests for cadPersistenceService and cadToDesignSyncAdapter (Sprint 26)
- PlanModel→CadDocument roundtrip — conversion adapter for downstream analysis (Sprint 27)
- BOQ source metadata and CAD quantity sync — geometry source, quantity source label, CAD-edited labels, cadQuantitiesAdapter for wall/opening extraction (Sprint 28)
- Manual CAD save/restore UI — CadSyncControls dropdown with Save/Restore/Reset buttons, timestamp, source badge, auto-dismiss status messages (Sprint 29)

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 238 passed, 18 files
- Build: success (3388 modules, 20 precache entries)

### Known Limitations
- Downstream adapters still use generated quantities for most line items (CAD-edited labels, not full CAD-derived quantities)
- Snapshot source metadata not yet stored
- No export sync for WS6 boq-export.ts (drawing register + plan SVGs)
- Same room template per floor (no ground/upper variation)
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)

---

## Sprint 26 — CAD Persistence and Sync Tests

**Date:** 2026-07-02

### Added
- `src/__tests__/fixtures/cadFixtures.ts` — reusable PlanModel and DesignOption factories
- `src/__tests__/cadPersistenceService.test.ts` — 16 tests for save/load/has/delete with null safety, multiple design IDs, timestamp, mutation isolation
- `src/__tests__/cadToDesignSyncAdapter.test.ts` — 17 tests for buildCadSyncMetadata, deriveBim/Boq/Analysis fallback, region param, NaN protection

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 192 passed, 16 files
- Build: success

### Fixed
- No bugs found — all tests passed against existing implementation

## Sprint 24 — CAD Editing Persistence and Export Sync

**Date:** 2026-07-02

### Added
- `cadPersistenceService.ts` — save/load/delete PlanModel from IndexedDB `planModels` table
- `cadToDesignSyncAdapter.ts` — fallback wrappers for BIM/BOQ/analysis with GeometrySource metadata (generated-design | persisted-cad | fallback-generated)
- Dexie v4 migration: new `planModels` table (additive, no schema break)
- Dashboard integration: load persisted PlanModel on design selection, auto-save on edit commit, CAD sync status badges in toolbar

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 145 passed, 13 files
- Build: 20 precache entries

### Known Limitations
- Downstream adapters still read from DesignOption (not persisted PlanModel)
- No PlanModel → CadDocument roundtrip wired
- No test coverage for new services/adapter
- No export sync for CAD-edited data

## v0.1.0 — Public MVP Release

**Date:** 2026-07-01

**Live demo:** https://budget-engineer.vercel.app/
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

### Core Pipeline
- AI brief parser (deterministic, regex-based, Zod-validated)
- AI design engine — generates 3 design options (compact/standard/spacious)
- 6-stage pipeline UI: Brief → Concept → Design → Engineering → Docs → Cost
- First-time builder journey with template briefs and guided steps

### CAD / BIM
- 2D plan canvas with pan/zoom, wall drawing, room labels, dimensions
- Multi-floor support
- Wall corner solver (intersection trim)
- DXF/SVG/MakerJS export
- 3D BIM viewer (React Three Fiber) with legend, inspector, floor visibility
- 2D/3D toggle in Dashboard toolbar

### Engineering Analysis
- 3-rule BIM clash detection (opening proximity, overlap, AABB collision)
- Cardinal solar orientation heat gain analysis (N/E/S/W walls + windows)
- MEP services takeoff (electrical, lighting, plumbing points per zone)

### BOQ / Export
- Geometry-derived BOQ quantities (door/window/partition/finish from actual CAD geometry)
- Regional rate card pricing (Zimbabwe, South Africa, Kenya, Global)
- CSV export, HTML dossier, print-to-PDF
- Regional currency support (USD, ZWG)
- Rate assumptions displayed in export

### Persistence & Versioning
- IndexedDB persistence via Dexie (10 tables)
- Project data survives page refresh
- Design snapshot save/load/compare with cost and quantity deltas
- Transaction logging on all mutations
- Governance audit trail (approval readiness checklist, RBAC roles, design fingerprint)

### Portfolio & Governance
- Portfolio Dashboard at `/portfolio` with executive summary stats
- Category distribution breakdown (Walls/Slabs/Roof/Openings/Objects)
- Project search, status filter (All/Active/Archived), sort (newest/name/cost)
- Archive/restore actions on project cards
- Governance/audit panel with approval checklist and RBAC role descriptions

### Testing & CI
- 117 automated tests across 12 files (vitest + fake-indexeddb)
- GitHub Actions CI pipeline: typecheck → lint → test → build
- Test coverage across all core adapters: governance, geometry, BOQ, BIM, analysis, rate cards, persistence, snapshots, archive, portfolio filters

### Known Limitations
- Cost rates are approximate and vary by region — not suitable for procurement
- No professional structural engineer sign-off — designs are for concept/feasibility only
- Generated CAD is deterministic and early-stage — manual editing recommended
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)
- Not a replacement for professional quantity surveyor or engineering review
- Multi-floor uses same room template for all levels
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
