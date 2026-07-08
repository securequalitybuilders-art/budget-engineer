# Stage 15 — 2D CAD Drawing View (closing the CAD → BIM journey gap)

Local-first, free/open-source only. No paid APIs. Inline SVG (preview-safe, no CDNs).
Dark-first Dzenhare brand preserved.

## Why
The product vision is **AI architectural design → 2D CAD drawings → 3D BIM → quantities → BOQ**,
but the app jumped straight from the CAD *data model* to the 3D BIM viewer with no dedicated
**2D CAD drawing** step. This stage adds a real, interactive 2D floor plan rendered directly
from the seeded `CadDocument`.

## What changed
### New interactive plan component
`src/components/cad/CadPlanView.tsx`:
- Renders the active floor's **walls** (thickness-scaled, structural vs partition styling),
  **openings** (doors green / windows cyan, positioned along host wall by offset),
  and **blocks/furniture** (labelled rectangles).
- Background construction **grid** via SVG pattern.
- **Dimension overlay** (per-wall length in metres) with show/hide toggle.
- **Click-to-select** any element — selection is linked to the BIM model via the
  `bim-{cadId}` id convention, so selecting a wall/door/object in 2D drives the same
  `selectedElementId` used by the 3D viewer and BIM inspector.
- Follows the floor switch (`activeFloorId`, falling back to the first floor when "all").
- Legend + helper text. Fully inline-styled SVG — renders in the sandboxed preview.

### New dependency-free exporters
`src/lib/cadExport.ts`:
- `buildCadDxf(cad, floorId)` — minimal **DXF R12 ASCII** writer (LINE entities for wall
  centerlines, rectangles for blocks). DXF R12 is the most widely importable CAD interchange
  format and needs no library — pure string assembly.
- `buildCadSvg(cad, floorId)` — self-contained **SVG** export of the plan for save/print.

### Route wiring
`src/routes/BimRoute.tsx`:
- `cad` now destructured from the store.
- `CadPlanView` mounted in the right column **above** the 3D viewer, so the on-screen
  journey reads 2D plan → 3D BIM.
- Export buttons download `cad-plan-{floor}.svg` and `cad-plan-{floor}.dxf`.

## Build status
- `tsc --noEmit` → clean.
- `vite build` → success.
- `BimRoute` chunk 167.61 kB → 173.99 kB (+~6 kB; pure SVG, no new deps).
- Critical-path preloads unchanged (state-vendor + react-vendor only); 3D still deferred.

## Verification
Reproduced `buildCadSvg` for the seed ground floor: correct 12×8 m envelope, central
partition at x=6, and the sofa block — confirming geometry/coordinate transform (Y-flip) is right.

## Remaining / future targets
- Editable 2D plan (drag walls/openings) writing back to the CAD doc + regenerating BIM.
- Split drei helpers out of the `BimViewer` chunk to reduce 3D-load latency.
- Free OSS IFC import/export round-trip.
