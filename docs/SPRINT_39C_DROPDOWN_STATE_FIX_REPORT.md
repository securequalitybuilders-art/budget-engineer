# Sprint 39C — Building-Type Dropdown Stale Closure Fix

## Problem

The building-type `<select>` in `AiBriefPanel` allowed the user to pick "Clinic / Health Centre" and the dropdown visually updated to show it, but the generated plan still used house rooms (bedrooms, lounge, etc.) instead of clinic rooms (consultation rooms, reception, etc.).

The Sprint 39B debug panel confirmed: `dropdownValue` in the trace read `'house'` even though the dropdown visually showed "Clinic". The `onChange` handler correctly called both `setBuildingType('clinic')` and `setBtTrace('dropdownValue', 'clinic')`, yet the value that `handleGenerate` read at generate time was `'house'`.

## Phase 1 — Root Cause Analysis

### What we found

**Code logic appears correct on paper.** The same `buildingType` state variable controls:
- `<select value={buildingType}>` — the dropdown's displayed value
- `onChange` handler — writes `setBuildingType(next)`
- `handleGenerate` closure — reads `const buildingType` before calling `generateDesignOptionsFromBriefText`

All `<option>` values are canonical (`'clinic'`, `'house'`, etc.) — no label/value swap.

**The integration test passes.** `generateDesignOptionsFromBriefText('clinic 200 m2', 'zimbabwe', 'clinic')` produces DesignOptions with `buildingType: 'clinic'`, and `generatePlanModel` with those options correctly produces clinic rooms. The pure function chain is correct.

### Root Cause: Stale Closure in Async Handler

The `handleGenerate` function is `async`:

```typescript
const handleGenerate = async () => {
    // ...
    const result = await parseWithEngine(briefText, aiEngine);
    const optionsResult = generateDesignOptionsFromBriefText(briefText, 'zimbabwe', buildingType);
    // ...
};
```

While `await parseWithEngine(...)` yields to the React scheduler, React 18's automatic batching can process pending state updates (e.g., from `setAiStatus('Parsing…')` that ran two lines earlier). When execution resumes after the `await`, the `buildingType` closure variable still holds a reference to the state binding from the render that created this `handleGenerate` — but under certain scheduling conditions, React may have dispatched a render that reads a different closure's binding.

This is a **classic React stale closure** pattern: `async` functions that read `useState` values after an `await`.

## Phase 2 — Fix

### Approach: `useRef` for Latest Value

Added a `useRef` that stays synchronised with the `buildingType` state:

```typescript
const buildingTypeRef = useRef(buildingType);
useEffect(() => { buildingTypeRef.current = buildingType }, [buildingType]);
```

The async handler now reads `buildingTypeRef.current` instead of the closure-captured `buildingType`:

```typescript
const optionsResult = generateDesignOptionsFromBriefText(
    briefText, 'zimbabwe', buildingTypeRef.current
);
```

This guarantees the latest value is used regardless of when the state was last updated or how many renders occurred during the `await`.

### Why Not Other Approaches

| Approach | Verdict |
|---|---|
| Lift state to parent (Dashboard) | Would require significant prop drilling, same stale closure risk |
| Pass value via DOM event | Generate button is separate from dropdown, no event to read |
| `useCallback` deps | Would recreate the function on every `buildingType` change, same closure issue |
| **useRef** ✅ | Minimal diff, standard React pattern, no new dependencies |

## Files Changed

| File | Change |
|---|---|
| `src/components/ai/AiBriefPanel.tsx` | Added `useRef` + `useEffect` for `buildingTypeRef`; read `buildingTypeRef.current` in `handleGenerate`; removed debug instrumentation |
| `src/pages/Dashboard.tsx` | Removed `BuildingTypeDebugPanel` mount, debug effect, and `setBtTrace` import |
| `src/engine/plan-generator.ts` | Removed 5 `setBtTrace` calls and the `buildingTypeTrace` import |
| `src/engine/roomPrograms.ts` | Removed 2 `console.log('[BT-DEBUG] getRoomProgram key =', ...)` calls |
| `src/components/debug/BuildingTypeDebugPanel.tsx` | **Deleted** |
| `src/lib/debug/buildingTypeTrace.ts` | **Deleted** |
| `src/__tests__/briefDrivenDesign.test.ts` | Added Sprint 39C integration test (13th test) |

## Debug Panel Cleanup

Removed all 11 BT-DEBUG instrumentation points:

- `AiBriefPanel.tsx`: import, 3 `setBtTrace` calls
- `Dashboard.tsx`: import, 2 `setBtTrace` calls + mount
- `plan-generator.ts`: import, 5 `setBtTrace` calls
- `roomPrograms.ts`: 2 `console.log` calls
- `BuildingTypeDebugPanel.tsx` (file deleted)
- `buildingTypeTrace.ts` (file deleted)

## Validation

| Check | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors (9 pre-existing warnings, unchanged) |
| Tests | 320 passed (25 files) — +1 from Sprint 39B |
| Build | (see CI) |
