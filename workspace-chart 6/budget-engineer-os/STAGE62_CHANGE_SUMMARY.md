# Stage 62 — Change Summary Since Last Issue

Continues from Stage 61 (Auto-Bump Suggestion). Upgrades the stale-design warning from
*"something changed"* to a concrete list of **what changed** since the last issued
revision — wall/opening/object counts, slab area, beam length, and the grand-total delta.

## What shipped

- **`src/lib/designMetrics.ts`**:
  - `designMetrics(cad, bim, boq)` → headline snapshot (walls, openings, blocks, floors,
    slab m², beam m, grand total, currency).
  - `summarizeChanges(prev, curr)` → human-readable `ChangeLine[]` with sign, magnitude
    and direction (up/down); cost delta formatted in the active currency.
- **`src/domain/types.ts`** — revision log entries gained an optional `metrics` snapshot.
- **`src/store/appStore.ts`** — metrics are captured alongside the fingerprint on first
  issue and on every `bumpRevision`.
- **`src/components/panels/ExportPanel.tsx`** — when the design is dirty, the amber banner
  now lists change chips (green = increase, red = decrease), e.g. `+1 walls`, `−1 objects`,
  `+$1,488 grand total`.

## Verified round-trip (real engine)

Issued vs modified (added a partition wall, deleted the sofa):

| Change chip | Direction |
|---|---|
| +1 walls | up ✓ |
| −1 objects | down ✓ |
| +$1,488 grand total | up ✓ |

No-change case → empty summary (0 lines) ✓. Cost delta formatted in the active currency. ✓

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 162.98 kB (gzip 53.27), no 500 kB warning

## Honest scope note

The summary reports deltas of headline counts/quantities/cost, not a per-element edit
log (it won't say *which* wall moved). It answers "what's different since I last issued?"
at a glance, which is the intent.

## Next candidates

1. **Carry the change summary into the new revision's note** when bumping.
2. **Selectable section line** (A–A / B–B anywhere through the plan).
3. **Slab edge & column formwork** for a fuller formwork takeoff.
