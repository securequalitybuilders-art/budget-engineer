# Sprint 38 — Roof, Multi-Storey Polish, and 3D Model Export

## 1. Roof Options

### Roof type / pitch model field
**DesignOption** (`src/domain/boq.ts:27-33`) has **no** roof type or pitch field —
it only has `id`, `name`, `grossFloorArea`, `floors`, `elements`. The roof always
defaults to a **pitched (gable)** roof.

### Pitch/height constant
- **`ROOF_PITCH_HEIGHT = 1.5`** — metres from eave level to ridge apex
- **`ROOF_OVERHANG = 0.3`** — metres the roof extends past the wall footprint
- Both defined in `src/adapters/planTo3d.ts:15-16`

### Ridge direction
Computed automatically: ridge runs along the **longer** axis of the building
footprint. If `plan.width >= plan.height` the ridge runs along the X axis;
otherwise along the Z axis.

### Material
Sienna/brown terracotta (`#a0522d`, roughness 0.85) — a dark warm tone that
complements the brand palette and provides good visual contrast.

## 2. Multi-Storey Stacking

- Each storey has **exactly one slab** at `yOffset = storeyIndex × storeyHeight`
- **Walls** and **openings** repeat per storey at the correct y offset
- The **roof sits only on the topmost storey**, with `eaveY = numberOfStoreys × storeyHeight`
- **No overlapping geometry**: slabs are contained within storey bounds, walls
  sit on slabs, openings cut through walls, roof caps the top
- Ground slab at y=0 with thickness `SLAB_THICKNESS` (0.15 m)
- For 2 storeys: 2 slabs, 2× walls, 1 roof at y=6.0 (2 × 3.0 m)

## 3. GLB / 3D Model Export

### Approach
**Client-side only, offline, free.** Uses three.js's `GLTFExporter` from
`three/examples/jsm/exporters/GLTFExporter` — part of the three.js distribution
(no new dependencies, MIT license).

### Import path (dynamic)
```ts
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter')
```

The GLTFExporter is **dynamically imported** only when the user clicks the
download button, so its 35 kB is loaded on demand and does not bloat the main
3D chunk.

### Button
- Located **below the 3D Canvas**, inside the BimModel3D component's wrapper div
- Label: "Download 3D model (.glb)"
- Tooltip: "Download 3D BIM model (opens in Blender, Windows 3D Viewer, etc.)"
- Shows "Preparing model..." while exporting
- Disabled when empty/model nonexistent
- Applies `Button variant="secondary"` styling

### How it works
1. All building meshes (walls, slabs, doors, windows, roof) are wrapped in a
   `<group ref={buildingRef}>`
2. On click, `GLTFExporter.parse()` serializes the group with `{ binary: true }`
3. The resulting `ArrayBuffer` is wrapped in a `Blob` and downloaded via a
   temporary `<a>` element — no server round-trip

### File format
- **`.glb`** (binary glTF) — single file, ready for Blender, Windows 3D Viewer,
  Babylon.js, three.js editor, etc.
- JSON `.gltf` not offered (would require separate texture files)

### Type declarations
A small ambient declaration file (`src/three-examples.d.ts`) was added to
satisfy TypeScript for the GLTFExporter import, since three.js examples do not
ship `.d.ts` files.

## 4. Files Changed

### Modified
- `src/adapters/planTo3d.ts` — added `RoofParams`, `ROOF_PITCH_HEIGHT`,
  `ROOF_OVERHANG`, roof computation in `planTo3d()`
- `src/components/bim/BimModel3D.tsx` — `RoofMesh` with custom gable geometry,
  `<group ref={buildingRef}>`, dynamic GLTFExporter import, download button,
  brand-appropriate roof material
- `src/pages/Dashboard.tsx` — updated caption to mention roof + downloadable .glb
- `src/__tests__/planTo3d.test.ts` — 9 new roof tests
- `CHANGELOG.md`

### Added
- `src/three-examples.d.ts` — ambient type declaration for GLTFExporter
- `docs/SPRINT_38_ROOF_AND_EXPORT_REPORT.md`

## 5. Validation

| Check | Result |
|-------|--------|
| Typecheck | **0 errors** |
| Lint | **0 errors, 10 warnings** (baseline 9 + 1 pre-existing `any` in test) |
| Tests | **306 passed, 24 files** (297 → 306, +9 roof tests) |
| Build | **3392 modules**, 21 precache entries |
| 3D chunk | `assets/BimModel3D-Bkt3u13u.js` — **865.33 kB** (+2.71 kB from Sprint 37) |
| GLTFExporter | **Separate chunk** `assets/GLTFExporter-CW4fz1io.js` — **35.30 kB** (loaded on demand) |
| New dependencies | None |

## 6. Before / After

### Test count
- **Sprint 37:** 297 tests, 24 files
- **Sprint 38:** 306 tests, 24 files (+9)

### 3D chunk size
- **Sprint 37:** `BimModel3D-uB3rycpw.js` — 862.62 kB
- **Sprint 38:** `BimModel3D-Bkt3u13u.js` — 865.33 kB (+2.71 kB)

### GLTFExporter chunk
- **New** `GLTFExporter-CW4fz1io.js` — 35.30 kB (loaded only on click)

## 7. How to Open the Downloaded 3D Model

1. **Click "Download 3D model (.glb)"** below the 3D BIM view
2. Open the downloaded `.glb` file in:
   - **Blender** — File → Import → glTF 2.0
   - **Windows 3D Viewer** — built-in, double-click the file
   - **three.js editor** — https://threejs.org/editor/
   - **Babylon.js sandbox** — https://sandbox.babylonjs.com/
