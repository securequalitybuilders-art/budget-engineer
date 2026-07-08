# Stage 61 — Auto-Bump Suggestion

Continues from Stage 60 (Interactive Revision Bump). Makes revision control *intelligent*:
the app detects when the design has changed since the last issued revision (via a content
fingerprint) and prompts to re-issue, so the drawing set never silently drifts out of date.

## What shipped

- **`src/lib/fingerprint.ts`** — `designFingerprint(cad, boq)`: a deterministic djb2 hash
  of wall geometry, openings, blocks, floors, material system **and** the BOQ grand total.
  Cheap, no deps, stable across reloads.
- **`src/domain/types.ts`** — revision log entries gained an optional `fingerprint`.
- **`src/store/appStore.ts`** — the fingerprint is stamped on the first-issue entry
  (`initialize`) and on every `bumpRevision`, so each issued revision records the exact
  design state it represents.
- **`src/components/panels/ExportPanel.tsx`** — compares the **current** fingerprint to the
  **last issued** one:
  - dirty → amber banner *"Design changed since Rev X — issue a new revision"* and the
    Issue Rev button is highlighted (primary);
  - clean → green *"Drawings are up to date with the issued Rev X"*.

## Verified round-trip (real engine)

| Change | Dirty? |
|---|---|
| No change | false ✓ |
| Wall moved | true ✓ (276f21e8 → 1c7569a3) |
| Material only (cost change) | true ✓ |
| Re-issue at the new state | false ✓ |

The fingerprint catches both geometry edits and cost-only changes (e.g. material/rate),
and is persisted with the revision, so the suggestion is durable.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 161.49 kB (gzip 52.69), no 500 kB warning

## Honest scope note

The fingerprint covers the tracked design inputs + grand total; it doesn't diff *what*
changed (no field-level change report), and a revision still advances all sheets together.
It reliably answers "is the issued set stale?" which is the goal.

## Next candidates

1. **Change summary** — show *what* changed since last issue (e.g. "+1 wall, −3 m² slab, +$2k").
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
