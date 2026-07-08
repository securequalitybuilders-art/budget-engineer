# Feature Matrix — Budget Engineer OS Canonical

> **Date:** 2026-07-08 (v0.9.0)  
> **Base:** WS1 (`workspace-chart 1`)  
> **Legend:** ✅ Present | ❌ Missing | 🔄 Staged (not wired)
> **Phase E (WS6 AI + Drawing Management) merged.**  
> **Sprint 1:** 6 staged WS6 panels wired into Engineering Studio dashboard section.  
> **Sprint 1.1:** Stabilized Engineering Studio — WebLLM button disabled, NaN guards, smoke report created.  
> **Sprint 2:** 3D BIM viewer integrated into Dashboard with 2D/3D toggle + design-to-BIM adapter.  
> **Sprint 3:** Local AI brief-to-design flow wired — brief parser + design engine produce visible design options in Dashboard via AiBriefPanel.
> **Sprint 93:** Lighthouse audit + a11y/SEO/PWA hardening (A11y 100, BP 100, SEO 100).

---

| Feature | Status | Notes |
|---|---|---|
| **AI Brief Parser** (deterministic, canonical) | ✅ Present, wired | WS1 `src/ai/briefParser.ts` — wired into Dashboard via Sprint 3 adapter |
| **AI Brief Parser** (deterministic, WS6 variant) | ✅ Present | WS6 `src/lib/ai/brief-parser.ts` (used by AiBriefPanel display) |
| **AI Design Engine** (canonical, Design[] output) | ✅ Present, wired | WS1 `src/ai/designEngine.ts` — wired into Dashboard via Sprint 3 adapter |
| **AI Design Engine** (WS6, CadDocument output) | ✅ Present | WS6 `src/lib/ai/design-engine.ts` (multi-floor parametric) |
| **AI Provider** (engine abstraction + fallback) | ✅ Present | WS6 `src/lib/ai/ai-provider.ts` |
| **WebLLM Parser** (in-browser local LLM) | 🔄 Staged | WS6 `src/lib/ai/webllm-parser.ts` — opt-in; needs `@mlc-ai/web-llm` |
| **2D CAD Editor** (interactive plan canvas) | ✅ Present | WS2 |
| **Parametric Floor Plan Generator** | ✅ Present | WS2 |
| **Wall Editing** (draw/move/delete walls) | ✅ Present | WS2 |
| **Opening Editing** (doors/windows) | ✅ Present | WS2 |
| **Layer Management** | ✅ Present | WS2 |
| **Block Library** (furniture fixtures) | ✅ Present | WS2 |
| **Dimension Annotations** | ✅ Present | WS2 |
| **CAD Topology** (split/join/heal walls) | ✅ Present | WS2 + WS4 cad-solver |
| **Undo/Redo** | ✅ Present | WS2 |
| **Multi-Floor Support** | ✅ Present | WS2 |
| **Wall Corner Solver** (intersection trim) | ✅ Present | WS4 cad-solver |
| **Clash Detection** (3 BIM rules) | ✅ Present, wired | WS4 clash-checker — wired into Dashboard via Sprint 5 EngineeringAnalysisPanel |
| **Solar Orientation Analysis** (cardinal heat gain) | ✅ Present, wired | WS4 solar-analyzer — wired into Dashboard via Sprint 5 EngineeringAnalysisPanel |
| **MEP Takeoff** (points per zone) | ✅ Present, wired | WS4 mep-takeoff — wired into Dashboard via Sprint 5 EngineeringAnalysisPanel |
| **Engineering Analysis Panel** (clash + solar + MEP) | ✅ Present, wired | Sprint 5 — BoqExportPanel sidebar with recommendation cards |
| **Solar Orientation Analysis** (cardinal heat gain) | ✅ Present, wired | WS4 solar-analyzer — wired via Sprint 5 |
| **MEP Takeoff** (points per zone) | ✅ Present, wired | WS4 mep-takeoff — wired via Sprint 5 |
| **DXF Export** | ✅ Present | WS2 |
| **MakerJS Export** | ✅ Present | WS2 |
| **SVG Plan Export** | ✅ Present | WS2 |
| **Static Plan SVG** (dossier-ready, no DOM) | ✅ Present | WS6 `src/lib/drawings/plan-svg.ts` |
| **Section Elevation SVG** (AA/BB cut planes) | ✅ Present | WS6 `src/lib/drawings/section-svg.ts` |
| **SVG Title Block** (DZENHARE OS branded) | ✅ Present | WS6 `src/lib/drawings/title-block.ts` |
| **Drawing Register** (A-101, A-201 with revision history) | ✅ Present | WS6 `src/lib/drawings/drawing-register.ts` |
| **PDF Executive Dossier** (HTML-to-Print) | ✅ Present | WS4 pdf-dossier |
| **BOQ Export** (CSV + HTML dossier with plans/sections) | ✅ Present | WS6 `src/lib/export/boq-export.ts` |
| **IFC Import/Export** (real IFC4 STEP) | ✅ Present | WS3 |
| **IFC-like & COBie JSON Export** | ✅ Present | WS2/WS3 |
| **3D BIM Viewer** (React Three Fiber) | ✅ Present | WS3 (lazy-loadable, now wired via Sprint 2 2D/3D toggle) |
| **3D BIM Viewer in Dashboard** (2D/3D toggle) | ✅ Present | Sprint 2 — `LazyBimViewer` + `designToBim.ts` adapter wired in Dashboard |
| **BIM Legend & Inspector** | ✅ Present | WS3 |
| **BIM Generator** (CAD→BIM) | ✅ Present | WS3 |
| **BOQ Generator** (BIM→BOQ) | ✅ Present, wired | WS3 — wired into Dashboard via Sprint 4 designToBoq adapter |
| **BOQ Dashboard Panel** (sidebar BOQ display, CSV/HTML export, print PDF) | ✅ Present, wired | Sprint 4 — `BoqExportPanel.tsx` + `designToBoq.ts` |
| **CSV Export** (from BOQ panel) | ✅ Present, wired | Sprint 4 — `buildExportCsv()` + `downloadTextFile()` |
| **HTML Dossier Export** (self-contained, with print-to-PDF) | ✅ Present, wired | Sprint 4 — `buildExportHtml()` + `downloadTextFile()` |
| **Governance Workflow** | ✅ Present | WS3 types + lib — wired via Sprint 16 GovernancePanel |
| **Governance Approval Workflow** | ✅ Present | Sprint 25 — local-first submit/approve/request-changes with comments, timeline, role selector, transaction logging |
| **RBAC** (role-based access control) | ✅ Present | WS3 types + lib — displayed in GovernancePanel |
| **Project Snapshots** (versioning) | ✅ Present | WS3 types + lib — wired via Sprint 17 SnapshotHistoryPanel panel (save, list, compare) |
| **Snapshot Diff** | ✅ Present | WS3 lib — lightweight cost/quantity diff via Sprint 17 comparison |
| **BOQ Analysis & Comparison** | ✅ Present | WS3 lib |
| **Zone Costing & Traceability** | ✅ Present | WS3 lib |
| **Room Zone Reconstruction** | ✅ Present | WS3 lib |
| **Cross-Project Analytics** | ✅ Present | WS3 lib |
| **Portfolio Analytics** | ✅ Present | WS3 + WS4 lib |
| **Executive Portfolio** (project aggregation) | ✅ Present | WS4 |
| **Export Package** (ZIP, CSV, HTML, manifest) | ✅ Present | WS3 lib |
| **Standards Manifest** (IFC/COBie/BOQ) | ✅ Present | WS3 lib |
| **Rate Cards / Cost Database** (regional, editable, wired) | ✅ Present | WS6 `src/lib/rates/rate-card.ts` — Zimbabwe, SA, Kenya, Global |
| **Load Combination Factors** (SLS/ULS, wired) | ✅ Present | WS6 `src/lib/structural/load-engine.ts` |
| **Footing Sizing** (from soil bearing + load, wired) | ✅ Present | WS6 `src/lib/structural/footing-sizer.ts` |
| **Rebar Specification** (parametric bar mass, wired) | ✅ Present | WS6 `src/lib/structural/rebar-spec.ts` |
| **Design Fingerprint** (djb2 content hash) | ✅ Present | WS6 `src/lib/versioning/fingerprint.ts` |
| **Design Metrics & Change Summary** | ✅ Present | WS6 `src/lib/versioning/design-metrics.ts` |
| **Currency Symbols** (USD, ZAR, KES, etc.) | ✅ Present | WS6 `src/lib/utils/currency.ts` |
| **Charts** (cost breakdown) | ✅ Present | Recharts |
| **Transaction History** (audit log) | ✅ Present | WS1 |
| **Governance Dashboard Panel** (status, checklist, RBAC, audit) | ✅ Present | Sprint 16 — GovernancePanel in Dashboard right sidebar |
| **Snapshot History Panel** (save, list, compare, cost/quantity deltas) | ✅ Present | Sprint 17 — SnapshotHistoryPanel in Dashboard right sidebar |
| **Exports** (CSV, HTML, ZIP, SVG, DXF) | ✅ Present | WS1/WS2/WS3/WS6 |
| **Section/Elevation Views** (interactive SVG) | ✅ Present | WS6 SectionView wired into Engineering Studio |
| **Drawing Register Panel** | 🔄 Staged | WS6 drawing-register lib — not wired into dashboard |
| **Structural Column Generator** | 🔄 Staged | WS5 structural-generator — not wired |
| **Structural Beam Generator** | 🔄 Staged | WS5 structural-generator — not wired |
| **Foundation Footing Generator** | 🔄 Staged | WS5 structural-generator — not wired |
| **Rebar Calculator** (slab tonnage, WS5) | 🔄 Staged | WS5 rebar-calculator — not wired |
| **Material Switch** (concrete/steel/timber) | 🔄 Staged | WS5 material-rates — not wired |
| **Clash Auto-Healing** | 🔄 Staged | WS5 clash-healer — not wired |
| **Command Palette** | ✅ Present | WS1 |
| **Keyboard Shortcuts** | ✅ Present | WS1 |
| **Theme Toggle** (dark/light/system) | ✅ Present | WS1 |
| **Offline Indicator** | ✅ Present | WS1 |
| **AI Chat Panel** | ✅ Present | WS1 |
| **PWA** (service worker, manifest) | ✅ Present | WS1 |
| **Project CRUD** | ✅ Present | WS1 |
| **Pipeline UI** (6-stage workflow) | ✅ Present | WS1 |
| **Project Wizard** (3-step) | ✅ Present | WS1 |
| **Lazy Loading / Code Splitting** | ✅ Present | WS1/WS3 |
| **Generated Rooms/zones** (room layout per building type) | ✅ Present | Sprint 7 — designGeometryAdapter |
| **Generated Doors** (internal + entrance) | ✅ Present | Sprint 7 — designGeometryAdapter → BIM openings |
| **Generated Windows** (on external walls) | ✅ Present | Sprint 7 — designGeometryAdapter → BIM openings + solar analysis |
| **Internal Partition Walls** | ✅ Present | Sprint 7 — designGeometryAdapter → BIM walls |
| **BOQ: Doors, Windows, Finishes, Services line items** | ✅ Present | Sprint 7 — designToBoq extra items |
| **Regional BOQ Pricing** (Zimbabwe/South Africa/Kenya/Global) | ✅ Present | Sprint 8 — rateCardAdapter + region selector in BoqExportPanel |
| **BOQ Rate Assumptions** (source tracking, fallback warnings) | ✅ Present | Sprint 8 — rateCardAdapter assumptions + BoqExportPanel display |
| **BOQ CSV/HTML: region, currency, rate source in export** | ✅ Present | Sprint 8 — updated buildExportCsv/buildExportHtml |
| **Automated Tests** (vitest, 58 tests, 7 files) | ✅ Present | Sprint 9 — all core adapters/engines tested, CI pipeline |
| **CI Pipeline** (GitHub Actions: typecheck → lint → test → build) | ✅ Present | Sprint 9 — `.github/workflows/ci.yml` |
| **Deployment Docs** (DEPLOYMENT_GUIDE.md) | ✅ Present | Sprint 10 — Vercel, Netlify, static hosting, PWA notes |
| **Release Checklist** (RELEASE_CHECKLIST.md) | ✅ Present | Sprint 10 — pre-release + smoke test checklist |
| **SPA Router Fallback** (vercel.json, _redirects) | ✅ Present | Sprint 10 — BrowserRouter fallback for Vercel/Netlify |
| **PWA Assets** (icon-192, icon-512, favicon, manifest) | ✅ Present | Sprint 10 — verified all present |
| **SEO Meta Tags** (OG, Twitter, canonical) | ✅ Present | Sprint 12 — added OG/twitter/canonical to index.html |
| **Accessibility** (ARIA roles, labels, form associations) | ✅ Present | Sprint 12 — tab ARIA, form labels, expanded states |
| **Performance Audit** (bundle size, lazy loading) | ✅ Present | Sprint 12 — documented chunks, lazy BIM, excluded WebLLM |
| **Public Demo Audit** (live smoke test, polish) | ✅ Present | Sprint 12 — full audit report |

---

## Summary Counts

| Status | Count |
|---|---|
| ✅ Present (WS1 base) | 14 |
| ✅ Present (Phase A WS2 CAD merged) | 16 |
| ✅ Present (Phase B WS3 BIM merged) | ~20 |
| ✅ Present (Phase C WS4 Advanced Engineering merged) | ~7 (clash, solar, MEP now wired) |
| 🔄 Staged (Phase D WS5 Structural algorithms) | 5 algorithm modules |
| ✅ Present (Sprint 5 — Engineering analysis panels wired) | 1 adapter + 1 panel + 1 Dashboard integration |
| ✅ Present (Phase E WS6 AI/Drawing/Rates/Structural lib) | ~15 new modules |
| ✅ Present (Sprint 1 — WS6 panels wired) | 6 panel components |
| ✅ Present (Sprint 2 — BIM viewer in Dashboard) | 1 adapter + 1 toggle UI |
| ✅ Present (Sprint 3 — AI brief-to-design flow) | 1 adapter + 3 files modified |
| ✅ Present (Sprint 4 — BOQ dashboard workflow + CSV/HTML export) | 1 adapter + 1 panel + 1 fix + 4 doc files |
| ✅ Present (Sprint 5 — Engineering analysis panels wired) | 1 adapter + 1 panel + 1 Dashboard integration |
| ✅ Present (Sprint 6 — IndexedDB persistence) | 1 service + 2 files modified + 1 sprint report |
| ✅ Present (Sprint 7 — Generated rooms, doors, windows, zones) | 1 adapter + 3 files modified + 1 sprint report |
| ✅ Present (Sprint 8 — Regional rate card BOQ pricing) | 1 adapter + 2 files modified + 1 sprint report |
| ✅ Present (Sprint 9 — Automated tests + CI) | 7 test files + 1 CI workflow + 1 sprint report |
| ✅ Present (Sprint 10 — Deployment polish + release prep) | 4 docs + 1 vercel.json + 1 _redirects + README updates |
| ✅ Present (Sprint 11 — Live deployment smoke test) | 1 report + README URL update |
| ✅ Present (Sprint 12 — Public demo audit + polish) | SEO tags + a11y fixes + mobile polish + audit report |
| ✅ Present (Sprint 13 — Geometry-derived BOQ quantities) | 1 adapter + 1 test file + 2 files modified + 1 report |
| ✅ Present (Sprint 14 — Builder journey guide) | 1 panel + 2 pages modified + 1 report |
| ✅ Present (Sprint 15 — Mobile polish) | 6 files modified + 1 report |
| ✅ Present (Sprint 16 — Governance & audit panel) | 1 adapter + 1 panel + 1 Dashboard integration + 1 test file + 1 report |
| ✅ Present (Sprint 17 — Snapshot history & comparison) | 1 service + 1 panel + 1 Dashboard integration + 1 test file + 1 report |
| ✅ Present (Sprint 18 — Portfolio dashboard) | 1 page + 2 files modified + 1 report |
| ✅ Present (Sprint 19 — Portfolio filters, search, sort, archive/restore) | 2 services + 1 adapter + 2 test files + 2 reports + 7 files modified |
| ✅ Present (Sprint 21 — Feedback and issue reporting workflow) | 1 utility + 1 component + 1 page + 1 test file + 1 report + 4 files modified |
| ✅ Present (Sprint 22 — Mobile UX deep polish) | Hero text sizes, mobile messages, always-visible archive/restore on touch, larger tap targets, 4 files modified + 1 report |
| ✅ Present (Sprint 23 — Better CAD room layout algorithm) | Strategy-based layout per building type, circulation corridors, wet-core grouping, multi-floor differentiation, improved opening placement, 18 new tests, 2 files changed |
| ✅ Present (Sprint 25 — Governance approval actions and comments) | Local-first approval workflow: submit for review, approve, request changes, add comments, timeline, role selector, transaction logging, 15 new tests, 1 new service, 1 test file, 1 report |
| ✅ Present (Sprint 26 — CAD persistence and sync tests) | 33 tests for cadPersistenceService (CRUD) and cadToDesignSyncAdapter (fallback adapters), 3 new files, 1 report |
| ✅ Present (Sprint 27 — PlanModel→CadDocument roundtrip) | PlanModel→CadDocument converter + fallback in sync adapter + 22 new tests (13 converter + 9 sync), 2 new files, 1 report |
| ✅ Present (Sprint 28 — Export source metadata & CAD-edited BOQ sync) | Source metadata in BOQ/CSV/HTML exports, CAD-edited BOQ labels, cadQuantitiesAdapter, 21 new tests (10 cadQty + 8 designToBoq + 3 sync), 3 new files, 1 report |
| ✅ Present (Sprint 29 — Manual CAD save/restore UI) | CadSyncControls dropdown (save/restore/reset), loadPlanModelMeta service, status message auto-dismiss, toolbar integration, 3 new tests, 2 new files, 1 report |
| ✅ Present (Sprints 56–63 — Professional Drawings v0.4.0) | 11 drawing types (Elevations, Section, Site, Foundation, Roof, RCP, Electrical, Plumbing, HVAC) + A1 presentation sheet + PDF/PNG export, coloured material/discipline system, MEP placement heuristics, rich Section A‑A, presentation sheet export, 96 new tests across 4 test files, 25 new files, v0.4.0 tag |
| ✅ Present (Sprints 67–70 — Interactive 2D CAD Editor v0.5.0) | Room add/delete/move/resize, door/window add/move/delete, snap-to-grid, keyboard nudge, live dimension readout, undo/redo timeline, IndexedDB persistence, 63 new tests (766 total across 43 files), 7 new files, v0.5.0 tag |
| ✅ Present (Sprints 72–74 — Interior Inspection v0.6.0) | Dollhouse/cutaway 3D view (Full/Dollhouse/No Roof toggles + storey selector), click-a-room camera fly-in with smooth animation and Back button, first-person walkthrough (WASD + pointer-lock mouse-look, footprint clamp, eye height, auto no-roof, Exit/Esc), 41 new tests (807 total across 46 files), 6 new files, v0.6.0 tag |
| ✅ Present (Sprints 76–77 — Parametric Canopy Roof v0.7.0) | Opt-in canopy roof type (alongside gable), Voronoi-cell surface (Bowyer–Watson Delaunay), ETFE panels, spine ribs + structural framing, Section A-A drawing integration, geometry disposal/debounce, 30 new tests (847 total across 47 files), 3 new files, v0.7.0 tag |
| ✅ Present (Sprints 79–80 — SADC Building-Code Compliance v0.8.0) | 4 jurisdictions: Zimbabwe (ZBC), South Africa (SANS 10400, 10 rules), Zambia (CAP 295, 9 rules), Botswana (Building Control, 9 rules); jurisdiction picker in Analysis + BOQ panels; 17 new tests (864 total across 47 files), 3 new files, v0.8.0 tag |
| ✅ Present (Sprint 81 — Onboarding tour) | 6-step interactive overlay, first-visit only, re-openable, accessible, 6 tests (894 total) |
| ✅ Present (Sprint 82 — 6-Stage navigation rail) | Left rail with Brief→Concept→Design→Engineering→Docs&BIM→Cost&Deliver, status indicators, empty-state CTAs, 18 tests (894 total, 49 files) |
| ✅ Present (Sprint 83 — Unified sidebar dashboard) | Combined stage rail + project tools sidebar, responsive collapse |
| ✅ Present (Sprint 84 — DXF import) | LINE + LWPOLYLINE parser, mm auto-detect, editable PlanModel, 7 tests (922 total, 51 files) |
| ✅ Present (Sprint 85 — Multi-format import + backdrop) | Unified Import, image backdrop + scale calibration, importRouter, 13 tests (922 total, 51 files) |
| ✅ Present (Sprint 86 — Backdrop canvas fix) | Canvas renders without selectedDesign when backdrop exists, 932 total tests |
| ✅ Present (Sprint 87 — Offline wall detection) | Detect-then-correct, lazy-loaded OpenCV.js/WASM, 17 tests (949 total, 52 files) |
| ✅ Present (Sprint 93 — Lighthouse audit + a11y/SEO/PWA hardening) | A11y 100, BP 100, SEO 100, manifest fields, skip-to-content, dialog roles, landmarks, 2 new tests (978 total, 53 files) |
