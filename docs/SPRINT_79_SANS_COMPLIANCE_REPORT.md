# Sprint 79 — SADC Building Codes (1/2): South Africa SANS 10400 + Jurisdiction Picker

> **Date:** 2026-07-07  
> **Release:** v0.7.0 + Sprint 79  
> **Head:** `1c0e11d` + Sprint 79 commit  
> **Theme:** SADC regional compliance, jurisdiction selector UI

---

## Summary

Added **South Africa (SANS 10400)** compliance rules to the existing compliance engine, mirroring the Zimbabwe (ZBC) pattern exactly. Introduced a **jurisdiction picker** in the Analysis panel and BOQ & Export panel so users can switch between building code jurisdictions. Zambia & Botswana are stubbed as disabled "coming soon" options.

---

## What was built

### 1. South Africa SANS 10400 Rules (`src/engine/compliance/southAfrica.ts`)

10 rules implemented, each wrapped in try/catch per the existing `evaluateZbcRules` pattern:

| # | Rule ID | SANS Part | Title |
|---|---------|-----------|-------|
| 1 | `sans-min-room-area` | SANS 10400-C | Minimum habitable room area (first ≥ 6.0 m², others ≥ 4.5 m²) |
| 2 | `sans-min-room-width` | SANS 10400-C | Minimum habitable room dimension (≥ 2.0 m) |
| 3 | `sans-ceiling-height` | SANS 10400-C | Minimum ceiling height (habitable ≥ 2.4 m, passage ≥ 2.1 m) |
| 4 | `sans-natural-light` | SANS 10400-O | Natural glazing (≥ 10% floor area) |
| 5 | `sans-natural-ventilation` | SANS 10400-O | Openable ventilation area (≥ 5% floor area) |
| 6 | `sans-sanitary-provision` | SANS 10400-P/Q | Sanitary fixtures for non-residential (1/25M + 1/15F) |
| 7 | `sans-means-of-escape` | SANS 10400-T | Fire egress (≥ 2 exits for > 49 occupants) |
| 8 | `sans-site-coverage` | SANS 10400 — local scheme | Site coverage ≤ 50% (check local scheme) |
| 9 | `sans-energy-efficiency` | SANS 10400-XA | Fenestration/energy compliance (glazing ≤ 20% wall area) |
| 10 | `sans-structural-adequacy` | SANS 10400-B | Preliminary structural load check (engineer sign-off) |

Every rule's `note` field contains "approximate — verify with local authority". All rules degrade to `warn` with "no data" if input is missing. None throw.

### 2. Engine Integration (`src/engine/compliance/index.ts`)

Added `case 'south-africa':` to the `runCompliance` switch, importing `evaluateSouthAfricaRules` from `southAfrica.ts`. Unknown jurisdictions (e.g. `'zambia'`, `'botswana'`) fall through to the default branch returning empty results with a warning — no crash.

### 3. Jurisdiction Picker UI

| Panel | Location | Options |
|-------|----------|---------|
| **AnalysisPanel** | Inside the compliance section header | Zimbabwe (ZBC), South Africa (SANS 10400), Zambia (disabled/coming soon), Botswana (disabled/coming soon) |
| **BoqExportPanel** | Below the Pricing Region selector | Same 4 options |

- Default jurisdiction: `'zimbabwe'` (preserves existing behavior for all existing users and tests)
- The compliance card header dynamically shows the jurisdiction name (ZBC / SANS 10400)
- The PDF compliance summary in BOQ export also includes the jurisdiction label

### 4. Tests (`src/__tests__/compliance.test.ts`)

7 new tests (20 total, up from 13):

- `evaluateSouthAfricaRules returns >0 rules for valid input`
- `each SANS result has required fields and approximate note`
- `runCompliance south-africa returns report with score/totalRules/passedRules`
- `too-small room fails sans-min-room-area rule`
- `compliant plan passes sans-min-room-area and sans-min-room-width`
- `unknown jurisdiction (zambia) returns empty results without throwing`
- `zimbabwe regression: still works unchanged`

---

## Quality

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (EXACT baseline) |
| `npm test` | **854 passed**, 47 files (7 new tests) |
| `npm run build` | Success, PWA 30 entries |
| `text-stone-500` in app code | **0** — only in the test that asserts compliance |
| Existing ZBC rules | Unchanged — all pass |

---

## Files changed

```
A src/engine/compliance/southAfrica.ts          — SANS 10400 rules (10 rules)
M src/engine/compliance/index.ts                — wire south-africa case
M src/components/dashboard/AnalysisPanel.tsx    — jurisdiction picker + dynamic compliance header
M src/components/dashboard/BoqExportPanel.tsx   — jurisdiction picker + use it in PDF compliance
M src/__tests__/compliance.test.ts              — 7 new SANS + regression tests
A docs/SPRINT_79_SANS_COMPLIANCE_REPORT.md      — this file
```

---

## Known limitations

- **Approximate only** — all SANS 10400 rule values are reasonable approximations. Users must verify with the local municipality / accredited building control officer.
- **Zambia & Botswana** — stubbed as disabled "coming soon" menu items. Their rule modules will land in Sprint 80.
- **No structural engineer sign-off** — the structural adequacy rule is flagged as preliminary only.
