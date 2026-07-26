# Sprint 48C — Fix Typology Detection: Full Dropdown + Auto-Detect Default

## Root Cause Recap

In Sprint 48B we confirmed: the building-type dropdown defaulted to `'house'` and was ALWAYS applied as an override in `parseBrief()`. A hotel brief like "Build a 20-room hotel in Victoria Falls" was text-detected as `hotel-fullservice`, but the override `'house'` matched `house-residential` via `startsWith('house')`, clobbering the detected typology. The courtyard selection branch (`typologyId === 'hotel-fullservice'`) never fired.

Additionally, the dropdown only offered 8 types (house, apartment, townhouse, clinic, school, commercial, office, other); `hotel` was not even listed.

## What Changed

### A) Dropdown now offers Auto + all 14 Tier 1 typologies

**Before** (AiBriefPanel.tsx):
```
house, apartment, townhouse, clinic, school, commercial, office, other
```

**After** (AiBriefPanel.tsx):
```
Auto-detect from brief (DEFAULT)
House / Residential
Apartment / Flat
Clinic / Health Centre
School / Classroom Block
Hotel (Full Service)          ← NEW
Office / Commercial
Retail / Shop                 ← NEW
Restaurant / Eatery           ← NEW
Church / Place of Worship     ← NEW
Warehouse / Industrial         ← NEW
Community Hall                 ← NEW
Market / Informal Trading      ← NEW
Petrol Station / Filling Station  ← NEW
Mixed-Use (Commercial + Residential)  ← NEW
```

Dropdown values are **canonical Tier 1 typology IDs** matching `typology-kb.ts`, so picking "Hotel (Full Service)" emits `'hotel-fullservice'`, which directly triggers the courtyard branch.

### B) Auto/Default skips the override

`parseBrief.ts:195` — the override condition now excludes `'auto'`:

```ts
if (uiOverrides?.buildingType && uiOverrides.buildingType !== 'auto' && uiOverrides.buildingType !== 'other') {
```

Additionally, `Dashboard.tsx:272` now passes `'auto'` as the default:

```ts
const parsed = parseBrief(brief.rawText, { buildingType: brief.parsed.buildingType ?? 'auto' })
```

And `aiDesignAdapter.ts:21` skips override when `'auto'`:

```ts
if (buildingTypeOverride && buildingTypeOverride !== 'auto') {
```

### C) Courtyard now reachable both ways

- **Auto + hotel text**: `detectTypology` finds `hotel-fullservice` → `generateLayoutParameters` → `topologies = ['courtyard', 'l-shape', 'split-wing']` → courtyard option appears.
- **Explicit "Hotel (Full Service)"**: dropdown value `'hotel-fullservice'` → exact match in `parseBrief` → same flow → courtyard appears.

### D) Sprint 48B debug removed

All `CY_DEBUG` exports, `console.log('[CY-DEBUG]', ...)` calls, `DebugPanel` component, `cyDebug` state, and wiring were deleted. Grep confirms zero references remain.

## Mapping: Dropdown Value → Tier 1 ID → Courtyard Selection

| Dropdown Label | Value | Triggers Courtyard? |
|---------------|-------|-------------------|
| Auto-detect from brief | `'auto'` | If text says hotel etc. |
| House / Residential | `'house-residential'` | No |
| Apartment / Flat | `'apartment-multi'` | No |
| Clinic / Health Centre | `'clinic-health'` | No |
| School / Classroom Block | `'school-classroom'` | No |
| **Hotel (Full Service)** | `'hotel-fullservice'` | **Yes** |
| Office / Commercial | `'office-commercial'` | No |
| Retail / Shop | `'retail-shop'` | No |
| Restaurant / Eatery | `'restaurant'` | No |
| Church / Place of Worship | `'church-worship'` | No |
| Warehouse / Industrial | `'warehouse-industrial'` | No |
| Community Hall | `'community-hall'` | No |
| Market / Informal Trading | `'market'` | No |
| Petrol Station / Filling Station | `'petrol-station'` | No |
| Mixed-Use | `'mixed-use'` | No |

Courtyard is also triggered by heritage patterns `'kraal'` and `'courtyard-hearth'` (unchanged).

## Clinic != House Guard

Both paths preserve the clinic fix:
- Explicit "Clinic / Health Centre" → `'clinic-health'` exact match → clinic typology
- Auto + "Build a clinic..." → text-detection finds `'clinic-health'` → clinic typology

## Tests Added

8 new tests in `src/__tests__/parseBriefOverride.test.ts`:
- `auto + hotel text → hotel-fullservice`
- `no override + hotel text → hotel-fullservice`
- `explicit 'hotel-fullservice' → hotel-fullservice`
- `explicit 'house-residential' + hotel text → house-residential` (override wins when chosen)
- `explicit 'clinic-health' → clinic-health`
- `auto + clinic text → clinic-health` (detection wins)
- `explicit 'house-residential' + clinic text → house-residential`
- `non-matching text with auto → null typology` (no false positive)

## Sprint 48B Debug Removed

Grep confirms zero `CY_DEBUG`, `cyDebug`, `DebugPanel`, `[CY-DEBUG]`, or `SPRINT 48B DEBUG` references remain.

## Files Changed

| File | Change |
|------|--------|
| `src/components/ai/AiBriefPanel.tsx` | Dropdown: Auto + all 14 typologies with canonical IDs; default `'auto'` |
| `src/engine/parseBrief.ts` | Skip override when `'auto'`; exact match by canonical ID |
| `src/pages/Dashboard.tsx` | Default `'house'` → `'auto'`; removed DebugPanel + cyDebug |
| `src/adapters/aiDesignAdapter.ts` | Skip override when `'auto'` |
| `src/engine/tier3/layoutEngine.ts` | Removed CY_DEBUG export + [CY-DEBUG] console.logs |
| `src/__tests__/parseBriefOverride.test.ts` | 8 new tests for override behavior (new file) |
| `docs/SPRINT_48C_TYPOLOGY_DROPDOWN_REPORT.md` | This report |
| `CHANGELOG.md` | Sprint 48C entry |
