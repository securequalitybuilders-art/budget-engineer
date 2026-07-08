# Stage 60 — Interactive Revision Bump

Continues from Stage 59 (Revision History). Turns revision control from *synthesised*
to *real*: a UI action issues an actual new revision per change, persisted to IndexedDB
and recorded in the audit/transaction log; the current revision drives the whole dossier.

## What shipped

- **`src/domain/types.ts`** — new `RevisionRecord { projectId, current, log[] }`.
- **`src/lib/db.ts`** — Dexie **v2** adds a `revisions` table (keyed by `projectId`).
- **`src/store/appStore.ts`**:
  - `currentRevision` + `revisionLog` state, loaded on `initialize` (seeded with Rev A
    "First issue" if absent),
  - `bumpRevision(note)` — advances via `nextRev`, appends a log entry, persists the
    `RevisionRecord`, and logs a `REVISION_BUMPED` transaction (entityType `PROJECT`).
- **`src/lib/boqExport.ts`** — `buildBoqDossierHtml(..., revision)`; the register, title
  blocks and revision-history table all reflect the passed revision.
- **`src/components/panels/ExportPanel.tsx`** — shows the current issue (Rev badge +
  count), a note input + **Issue Rev** button, and a recent-revisions table. Exports are
  filename-stamped with the revision and built at the current revision.

## Verified round-trip (real store logic + engine)

| Check | Result |
|---|---|
| Bump sequence | A (First issue) → B (Client comments) → C (Issued for construction) ✓ |
| Current after 2 bumps | C ✓ |
| Dossier @ Rev C — register REV cell | C ✓ |
| Dossier @ Rev C — history | A, B, C all present ✓ |
| Dossier @ Rev A — history | only "First issue" (no construction note) ✓ |

The bump persists to the `revisions` IndexedDB table and writes a `REVISION_BUMPED`
audit transaction, so issuing a revision is durable and traceable. Sample
`samples/demo-boq-dossier.html` regenerated at **Rev C**.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 160.08 kB (gzip 52.11), no 500 kB warning

## Honest scope note

A bump advances **all** sheets together (no per-sheet selective revisioning yet), and the
revision note is free text rather than a structured change set linked to the specific
geometry/BOQ deltas. It is, however, now a real persisted + audited action rather than a
synthesised history.

## Next candidates

1. **Auto-bump suggestion** when geometry/BOQ changes since the last issue.
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
