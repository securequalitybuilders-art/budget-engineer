# Stage 63 — Auto-Fill Revision Note from Change Summary

Continues from Stage 62 (Change Summary). Closes the issue-control loop: when you bump a
revision **without typing a note**, the note is auto-populated from the detected changes
since the last issue — so the revision history reads itself.

## What shipped

- **`src/store/appStore.ts`** — `bumpRevision(note)` now resolves the note:
  1. user-typed note (trimmed) wins;
  2. else, if the previous issued revision has a metrics snapshot, the note is the
     change summary (`summarizeChanges(prev, curr)` joined, e.g.
     *"+1 walls, −1 objects, +$1,488 grand total"*);
  3. else *"No measurable change"* (dirty fingerprint but no metric delta) or
     *"Design revision"* (no prior metrics).
  The resolved note is stored on the revision entry **and** in the `REVISION_BUMPED`
  audit transaction.
- **`src/components/panels/ExportPanel.tsx`** — input placeholder updated to
  *"leave blank to auto-fill from changes"*; the status line echoes the resolved note.

## Verified round-trip (real engine, store logic in isolation)

| Case | Resolved note |
|---|---|
| Empty note + changes | `+1 walls, −1 objects, +$1,488 grand total` ✓ |
| Empty note + no change | `No measurable change` ✓ |
| User note provided | `Client comments` (respected) ✓ |
| No prior metrics | `Design revision` ✓ |

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 163.21 kB (gzip 53.36), no 500 kB warning

## Honest scope note

The auto note is the headline metric summary, not a per-element edit list. A user note
always overrides it. This makes the revision history self-documenting without extra typing.

## Next candidates

1. **Selectable section line** (A–A / B–B anywhere through the plan).
2. **Slab edge & column formwork** for a fuller formwork takeoff.
3. **Per-discipline drawing series** (S- structural, M/E- services sheets).
