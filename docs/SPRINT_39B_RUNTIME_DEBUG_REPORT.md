# Sprint 39B — Runtime debug panel: trace buildingType through the live flow

## What was added

A temporary on-screen debug panel (`BuildingTypeDebugPanel`) mounted in the Dashboard at `src/pages/Dashboard.tsx:320`. It is a fixed-position overlay (top-left, z-index 99999) with a dark navy background and amber text. When hidden, a small "BT-DEBUG" button appears to re-show it.

## The 7 values shown

| # | Label | Source | Instrumented at |
|---|-------|--------|-----------------|
| 1 | `dropdownValue` | The current `buildingType` state in AiBriefPanel's `<select>` | `AiBriefPanel.tsx` — `onChange` handler |
| 2 | `briefBuildingType` | The `parsed.buildingType` returned by `generateDesignOptionsFromBriefText` (after override) | `AiBriefPanel.tsx` — after `generateDesignOptionsFromBriefText` call |
| 3 | `optionsBuildingTypes` | Array of `.buildingType` on each generated DesignOption | `AiBriefPanel.tsx` — from `optionsResult.designOptions.map(o => o.buildingType)` |
| 4 | `selectedDesignBuildingType` | The `.buildingType` on the currently selected DesignOption (`selectedDesign`) | `Dashboard.tsx` — `useEffect` watching `selectedDesign` |
| 5 | `planGenBuildingType` | The `buildingType` value inside `generatePlanModel()` right before it calls `layoutRooms` | `plan-generator.ts` — at top of `generatePlanModel()` |
| 6 | `programKeyUsed` | Which `ROOM_PROGRAMS` key `getRoomProgram()` / `programFromArea()` actually resolved to | `plan-generator.ts` — inside `programFromArea()` branch |
| 7 | `firstThreeRoomNames` | First 3 room names from the resulting PlanModel | `plan-generator.ts` — after `layoutRooms()` |

Each value is also `console.log`'d with prefix `[BT-DEBUG]` at the moment it is computed.

## How to use

1. Load the app in the browser.
2. The debug panel appears at top-left (may overlap the nav — move it in devtools if needed).
3. Open Engineering Studio → AI Brief tab.
4. Select "Clinic / Health Centre" from the dropdown.
5. Enter a brief (e.g. "clinic 200 m2") and click "Generate Design →".
6. Watch the panel update in real time as the values change.
7. Look for the **first stage where the value shows `house` instead of `clinic`**.

## Integration test

Added `REAL FLOW: generateDesignOptionsFromBriefText with clinic override + generatePlanModel yields clinic rooms` to `briefDrivenDesign.test.ts`.

This test EXACTLY replicates the live flow:
1. Calls `parseWithEngine(text, 'local-rules')` (same as AiBriefPanel does)
2. Calls `generateDesignOptionsFromBriefText(text, 'zimbabwe', 'clinic')` (with the dropdown override)
3. Asserts every returned DesignOption has `buildingType: 'clinic'`
4. Takes the first DesignOption and calls `generatePlanModel(option)`
5. Asserts the room names contain 'Consultation' and do NOT contain 'bedroom'

**Result: the test PASSES.** (319 tests, 25 files)

This discrepancy means the test does NOT reproduce the real UI failure. The pure function chain `parseWithEngine → generateDesignOptionsFromBriefText → generatePlanModel` works correctly in isolation. The bug must be in one of:
- The React state wiring between the components
- The persistence/caching layer (saved designs loading with house buildingType despite the clinic generation)
- The `useEditablePlan` `initialModel = persistedModel ?? baseModel` using a stale persistedPlan
- The `visibleDesignOptions` fallback chain selecting `designOptions` instead of `aiDesignOptions`
- An async timing issue where the correct clinic options are overwritten by stale store data

## Files changed

| File | Type |
|------|------|
| `src/lib/debug/buildingTypeTrace.ts` | New — module-level observable store for BT-DEBUG values |
| `src/components/debug/BuildingTypeDebugPanel.tsx` | New — fixed overlay panel |
| `src/components/ai/AiBriefPanel.tsx` | Modified — added BT-DEBUG writes on dropdown change + after generation |
| `src/pages/Dashboard.tsx` | Modified — added BT-DEBUG write on selectedDesign change + mounts panel |
| `src/engine/plan-generator.ts` | Modified — added BT-DEBUG writes inside generatePlanModel + programFromArea |
| `src/engine/roomPrograms.ts` | Modified — added BT-DEBUG console.log inside getRoomProgram |
| `src/__tests__/briefDrivenDesign.test.ts` | Modified — added integration test that replicates real flow |

## Validation

- **Typecheck:** 0 errors
- **Lint:** 0 errors, 9 warnings (baseline)
- **Tests:** 319 passed, 25 files (was 318)
- **Build:** Succeeds (3396 modules), 3D + GLTFExporter code-split
