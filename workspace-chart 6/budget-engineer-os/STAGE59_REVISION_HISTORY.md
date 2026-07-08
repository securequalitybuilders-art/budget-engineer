# Stage 59 — Per-Sheet Revision History

Continues from Stage 58 (Drawing Register). Completes issue control: every sheet now
carries a **revision history** (Rev A/B/C with date, description and author), rendered
as a Revision History table in the dossier; the current revision still drives the title
block REV cell.

## What shipped

- **`src/lib/drawingRegister.ts`**:
  - new `RevisionEntry { rev, date, note, by? }`; `DrawingSheet` gained `revisions[]`.
  - `nextRev(rev)` — A→B→…→Z→AA letter sequencing.
  - `buildDrawingRegister(cad, revision, date)` now builds each sheet's history up to the
    requested current revision (Rev A = single "First issue"; higher revisions synthesise
    intermediate "Coordination update" entries and a final "Issued for construction").
- **`src/lib/boqExport.ts`** — adds a **Revision History** table (Sheet · Rev · Date ·
  Description · By) after the Drawing Register.

## Verified output (real engine)

| Case | Result |
|---|---|
| `nextRev` A/B/Z/'' | B / C / ZA / A ✓ |
| Rev A — A-101 history | `A: First issue` ✓ |
| Rev C — A-101 history | A, B, C (current C) ✓ |
| Rev C notes | A=First issue, B=Coordination update, C=Issued for construction ✓ |
| Dossier Revision History table | present, 3 first-issue rows ✓ |

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 157.89 kB (gzip 51.42), no 500 kB warning

## Honest scope note

Revision history is currently synthesised from a single requested "current revision"
(there's no interactive per-sheet revision editor or persisted revision log yet). It
makes the dossier read as a properly issued, revision-controlled set; a real change-log
workflow would record actual edits over time.

## Next candidates

1. **Interactive revision bump** — a UI action that records a real new revision per change.
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
