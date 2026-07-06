# Sprint 55 — Zimbabwe (ZBC) Building-Code Compliance Checks (Phase A / Design Intelligence)

**Date:** July 2026
**Commit:** (to be filled after push)

## Overview

Added a jurisdiction-keyed rule-based compliance checker that evaluates the active design against Zimbabwe (ZBC 1996) building code minimums. Results appear in the Analysis panel (new "ZBC Compliance" card) and in the PDF cost report. The engine is structured so SADC neighbours (South Africa, Zambia, Botswana, etc.) can be added as new files later.

## ZBC Rules Implemented

All rules are **approximate pre-compliance checks** — marked "verify with local authority" throughout. The exact ZBC clause values are documented defaults based on ZBC 1996 / SI; where uncertain, clearly noted.

| # | Rule ID | Category | Requirement | Value Used | Approximate? |
|---|---------|----------|-------------|------------|--------------|
| 1 | `zbc-min-room-area` | Space Standards | Habitable rooms ≥ 6.0 m² | 6.0 m² | Yes — verify with local authority |
| 2 | `zbc-min-room-width` | Space Standards | Habitable rooms min width ≥ 2.0 m | 2.0 m | Yes — verify with local authority |
| 3 | `zbc-ceiling-height` | Space Standards | Ceiling height ≥ 2.4 m | 2.4 m (3.0 m default assumed) | Yes — verify with local authority |
| 4 | `zbc-natural-light` | Health & Amenity | Window area ≥ 10% floor area | 10% | Yes — verify with local authority |
| 5 | `zbc-natural-ventilation` | Health & Amenity | Operable window area ≥ 5% floor area | 5% | Yes — verify with local authority |
| 6 | `zbc-sanitary-provision` | Health & Amenity | Non-residential: min 1 WC per 25 occ | 1 per 25 occ | Yes — verify with local authority |
| 7 | `zbc-means-of-escape` | Life Safety | ≥ 2 exits when occupant load > 49 | Reuses egress calculator | Yes — verify with local authority |
| 8 | `zbc-site-coverage` | Site Planning | Building footprint ≤ 60% site area | 60% | Yes — estimated site from GFA |
| 9 | `zbc-structural-adequacy` | Structural | Preliminary load check performed | Reuses structural calculator | Yes — PRELIMINARY only |

Each rule:
- Reads from the Sprint 54 `AnalysisResult` (area schedule, envelope, daylight, egress, structural loads, energy, cost)
- Returns `{ status: 'pass' | 'warn' | 'fail', actual, required, note }`
- Has a clear "approximate / verify with local authority" disclaimer
- Is wrapped in try/catch at the rule level → never crashes the app

## Quality Gate Extension

The Tier 1 quality gate (`src/engine/parseBrief.ts:buildQualityGate`) runs at brief time and has no access to design/plan geometry. Compliance checking is a **post-design** quality layer:

- New `runCompliance()` in `src/engine/compliance/index.ts` produces a `ComplianceReport` with score, pass/warn/fail counts, and per-rule results
- The score (percentage pass) is shown in the Analysis panel card header
- The existing `QualityGate` interface and Tier 1 flow are **unchanged** — zero regression
- Compliance results augment the brief-level quality gate without modifying it

## Analysis Panel Integration

A new **"ZBC Compliance"** card appears at the bottom of the Analysis panel when designs exist:

- Score badge (`${score}/100`) with emerald/amber/red coloring
- Pass/warn/fail count summary line
- Scrollable list of each rule with colored status badge (pass=green, warn=amber, fail=red)
- Each rule shows: title, actual vs required values, and the full disclaimer note
- Non-authoritative warning at card bottom
- Empty state when no plan/design → nothing rendered (no broken UI)

## PDF Integration

Extended `PdfAnalysisSummary` with optional `complianceSummary` and `complianceHasData` fields. When present:
- "ZBC Compliance" header rendered after Design Analysis section
- Summary line: "7 pass, 2 warn, 0 fail (78% score)"
- Italic disclaimer: "Approximate pre-compliance check — verify all items with local authority."
- PDF always generates (compliance is optional, gracefully skipped)

## Jurisdiction-Extension Seam

The compliance engine uses a `runCompliance(jurisdiction, input)` switch in `src/engine/compliance/index.ts`:

```typescript
switch (jurisdiction) {
  case 'zimbabwe':
    results = evaluateZbcRules(input)
    break
  // TODO: Add south-africa (SANS 10400), zambia, botswana, etc.
  //   case 'south-africa':
  //     results = evaluateSouthAfricaRules(input)
  //     break
  default:
    // unknown jurisdiction → empty result, no throw
}
```

To add a new country:
1. Create `src/engine/compliance/southAfrica.ts` exporting `evaluateSouthAfricaRules(input): ComplianceResult[]`
2. Add a case in `index.ts`
3. The `ComplianceInput` interface provides plan, design, analysis, and buildingType — all reusable

## Files Changed

| File | Status |
|---|---|
| `src/engine/compliance/types.ts` | NEW |
| `src/engine/compliance/zimbabwe.ts` | NEW — 9 ZBC rules |
| `src/engine/compliance/index.ts` | NEW — runCompliance + emptyCompliance + summarizeCompliance |
| `src/components/dashboard/AnalysisPanel.tsx` | MODIFIED — added ZBC Compliance card |
| `src/components/dashboard/BoqExportPanel.tsx` | MODIFIED — accepts plan/buildingType, computes compliance for PDF |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | MODIFIED — passes jurisdiction to AnalysisPanel |
| `src/adapters/boqToPdf.ts` | MODIFIED — extended PdfAnalysisSummary + compliance PDF section |
| `src/pages/Dashboard.tsx` | MODIFIED — passes activePlan + buildingType to BoqExportPanel |
| `src/__tests__/compliance.test.ts` | NEW — 13 tests |
| `docs/SPRINT_55_ZBC_COMPLIANCE_REPORT.md` | NEW — this file |
| `CHANGELOG.md` | MODIFIED |
| `ATTRIBUTIONS.md` | MODIFIED |

## Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint src --max-warnings 9` | 0 errors, 9 warnings (baseline) |
| `npx vitest run` | 559 passed (546 old + 13 new), 37 files |
| `npm run build` | Success, PWA intact, 30 precache entries |

## Attribution

The compliance rule **STRUCTURE** (per‑jurisdiction files with a `ComplianceRuleDef` interface) is inspired by the country‑code dossier pattern in [github.com/Abhinavbwj/Skills-Architects](https://github.com/Abhinavbwj/Skills-Architects) (MIT). The rules themselves (ZBC minimums) are based on ZBC 1996 / SI references already cited in the app's typology knowledge base. All TypeScript code is original.
