# Sprint 36 — BIM Shell: Walls, Slabs, Multi-Storey, Materials, Lighting

## Problem

The existing 3D BIM view (`BimViewer.tsx`) renders a BimModel derived from
DesignOption via `designOptionToBimModel()`. While functional, it used flat
colours (`#6366f1` walls, `#22c55e` slabs) without PBR materials, real shadows,
or a clear legend. More importantly, it was NOT derived from the same PlanModel
data that drives the 2D plan — so 2D and 3D could diverge after CAD edits.

## What Changed

### New pure adapter: `src/adapters/planTo3d.ts`

Converts `PlanModel` + `numberOfStoreys` + `storeyHeight` into a pure data
structure (`PlanTo3dResult`) with arrays of wall solids and floor slabs.
Contains **zero three.js imports** — fully unit-testable.

**Constants defined:**

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| `DEFAULT_STOREY_HEIGHT` | `3` | `planTo3d.ts:8` | Matches `FLOOR_HEIGHT = 3` in `designGeometryAdapter.ts:71` and `designToBim.ts:6` |
| `FALLBACK_WALL_THICKNESS` | `0.23` | `planTo3d.ts:11` | Matches `WALL_THICKNESS = 0.23` in `designGeometryAdapter.ts:72` |
| `SLAB_THICKNESS` | `0.15` | `planTo3d.ts:14` | Slab thickness (matches `designToBim.ts:41`) |

**Storey count** comes from `DesignOption.floors` (e.g. `design.floors`).

**PlanModel fields used for geometry:**

| Field | Type | Purpose |
|-------|------|---------|
| `PlanModel.width` | `number` | Overall building width (3D x-axis) |
| `PlanModel.height` | `number` | Overall building depth (3D z-axis) |
| `PlanModel.wallThickness` | `number` | Wall thickness default |
| `PlanModel.walls[].id` | `string` | Wall identifier |
| `PlanModel.walls[].start.x` | `number` | Wall start x (3D x) |
| `PlanModel.walls[].start.y` | `number` | Wall start y → 3D z |
| `PlanModel.walls[].end.x` | `number` | Wall end x |
| `PlanModel.walls[].end.y` | `number` | Wall end y → 3D z |
| `PlanModel.walls[].thickness` | `number` | Per-wall thickness |
| `PlanModel.walls[].type` | `'external'\|'internal'` | Wall role |

**Wall direction mapping:** PlanModel 2D `(x, y)` → 3D `(x, z)`. Storey height
is the `y`-axis in 3D.

### New component: `src/components/bim/BimModel3D.tsx`

A self-contained `@react-three/fiber` Canvas component that:
- **Walls with real thickness:** `BoxGeometry` along wall segments, height =
  `storeyHeight`, thickness = wall's `thickness` field
- **Floor slabs:** One `BoxGeometry` per storey, positioned at
  `y = storeyIndex * storeyHeight`
- **Multi-storey stacking:** Reads `design.floors`, generates N stacked copies
  of walls and slabs
- **PBR materials:**
  - External walls: `#94a3b8` (Slate 400), roughness 0.7, metalness 0.05
  - Internal walls: `#cbd5e1` (Slate 300), roughness 0.8
  - Slabs: `#475569` (Slate 600), roughness 0.9
  - Violet `#8B5CF6` accent edges via `AccentEdges` component (BIM Violet)
- **Lighting + shadows:**
  - `ambientLight` intensity 0.5
  - `directionalLight` position `[15, 20, 10]`, intensity 1.2, castShadow
  - Shadow map: 2048×2048
  - `hemisphereLight` from `#94a3b8` to `#1e293b`, intensity 0.4
- **Ground + grid:**
  - Ground plane (`#1e293b`) receiving shadows
  - `gridHelper` (size based on building footprint, `#334155` / `#1e293b`)
- **OrbitControls:** damping 0.12, auto-targeted at building centre,
  min/max distance
- **Empty state:** Shows "Select a design and generate a floor plan to view
  the 3D BIM model" when no PlanModel exists
- **Camera:** Dynamic framing based on building dimensions

### Lazy loading: `src/components/bim/LazyBimModel3D.tsx`

Wraps `BimModel3D` with `React.lazy` + `Suspense`. Fallback shows a
spinning loader + **"Loading 3D BIM model..."** text (never blank, preserving
the Sprint 31A NO_FCP fix).

### Integration in Dashboard

- When a `persistedPlan` exists (CAD-edited plan), the 3D toolbar button
  renders `LazyBimModel3D` powered by PlanModel
- When no persisted plan exists, falls back to the existing `LazyBimViewer`
- Caption below the view:
  > "3D BIM model — walls, slabs and storeys generated from your floor plan.
  > Storey height 3.0 m, wall thickness 0.25 m. Doors, windows and roof are
  > added in later stages."

## Sprint 37 Recon — Doors, Windows, Wall Segments

### a) Do rooms/walls store DOOR positions/openings anywhere?

**Yes.** `PlanModel.openings[]` has type `Opening` with:
- `kind: 'door' | 'window'` — discriminator
- `wallId: string` — links to `PlanModel.walls[].id`
- `offset: number` — distance along wall from start
- `width: number` — opening width

### b) Do they store WINDOW positions/openings anywhere?

**Yes.** Same `PlanModel.openings[]` array with `kind: 'window'`. Also has
`offset` and `width`.

There is **no `height` or `sillHeight`** in the PlanModel Opening type
(those exist in `GeneratedOpening` from `designGeometryAdapter.ts` and
`BimOpening` from `domain/bim.ts`, but not in the PlanModel storage type).

### c) Is there a wall segment list (start/end points) or only room rectangles?

**Yes, wall segment list exists.** `PlanModel.walls: WallSegment[]` with:
- `start: Point` (`x`, `y`)
- `end: Point` (`x`, `y`)
- `thickness: number`
- `type: 'external' | 'internal'`

This is the primary geometry source. Room rectangles (`PlanModel.rooms:
RoomRect[]`) are secondary/descriptive.

### d) Where should door/window data most naturally live for Sprint 37?

The data **already lives** in `PlanModel.openings`. For Sprint 37, the work is
to cut actual 3D holes in wall meshes at those positions using CSG or by
splitting wall geometry. The Opening type may need:
- `height` and `sillHeight` fields added (matching `GeneratedOpening` and
  `BimOpening`)
- A helper that converts offset + width into 3D bounding-box coordinates
  relative to the wall segment

## Files Changed

### Added
- `src/adapters/planTo3d.ts` — pure geometry adapter
- `src/components/bim/BimModel3D.tsx` — r3f 3D BIM scene
- `src/components/bim/LazyBimModel3D.tsx` — lazy-loading wrapper
- `src/__tests__/planTo3d.test.ts` — 11 tests
- `docs/SPRINT_36_3D_BIM_SHELL_REPORT.md` — this file

### Modified
- `src/pages/Dashboard.tsx` — imports LazyBimModel3D, uses it when
  persistedPlan exists, adds BIM caption

## Validation

| Check | Result |
|-------|--------|
| Typecheck | 0 errors |
| Lint | 0 errors (9 pre-existing warnings) |
| Tests | 284 passed, 24 files (273 + 11 new) |
| Build | 3393 modules, 22 precache entries |
| 3D code-split? | Yes — `assets/BimModel3D-CU44wzKR.js` (4.15 kB) + `assets/OrbitControls-Cypu0Yxi.js` (855.40 kB) are separate chunks, NOT in main bundle |

## Dependencies (already installed, no changes)
- `three@^0.179.1` (MIT)
- `@react-three/fiber@^8.18.0` (MIT)
- `@react-three/drei@^9.122.0` (MIT)
