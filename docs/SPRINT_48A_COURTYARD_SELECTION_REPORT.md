# Sprint 48A — Courtyard Topology Selection Fix

## PHASE 1 — Root Cause

### The Selection Logic That Excluded Courtyard

`src/engine/tier3/layoutEngine.ts:475-482`:

```ts
const topologies: Topology[] = ['rectangle', 'l-shape', 'split-wing']

const heritageId = brief.heritagePattern?.id
if (typologyId === 'hotel-fullservice' || typologyId === 'townhouse' || heritageId === 'kraal' || heritageId === 'courtyard-hearth') {
    topologies.push('courtyard')
}
```

`generateLayoutParameters` correctly detected courtyard-eligible typologies/heritage and **pushed** `'courtyard'` as a 4th topology. `generateFloorPlans` then produced 4 plans. However, the UI in `Dashboard.tsx:281-287` only mapped over the 3 existing `aiDesignOptions` entries, so `plans[3]` (courtyard) was never surfaced to the user.

Additionally, `handleTier3Plans` at `Dashboard.tsx:314` had guard `prev.length >= plans.length` — `3 >= 4` is false — so even the alternative callback path silently dropped the courtyard plan.

### Signal Now Triggering Courtyard

The same signals were already available; the fix changes HOW they're used:

| Signal | Source | Used for selection |
|--------|--------|-------------------|
| `brief.typology?.id === 'hotel-fullservice'` | Tier 1 parsed brief | ✅ replaced Rectangle with Courtyard |
| `brief.typology?.id === 'townhouse'` | Tier 1 parsed brief | ✅ same |
| `brief.heritagePattern?.id === 'kraal'` | Heritage KB | ✅ same |
| `brief.heritagePattern?.id === 'courtyard-hearth'` | Heritage KB | ✅ same |

## PHASE 2 — Selection Rule

### Before

```
house/clinic/retail → topologies = ['rectangle', 'l-shape', 'split-wing']      (3 plans)
hotel/townhouse/kraal → topologies = ['rectangle', 'l-shape', 'split-wing', 'courtyard']  (4 plans, UI shows 3)
```

### After

```
house/clinic/retail → topologies = ['rectangle', 'l-shape', 'split-wing']      (3 plans)
hotel/townhouse/kraal → topologies = ['courtyard', 'l-shape', 'split-wing']    (3 plans, courtyard REPLACES rectangle)
```

The rule: any typology/heritage that signals courtyard heritage replaces `'rectangle'` with `'courtyard'` in the 3-topology set. Non-courtyard typologies (house, clinic, retail, office, etc.) remain unchanged — they keep `['rectangle', 'l-shape', 'split-wing']`.

The rationale: for a hotel, a Courtyard layout is more relevant and distinct than a plain Rectangle. The user still gets L-Shape and Split-Wing as alternatives.

### Implementation

`src/engine/tier3/layoutEngine.ts:475-480`:
```ts
const needsCourtyard = typologyId === 'hotel-fullservice' || typologyId === 'townhouse' || heritageId === 'kraal' || heritageId === 'courtyard-hearth'

const topologies: Topology[] = needsCourtyard
    ? ['courtyard', 'l-shape', 'split-wing']
    : ['rectangle', 'l-shape', 'split-wing']
```

### Live Hotel Program Confirmation

Hotel with 20 guest rooms (28m² each, minDepth=5.5) + 6 support spaces (26 items total). `generateCourtyard` computes `wingDepth = max(minDim) = 5.5`, wraps rooms around a central void, produces a REAL courtyard ring — no overlaps, ZBC-compliant. The test `courtyard rooms meet ZBC minimums` and `courtyard has a central void` both pass.

### UI Fix

`Dashboard.tsx`: both `handleGenerate` and `handleTier3Plans` now handle `plans.length !== prev.length` by appending new `DesignOption` entries for extra plans. The fragile `prev.length >= plans.length` guard was replaced with a simple `plans.length === 0` check.

### Test Impact

- Modified: hotel test from `toBe(4)` → `toBe(3)` + `toContain('courtyard')`
- Modified: signature difference test compares courtyard vs l-shape (not rectangle)
- Added: explicit `not.toContain('courtyard')` for house typology
- All 455 tests pass (baseline 449 + 6 Sprint 48 tests)

### Files Changed

| File | Change |
|------|--------|
| `src/engine/tier3/layoutEngine.ts` | Selection logic: courtyard replaces rectangle | 
| `src/pages/Dashboard.tsx` | Handle plans.length ≠ prev.length (append missing options) |
| `src/__tests__/tier3LayoutEngine.test.ts` | Hotel expects 3 plans including courtyard; house excludes courtyard |
| `docs/SPRINT_48A_COURTYARD_SELECTION_REPORT.md` | This report |
| `CHANGELOG.md` | Sprint 48A entry |
