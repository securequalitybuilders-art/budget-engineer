# Stage 21 — True Boolean Openings (IfcOpeningElement + IfcRelVoidsElement)

Local-first, free/open-source only. **No library, no network, no paid API** — pure STEP.
Dark-first Dzenhare brand preserved.

## Why
Stage 20 emitted solid geometry, but doors/windows were overlapping boxes — they didn't
actually *cut* the wall. Real BIM voids openings out of their host element. This stage adds the
standard pattern so openings render as genuine holes in BlenderBIM / Revit / IFC.js.

## What changed
`src/lib/ifc/ifcExport.ts`:
- Track each wall's IFC entity id (`wallEntityRef: cad wall id → #id`) as walls are written.
- For every opening, emit:
  1. **`IFCOPENINGELEMENT`** — a void box sized to the opening, depth = host wall thickness
     + 0.1 m so the cut passes fully through, placed at the opening's position/angle/sill.
  2. **`IFCRELVOIDSELEMENT(host wall, opening)`** — subtracts the void from the host wall.
  3. The door/window product (thin filling panel) as before.
  4. **`IFCRELFILLSELEMENT(opening, door/window)`** — the product fills the void.
- `Dzenhare_CAD` property set on the filling product is unchanged → round-trip preserved.

## Verified (real engine, 2-opening test model)
- `IFCOPENINGELEMENT`: 2 · `IFCRELVOIDSELEMENT`: 2 · `IFCRELFILLSELEMENT`: 2.
- Sample void references the real host wall + opening entities:
  `IFCRELVOIDSELEMENT('…',#5,$,$,#35,#188)`.
- **Lossless round-trip preserved**: re-import → 5 walls, 2 openings, 1 object;
  BOQ identical ($39,676.84 == $39,676.84).
- Seed sample (`samples/demo-house.ifc`): 1 opening → 1 `IFCRELVOIDSELEMENT`,
  ends `END-ISO-10303-21;`.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success. `BimRoute` ~198 kB (negligible change; export-only logic).
- Critical-path preloads unchanged; 3D still deferred.

## Remaining / future targets
- Map imported elements to original storeys for multi-floor IFC files.
- Drag openings along host wall; multi-select + group ops.
- Split drei helpers out of `BimViewer` to reduce 3D-load latency.
