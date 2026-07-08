# Stage 57 — Title Blocks on Drawings

Continues from Stage 56. Makes the dossier look properly *issued*: every floor plan and
the building section now carry a professional **title block** (brand, project, drawing
name, scale, date, revision, drawn-by).

## What shipped

- **`src/lib/titleBlock.ts`** — `buildTitleBlock(w, h, meta)` returns a self-contained
  SVG title strip (`TITLE_BLOCK_H = 46 px`): DZENHARE OS brand + project (left), drawing
  name + drawn-by (centre), and SCALE / DATE / REV cells (right) with dividers and an
  amber top rule. `TitleBlockMeta` = `{ project, drawing, scale?, date?, revision?, drawnBy? }`.
- **`src/lib/planSvg.ts`** / **`src/lib/sectionSvg.ts`** — both accept an optional
  `titleMeta`. When provided they reserve an extra 46 px at the bottom and draw the block
  there; geometry math is unchanged (drawing isn't overlapped). **Back-compatible**:
  without `titleMeta` the SVG is exactly as before.
- **`src/lib/boqExport.ts`** — the dossier passes a title block to every plan
  ("Floor Plan — <floor>") and the section ("Section A–A"), with the project name and date.
- **`src/components/panels/ExportPanel.tsx`** — the standalone Plan SVG export now
  includes a title block too.

## Verified output (real engine, two-storey seed)

| Check | Result |
|---|---|
| Plan without meta has title block | no (back-compat) ✓ |
| Plan with meta: brand / drawing / project / SCALE / REV / date | all present ✓ |
| SVG height grows | 284 → 330 px (+46, exact) ✓ |
| Section title block + valid SVG | ✓ |

Dossier refreshed (`samples/demo-boq-dossier.html`): each plan and the section now show a
title block.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 156.04 kB (gzip 50.83), no 500 kB warning

## Honest scope note

Scale is a label ("1:100 @ A4"), not a true measured scale factor tied to the print size;
revision is fixed at "A" (no revision history yet). These are presentation metadata, not a
controlled drawing register.

## Next candidates

1. **Revision register / drawing list** in the dossier (sheet numbers, rev history).
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
