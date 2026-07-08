# Stage 20 — Real IFC Swept-Solid Geometry

Local-first, free/open-source only. **No library, no network, no paid API** — pure STEP string
assembly of the open ISO standard. Dark-first Dzenhare brand preserved.

## Why
Stage 19's IFC export was topologically valid but carried only placements (no `Representation`),
so external viewers (BlenderBIM, IFC.js, Revit) showed empty/point geometry. This stage emits
**real `IfcExtrudedAreaSolid` swept-solid bodies** so the model renders as actual 3D shapes
everywhere — while keeping the lossless `Dzenhare_CAD` round-trip intact.

## What changed
`src/lib/ifc/ifcExport.ts`:
- New `fnum()` STEP-real formatter (guarantees a decimal point — `3` → `3.`).
- New `localPlacement(x, y, z, angleRad)` → per-element `IfcLocalPlacement` with rotation about Z.
- New `boxShape(width, depth, height)` → `IfcRectangleProfileDef` → `IfcExtrudedAreaSolid`
  → `IfcShapeRepresentation('Body','SweptSolid')` → `IfcProductDefinitionShape`.
- Every element now gets geometry + an oriented placement:
  - **Walls** — box extruded along their length × thickness × height, rotated to wall angle.
  - **Slabs** — real `IFCSLAB(... .FLOOR.)` thin plate at the floor footprint.
  - **Roofs** — real `IFCROOF(... .FLAT_ROOF.)` plate at storey top.
  - **Openings** — small box at the correct offset along the host wall, at sill height, wall angle.
  - **Objects** — furniture box at position, height by kind, rotated.
- The element `Representation` argument now references the product-definition shape (was `$`).

## Verified (real engine)
Export the seed model → checks:
- `IFCEXTRUDEDAREASOLID`, `IFCRECTANGLEPROFILEDEF`,
  `IFCSHAPEREPRESENTATION('Body','SweptSolid')`, `IFCPRODUCTDEFINITIONSHAPE` — all present.
- Real `IFCSLAB(` and `IFCROOF(` entities present.
- **11 extruded solids** generated (walls + per-floor slab/roof + opening + object).
- Sample solid is valid STEP: `IFCEXTRUDEDAREASOLID(#25,#27,#26,3.)`.
- File now 262 lines / ~13 KB (was ~7 KB placement-only), ends `END-ISO-10303-21;`.

**Lossless round-trip preserved**: re-import → 5 walls, 1 opening, 1 object; BOQ identical
($39,354.84 == $39,354.84). The `Dzenhare_CAD` property sets still drive exact reconstruction.

Refreshed sample: `samples/demo-house.ifc`.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success. `BimRoute` ~196 → ~198 kB (+~2 kB; geometry helpers, no deps).
- Critical-path preloads unchanged; 3D still deferred.

## Remaining / future targets
- Boolean-subtract openings from host walls (`IfcOpeningElement` + `IfcRelVoidsElement`) for
  true holes instead of overlapping boxes.
- Map imported elements to original storeys for multi-floor IFC files.
- Drag openings along host wall; multi-select.
- Split drei helpers out of `BimViewer` to reduce 3D-load latency.
