# Stage 58 — Drawing Register / Sheet List

Continues from Stage 57 (Title Blocks). Completes the "issued" look with conventional
**sheet numbers** (A-101, A-102, …, A-201) assigned to every drawing, a **drawing
register** table in the dossier, and the sheet number shown in each title block.

## What shipped

- **`src/lib/drawingRegister.ts`** — `buildDrawingRegister(cad, rev)`:
  - A-1xx for floor plans (one per storey: A-101, A-102, …),
  - A-201 for the building section,
  - each with title, discipline, scale, revision. Helpers `planSheet(reg, i)` and
    `sectionSheet(reg)` look up the number for a drawing.
- **`src/lib/titleBlock.ts`** — `TitleBlockMeta` gained a `sheet?` field; the title block
  now shows `… · Sheet A-101` in the centre cell.
- **`src/lib/boqExport.ts`** — the dossier builds the register once, renders a
  **Drawing Register** table after the metadata strip, prefixes each plan/section heading
  with its sheet number, and passes the sheet into each title block.

## Verified output (real engine, two-storey seed)

| Sheet | Title | Discipline |
|---|---|---|
| A-101 | Floor Plan — Ground Floor | Architectural |
| A-102 | Floor Plan — First Floor | Architectural |
| A-201 | Section A–A | Architectural |

- Dossier has a "Drawing Register" table listing all three sheets. ✓
- Plan headings show the sheet number ("A-101 · Floor Plan"). ✓
- Each title block shows "Sheet A-101" etc. ✓

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 157.05 kB (gzip 51.17), no 500 kB warning

## Honest scope note

Numbering is a simple sequential A-series (no S-/M-/E- structural/services series yet,
since those drawings don't exist as separate sheets), and there's no multi-revision
history — the register reflects the current issue (Rev A).

## Next candidates

1. **Revision history table** per sheet (Rev A/B/C with dates & notes).
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
