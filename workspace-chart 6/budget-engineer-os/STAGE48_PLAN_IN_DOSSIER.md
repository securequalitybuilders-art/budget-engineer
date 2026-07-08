# Stage 48 — Embed the 2D Plan into the Export Dossier

Continues from Stage 47 (Currency-Aware BOQ Export). The dossier is now a complete
deliverable: the **2D floor plan drawing and the BOQ in one printable A4 document**.
A new standalone Plan SVG export is also available.

## What shipped

- **`src/lib/planSvg.ts`** — `buildPlanSvg(cad, floorId?)`: a pure-string, DOM-free SVG
  generator mirroring `CadPlanView` (grid, structural/partition walls in material
  colours, door/window markers, blocks, overall W×D dimension labels). Runs in both
  the browser and Node (verification).
- **`src/lib/boqExport.ts`** — the dossier now embeds the plan SVG in a styled
  `.planbox` under a "Floor Plan" heading, above the BOQ table, with print-safe
  `page-break-inside: avoid`.
- **`src/components/panels/ExportPanel.tsx`** — added a **🗺 Plan SVG** button to export
  the drawing on its own; updated copy.

## Verified output (real engine, seed model)

- **Standalone SVG** (2,231 bytes): valid `<svg>` root; canvas 396×284 px =
  (12 m×28 + 60) × (8 m×28 + 60), exactly matching the 12×8 m seed envelope; dimension
  labels read **"12.0 m"** and **"8.0 m"**; contains wall lines, the door marker and the
  sofa block. ✓
- **Dossier** grew 5.3 KB → 8.1 KB: embeds the plan SVG, has the "Floor Plan" heading,
  and retains the print-to-PDF button. ✓

Sample deliverables refreshed:
- `samples/demo-plan.svg` (standalone drawing)
- `samples/demo-boq-dossier.html` (plan + BOQ in one document)

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 144.50 kB (gzip 47.58), no 500 kB warning

## Honest scope note

The plan is a schematic single-floor SVG (no per-room dimension chains, hatching or
title block yet). It shares geometry with the on-screen `CadPlanView` but is a separate
static renderer — a future refactor could make `CadPlanView` consume `buildPlanSvg`
directly to guarantee pixel-identical output.

## Next candidates

1. **Multi-floor dossier** — one plan section per storey.
2. **Footing reinforcement** — rebar tonnage for the pads.
3. **Title block + per-room dimensions** on the plan.
