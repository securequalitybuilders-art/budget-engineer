# Feature Matrix — Budget Engineer OS Canonical

> **Date:** 2026-06-30  
> **Base:** WS1 (`workspace-chart 1`)  
> **Legend:** ✅ Present | ❌ Missing | 🔄 Planned
> **Phase A (WS2 CAD) and Phase B (WS3 BIM) merged.**

---

| Feature | Status | Notes |
|---|---|---|
| **AI Brief Parser** (deterministic) | ✅ Present | WS1 |
| **AI Brief Parser** (WebLLM/local LLM) | ❌ Missing | 🔄 WS6 |
| **2D CAD Editor** (interactive plan canvas) | ✅ Present | WS2 |
| **Parametric Floor Plan Generator** | ✅ Present | WS2 |
| **Wall Editing** (draw/move/delete walls) | ✅ Present | WS2 |
| **Opening Editing** (doors/windows) | ✅ Present | WS2 |
| **Layer Management** | ✅ Present | WS2 |
| **Block Library** (furniture fixtures) | ✅ Present | WS2 |
| **Dimension Annotations** | ✅ Present | WS2 |
| **CAD Topology** (split/join/heal walls) | ✅ Present | WS2 + WS4 cad-solver (wall corner solver) |
| **Undo/Redo** | ✅ Present | WS2 |
| **Multi-Floor Support** | ✅ Present | WS2 |
| **Wall Corner Solver** (intersection trim) | ✅ Present | WS4 cad-solver |
| **Clash Detection** (3 BIM rules) | ✅ Present | WS4 clash-checker |
| **Solar Orientation Analysis** (cardinal heat gain) | ✅ Present | WS4 solar-analyzer |
| **MEP Takeoff** (points per zone) | ✅ Present | WS4 mep-takeoff |
| **DXF Export** | ✅ Present | WS2 |
| **MakerJS Export** | ✅ Present | WS2 |
| **SVG Plan Export** | ✅ Present | WS2 |
| **PDF Executive Dossier** (HTML-to-Print) | ✅ Present | WS4 pdf-dossier |
| **IFC Import/Export** (real IFC4 STEP) | ✅ Present | WS3 |
| **IFC-like & COBie JSON Export** | ✅ Present | WS2/WS3 |
| **3D BIM Viewer** (React Three Fiber) | ✅ Present | WS3 (lazy-loadable) |
| **BIM Legend & Inspector** | ✅ Present | WS3 |
| **BIM Generator** (CAD→BIM) | ✅ Present | WS3 (adapted for WS2 CadDocument) |
| **BOQ Generator** (BIM→BOQ) | ✅ Present | WS3 |
| **Governance Workflow** | ✅ Present | WS3 types + lib (panels deferred) |
| **RBAC** (role-based access control) | ✅ Present | WS3 types + lib (panels deferred) |
| **Project Snapshots** (versioning) | ✅ Present | WS3 types + lib (panels deferred) |
| **Snapshot Diff** | ✅ Present | WS3 lib |
| **BOQ Analysis & Comparison** | ✅ Present | WS3 lib (compare, share, category totals) |
| **Zone Costing & Traceability** | ✅ Present | WS3 lib (cost, trace, grouping) |
| **Room Zone Reconstruction** | ✅ Present | WS3 lib |
| **Cross-Project Analytics** | ✅ Present | WS3 lib (portfolio, cross-project metrics) |
| **Portfolio Analytics** | ✅ Present | WS3 + WS4 lib (executive-portfolio) |
| **Executive Portfolio** (project aggregation) | ✅ Present | WS4 executive-portfolio |
| **Export Package** (ZIP, CSV, HTML, manifest) | ✅ Present | WS3 lib (fflate-based ZIP) |
| **Standards Manifest** (IFC/COBie/BOQ) | ✅ Present | WS3 lib |
| **BOQ Engine** (rate-based costing) | ✅ Present | WS1 |
| **Rate Cards / Cost Database** | ✅ Present | Zimbabwe only, non-editable |
| **Charts** (cost breakdown) | ✅ Present | Recharts |
| **Transaction History** (audit log) | ✅ Present | WS1 |
| **Exports** (CSV, HTML, ZIP) | ✅ Present | WS3 |
| **Section/Elevation Views** | ❌ Missing | 🔄 WS6 |
| **Drawing Register / Title Blocks** | ❌ Missing | 🔄 WS6 |
| **Structural Column Generator** (auto-place at wall nodes) | 🔄 Staged | WS5 structural-generator — not wired to store/UI |
| **Structural Beam Generator** (link beams between columns) | 🔄 Staged | WS5 structural-generator — not wired to store/UI |
| **Foundation Footing Generator** (pad footings under columns) | 🔄 Staged | WS5 structural-generator — not wired to store/UI |
| **Rebar Specification & Takeoff** (slab tonnage calc) | 🔄 Staged | WS5 rebar-calculator — not wired to store/UI |
| **Material Switch** (concrete/steel/timber rates + IFC map) | 🔄 Staged | WS5 material-rates — not wired to store/UI |
| **Clash Auto-Healing** (move openings, shift overlapping blocks) | 🔄 Staged | WS5 clash-healer — not wired to store/UI |
| **Load Path Analysis** | ❌ Missing | 🔄 WS6 |
| **Footing Sizing** (from soil bearing + load) | ❌ Missing | 🔄 WS6 |
| **Section/Elevation Views** | ❌ Missing | 🔄 WS6 |
| **Drawing Register / Title Blocks** | ❌ Missing | 🔄 WS6 |
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
| ✅ Present (Phase C WS4 Advanced Engineering merged) | ~7 new features |
| 🔄 Staged (Phase D WS5 Structural algorithms — unwired) | 5 new algorithm modules |
| ❌ Missing (WS6) | ~6 |
