# Feature Matrix — Budget Engineer OS Canonical

> **Date:** 2026-06-30  
> **Base:** WS1 (`workspace-chart 1`)  
> **Legend:** ✅ Present | ❌ Missing | 🔄 Staged (not wired)
> **Phase E (WS6 AI + Drawing Management) merged.**  
> **Sprint 1:** 6 staged WS6 panels wired into Engineering Studio dashboard section.  
> **Sprint 1.1:** Stabilized Engineering Studio — WebLLM button disabled, NaN guards, smoke report created.

---

| Feature | Status | Notes |
|---|---|---|
| **AI Brief Parser** (deterministic, canonical) | ✅ Present | WS1 `src/ai/briefParser.ts` |
| **AI Brief Parser** (deterministic, WS6 variant) | ✅ Present | WS6 `src/lib/ai/brief-parser.ts` (compatible with WS6 AI pipeline) |
| **AI Design Engine** (canonical, Design[] output) | ✅ Present | WS1 `src/ai/designEngine.ts` |
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
| **Clash Detection** (3 BIM rules) | ✅ Present | WS4 clash-checker |
| **Solar Orientation Analysis** (cardinal heat gain) | ✅ Present | WS4 solar-analyzer |
| **MEP Takeoff** (points per zone) | ✅ Present | WS4 mep-takeoff |
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
| **3D BIM Viewer** (React Three Fiber) | ✅ Present | WS3 (lazy-loadable) |
| **BIM Legend & Inspector** | ✅ Present | WS3 |
| **BIM Generator** (CAD→BIM) | ✅ Present | WS3 |
| **BOQ Generator** (BIM→BOQ) | ✅ Present | WS3 |
| **Governance Workflow** | ✅ Present | WS3 types + lib (panels deferred) |
| **RBAC** (role-based access control) | ✅ Present | WS3 types + lib (panels deferred) |
| **Project Snapshots** (versioning) | ✅ Present | WS3 types + lib (panels deferred) |
| **Snapshot Diff** | ✅ Present | WS3 lib |
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

---

## Summary Counts

| Status | Count |
|---|---|
| ✅ Present (WS1 base) | 14 |
| ✅ Present (Phase A WS2 CAD merged) | 16 |
| ✅ Present (Phase B WS3 BIM merged) | ~20 |
| ✅ Present (Phase C WS4 Advanced Engineering merged) | ~7 |
| 🔄 Staged (Phase D WS5 Structural algorithms) | 5 algorithm modules |
| ✅ Present (Phase E WS6 AI/Drawing/Rates/Structural lib) | ~15 new modules |
| ✅ Present (Sprint 1 — WS6 panels wired) | 6 panel components |
