# v0.2.0 — Full 3D BIM Pipeline and GLB Export

**Date:** 2026-07-02  
**Tag:** `v0.2.0`  
**Live demo:** https://budget-engineer.vercel.app/  
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Summary

v0.2.0 is a cumulative release covering Sprints 33–38A. It delivers the **complete 3D BIM pipeline**: thick walls with real-world thickness, floor slabs, multi-storey stacking, PBR materials, doors and windows as real pierced openings, and a pitched gable roof — all topped with a **client-side GLB export** button that downloads the full 3D model for use in Blender, Windows 3D Viewer, and other glTF-compatible tools.

On the 2D side, the floor plan now shows readable room labels with area, building dimensions, and a metre caption. The BOQ view has been upgraded with trade-grouped subtotals and a grand total. The design option selector is now a prominent card UI at the top of the canvas area.

All validated with **306 automated tests** across 24 files. No new dependencies, no paid APIs, no backend, no cloud.

---

## What Changed Since v0.1.1

### 3D BIM Shell — Walls, Slabs, Multi-Storey, Materials (Sprint 36 + 36A)
- New pure adapter `planTo3d.ts` converts PlanModel to 3D wall piers + floor slabs per storey (no three.js imports, fully testable)
- `BimModel3D.tsx` component using @react-three/fiber Canvas: walls with real thickness (`BoxGeometry` along segments), floor slabs, multi-storey stacking from `DesignOption.floors`
- PBR `MeshStandardMaterial` per element type (external walls `#94a3b8`, internal `#cbd5e1`, slabs `#475569`, BIM Violet `#8B5CF6` accent edges)
- Ambient + directional light with 2048² shadow map, hemisphere light, ground plane, grid helper
- `OrbitControls` with damping, dynamic camera framing
- Lazy-loaded via `React.lazy` + Suspense — preserves the Sprint 31A NO_FCP fix (no regressions)
- 3D view always reachable: toggle buttons show visible "2D"/"3D" labels, model generates immediately from a normally generated design (no CAD edits required)
- Constants: `DEFAULT_STOREY_HEIGHT=3`, `FALLBACK_WALL_THICKNESS=0.23`, `SLAB_THICKNESS=0.15`
- 11 tests

### Doors & Windows (Sprint 37)
- Walls split into pier segments around door/window openings (split-box approach — no CSG library needed)
- Door mesh: Warm Sand leaf (`#d4a574`) + frame jambs and header
- Window mesh: semi-transparent AI Cyan glass (`#06b6d4`, opacity 0.35) + frame sill/jambs/header at sillHeight
- Openings repeat per storey with correct y-offset stacking
- Opening defaults by kind: door 2.1 m sill 0, window 1.5 m sill 0.9 m
- 8 new tests

### Pitched Gable Roof (Sprint 38)
- Gable roof on the topmost storey: ridge along the longer axis, 1.5 m pitch height, 0.3 m overhang, terracotta material (`#a0522d`)
- Roof geometry computed in pure adapter (`RoofParams`), mesh built as custom `BufferGeometry` (8 vertices, 6 triangles)
- No CSG, no new dependencies
- 9 new tests

### GLB 3D Model Export (Sprint 38)
- "Download 3D model (.glb)" button below the 3D Canvas
- Dynamically imports `GLTFExporter` (35 kB, loaded on click) from `three/examples/jsm/exporters/GLTFExporter`
- Serializes the entire building group to binary glTF and triggers a browser download
- Client-side only, offline, free — opens in Blender, Windows 3D Viewer, three.js editor, etc.

### Readable 2D Floor Plan (Sprint 34)
- Room labels with name and area (m²) centered inside each room
- Overall building width/height dimensions with dashed lines and tick marks
- "Dimensions in metres" caption below the scale label

### Grouped BOQ Cost View (Sprint 35)
- BOQ items grouped by trade category with per-group subtotals
- Prominent grand total in emerald-500 branded container
- Collapsible geometry source badge with metadata
- All currency formatting unified to `makeMoney()` helper

### Prominent Design Option Selector (Sprint 33)
- Full-width branded card section at the top of the canvas area
- Clickable cards with name, area, floor count, element count
- "Select this design" / "Selected" badge
- Confirmation bar with "View 2D floor plan →" CTA
- Regenerate options button
- Responsive grid

### Design Option Gating & Stage Progression
- Design stage locked until a design option is selected (dotted line-through + tooltip)
- Auto-scroll to design options after generation
- `selectedDesignId` moved to central `uiStore`

### Lighthouse NO_FCP Fix
- Loading state shows "Loading project…" text instead of a CSS-only spinner
- Non-existent project IDs show "Project not found" fallback with create-project link

### Lint Hygiene (Sprint 38A)
- Restored lint baseline to 9 warnings (0 errors)

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (9 pre-existing warnings) |
| `npm test` | 306 passed, 24 files |
| `npm run build` | Success (3392 modules, 21 precache entries) |
| 3D code-split chunk | Separate lazy chunk (+2.71 kB from v0.1.1) |
| GLTFExporter chunk | Separate dynamic chunk (35.30 kB, loaded on click) |
| New dependencies | None |

---

## How to View the 3D Model and Export .glb

1. **Generate design options** — enter a building brief in the AI Brief panel (right sidebar), click "Generate"
2. **Select a design option** — click one of the design cards in the "Choose your design" section
3. **View in 3D** — click the **3D** toggle button in the toolbar (top-left of the canvas area)
4. **Navigate** — orbit, pan, and zoom with mouse/touch (OrbitControls with damping)
5. **Export** — click **"Download 3D model (.glb)"** below the 3D view. Open the `.glb` file in Blender, Windows 3D Viewer, Babylon.js sandbox, or any glTF-compatible tool.

> The 3D model includes walls, floor slabs, doors, windows, and a pitched gable roof — all faithfully reproduced at real-world dimensions and positions matching the 2D floor plan.

---

## Known Limitations

- Cost rates are approximate and vary by region — not suitable for procurement or final budgeting
- No professional structural engineer sign-off — designs are for concept/feasibility only
- Generated CAD is deterministic and early-stage — manual editing recommended for real projects
- Same room template per floor (no ground/upper variation)
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)

---

## Roadmap

- **v0.2.1** — Snapshot source metadata storage, full CAD-derived BOQ quantities
- **v0.3.0** — Multi-user project sharing, cloud sync architecture research
- **v0.3.0** — Structural engine integration (load analysis, footing sizing)
- **v0.3.0** — Drawing register + section views in export
- **v0.3.0** — IFC import/export improvements
