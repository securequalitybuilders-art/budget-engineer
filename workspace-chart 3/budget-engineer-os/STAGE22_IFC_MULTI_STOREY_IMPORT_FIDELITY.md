# Stage 22 — IFC Multi-Storey Import Fidelity

## Objective
Close the main remaining IFC interoperability gap by preserving **original storey assignment** when importing IFC files back into Budget Engineer.

Before this stage, the importer reconstructed geometry losslessly from the custom `Dzenhare_CAD` property sets, but it assigned **all imported walls, openings, and blocks to the first floor**. That meant multi-floor IFC round-trips lost floor membership fidelity even though geometry and BOQ remained correct.

## What changed

### 1) IFC importer now resolves element → storey mapping
Updated:
- `src/lib/ifc/ifcImport.ts`

The importer now reads and links three IFC relationship layers:

1. **`IFCPROPERTYSET('Dzenhare_CAD')`**
   - still used to reconstruct exact source CAD payloads.

2. **`IFCRELDEFINESBYPROPERTIES`**
   - used to map each `Dzenhare_CAD` property set back to its owning IFC product entity.

3. **`IFCRELCONTAINEDINSPATIALSTRUCTURE`**
   - used to map each product entity into its containing `IFCBUILDINGSTOREY`.

4. **`IFCBUILDINGSTOREY`**
   - used to rebuild `CadFloor[]` and assign imported CAD elements to the correct `floorId`.

### 2) Exact imported floor assignment is preserved
Imported elements now land on the same logical floor they were exported from:
- walls → correct `floorId`
- openings → correct `floorId`
- blocks/objects → correct `floorId`

This fixes the most important remaining IFC round-trip fidelity issue for multi-storey projects.

## Implementation detail
The importer now builds these in-memory maps:

- `propertySetToRecord: Map<psetId, CadRecord>`
- `propertySetToElement: Map<psetId, elementRef>`
- `storeyIdToFloorId: Map<storeyRef, floorId>`
- `elementToFloorId: Map<elementRef, floorId>`

Then, while reconstructing each CAD entity from its `Dzenhare_CAD` record, it resolves:

`record -> property set -> IFC element -> containing storey -> imported floorId`

Fallback behavior remains safe:
- if no storey containment can be resolved, the importer still falls back to the first floor.

## Verification

### Type check
```bash
./node_modules/.bin/tsc --noEmit
```
Passed.

### Dedicated multi-floor IFC round-trip test
Created a temporary verification script that:
- starts from the seed CAD model
- adds a **second-floor wall** (`w6`)
- adds a **second-floor window** (`o2`)
- adds a **second-floor block** (`b2`)
- exports to IFC
- re-imports from IFC
- asserts all three remain on `floor-2`
- also asserts original ground-floor wall `w1` remains on `floor-1`

Observed output:

```json
{
  "floors": [
    { "id": "floor-1", "name": "Ground Floor", "elevation": 0, "height": 3 },
    { "id": "floor-2", "name": "First Floor", "elevation": 3.2, "height": 3 }
  ],
  "wallFloors": {
    "w1": "floor-1",
    "w2": "floor-1",
    "w3": "floor-1",
    "w4": "floor-1",
    "w5": "floor-1",
    "w6": "floor-2"
  },
  "openingFloors": {
    "o1": "floor-1",
    "o2": "floor-2"
  },
  "blockFloors": {
    "b1": "floor-1",
    "b2": "floor-2"
  }
}
```

### Production build
```bash
./node_modules/.bin/vite build
```
Passed.

## Enterprise impact
This upgrade materially improves Budget Engineer’s open IFC interoperability:

- **multi-storey imports are now floor-aware**
- BIM/CAD round-trips are more audit-safe
- imported spatial organization is preserved for downstream BOQ, analytics, and governance
- the platform becomes more credible as a **local-first, inspectable BIM-to-BOQ pipeline**

## Files changed
- `src/lib/ifc/ifcImport.ts`

## Result
Stage 22 completes the top known IFC limitation from the prior roadmap:

- ✅ IFC export carries real geometry and boolean openings
- ✅ IFC import reconstructs exact CAD payloads
- ✅ IFC import now restores original storey membership for multi-floor models

## Next highest-value options
1. Drag openings directly along their host wall in the 2D plan
2. Multi-select / group CAD operations
3. Further defer or slim 3D viewer payloads
