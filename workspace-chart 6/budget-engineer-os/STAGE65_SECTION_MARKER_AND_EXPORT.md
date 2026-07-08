# Stage 65 — Section-Line Marker on the Plan + Export Selected Cut

Continues from Stage 64 (Selectable Section Line). Ties plan and section together: the
plan now shows **where** the section is cut (a dashed section line with A–A / B–B bubbles),
and the user's selected cut flows through the app into the dossier.

## What shipped

- **`src/lib/planSvg.ts`** — `buildPlanSvg(cad, floorId?, titleMeta?, sectionMark?)`.
  When a `SectionConfig` is passed it draws the section line:
  - **AA** → horizontal dashed line at the cut Y, with "A" bubbles at both ends;
  - **BB** → vertical dashed line at the cut X, with "B" bubbles.
  (Type-only import of `SectionConfig` from `sectionSvg` — no runtime cycle.)
- **`src/store/appStore.ts`** — `sectionConfig` state + `setSectionConfig`, so the active
  cut is shared app-wide.
- **`src/components/cad/SectionView.tsx`** — pushes the chosen `{ axis, position }` to the
  store via `useEffect` whenever the toggle/slider changes.
- **`src/lib/boqExport.ts`** — `buildBoqDossierHtml(..., sectionConfig?)` threads the cut
  into both the plan markers and the section drawing; the section heading reflects A–A/B–B.
- **`src/components/panels/ExportPanel.tsx`** — passes the store's `sectionConfig` into the
  HTML/PDF exports.

## Verified output (real engine, seed)

| Check | Result |
|---|---|
| No config → no section line (back-compat) | ✓ |
| AA marker → dashed line + 2 "A" bubbles | ✓ |
| BB marker → dashed line + 2 "B" bubbles | ✓ |
| Dossier @ BB → "Building Section B–B" heading | ✓ |
| Dossier plans show the B section marker | ✓ |

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 165.92 kB (gzip 54.09), no 500 kB warning

## Honest scope note

The marker is drawn on the static export plan via `buildPlanSvg`; the interactive
on-screen `CadPlanView` doesn't yet render the marker (it would need the same overlay).
The bubble label is the axis letter (A/B); multiple distinct section lines per plan aren't
supported yet.

## Next candidates

1. **Render the section marker on the interactive plan** too (parity with export).
2. **Slab edge & column formwork** for a fuller formwork takeoff.
3. **Multiple named section lines** (A–A, B–B, C–C) on one plan.
