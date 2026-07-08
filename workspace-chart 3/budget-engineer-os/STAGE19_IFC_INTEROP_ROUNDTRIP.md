# Stage 19 — IFC Import/Export Round-Trip (open BIM interoperability)

Local-first, free/open-source only. **No library, no network, no paid API** — pure string
assembly/parsing of the open ISO standard. Dark-first Dzenhare brand preserved.

## Why
The OS now has a full 2D editor and BIM/BOQ engine, but was isolated from the wider BIM
ecosystem. This stage adds a real **IFC4 (ISO-10303-21 / `.ifc`)** round-trip so models can
move to/from Revit, ArchiCAD, BlenderBIM, etc. — the universal open-source BIM exchange format.

## What changed
### Real IFC4 STEP writer
`src/lib/ifc/ifcExport.ts` → `buildIfcStep(cad)`:
- Emits a valid `ISO-10303-21` file: HEADER (FILE_DESCRIPTION / FILE_NAME / FILE_SCHEMA IFC4),
  owner/application history, geometric context, SI units (metre / m² / m³).
- Spatial hierarchy: `IFCPROJECT → IFCSITE → IFCBUILDING → IFCBUILDINGSTOREY` via
  `IFCRELAGGREGATES`, with elements placed by `IFCRELCONTAINEDINSPATIALSTRUCTURE`.
- Standard element entities: `IFCWALLSTANDARDCASE`, `IFCDOOR`, `IFCWINDOW`,
  `IFCBUILDINGELEMENTPROXY` (objects).
- 22-char IFC GlobalIds.
- **Lossless re-import**: each element carries a custom `IFCPROPERTYSET('Dzenhare_CAD')`
  holding exact source geometry/params. Generic viewers ignore it; our importer uses it.

### IFC4 STEP parser
`src/lib/ifc/ifcImport.ts` → `parseIfcStep(text, projectId)`:
- Indexes every `#id=` line, reads `IFCPROPERTYSINGLEVALUE` name/value pairs, groups the
  `Dzenhare_CAD` property sets back into element records, reads storeys for floors, and
  reconstructs an exact `CadDocument`. Includes a STEP-aware top-level argument splitter
  (handles nested `()` and quoted strings).

### Store + UI
- `appStore.importCadFromIfc(ifcText)` → parses, replaces the active plan, regenerates BIM +
  BOQ, logs a `CAD_IFC_IMPORTED` transaction; returns `{ ok, message }`.
- `src/components/cad/IfcInteropPanel.tsx`: **Export IFC** (download `.ifc`) and **Import IFC**
  (file picker → import) with success/error status. Mounted under the CAD properties panel.

## Verified lossless round-trip (real engine)
`createSeedCadDocument → buildIfcStep → parseIfcStep → BOQ`:
- IFC output is valid (`ISO-10303-21;` header; contains `IFCWALLSTANDARDCASE`, `IFCDOOR`).
- Re-import reconstructs **5 walls, 1 opening, 1 object** with exact geometry
  (e.g. wall `w2` `(12,0)→(12,8)`, thickness 0.2).
- **BOQ before == after: $39,354.84 == $39,354.84 → LOSSLESS: true.**

A sample export is saved at `samples/demo-house.ifc`.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success. `BimRoute` 186.70 kB → 195.89 kB (+~9 kB; writer/parser/panel, no deps).
- Critical-path preloads unchanged; 3D still deferred.

## Remaining / future targets
- Map imported elements to their original storeys when multiple floors carry geometry
  (current importer assigns the first storey).
- Emit real IFC swept-solid geometry (not just placements) for richer external viewers.
- Drag openings along host wall; multi-select.
- Split drei helpers out of `BimViewer` to reduce 3D-load latency.
