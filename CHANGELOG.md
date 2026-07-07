# Changelog

## Unreleased

### Sprint 77 — Canopy in Section drawing + refined 3D framing
**Summary:** The parametric canopy roof is now visible in the Section A-A drawing (curved profile, rib ticks, ETFE panel fill, support columns) when Canopy is selected in the DrawingsPanel. 3D framing refined toward dragonfly-wing look: spine ribs (primary structural ribs along X/Z axes, rendered as thick teal box segments), Voronoi edge lattice as secondary ribs, ETFE panels updated to cyan. `canopySectionProfile()` and `computeSpineRibs()` helpers added to `canopyGeometry.ts`.

### Sprint 76B — Fix canopy WebGL context loss (dispose geometry, debounce, cap density) + structural framing
**Summary:** Geometry disposal (`BufferGeometry.dispose()`) via `useEffect` + `useRef` prevents WebGL context loss on param changes. 120ms debounce on slider-driven canopy params in `LazyBimModel3D`. Density capped at `MAX_CELL_DENSITY = 60`. Structural framing look: ribs (violet line segments), ETFE-like panels (low-opacity), perimeter beam, support columns. `clampCanopyParams`, `computePerimeterEdges`, `computeSupports` helpers.

### Sprint 76 — Parametric biomimetic canopy (opt-in roof type)
**Summary:** Curved surface + Voronoi cell network rendered in 3D with live sliders (span, rise, cell density, reseed). Opt-in roof type alongside existing gable — toggle via "Gable" / "Canopy" button in the 3D panel.

### New Files (Sprint 77)
- (none — all additions within existing files)

### New Files (Sprint 76)
- `src/engine/canopy/canopyGeometry.ts` — pure, deterministic Voronoi geometry engine (Bowyer–Watson Delaunay, Sutherland–Hodgman clip, surface projection)
- `src/__tests__/canopyGeometry.test.ts` — 22 tests covering surfacePoint, seed generation, triangulation, cells, projection, edge cases, determinism
- `src/components/bim/CanopyMesh.tsx` — React Three Fiber component rendering translucent cell surface + cyan edge network

### Changed Files (Sprint 77)
- `src/engine/canopy/canopyGeometry.ts` — adds `canopySectionProfile()`, `computeSpineRibs()`, `CanopySectionProfile`, `SpineRib` types
- `src/components/drawings/sectionModel.tsx` — accepts `roofType` + `canopyParams`; renders canopy profile curve, rib ticks, support columns, ETFE fill, and label when canopy selected; falls back to gable on error
- `src/components/drawings/SectionView.tsx` — accepts `roofType` + `canopyParams` props; threads to `renderSectionSheet`
- `src/components/drawings/DrawingsPanel.tsx` — adds local `roofType` state toggle (Gable/Canopy) + Rise/Span sliders for section view; threads canopy params to SectionView
- `src/components/bim/CanopyMesh.tsx` — updates panel material to cyan ETFE look; adds spine ribs (thick box mesh along X/Z axes); `SPINE_MAT` material; spineGeo disposal
- `src/__tests__/canopyGeometry.test.ts` — 8 new tests: `canopySectionProfile` (4) + `computeSpineRibs` (4)

### Changed Files (Sprint 76B)
- `src/components/bim/CanopyMesh.tsx` — adds `disposeGeometry()` helper + geometry disposal in `useEffect` cleanup via `useRef`; `computePerimeterEdges` + `computeSupports` integration; structural framing render order
- `src/components/bim/LazyBimModel3D.tsx` — adds 120ms `setTimeout` debounce on slider params; density slider capped at 60; `debouncedCanopyParams` passed to 3D
- `src/engine/canopy/canopyGeometry.ts` — adds `clampCanopyParams()`, `computePerimeterEdges()`, `computeSupports()` with `MAX_CELL_DENSITY = 60`; internal clamp in `computeCanopy`
- `src/components/bim/BimModel3D.tsx` — accepts `roofType` + `canopyParams` props; conditional CanopyMesh vs RoofMesh

### Tests
847 tests across 47 files (8 new in Sprint 77, 4 new in Sprint 76B, 22 new in Sprint 76).

## [0.6.0] - 2026-07-07

### Interior Inspection — Dollhouse / Cutaway 3D View, Room Fly-in Focus, First-person Walkthrough (Sprints 72–74)

**Summary:** Complete interior inspection phase for the 3D BIM viewer. Three view-mode toggles (Full, Dollhouse, No Roof) with a storey selector for multi-storey plans. Click-a-room fly-in with smooth camera animation (0.6s lerp) and auto noRoof+storey assist. First-person walkthrough with WASD + pointer-lock mouse-look, footprint clamp, eye height at 1.6m, and a clear Exit button. All modes reflect the edited active plan, wrapped by ErrorBoundary — crash-safe.

### New Files
- `src/components/bim/viewMode.ts` — `computeVisibility()` pure helper (ViewMode type, VisibilityState)
- `src/__tests__/bimViewMode.test.ts` — 12 tests for `computeVisibility`
- `src/components/bim/roomFocus.ts` — `computeRoomFocus()` pure helper (RoomFocus interface)
- `src/__tests__/roomFocus.test.ts` — 13 tests for `computeRoomFocus`
- `src/components/bim/walkthrough.ts` — `computeWalkStart()` and `clampToFootprint()` pure helpers
- `src/__tests__/walkthrough.test.ts` — 16 tests for walkthrough helpers

### Changed Files
- `src/components/bim/BimModel3D.tsx` — Accepts `viewMode`/`visibleStorey`/`focusedRoomId`/`onBack`/`onExitWalk` props. `Scene` receives visibility state from `computeVisibility`. Meshes gated by storey, wall opacity, showRoof, showCeilings. Camera adjusts for dollhouse mode. `WalkController` component (pointer-lock mouse-look, WASD movement, footprint clamp, eye height). Room focus animation via `useFrame` lerp. Back / Exit Walkthrough buttons in footer.
- `src/components/bim/LazyBimModel3D.tsx` — Manages `viewMode`/`visibleStorey`/`focusedRoomId`. View-mode buttons (Full, Dollhouse, No Roof, Walk). Storey selector for multi-storey. Room picker `<select>`. Walk mode entry saves state, auto-sets noRoof+storey 0; exit restores.

### Tests
807 tests across 46 files (41 new).

### Known Limitations (v1)
- Interior-wall collision is **deferred** — walkthrough enforces outer footprint clamp only (0.5m margin); you can walk through interior walls.
- Walkthrough controls are desktop-focused (WASD + pointer-lock mouse-look). On touch devices the Exit button remains accessible; a note indicates "walkthrough works best on desktop".

## [0.5.0] - 2026-07-06

### Interactive 2D CAD Editor — Sprints 67–70: Reliable room & opening editing with snap-to-grid, nudge, live dimension readout, undo/redo timeline, and IndexedDB persistence

**Summary:** Complete interactive 2D CAD editing for rooms and openings, built on SVG-root pointer capture with `data-*` attribute routing. Rooms can be added, deleted, moved, and resized (8 handles); doors and windows can be added, moved along walls, and deleted. All operations flow through undo/redo (history stack) and persist to IndexedDB via `cadPersistenceService`. A snap-to-grid helper (`snapToGrid`) constrains moves and resizes at a user-selectable step (default 0.1m). Arrow-key nudge moves rooms/doors/windows by the snap step (Shift+10×). Live dimension readouts render W×H for rooms and offset‑% for openings. Toolbar is grouped with separator pipes and includes a snap‑step `<select>`. Debug readout (`debugInfo`) fully removed. 63 tests in `editablePlan.test.ts`; 766 total tests across 43 files.

### Sprint 70 — Snap-to-grid, nudge, dimension readout, snap step selector
- `snapToGrid(value, step)` pure helper in `src/lib/geometry/snap.ts` with guard for `step <= 0`
- `snapStep` state (default 0.1m) + `setSnapStep` in `useEditablePlan`
- Snap applied in `updatePointer` for move (position), resize (dimensions), opening-move (offset)
- `nudgeRoom`/`nudgeOpening` through `history.set()` + `onCommit` with collision check
- Arrow‑key nudge by `snapStep`; Shift+Arrow = 10×; only in `idle` mode
- Live dimension readout (W×H / offset‑%) as SVG `<text>` with `pointerEvents="none"`
- Snap step `<select>` in toolbar; toolbar grouped with `|` separators
- `debugInfo` state and all `setDebugInfo` calls fully removed

### Sprint 69 — Editor: add/move/delete doors & windows (offset clamped to wall, undo/redo, persistence); openings flow to elevations, section, and 3D.

### Sprint 68 — Editor: add/delete rooms (auto wall rebuild, dangling-opening cleanup, undo/redo, persistence); guarded against deleting the last room.

### Sprint 67B — Fixed live 2D editing: pointer capture moved from room rects to SVG root (data-attribute routing), replaced unreliable movementX/movementY with absolute clientX/Y deltas (frame-independent under capture), added on-screen debug readout (removed in Sprint 70). Edits now actually drag/resize without orphaned captures.

### Sprint 67 — Reliable 2D room editing (cumulative-delta drag fix, pointer-capture pan/edit disambiguation, selection outline + 8 resize handles, undo/redo timeline); edits flow to all drawings + 3D and persist to IndexedDB.

### Sprint 65 — A1 sheet Floor Plan cell now renders white-paper CAD; fixed elevation opening projection (doors to ground, windows at sill, correct spacing, front/side filtering)

### Sprint 66 (hotfix) — 3D WebGL failures no longer crash the page — added error boundary + WebGL context-loss handling with a friendly "3D unavailable" fallback and Retry

### Tests

766 tests across 43 files. All interactive editing operations tested: room add/delete/move/resize, opening add/move/delete, undo/redo, persistence, snap-to-grid, nudge.

### New Files (Sprints 65–70)

| File | Sprint | Purpose |
|------|--------|---------|
| `src/lib/geometry/snap.ts` | 70 | `snapToGrid(value, step)` pure helper |
| `src/__tests__/editablePlan.test.ts` | 67 | 63 tests: rooms, openings, snap, nudge, undo/redo, persistence |
| `src/__tests__/errorBoundary.test.tsx` | 66 | Error boundary and WebGL fallback tests |
| `src/components/common/ErrorBoundary.tsx` | 66 | React error boundary component |
| `src/components/bim/Bim3DUnavailable.tsx` | 66 | Friendly "3D unavailable" fallback UI |
| `src/lib/webgl.ts` | 66 | WebGL context-loss detection utility |
| `src/components/drawings/planSheetModel.tsx` | 65 | White-paper CAD floor plan for A1 sheet |

## [0.4.0] - 2026-07-06

### Professional Drawings Phase — 11 Drawing Types + A1 Presentation Sheet + PDF/PNG Export

**Summary of Sprints 56–63:** Auto-generated elevations + section from PlanModel geometry. Professional orthographic CAD styling (flat black-on-white, proper line weights, dimension strings, grid bubbles, level markers, title blocks). Coloured material system (BS 1192 / ISO 13567-2) with 6 material fills + 6 discipline colours. 9 new drawing types: Site Plan, Foundation Plan, Roof Plan, Reflected Ceiling Plan (RCP), Electrical Layout, Plumbing & Drainage, HVAC/Mechanical, Rich Section A‑A (solid black cut poché, stairs, room labels, footings, entourage). A1 landscape presentation sheet composing all drawings onto a single titled sheet with master title block. PDF (jsPDF) and PNG (canvas) export of the presentation sheet. Schematic disclaimer: "Drawings indicative — verify with registered professionals."

### New Drawing Types

| Type | File | Discipline Colour | Features |
|------|------|-------------------|----------|
| Front Elevation | `ElevationView.tsx` | Black (#1a1a1a) | Building outline, openings, roof, dimensions, grid bubbles, level markers |
| Side Elevation | `ElevationView.tsx` | Black (#1a1a1a) | Same as front, orthogonal projection |
| Section A‑A | `SectionView.tsx` | Black + material fills | Solid black cut poché, floor build-ups, stairs, room labels, footings, roof trusses, soil layers, entourage |
| Site Plan | `SitePlanView.tsx` | Black | Plot boundary, building footprint, road, trees, parking, north arrow, scale bar, setbacks |
| Foundation Plan | `FoundationPlanView.tsx` | Black | Strip footings, wall centre-lines, grid, materials legend |
| Roof Plan | `RoofPlanView.tsx` | Black | Ridge, eaves, overhang, gutters, downpipes, slope arrows, pitch note |
| RCP | `CeilingPlanView.tsx` | Yellow (#e6b800) | Ceiling grid, auto-placed light fixtures, room outlines |
| Electrical Layout | `ElectricalPlanView.tsx` | Yellow (#e6b800) | Lights, sockets, switches, distribution board, dashed wiring runs |
| Plumbing & Drainage | `PlumbingPlanView.tsx` | Blue (#2f6fd1) | WC, basin, shower, sink, drain, stack, dashed pipe runs |
| HVAC/Mechanical | `HvacPlanView.tsx` | Green (#2fae66) | Supply diffusers, return grilles, FCU, dashed duct runs |

### New Infrastructure

- **CAD constants & primitives** (`cadConstants.ts`, `cadPrimitives.tsx`) — Line weights, ink/paper colours, `SheetBorder`, `TitleBlock`, `DimensionLineH/V`, `GridBubble`, `LevelMarker`, `DrawingTitle`, `HatchDefs`
- **Colour system** (`drawingColors.ts`, `drawingLegend.tsx`) — Material colours (concrete, brick, earth, insulation, steel, glass, blockwork) + Discipline colours (structural, electrical, plumbing, HVAC, architectural, dimensions) + `MATERIAL_LEGEND` / `DISCIPLINE_LEGEND` arrays + SVG hatch patterns
- **MEP symbols** (`mepSymbols.tsx`) — 12 pure SVG symbol components (LightFixture, Socket, Switch, DistributionBoard, WaterCloset, Basin, Shower, Sink, FloorDrain, StackRiser, SupplyDiffuser, ReturnGrille, FanCoilUnit)
- **MEP placement** (`mepPlacement.ts`) — Pure heuristics: `placeElectrical`, `placePlumbing`, `placeHvac`
- **Entourage & ground** (`entourage.tsx`, `ground.tsx`) — TreeElevation, PersonSilhouette, CarSilhouette, NorthArrow, ScaleBar, NumberedLegend, GroundHatchDefs, SoilLayers
- **Presentation sheet model** (`presentationSheetModel.ts`) — A1 layout math, 9-cell grid
- **Presentation sheet view** (`PresentationSheetView.tsx`) — Composes all drawings onto A1, export toolbar (PDF/PNG)
- **Sheet export** (`sheetExport.ts`) — `serializeSvg`, `svgToDataUrl`, `exportSheetPng`, `exportSheetPdf` (jsPDF A1 landscape)

### Fixes

- **Blank Plan tab (Sprint 58):** `DrawingsPanel` was passing `design={null}` to `PlanCanvas` — wired `selectedDesign` from Dashboard so all sub-tabs render from one consistent plan
- **RCP light-fixture placement (Sprint 62A):** Fixed y-flip to match wall coordinate convention; metre-based grid threshold so small rooms get a fixture but no grid
- **Lint baseline (Sprint 61A):** Moved render functions from `.tsx` to `.ts` model files to maintain exact 9-warning lint baseline

### Tests

681 tests across 41 files. All drawing types tested: null-plan safety, data shape, coordinate bounds, element counts, fallback rendering via `@testing-library/react`.

### Files Created (Sprints 56–63)

| File | Purpose |
|------|---------|
| `src/adapters/planToElevations.ts` | Elevation/section geometry computation |
| `src/adapters/sheetExport.ts` | Presentation sheet PNG/PDF export |
| `src/components/drawings/cadConstants.ts` | Line weights, ink/paper colours |
| `src/components/drawings/cadPrimitives.tsx` | CAD annotation primitives |
| `src/components/drawings/drawingColors.ts` | Material/discipline colour system |
| `src/components/drawings/drawingLegend.tsx` | SVG hatch patterns + legend box |
| `src/components/drawings/entourage.tsx` | Tree, person, car, north arrow, scale bar |
| `src/components/drawings/ground.tsx` | Soil layers, ground hatch patterns |
| `src/components/drawings/ElevationView.tsx` | Front/side elevation view |
| `src/components/drawings/SectionView.tsx` | Rich section A‑A view |
| `src/components/drawings/SitePlanView.tsx` | Site plan view |
| `src/components/drawings/FoundationPlanView.tsx` | Foundation plan view |
| `src/components/drawings/RoofPlanView.tsx` | Roof plan view |
| `src/components/drawings/CeilingPlanView.tsx` | Reflected ceiling plan view |
| `src/components/drawings/ElectricalPlanView.tsx` | Electrical layout view |
| `src/components/drawings/PlumbingPlanView.tsx` | Plumbing & drainage view |
| `src/components/drawings/HvacPlanView.tsx` | HVAC/mechanical view |
| `src/components/drawings/mepSymbols.tsx` | 12 MEP SVG symbol components |
| `src/components/drawings/mepPlacement.ts` | MEP placement heuristics |
| `src/components/drawings/presentationSheetModel.ts` | A1 layout math |
| `src/components/drawings/PresentationSheetView.tsx` | A1 presentation sheet component |
| `src/__tests__/planToElevations.test.ts` | 26 elevation/section tests |
| `src/__tests__/cadDrawings.test.ts` | 74 CAD drawing tests |
| `src/__tests__/mepPlacement.test.ts` | 12 MEP placement tests |
| `src/__tests__/presentationSheet.test.ts` | 10 presentation sheet tests |

## [0.3.2] - 2026-07-06

### Sprint 55 — ZBC Building-Code Compliance Checks (Design Intelligence)

**Additive (non-breaking):** Added jurisdiction-keyed rule-based compliance checker for Zimbabwe (ZBC 1996). Evaluates active design against 9 building-code minimums. Results shown in Analysis panel (new ZBC Compliance card) and PDF cost report. Extensible for SADC neighbours.

**New files:**
- **`src/engine/compliance/types.ts`** — `ComplianceRuleDef`, `ComplianceResult`, `ComplianceInput`, `ComplianceReport` interfaces. Jurisdiction-keyed structure.
- **`src/engine/compliance/zimbabwe.ts`** — 9 ZBC rules (min room area 6 m², min room width 2 m, ceiling height 2.4 m, natural light 10%, ventilation 5%, sanitary 1 WC/25 occ, means of escape ≥ 2 exits >49 occ, site coverage ≤ 60%, structural adequacy). Each rule wrapped in try/catch. All values marked "approximate — verify with local authority".
- **`src/engine/compliance/index.ts`** — `runCompliance(jurisdiction, input)` routing switch. Default `'zimbabwe'`. TODO seam for South Africa, Zambia, Botswana. Exports `emptyCompliance()` and `summarizeCompliance()`.

**Modified files:**
- **`AnalysisPanel.tsx`** — Added "ZBC Compliance" card with score, pass/warn/fail counts, per-rule status badges, actual vs required, disclaimer. Accepts optional `jurisdiction` prop.
- **`BoqExportPanel.tsx`** — Accepts optional `activePlan` and `buildingType` props. Computes compliance summary on PDF export and passes to `generatePdfReport`.
- **`EngineeringStudioPanel.tsx`** — Passes `jurisdiction="zimbabwe"` to `AnalysisPanel`.
- **`boqToPdf.ts`** — Extended `PdfAnalysisSummary` with optional `complianceSummary`/`complianceHasData`. Renders compliance section when data available.
- **`Dashboard.tsx`** — Passes `activePlan` and `buildingType` to `BoqExportPanel`.
- **`ATTRIBUTIONS.md`** — Noted compliance rule structure inspiration from Skills-Architects code dossiers.

**Tests:** `src/__tests__/compliance.test.ts` — 13 tests: pass/warn/fail for known inputs, small room fails min-area, small room fails min-width, ceiling height passes, large room passes, egress reuses calculator, sanitary for non-residential, residential sanitary N/A, null input safe, unknown jurisdiction safe, emptyCompliance safe, summarizeCompliance counts, never throws. All 546 old tests kept green.

**Validation:** 559 tests pass (37 files). Typecheck 0 errors. Lint 0 errors (9 warnings baseline). Build succeeds. PWA intact.

### Sprint 54 — Surface Enterprise Calculators in the UI

**Additive (non-breaking):** Wired Sprint 53's 7 pure TS calculators into the UI — new Analysis tab in Engineering Studio, analysis assembly helper, PDF Design Analysis section. All 546 tests pass, 0 typecheck errors, lint baseline 9, build succeeds.

**New files:**
- **`src/engine/calculators/analysisAssembly.ts`** — `assembleAnalysis(plan, design, boq, buildingType)` orchestrates all 7 calculators from PlanModel + DesignOption + BOQ. Each calculator wrapped in try/catch. Default envelope assemblies per building type (wall U-values 0.45–0.55 W/m²K, roof 0.35–0.45 W/m²K). Exports `emptyAnalysis()` for safe zero output.
- **`src/components/dashboard/AnalysisPanel.tsx`** — 7 branded cards (Area Schedule, Envelope U-Values, Daylight, Egress, Structural Loads, Energy Demand, Cost Summary) with units and preliminary-estimate notes. Empty state: "Generate a design to see analysis". Uses `text-stone-400` tokens (WCAG AA).

**Modified files:**
- **`EngineeringStudioPanel.tsx`** — Added `'analysis'` TabId, TABS entry, tab panel. Accepts `activePlan` and `boq` props.
- **`Dashboard.tsx`** (~line 624) — Passes `activePlan` and `boq` to `EngineeringStudioPanel`.
- **`boqToPdf.ts`** — Added `PdfAnalysisSummary` interface + optional `analysis` param. When `hasData === true`, renders "Design Analysis" section between disclaimer and BOQ table. Gracefully skips when absent.
- **`structuralLoad.ts`** — Added `'educational'` and `'institutional'` to `StructuralOccupancy` union with corresponding dead/live load values.

**Tests:** +5 tests (546 total). 2 `analysisAssembly` tests in calculators.test.ts, 3 "Design Analysis section" tests in boqToPdf.test.ts.

### Sprint 53 — Enterprise Design Calculators (TS Ports)

**Additive (non-breaking):** Ported 7 enterprise architectural/engineering calculators from MIT-licensed Python references to pure TypeScript. No UI yet (Sprint 54). All calculators are deterministic, locally runnable, and safe on bad input.

**New files:**
- **`src/engine/calculators/areaSchedule.ts`** — `computeAreaSchedule(rooms, grossFloorArea?)` → gross floor area, net usable, circulation %, efficiency ratio. Reuses pre-computed room areas; accepts optional explicit GFA.
- **`src/engine/calculators/uValue.ts`** — `computeUValue(layers, target?)` → U-value (W/m²K) from material layers + Rsi/Rso (ISO 6946). Flags against target.
- **`src/engine/calculators/daylight.ts`** — `estimateDaylightFactor(input, targetDF?)` → average daylight factor % (BRE formula). Flags rooms below 2%. Formula: DF = (W × θ × τ × M) / (A × (1−R²)).
- **`src/engine/calculators/egress.ts`** — `computeOccupancyAndEgress(input)` → occupant load (IBC 2018 factors), exit width, number of exits, travel distance check.
- **`src/engine/calculators/structuralLoad.ts`** — `computeGravityLoads(input)` → dead + live load (kN/m², total kN) per IBC/ASCE 7 defaults. Outputs flagged as PRELIMINARY.
- **`src/engine/calculators/energyDemand.ts`** — `estimateEnergyDemand(input)` → annual heating/cooling (kWh, kWh/m²/yr) via degree-day envelope method.
- **`src/engine/calculators/costEstimate.ts`** — `estimateCost(input)` → thin wrapper reusing `buildBoqFromDesignOption` + `getCostPerM2`. No BOQ duplication.

**Reused existing logic:**
- `areaSchedule` accepts pre-computed `room.area` values (uses `PlanModel` / `GeneratedRoom` area, not a second formula)
- `costEstimate` calls `buildBoqFromDesignOption` and `getCostPerM2` directly — zero BOQ engine duplication
- `egress` accepts `RoomAreaInput[]` compatible with existing `GeneratedRoom[]`

**Attributions:** Added `ATTRIBUTIONS.md` crediting MIT repos `Skills-Architects` and `Claude-skills-for-Computational-Designers`.

**Validation:** 541 tests pass (512 old + 29 new), 0 typecheck errors, 0 lint errors (9 warnings baseline), build succeeds. Code-split intact.

### Sprint 52 — Accessibility & SEO Fixes (Lighthouse Audit)

**Non-breaking:** Fixed real Accessibility (84→94+) and SEO (85→98+) issues found by Lighthouse production audit. All changes are cosmetic or additive — no feature logic changed.

**A) Select labels:** Added `htmlFor`/`id` pairs to all 6 `<select>` elements across `AiBriefPanel`, `FeedbackPanel`, `RebarSpecPanel` (3 selects), `FootingSizingPanel`.

**B) Color contrast:** Replaced failing tokens globally — `text-stone-500`→`text-stone-400`, `text-slate-500`→`text-slate-400`, `text-stone-600`→`text-stone-400`, `bg-cyan-600`→`bg-cyan-700`. All pass WCAG AA 4.5:1 on dark backgrounds.

**C) Main landmark:** Wrapped `<Outlet />` in `<main>` within `GlobalLayout` in `router.tsx`.

**D) robots.txt:** Created `public/robots.txt` allowing all crawlers with sitemap reference.

**E) sitemap.xml:** Created `public/sitemap.xml` with 4 routes (`/`, `/new`, `/portfolio`, `/feedback`).

**F) Canonical URL:** Removed hardcoded `<link rel="canonical">` from `index.html`. Set dynamically per route via `useEffect` in `GlobalLayout`.

**G) Icon optimization:** Resized and compressed `icon-192.png` (935 KB 1024×1024 → 18 KB 192×192) and `icon-512.png` (937 KB 1024×1024 → 123 KB 512×512).

**Tests:** Added `src/__tests__/a11ySeoConfig.test.ts` (13 tests) verifying all fixes.

**Validation:** 512 tests pass (499 old + 13 new), 0 typecheck errors, 0 lint errors (9 warnings baseline), build succeeds.

### Sprint 51 — Repeatable Lighthouse CI Auditing Tooling

**Additive (non-breaking):** Added `@lhci/cli` (Apache-2.0, free) as a repeatable local Lighthouse audit tool. Does not change app behavior, does not run on CI by default.

**Config:**
- `lighthouserc.json` at repo root with `startServerCommand: "npm run preview"` (port 4173, production build)
- Routes audited: `/`, `/portfolio`, `/feedback` (safe static routes that render without IndexedDB data)
- 3 runs per route, median aggregation
- `lighthouse:recommended` preset with all category assertions set to `"warn"` (baseline mode — never fails, just reports)
- Upload target: `filesystem` → `./lighthouse-report/` (HTML reports saved locally)

**Scripts added:**
- `npm run lighthouse` — builds production app and runs full LHCI audit

**Files changed:**
- `package.json` (+1 script, +1 devDependency)
- `lighthouserc.json` (new)
- `.gitignore` (+2 entries)
- `docs/SPRINT_51_LIGHTHOUSE_TOOLING_REPORT.md` (new)

**Validation:** 499 tests pass, 0 typecheck errors, 0 lint errors (9 warnings baseline), build succeeds. Existing behavior unchanged.

## [0.3.1] - 2026-07-05

### Sprint 49 — 2D/3D Plan Consistency (One Active Plan Source)

**Root cause**: The 2D PlanCanvas and 3D BimModel3D read from different plan sources. PlanCanvas used `persistedPlan ?? generatePlanModel(selectedDesign)` (ignoring Tier 3 FloorPlans), while the 3D view used `activePlan = persistedPlan ?? floorPlanToPlanModel(selectedTier3Plan, selectedDesign) ?? generatePlanModel(selectedDesign)`. For a hotel courtyard, 2D showed a generic rectangle while 3D showed the courtyard ring.

**Fix**: PlanCanvas now receives `activePlan` (the fully resolved plan) as its `persistedPlan` prop, making both views share the same resolution pipeline. Priority order for both: persistedPlan (CAD edits) ≫ Tier 3 FloorPlan via floorPlanToPlanModel ≫ legacy generatePlanModel fallback.

**Files changed**: `src/pages/Dashboard.tsx` (1 line), `src/__tests__/activePlanConsistency.test.ts` (new, 7 tests).

**Verification**: 470 tests pass (463 old + 7 new). Typecheck, lint (0 errors, 9 warnings baseline), build all pass.

### Sprint 48D — Pass current dropdown typology into Tier 3 in both generate paths

**Root cause**: Dashboard `handleGenerate` hardcoded `buildingType:'auto'` for Tier 3 calls, ignoring the user's explicit dropdown selection (e.g., Clinic, Hotel). The AiBriefPanel path correctly used `buildingTypeRef.current`, but the value never reached Dashboard.

**Fix**: Lifted `selectedBuildingType` state to Dashboard. AiBriefPanel emits `onBuildingTypeChange` on dropdown change; EngineeringStudioPanel passes it through; both generate paths now use the same `selectedBuildingType` value.

**Files changed**: `src/components/ai/AiBriefPanel.tsx`, `src/components/dashboard/EngineeringStudioPanel.tsx`, `src/pages/Dashboard.tsx`.

**Verification**: Auto+hotel → hotel-fullservice (courtyard). Explicit clinic → clinic-health. 463 tests pass.

### Sprint 48C — Fix Typology Detection: Full Dropdown + Auto-Detect Default

**Root cause**: The building-type dropdown defaulted to `'house'` and was ALWAYS applied as an override in `parseBrief()`. A hotel brief text-detected as `hotel-fullservice` was overridden to `house-residential` via `startsWith('house')`, so the courtyard selection branch (`typologyId === 'hotel-fullservice'`) never fired. Additionally, the dropdown only offered 8 types; `hotel` was not listed.

**Fixes**:
1. `AiBriefPanel.tsx`: Dropdown now offers "Auto-detect from brief" (default) + all 14 Tier 1 typologies with canonical IDs (e.g., `'hotel-fullservice'`). Selecting "Hotel (Full Service)" directly triggers the courtyard branch.
2. `parseBrief.ts`: Override is skipped when `buildingType` is `'auto'` — text detection wins at default. Explicit selection still forces its typology (e.g., picking "Hotel" forces `hotel-fullservice`, picking "House" forces `house-residential`).
3. `Dashboard.tsx:272`: Default changed from `'house'` → `'auto'`.
4. `aiDesignAdapter.ts:21`: Skip `'auto'` override so design options get the detected building type.
5. Sprint 48B debug (CY_DEBUG, DebugPanel, console.logs) fully removed.

**Before**: Hotel brief → typology `house-residential` → Rectangle/L-Shape/Split-Wing — no courtyard.
**After**: Hotel brief (auto OR explicit) → typology `hotel-fullservice` → Courtyard/L-Shape/Split-Wing.

**Testing**: +8 parseBrief override tests (463 total, 32 files). Zero `[CY-DEBUG]`/`DebugPanel` references remain.

**Documentation:** `docs/SPRINT_48C_TYPOLOGY_DROPDOWN_REPORT.md`

### Sprint 48B — Temporary Debug Readout for Courtyard Topology Selection

**Root cause**: Despite Sprint 48A fixing the layout engine to return courtyard among the 3 topologies, a hotel brief live still shows only Rectangle/L-Shape/Split-Wing. The UI override in `parseBrief(brief.rawText, { buildingType: brief.parsed.buildingType ?? 'house' })` overwrites the text-detected `hotel-fullservice` typology with `house-residential` when `brief.parsed.buildingType` is `'house'` — which it always is, because `src/lib/ai/brief-parser.ts` doesn't recognize `'hotel'`.

**Debug addition**: Added a temporary visible debug panel (top-left, green-on-black, z-index 99999) showing runtime values: `typologyId`, `heritageId`, `selectionBranch`, `topologies[]`, `planLabels[]`. Console logs with prefix `[CY-DEBUG]` at each generation.

**Documentation:** `docs/SPRINT_48B_COURTYARD_DEBUG_REPORT.md`

### Sprint 48A — Fix Courtyard Topology Selection for Hotels (No More Empty 4th Option)

**Root cause**: `generateLayoutParameters` added `'courtyard'` as a 4th topology for hotels/heritage-courtyard typologies, but the UI (`Dashboard.tsx`) only maps over the first 3 `aiDesignOptions` — the courtyard plan was silently dropped. Users always saw Rectangle / L-Shape / Split-Wing even for a hotel, never a Courtyard option.

**Fixes**:
1. `layoutEngine.ts:475-480`: For courtyard-eligible typologies/histories (hotel-fullservice, townhouse, kraal, courtyard-hearth), the 3 topologies are now `['courtyard', 'l-shape', 'split-wing']` — courtyard **replaces** rectangle instead of being a dropped 4th option.
2. `Dashboard.tsx`: Both `handleGenerate` and `handleTier3Plans` now handle `plans.length !== prev.length` by appending new `DesignOption` entries for extra plans. Removed fragile `prev.length >= plans.length` guard.

**Before**: Hotels returned 4 plans (`rectangle, l-shape, split-wing, courtyard`), UI showed only first 3 — courtyard invisible.
**After**: Hotels return 3 plans (`courtyard, l-shape, split-wing`), courtyard is the FIRST option the user sees.

**Testing**: Modified hotel test from `toBe(4)` → `toBe(3)` with `toContain('courtyard')`. Added explicit `not.toContain('courtyard')` for house. Signature test compares courtyard vs l-shape. All 455 tests pass (31 files).

**Files changed**: `layoutEngine.ts`, `Dashboard.tsx`, `tier3LayoutEngine.test.ts`, `CHANGELOG.md`, `docs/SPRINT_48A_COURTYARD_SELECTION_REPORT.md`.

**Documentation:** `docs/SPRINT_48A_COURTYARD_SELECTION_REPORT.md`

### Sprint 48 — Fix Courtyard Layout Overlap (Real Courtyard Ring for Hotels, No Rectangle Fallback)

**Root cause**: `generateCourtyard` used a hardcoded `wingDepth = 4.0`. Guest rooms with `minDepth = 5.5` were ZBC-enforced to 5.5m height, 1.5m deeper than the planned wingDepth. Rooms protruded into the courtyard void, causing `hasOverlaps` to return true, and `generateFloorPlans` degraded the courtyard plan to a "Fallback Rectangle (courtyard degrade)".

**Fixes**:
1. `layoutEngine.ts:310-465`: `generateCourtyard` now computes `wingDepth = max(minD, minW)` across ALL program items (minimum 4.0). Room sizes are computed directly from ZBC-minimum-aware formulae (`max(minW, area/wingDepth)` and `max(minD, area/wingDepth)`) so ZBC is satisfied BY CONSTRUCTION — no post-placement bump that could cause overlaps.
2. Spans use the ZBC-enforced sizes, not raw `area/wingDepth`. Outer dimensions accommodate the real placement.
3. Fewer-wings fallback for <4 rooms. Proper corner handling.

**Before**: 20-room hotel courtyard always degraded to "Fallback Rectangle (courtyard degrade)" — every hotel was just a rectangle.
**After**: 20-room hotel produces a REAL courtyard ring: rooms on all 4 sides, central void ≥ 2m × 2m, no overlaps, ZBC-compliant.

**Testing**: +6 tests (455 total, 31 files) — small courtyard (6 rooms), real courtyard with central void, ZBC compliance, signature distinct from l-shape, explicit house-excludes-courtyard.

**Documentation:** `docs/SPRINT_48_COURTYARD_LAYOUT_REPORT.md`

### Sprint 47B — Fix PDF Generation Failure (jspdf-autotable Functional API for Code-Split)

**Confirmed error** (browser console): `TypeError: t.autoTable is not a function` in `boqToPdf-*.js`.

**Root cause**: `await import('jspdf-autotable')` was a side-effect import. jsPDF v4.2.1 loaded as ESM does NOT set `window.jsPDF`, so the plugin's `applyPlugin(jsPDF)` never ran. Since both libraries are code-split into separate chunks, `doc.autoTable` was always `undefined`.

**Fixes**:
1. `boqToPdf.ts:81-82`: Changed to `Promise.all([import('jspdf'), import('jspdf-autotable')])` and obtains `autoTable` from `autoTableMod.default`. Replaced all `(doc as any).autoTable({...})` calls with `autoTable(doc, {...})` — the functional API works independent of prototype attachment.
2. `boqToPdf.ts`: Added null/undefined guards for `design.name`, `design.buildingType`, `design.grossFloorArea`, `design.floors`, `boq.currency`, `boq.items`, `boq.summary`, `item.description`, `item.quantity`, `item.rate`, `item.total`. Hardened `fmt()` to silently zero-out null/undefined/non-finite values.
3. `boqToPdf.ts`: Guarded `(doc as any).lastAutoTable?.finalY ?? y` so missing `finalY` never throws.
4. `boqToPdf.test.ts`: Updated mock to export `default` as `autoTable(doc, opts)`; added functional API test (asserts `autoTable` called with `(doc, opts)` not `doc.autoTable()`) and `finalY` fallback test.

**Before**: Every PDF download shows "Failed to generate PDF. Please try again." — `TypeError: t.autoTable is not a function` in console.
**After**: PDF generates reliably with and without 3D snapshot, with real and edge data.

**Testing**: +3 tests (448 total, 31 files) — edge data, functional API form, finalY fallback.

**Chunk impact**: boqToPdf 5.78 kB (+0.23 kB). jspdf.plugin.autotable remains a separate lazy chunk (31.10 kB).

**Documentation:** `docs/SPRINT_47B_PDF_GENERATION_FIX_REPORT.md`

### Sprint 47A — Fix PDF Download Regression: Isolate 3D Snapshot So PDF Always Generates

**Root cause**: `captureSnapshot()` in `BoqExportPanel.handleExportPdf` ran BEFORE the dynamic import and could throw (WebGL context loss, disposed canvas, render error). The entire PDF handler aborted — user clicked "Download PDF Report" and nothing happened. The outer catch only logged to console.

**Fixes**:
1. `BoqExportPanel.tsx`: Wrapped `captureSnapshot()` in its own try/catch — `snapshot` is always `undefined` on failure. PDF generation always proceeds.
2. `BoqExportPanel.tsx`: Added `pdfError` state — red inline "Failed to generate PDF. Please try again." message on genuine PDF failures. Auto-clears after 6 seconds.
3. `boqToPdf.ts`: Added `console.warn` inside `embedSnapshotInPdf` catch so addImage failures are visible in dev tools.

**Before**: WebGL context loss or render error during snapshot capture silently blocks PDF download — user sees "nothing happens".
**After**: PDF always generates. If capture fails, PDF omits snapshot but has everything else. Genuine PDF failures show a visible red error.

**Testing**: +15 tests (445 total, 31 files) — embed resilience (never throws for any input), capture isolation, generatePdfReport always saves regardless of snapshot validity.

**Documentation:** `docs/SPRINT_47A_PDF_DOWNLOAD_FIX_REPORT.md`

### Sprint 47 — Embed 3D Model Snapshot into PDF Cost Report

**Root cause**: The WebGL canvas in `BimModel3D` was created without `preserveDrawingBuffer: true`, so `gl.domElement.toDataURL()` returned a blank/transparent image. The optional `snapshotDataUrl` parameter existed in `boqToPdf.ts` (from Sprint 43) but was never populated.

**Fixes**:
1. `BimModel3D.tsx:392`: Added `preserveDrawingBuffer: true` to the Canvas `gl` config — enables WebGL readback via `toDataURL('image/png')`.
2. `BimModel3D.tsx:213-225`: Added `<SnapshotCapture />` component inside the Canvas that uses `useThree()` to obtain `gl`, `scene`, `camera` and registers a capture function. Before capturing, it calls `gl.render(scene, camera)` for a fresh frame.
3. `src/lib/3d-snapshot.ts` (new): Module-level capture registry (`registerSnapshotCapture`/`unregisterSnapshotCapture`/`captureSnapshot`) + `isValidPngDataUrl` guard function.
4. `boqToPdf.ts:56-67`: Extracted `embedSnapshotInPdf` function using `isValidPngDataUrl` guard + try/catch. Called from `generatePdfReport`.
5. `BoqExportPanel.tsx:129-131`: Calls `captureSnapshot()` before `generatePdfReport`, passes result as third argument.

**Graceful skip**: If the 3D view was never opened (`captureSnapshot()` returns `null`), the PDF still generates without the image — no errors, no blank placeholders.

**Before**: PDF cost report had an unused optional snapshot parameter — no image could be captured.
**After**: PDF includes a "3D Model Preview" section with a PNG snapshot of the current 3D BIM model when available; gracefully skips when not.

**Testing**: +16 tests (430 total, 31 files) — `isValidPngDataUrl` with valid/invalid/empty/null/undefined inputs, `embedSnapshotInPdf` with mock doc asserting `addImage` called/not-called and y-position advancement, capture registry lifecycle.

**Chunk impact**: boqToPdf +0.10 kB, BimModel3D +0.40 kB. Both still lazy-loaded.

**Documentation:** `docs/SPRINT_47_PDF_3D_SNAPSHOT_REPORT.md`

## [0.3.0] - 2026-07-04

### Sprint 46B — Unify Design Options: Remove Stale Panel, Fix Duplicate Accumulation

**Root cause**: Two separate sources rendered design options. (a) The top prominent selector (`Dashboard.tsx`) used `visibleDesignOptions` (Tier 3 topology names — working correctly after 46A). (b) The right-hand Properties sidebar (`PropertiesPanel.tsx`) read `currentDesigns` directly from the Dexie store, which contained old "Compact/Standard/Spacious Option" records from the `@/ai/designEngine` path. Additionally, `generateDesigns` in `projectStore.ts` used `db.designs.bulkAdd` which **appended** without deleting old records — every "Regenerate" added 3 more, accumulating to 6, 9, 12+ cards.

**Fixes**:
1. `projectStore.ts:203`: Added `await db.designs.where({ projectId }).delete()` before `bulkAdd` — always exactly 3 records, never accumulates.
2. `PropertiesPanel.tsx:81-115`: Removed the stale "Design Options" section entirely. The top prominent selector is the single source of truth (interactive, topology-labeled, drives the pipeline). Also removed unused `currentDesigns` import and unused lucide-react icons.
3. Tests: +3 tests for regenerate idempotency (calling twice returns 3 each), distinct room layout signatures per topology, and finite positive coordinates in all plans.

**Before**: Right sidebar shows old "Compact/Standard/Spacious" labels + 6+ duplicate cards after 2 regens.
**After**: Single unified top selector with exactly 3 topology-labeled cards, no duplicates anywhere.

**Documentation:** `docs/SPRINT_46B_UNIFY_OPTIONS_REPORT.md`

### Sprint 46A — Tier 3 Wiring Fix: Topology Labels in Design Option Cards

**Root cause**: Two bugs prevented Tier 3 topology names from appearing on the 3 design-option cards. (a) The "Regenerate options" button (`handleGenerate`) only called the old `@/ai/designEngine` engine, producing "Compact/Standard/Spacious". (b) The AI Brief panel path used a stale closure over `aiDesignOptions` in `handleTier3Plans`, causing the topology remap guard to fail silently (`0 >= 3 → false`).

**Fixes**:
1. `handleTier3Plans` (`Dashboard.tsx:283`): Changed from direct `aiDesignOptions` closure read to functional `setAiDesignOptions((prev) => ...)` — reads the latest state.
2. `handleGenerate` (`Dashboard.tsx:262`): After store's `generateDesigns(id)`, dynamically imports Tier 1/2/3 engines, runs `generateFloorPlans`, remaps option names to topology names. Falls back to `console.warn` on failure — old labels preserved.
3. Tests: +3 tests asserting plan names contain topology keywords (Rectangle/L-Shape/Split-Wing/Courtyard) and never "Compact" / "Standard" / "Spacious".

**Before**: 3 cards show "Compact Option / Standard Option / Spacious Option" (old engine names).
**After**: 3 cards show "Rectangle — ... / L-Shape — ... / Split-Wing — ..." (Tier 3 topology names).

**Documentation:** `docs/SPRINT_46A_TIER3_WIRING_FIX_REPORT.md`

### Sprint 46 — Tier 3: Layout Engine (Room-by-Room Floor Plan Generation)

**New modules** (layered, non-breaking — existing generator unchanged):
1. **3+1 topology generators** (`src/engine/tier3/layoutEngine.ts`): Rectangle (public front / corridor / private back), L-Shape (vertical wing + horizontal wing + corner courtyard), Split-Wing (two pavilions + central gallery), Courtyard (rooms distributed across 4 wings around central void — for hotel/townhouse/heritage typologies). Each produces real non-overlapping coordinates with ZBC minimum dimensions enforced per room type.
2. **Graceful degradation**: Each topology wraps in try/catch + `hasOverlaps` check. On failure/overlap, substitutes a safe banded rectangle + `console.warn`. `generateFloorPlans` never throws.
3. **FloorPlan→PlanModel adapter** (`src/adapters/floorPlanToPlanModel.ts`): Converts to existing `PlanModel` (rooms → RoomRect[], walls derived, openings present, scaleLabel). NaN guard: `assertFiniteSize` throws clear error on non-finite width/height.
4. **Dashboard integration**: `AiBriefPanel` triggers Tier 3 after Tier 2, hands `FloorPlan[]` via `onTier3Plans`. `activePlan` useMemo: Tier 3 → `floorPlanToPlanModel` → `generatePlanModel` fallback. User always gets a working plan.

**Bug fixes:**
- `pickSiteDims`: NaN crash on zero-area program fixed (early return `{30,30}`)
- Room-corridor overlap in rectangle: rooms clipped to band depth after zbcEnforce
- Corridor ZBC violations: widths/heights raised to ≥2 m
- L-shape overlap: redesigned so horizontal wing sits below vertical wing
- Test expectations aligned with actual parsed program output

**Documentation:** `docs/SPRINT_46_TIER3_LAYOUT_ENGINE_REPORT.md`

### Sprint 44 — Tier 1: Design Brief Intelligence (enterprise architectural intelligence)

**New modules** (layered, non-breaking — existing generator unchanged):
1. **14 building typologies** (`src/engine/typology-kb.ts`): house, apartment, clinic, school, hotel, office, retail, restaurant, church, warehouse, community hall, market, petrol station, mixed-use — each with aliases, SANS 10400/ZBC class mapping, default room program, min room dimensions, and notes.
2. **Climate zones** (`src/engine/climate-kb.ts`): Harare Highveld, Victoria Falls Lowveld, Mutare Eastern Highlands, Bulawayo Midlands, Generic Zimbabwe — with orientation/shading/thermal mass/ventilation strategy per zone.
3. **Heritage patterns** (`src/engine/heritage-kb.ts`): Kraal, Rondavel, Veranda, Courtyard-as-Hearth, Great Zimbabwe Enclosure — with cultural context and design implications.
4. **Tier 1 parser** (`src/engine/parseBrief.ts`): `parseBrief(text, uiOverrides?)` — detects typology, climate zone, heritage pattern; extracts site dimensions, budget, room program; produces quality gate with score (0–100), issues, and recommendations.
5. **Collapsible UI readout** (`Tier1Readout.tsx`): shown on the AiBriefPanel after generation — displays detected typology + confidence, climate zone, heritage pattern, quality score, issues, and recommendations. Brand-styled, non-intrusive.

**Layering / Fallback**: Tier 1 runs in a separate try/catch after the existing generation pipeline. If it fails, the main flow (brief → design → plan → BIM → BOQ → PDF) continues unchanged. Existing `parseBrief` from `@/ai/briefParser.ts` still drives plan generation.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings — unchanged)
- Tests: 368 passed (27 files, +22 new Tier 1 tests)
- Build: success — 3D still code-split; Tier 1 engine lazy-loaded (20 kB chunk)

**Documentation:** `docs/SPRINT_44_TIER1_BRIEF_INTELLIGENCE_REPORT.md`

### Sprint 43 — Print-friendly PDF BOQ + Cost Report (free/offline)

**Additive feature**: `Download PDF Report` button on the Cost & Deliver panel generates a professional PDF entirely client-side (no server, no paid API).

1. **Lazy-loaded PDF generation**: Uses jsPDF + jspdf-autotable (both MIT), dynamically imported on button click (`async import()`). Shows `Preparing PDF...` state during generation. Does NOT bloat initial bundle — pdf libs are separate chunks (boqToPdf=5kB, jspdf=391kB, autotable=31kB).
2. **PDF contents**:
   - Header: `Budget Engineer — Cost Report` with Deep Cobalt brand bar, project name, date
   - Project summary: building type, area (m2), storeys, design option name, quantity source label
   - Disclaimer: "Early estimate — consult a registered professional for final construction."
   - BOQ table grouped by trade (reuses same grouping logic as on-screen panel: Substructure, Walling, Roofing, Openings, Finishes, Services, Fittings), with group subtotals
   - Grand total breakdown: subtotal, contingency, professional fees, VAT, grand total (with green highlight)
   - Footer: page numbers + repo URL on every page
3. **Currency**: Reuses existing `currencySymbol` helper for formatting.
4. **Optional 3D snapshot**: Adapter accepts optional `snapshotDataUrl` param; gracefully skips if unavailable. Not wired yet (requires WebGL context ref exposure in BimModel3D — deferred).
5. **Existing CSV/HTML/Print exports preserved**.
6. **Filename**: `BudgetEngineer-<projectname>-BOQ.pdf`.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 346 passed (26 files)
- Build: success — 3D chunk still code-split; PDF libs in separate chunks

**Documentation:** `docs/SPRINT_43_PDF_BOQ_REPORT.md`

### Sprint 42C — Final window fix: visible glazing + frames, fix multi-storey key collision, remove debug

**Permanent fix** after Sprint 42B confirmed meshes render correctly:
1. **Glass material**: Replaced debug magenta with proper sky-cyan (`#7dd3fc`) transparent glass (`opacity: 0.5`, `side: DoubleSide`, `depthWrite: false`, subtle cyan emissive glow `emissiveIntensity: 0.15`).
2. **Frame**: Added 4-bar frame (head, sill, left/right jambs) in brand Muted `#cbd5e1`, thickness 0.06 — guarantees window visibility from any angle.
3. **Multi-storey key collision fixed**: React keys for doors and windows now include `storeyIndex` (`door-${id}-s${si}`, `win-${id}-s${si}`) — 2-storey plans now render all 6 window placements (was 3).
4. **Debug removed**: All 42B instrumentation (magenta material, overlay, console.log) fully removed — confirmed 0 matches in src/.

**Tests extended**: `planTo3d.test.ts` — new test asserts every opening placement has a `storeyIndex` and unique composite identity across storeys; 2-storey plans yield 2x openings with distinct identities.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings — unchanged)
- Tests: 346 passed (26 files, +1 new test)
- Build: success — 3D code-split chunk preserved

**Documentation:** `docs/SPRINT_42C_WINDOW_FINAL_FIX_REPORT.md`

### Sprint 42B — Debug sprint: expose windows with bright debug material + render-count readout

**Temporary diagnostic changes** to make windows impossible to miss:
1. **Glass material**: Replaced `WINDOW_GLASS_MAT` with bright opaque magenta (`#ff00ff`) with emissive glow — cannot be confused with walls or doors.
2. **Window geometry**: Simplified `WindowMesh` to a single solid box protruding both sides of the wall (`wallThickness * 1.5`), no frame elements.
3. **On-screen overlay**: Fixed top-left div showing `[WIN-42B] placed: X | rendered: Y` — window placements vs mesh count.
4. **Console.log**: `[WIN-42B]` log with per-window position, angle, sill, height, width, wallId, storey for every render.

**Investigation findings** (see report for full detail):
- Render loop at `BimModel3D.tsx:265-274` is straightforward: `.filter(kind==='window').map()` with key `win-${openingId}`. No conditionals, no early returns, no group nesting issues.
- Multi-storey: openingId is identical across storeys => React keys `win-${id}` collide for same opening on different storeys, causing React to only render the last one. This would lose windows on storey 0 for multi-storey plans.
- Window Y positions: all within wall height (`centerY + sillHeight + height/2` = 1.65 for single storey, wall top = 3.0). No off-range.
- Same building group as walls/doors — not in a separate group.

**Revert after this sprint:** The Sprint 42 permanent fix (cyan DoubleSide glass + thicker frames) should be restored after the user confirms whether windows are now visible in magenta.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 345 passed (26 files)
- Build: success — 3D code-split chunk, GLTFExporter lazy-loaded

**Documentation:** `docs/SPRINT_42B_WINDOW_DEBUG_REPORT.md`

### Sprint 42 — Fix window rendering so all windows are visible in 3D BIM model

**Root cause:** The `WindowMesh` glass material used `transparent: true` with `opacity: 0.35` but without `depthWrite: false` or `side: THREE.DoubleSide`. The glass box was a thin slab inside the wall gap, but with `depthWrite: true` on a transparent material, the glass wrote to the depth buffer and interacted poorly with the opaque wall piers around it, making the glass effectively invisible. Additionally, the window frame jambs were only 3cm wide — far too thin to resolve at typical camera distances, so even the opaque frame didn't provide a visible window outline.

**Fix (BimModel3D.tsx):**
1. **Glass material** (line 28-32): Added `depthWrite: false` and `side: THREE.DoubleSide`, bumped `opacity` from 0.35 to 0.45. `depthWrite: false` prevents the transparent glass from corrupting the depth buffer. `DoubleSide` ensures the glass is visible from any angle.
2. **Frame width** (line 109-110): Increased `frameW` from 0.03m to 0.06m and `frameDepth` from 0.04m to 0.06m (both now 6cm). This makes the frame reliably visible at typical viewing distances.
3. **Door frame consistency** (line 86-87): Increased door `frameDepth` from 0.05m to 0.06m and `jambW` from 0.03m to 0.06m for consistent visual weight.

**Tests** (`src/__tests__/planTo3d.test.ts`): Added 3 tests — `splitWall` produces a pier gap for a WINDOW opening equal to the window width, window placements have correct sillHeight > 0 and height > 0 and lie on their wall segment, and window count matches window openings in the plan.

**Before:** Most windows invisible (glass transparent-but-depth-corrupted, frame too thin to resolve at camera distance).

**After:** All windows render as clearly visible cyan-tinted panes with visible dark frames, seated at correct sill height inside wall gaps.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 345 passed (26 files) — +3 window-specific tests
- Build: success — 3D code-split chunk, GLTFExporter lazy-loaded

**Documentation:** `docs/SPRINT_42_WINDOWS_RENDER_FIX_REPORT.md`

### Sprint 41 — Fix 3D roof coverage, render all doors/windows, add room ceilings

**Root cause (roof):** The pitched gable roof BufferGeometry used wrong triangle indices — roof surface triangles were split diagonally across the building instead of forming proper rectangular quads, causing degenerate/zero-area triangles that collapsed to a narrow sliver at one corner.

**Root cause (openings):** Openings data was correct (all resolved in planTo3d), but DoorMesh and WindowMesh used inconsistent Y positioning (group at Y=0 with leaf/sill in world space) making some doors/windows appear at wrong heights relative to walls. Fixed by setting group Y to `op.centerY` so all sub-meshes use local storey-relative coords.

**Fixes:**
1. **Roof** (`src/components/bim/BimModel3D.tsx:RoofMesh`): Corrected triangle indices for both ridgeAxis='x' and 'z'. South roof now forms quad (0,1,5,4) instead of degenerate (0,4,1)+(1,4,5). North roof quad (3,2,5,4). East/west gable triangles corrected. Roof now covers the full building footprint with overhang, no collapse.
2. **Doors/windows** (`BimModel3D.tsx:DoorMesh,WindowMesh`): Changed group position Y from `0` to `op.centerY`, simplified local positions to be storey-relative. Every opening in PlanModel now produces a visible door or window mesh.
3. **Ceilings** (`src/adapters/planTo3d.ts` + `BimModel3D.tsx`): Added `CeilingSlab` interface, one ceiling per room per storey at (`storey+1`)*storeyHeight - inset, spanning the room footprint (slightly inset). Thin slab (0.05m), brand slate material. Rooms are now enclosed at top.
4. **Tests** (`src/__tests__/planTo3d.test.ts`): Added 9 tests — roof eave corners span full bounds (both axes), opening count parity (all openings resolve), ceilings per room/storey at correct height, empty plan returns empty ceilings.

**Before:** Roof collapsed to a thin triangular sliver at one corner (wrong indices). Only some doors/windows appeared visible. Rooms open at top.

**After:** Roof spans the full building footprint with overhang (pitched gable). All openings render as visible door/window meshes. Ceilings enclose each room.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 342 passed (26 files) — +9 roof/opening/ceiling tests
- Build: success — 3D code-split into `BimModel3D-*.js` chunk, GLTFExporter lazy-loaded as separate chunk

**Documentation:** `docs/SPRINT_41_ROOF_OPENINGS_CEILINGS_REPORT.md`

### Sprint 40 — Fix 3D BIM geometry: connected walls, seated roof, seated doors and windows

**Root cause:** A single axis-swap bug in the wall rotation formula `-Math.atan2(dx, dz)` (should be `Math.atan2(dz, dx)`) caused ALL walls to be rotated 90° from their correct direction, producing disjointed floating fins instead of a coherent connected building. Doors and windows inherited the wrong angle, making them float in space. The roof used correct world coordinates but appeared misaligned because walls were wrong.

**Fix:**
1. **Wall rotation** (`src/adapters/planTo3d.ts:129`, `src/components/bim/BimModel3D.tsx:54`): Changed `-Math.atan2(dx, dz)` → `Math.atan2(dz, dx)`. Walls now align with their segment direction — horizontal walls point along +X (angle 0), vertical walls point along +Z (angle π/2).
2. **Opening rotation** (`src/adapters/planTo3d.ts:318`): Same fix — openings inherit the correct wall angle so they seat flush inside wall openings.
3. **Walls still come from PlanModel.walls** (shared segments, not per-room) — the wall source was already correct. The 2D and 3D now use identical segment geometry.
4. **Roof seating** was already correct in data (`eaveY = numberOfStoreys * storeyHeight`) — no code change needed, the roof was just visually wrong because walls were rotated away.
5. **Extended tests** (`src/__tests__/planTo3d.test.ts`): Added 13 geometric coherency tests asserting adjacent walls share endpoints, wall box position/rotation matches segment midpoint/direction, roof eave exactly equals wall top, openings lie on their wall segment at correct offset/height, multi-storey stacks correctly, and empty plan → empty.

**Before:** Walls appeared as disconnected thin fins with gaps at corners; roof floated with visible gap above walls; doors/windows floated in space. The .glb export showed the same broken geometry.

**After:** Walls meet at shared endpoints forming enclosed room volumes; roof eaves sit exactly on top of top-storey walls; doors/windows are seated inside wall openings at correct offset and height. The .glb export reflects the corrected assembly.

**Validation:**
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 333 passed (26 files) — +13 geometric coherency tests, existing tests unchanged
- Build: success — 3D code-split into `assets/BimModel3D-*.js` chunk, GLTFExporter lazy-loaded as separate chunk

**Documentation:** `docs/SPRINT_40_3D_GEOMETRY_FIX_REPORT.md`

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
