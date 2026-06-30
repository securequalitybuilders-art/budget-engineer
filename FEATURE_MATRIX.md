# Feature Matrix — Budget Engineer OS Canonical

> **Date:** 2026-06-30  
> **Base:** WS1 (`workspace-chart 1`)  
> **Legend:** ✅ Present | ❌ Missing | 🔄 To Merge

---

| Feature | WS1 (Canonical) | Source to Merge |
|---|---|---|
| **AI Brief Parser** (deterministic) | ✅ Present | — |
| **AI Brief Parser** (WebLLM/local LLM) | ❌ Missing | 🔄 WS6 |
| **2D CAD Editor** (interactive plan canvas) | ❌ Missing (placeholder) | 🔄 WS2 |
| **Parametric Floor Plan Generator** | ❌ Missing | 🔄 WS2/WS6 |
| **Wall Editing** (draw/move/delete walls) | ❌ Missing | 🔄 WS2 |
| **Opening Editing** (doors/windows) | ❌ Missing | 🔄 WS2 |
| **Layer Management** | ❌ Missing | 🔄 WS2 |
| **Block Library** (furniture fixtures) | ❌ Missing | 🔄 WS2 |
| **Dimension Annotations** | ❌ Missing | 🔄 WS2 |
| **CAD Topology** (split/join/heal walls) | ❌ Missing | 🔄 WS2/WS4 |
| **Undo/Redo** | ❌ Missing | 🔄 WS2 |
| **Multi-Floor Support** | ❌ Missing | 🔄 WS2/WS6 |
| **DXF Export** | ❌ Missing | 🔄 WS2 |
| **MakerJS Export** | ❌ Missing | 🔄 WS2 |
| **SVG Plan Export** | ❌ Missing | 🔄 WS2/WS6 |
| **3D BIM Viewer** | ❌ Missing | 🔄 WS3 |
| **BIM Generator** (CAD→BIM) | ❌ Missing | 🔄 WS3 |
| **IFC Import** | ❌ Missing | 🔄 WS3/WS4 |
| **IFC Export** | ❌ Missing | 🔄 WS3/WS4 |
| **BOQ Engine** (rate-based costing) | ✅ Present | WS1 has basic version; 🔄 WS3/WS6 for enhancement |
| **Rate Cards / Cost Database** | ✅ Present (Zimbabwe only, non-editable) | 🔄 WS6 (4 regions, editable) |
| **Charts** (cost breakdown) | ✅ Present (Recharts) | 🔄 WS3 (BOQ comparison charts) |
| **Transaction History** (audit log) | ✅ Present | 🔄 WS3 (enhanced audit types) |
| **Exports** (CSV, HTML, PDF) | ❌ Missing | 🔄 WS3/WS4/WS6 |
| **Governance Workflow** | ❌ Missing | 🔄 WS3 |
| **RBAC** (role-based access control) | ❌ Missing | 🔄 WS3 |
| **Project Snapshots** (versioning) | ❌ Missing | 🔄 WS3 |
| **Portfolio Analytics** (cross-project) | ❌ Missing | 🔄 WS3/WS4 |
| **Zone Cost Traceability** | ❌ Missing | 🔄 WS3 |
| **Local LLM** (WebLLM integration) | ❌ Missing | 🔄 WS6 |
| **Section/Elevation Views** | ❌ Missing | 🔄 WS6 |
| **Drawing Register / Title Blocks** | ❌ Missing | 🔄 WS6 |
| **Revision History / Fingerprint** | ❌ Missing | 🔄 WS6 |
| **Structural Engineering** (columns, beams, footings) | ❌ Missing | 🔄 WS5/WS6 |
| **Load Path Analysis** | ❌ Missing | 🔄 WS5/WS6 |
| **Rebar Specification / Takeoff** | ❌ Missing | 🔄 WS5/WS6 |
| **Footing Sizing** | ❌ Missing | 🔄 WS6 |
| **Clash Detection** | ❌ Missing | 🔄 WS4 |
| **Solar Orientation Analysis** | ❌ Missing | 🔄 WS4 |
| **MEP Takeoff** | ❌ Missing | 🔄 WS4 |
| **PDF Executive Dossier** | ❌ Missing | 🔄 WS4 |
| **Command Palette** | ✅ Present | — |
| **Keyboard Shortcuts** | ✅ Present | — |
| **Theme Toggle** (dark/light/system) | ✅ Present | — |
| **Offline Indicator** | ✅ Present | — |
| **AI Chat Panel** | ✅ Present | — |
| **PWA** (service worker, manifest) | ✅ Present | — |
| **Project CRUD** | ✅ Present | — |
| **Pipeline UI** (6-stage workflow) | ✅ Present | — |
| **Project Wizard** (3-step) | ✅ Present | — |
| **Lazy Loading / Code Splitting** | ✅ Present | — |

---

## Summary Counts

| Status | Count |
|---|---|
| ✅ Present in WS1 | 14 |
| ❌ Missing from WS1 | 39 |
| 🔄 To Merge from WS2 | 12 |
| 🔄 To Merge from WS3 | 12 |
| 🔄 To Merge from WS4 | 5 |
| 🔄 To Merge from WS5 | 3 |
| 🔄 To Merge from WS6 | 13 |

*Note: Some features may be sourced from multiple workspaces (counted only once in "Missing").*
