# Sprint 39A — Brief wiring fix: building type reaches plan generation

## Phase 1 — Root Cause Diagnosis

### Traced data flow: dropdown → 2D labels

| Step | Component | File:Line | Variable | Status |
|------|-----------|-----------|----------|--------|
| 1 | Dropdown `select` | `AiBriefPanel.tsx:58` | `e.target.value` → `buildingType` state | ✅ Emits correct value ('clinic') |
| 2 | Generate button | `AiBriefPanel.tsx:38` | `generateDesignOptionsFromBriefText(..., buildingType)` | ✅ Passed as `buildingTypeOverride` |
| 3 | aiDesignAdapter overrides | `aiDesignAdapter.ts:22` | `parsed.buildingType = buildingTypeOverride` | ✅ Overrides correctly |
| 4 | DesignOption creation | `aiDesignAdapter.ts:42` | `buildingType: parsed.buildingType` | ✅ Set on each option |
| 5 | Dashboard receives | `Dashboard.tsx:259` | `setAiDesignOptions(options)` | ✅ Options carry clinic |
| 6 | visibleDesignOptions | `Dashboard.tsx:87-90` | `aiDesignOptions.length > 0 ? aiDesignOptions : designOptions` | ✅ AI options take priority |
| 7 | selectedDesign | `Dashboard.tsx:92` | `visibleDesignOptions.find(...)` | ✅ Clinic option selected |
| 8 | PlanCanvas | `PlanCanvas.tsx:24` | `generatePlanModel(design)` | ✅ Called with clinic DesignOption |
| 9 | programFromArea | `plan-generator.ts:24` | `!isResidential(buildingType)` → `getRoomProgram(buildingType)` | ✅ Routes clinic correctly |

**The chain looked correct in-session — the bug was in PERSISTENCE and BRIEF STATE.**

### PRIMARY ROOT CAUSE — Persistence drops buildingType

**File:** `src/services/projectPersistenceService.ts:36-44`
```ts
function designOptionToStoreDesign(...): Design {
  return {
    ...  // no buildingType field!
    generatedAt: ...
  }
}
```

**File:** `src/types/index.ts:90-98` — The `Design` interface had no `buildingType` field:
```ts
export interface Design {
  ...
  elements: BuildingElement[];
  generatedAt: string;
  // buildingType was MISSING
}
```

**File:** `src/services/projectPersistenceService.ts:66` — `loadPersistedDesignOptions` hardcoded 'house':
```ts
buildingType: 'house', // was HARDCODED — always loaded as house regardless of what was saved
```

**Effect:** When the page is reloaded, ALL previously-generated designs (including clinic) load with `buildingType: 'house'`, so the 2D floor plan always shows bedrooms.

### SECONDARY ROOT CAUSE — `onParsed` not wired

**File:** `src/components/dashboard/EngineeringStudioPanel.tsx:121`
```tsx
<AiBriefPanel onDesignOptionsGenerated={onDesignOptionsGenerated} />
// onParsed was NOT passed!
```

The AI Brief Panel's `onParsed` callback was never connected to the parent, so `currentBrief?.parsed?.buildingType` in the store was never updated. This meant the `designOptions` memo (Dashboard.tsx:67-85) always used the stale brief's building type for the non-AI generation path.

### TERTIARY ROOT CAUSE — 'residential' default

**File:** `src/stores/projectStore.ts:163`
```ts
buildingType: 'residential',  // not a key in ROOM_PROGRAMS
```

`roomPrograms.ts:101` — `getRoomProgram('residential')` falls back to house because 'residential' has no entry.

## Phase 2 — Fix Applied

### Fix 1: Persist buildingType (PRIMARY)
- **Added `buildingType: string`** to `Design` interface in `src/types/index.ts:96`
- **`designOptionToStoreDesign`** (`projectPersistenceService.ts:36`) now writes `opt.buildingType || 'house'`
- **`loadPersistedDesignOptions`** (`projectPersistenceService.ts:66`) now reads `d.buildingType || 'house'` instead of hardcoding 'house'

### Fix 2: `schemaToDesign` passes buildingType
- **`src/ai/designEngine.ts:188`** — `schemaToDesign` accepts `buildingType` param and writes it to the `Design` object
- **`generateDesignOptions`** now passes `brief.buildingType` to `schemaToDesign`
- **`generateDesignOptionsFromBrief`** now accepts optional `buildingType` param (default `'house'`)

### Fix 3: Wire `onParsed` (SECONDARY)
- **`EngineeringStudioPanel.tsx`** — accepts `onParsed` prop and passes it to `AiBriefPanel`
- **`Dashboard.tsx`** — passes `onParsed` to `EngineeringStudioPanel`
- **`Dashboard.tsx`** — adds `latestBuildingType` state that tracks the latest parsed buildingType from the AI flow, feeding into the `designOptions` memo

### Fix 4: Shared constant/enum
- **Created `src/engine/buildingTypes.ts`** — canonical `BUILDING_TYPES` array, `BuildingType` type, `RESIDENTIAL_TYPES`, and `isResidential()` helper
- **`plan-generator.ts`** — uses `isResidential()` instead of inline `['house', 'apartment', 'townhouse']` array
- **`roomPrograms.ts`** — keys are now implicitly validated against `BUILDING_TYPES` by test

### Fix 5: 'residential' → 'house'
- **`projectStore.ts:163`** — default `buildingType` changed from `'residential'` to `'house'`

### Fix 6: Stale persisted plan timing
No code change needed — the `useEditablePlan` memo (`persistedModel ?? baseModel`) already correctly switches to `baseModel` when `setPersistedPlan(null)` is called for a new design without a saved plan.

## Before / After

| Scenario | Before | After |
|----------|--------|-------|
| Generate clinic in AI Brief → view 2D | Transiently showed house (until `loadPlanModel` returned null), then clinic | Clinic immediately (persistedPlan cleared) |
| Reload page with persisted clinic designs | All designs load as house → show bedrooms | Designs load with their saved buildingType → show correct rooms |
| Click "Regenerate options" after brief change | Stale brief → 'residential' → house | Updated `latestBuildingType` → correct type |

## Files Changed

| File | Change |
|------|--------|
| `src/engine/buildingTypes.ts` | **NEW** — canonical BUILDING_TYPES, isResidential() |
| `src/types/index.ts` | Added `buildingType: string` to `Design` interface |
| `src/ai/designEngine.ts` | `schemaToDesign` passes buildingType; `generateDesignOptionsFromBrief` accepts buildingType param |
| `src/services/projectPersistenceService.ts` | Store/load buildingType instead of hardcoding 'house' |
| `src/stores/projectStore.ts` | Default `'residential'` → `'house'` |
| `src/engine/plan-generator.ts` | Uses shared `isResidential()` |
| `src/engine/roomPrograms.ts` | Removed unused imports (still same keys) |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Wires `onParsed` prop through to AiBriefPanel |
| `src/pages/Dashboard.tsx` | `latestBuildingType` state + `onParsed` handler |
| `src/components/ai/AiBriefPanel.tsx` | Extracted `BUILDING_TYPE_OPTIONS` (same values) |
| `src/__tests__/briefDrivenDesign.test.ts` | +3 tests: BUILDING_TYPE coverage, isResidential, programFromArea routing |
| `src/__tests__/projectPersistenceService.test.ts` | +1 test: round-trip preserves buildingType; fixed fragile projectId query |
| `src/__tests__/projectPersistenceService.test.ts` | Added `buildingType: 'house'` to test Design object |

## Verification

- **Typecheck:** 0 errors
- **Lint:** 0 errors, 9 warnings (baseline)
- **Tests:** 318 passed (25 files) — +4 new tests vs Sprint 39 (314)
- **Build:** Succeeds (3394 modules), 3D code-split confirmed, GLTFExporter lazy chunk
