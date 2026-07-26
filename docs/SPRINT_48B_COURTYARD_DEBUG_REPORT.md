# Sprint 48B — Courtyard Selection Debug (Temporary Readout)

## Field Mismatch Diagnosis

### The Selection Condition (layoutEngine.ts:478)

```ts
const needsCourtyard = typologyId === 'hotel-fullservice' || typologyId === 'townhouse' || heritageId === 'kraal' || heritageId === 'courtyard-hearth'
```

This condition reads `brief.typology?.id` (assigned to `typologyId` at line 475) and `brief.heritagePattern?.id` (line 477). The test expects `brief.typology?.id === 'hotel-fullservice'` for a hotel brief.

### Call-Site Object Shape (Dashboard.tsx:272)

```ts
const parsed = parseBrief(brief.rawText, { buildingType: brief.parsed.buildingType ?? 'house' })
const concept = generateDesignConcept(parsed)
const params = generateLayoutParameters(concept, parsed)
```

`parsed` is a `Tier1ParsedBrief` whose `typology` field is set by `parseBrief()` (the engine, at `src/engine/parseBrief.ts`). Inside `parseBrief`:

1. **Text detection** (`detectTypology`) scans aliases and finds `hotel-fullservice` from keywords like "hotel", "lodge", etc. (confidence ~0.45).
2. **UI override** (`uiOverrides.buildingType`) then runs. If the override value is `'house'` (the default), it matches `house-residential` via `t.id.startsWith('house')` and **overrides** the detected hotel typology.

### Suspected Mismatch

**What the code expects:** `brief.typology?.id === 'hotel-fullservice'`

**What actually flows in:** `brief.typology?.id === 'house-residential'` because the UI override (`brief.parsed.buildingType ?? 'house'` = `'house'`) overrides the text-detected hotel typology.

### Why `brief.parsed.buildingType` is `'house'`

`src/lib/ai/brief-parser.ts:34-38` only detects these building types:

```ts
let buildingType = 'house';              // DEFAULT
if (/office|commercial/.test(t)) buildingType = 'office';
else if (/apartment|flat|unit/.test(t)) buildingType = 'apartment';
else if (/school|classroom/.test(t)) buildingType = 'school';
else if (/clinic|hospital|health/.test(t)) buildingType = 'clinic';
```

**'hotel' is NOT listed.** A brief like "Build a 20-room hotel in Victoria Falls" produces `buildingType: 'house'`. This is stored into `Brief.parsed.buildingType`. When `handleGenerate` later calls `parseBrief(brief.rawText, { buildingType: brief.parsed.buildingType ?? 'house' })`, the override `'house'` matches `house-residential`, overriding the text-detected `hotel-fullservice`.

### The Debug Readout

A temporary visible panel (top-left, green-on-black, `z-index: 99999`) shows these 5 values live:

1. `typologyId` — the actual `brief.typology?.id` at runtime
2. `heritageId` — `brief.heritagePattern?.id`
3. `branch` — which selection branch fired (`courtyard-eligible` vs `default`)
4. `topologies` — the final `[a, b, c]` array
5. `labels` — the 3 plan names as strings

Console logs with prefix `[CY-DEBUG]` are emitted at each generation.

### Files Changed

| File | Change |
|------|--------|
| `src/engine/tier3/layoutEngine.ts` | Added `CY_DEBUG` mutable export + `console.log('[CY-DEBUG]', ...)` in `generateLayoutParameters` and `generateFloorPlans` |
| `src/pages/Dashboard.tsx` | Added `cyDebug` state, wired from `handleGenerate` and `handleTier3Plans`, renders `<DebugPanel />` fixed top-left |
| `docs/SPRINT_48B_COURTYARD_DEBUG_REPORT.md` | This report |
| `CHANGELOG.md` | Sprint 48B entry |

### Next Step (Sprint 48C)

Fix `brief-parser.ts` to recognize `'hotel'` and `'townhouse'` as building types, so the UI override does not overwrite the text-detected courtyard-eligible typology.
