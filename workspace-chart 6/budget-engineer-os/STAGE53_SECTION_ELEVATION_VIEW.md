# Stage 53 — Section / Elevation View

Continues from Stage 50/51 (Multi-Floor). Adds the major drawing type that was still
missing: a **vertical building section** showing the stacked storeys, floor slabs,
external wall cut-throughs, openings, the stair flight connecting floors, and the roof.

## What shipped

- **`src/lib/sectionSvg.ts`** — `buildSectionSvg(cad)`: a pure-string, DOM-free section
  generator that cuts vertically through the building width (X axis):
  - earth/ground below the ±0.000 GL datum,
  - per-storey floor slabs and external wall cut-throughs (material-coloured),
  - openings as voids (green door / cyan window) at sill→head heights,
  - the **stair** drawn as a diagonal flight with treads where a stair block exists,
  - roof slab on top, floor-level labels with elevations, and an overall-height note.
  Runs in both browser and Node.
- **`src/components/cad/SectionView.tsx`** — panel rendering the section inline; mounted
  in the left column under the 2D plan.
- **`src/lib/boqExport.ts`** — the dossier now includes a **Building Section** between
  the per-floor plans and the BOQ.

## Verified output (real engine, two-storey seed)

- Section SVG (2,144 bytes): valid root; **2 floor-level labels** (Ground + First);
  "Section A–A" title; "±0.000 GL" datum; stair flight (sand), door void (green) and
  window void (cyan) all present; note reads **"Overall height 6.00 m · 2 storey"**
  (= 2 × 3 m floors). ✓
- Dossier embeds the Building Section (13.5 KB). ✓

Samples: `samples/demo-section.svg`, `samples/demo-boq-dossier.html` (plans + section + BOQ).

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 151.75 kB (gzip 49.76), no 500 kB warning

## Honest scope note

The section is a schematic cut, not a true sectioned-geometry projection: external
walls are shown as uniform members, interior partitions and accurate stair geometry
aren't projected, and only one section line (A–A through the width) is generated.
It shares the model with the plans/BOQ so it stays consistent.

## Next candidates

1. **Stair opening cuts the upper slab** (inter-floor coordination + quantity effect).
2. **Slab edge & column formwork** for a fuller formwork takeoff.
3. **Selectable section line** (cut anywhere, A–A / B–B).
