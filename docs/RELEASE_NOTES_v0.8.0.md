# v0.8.0 — SADC Building-Code Compliance

> **Release date:** 2026-07-07  
> **Phase:** SADC Compliance Phase (complete)

## Headline

**Four building-code jurisdictions live — Zimbabwe (ZBC), South Africa (SANS 10400), Zambia (Public Health Act CAP 295), Botswana (Building Control Regs).** Two sprints (79 + 80) delivered 28 compliance rules across 4 jurisdictions, a jurisdiction picker in both the Analysis panel and BOQ & Export panel, and full test coverage for all rule modules.

## What's New

### 1. Jurisdiction Picker
- **Analysis Panel** — `<select>` dropdown in the compliance section header, dynamically shows applicable code name
- **BOQ & Export Panel** — dropdown below Pricing Region selector, jurisdiction drives `runCompliance()` and PDF compliance summary label

### 2. South Africa — SANS 10400 (10 rules)
| Rule | SANS Part | Check |
|------|-----------|-------|
| Minimum habitable room area | SANS 10400-C | first room ≥ 6.0 m², others ≥ 4.5 m² |
| Minimum room dimension | SANS 10400-C | ≥ 2.0 m |
| Ceiling height | SANS 10400-C | habitable ≥ 2.4 m, passage ≥ 2.1 m |
| Natural light | SANS 10400-O | glazing ≥ 10% floor area |
| Natural ventilation | SANS 10400-O | openable vent ≥ 5% floor area |
| Sanitary provision | SANS 10400-P/Q | 1WC/25M + 1WC/15F for non-residential |
| Means of escape | SANS 10400-T | ≥ 2 exits when > 49 occupants |
| Site coverage | SANS 10400 — local scheme | ≤ 50% (check local scheme) |
| Energy efficiency | SANS 10400-XA | glazing ≤ 20% wall area |
| Structural adequacy | SANS 10400-B | preliminary load check |

### 3. Zambia — Public Health Act CAP 295 (9 rules)
| Rule | Check |
|------|-------|
| Minimum habitable room area | ≥ 6.0 m² |
| Minimum room width | ≥ 2.0 m |
| Ceiling height | ≥ 2.4 m |
| Natural light | glazing ≥ 10% floor area |
| Natural ventilation | openable vent ≥ 5% floor area |
| Sanitary provision | 1 WC per 25 occupants (non-residential) |
| Means of escape | ≥ 2 exits when > 49 occupants |
| Site coverage | ≤ 50% |
| Structural adequacy | preliminary load check |

### 4. Botswana — Building Control Regulations (9 rules)
| Rule | Check |
|------|-------|
| Minimum habitable room area | ≥ 6.0 m² |
| Minimum room width | ≥ 2.0 m |
| Ceiling height | ≥ 2.4 m |
| Natural light | glazing ≥ 10% floor area |
| Natural ventilation | openable vent ≥ 5% floor area |
| Sanitary provision | 1 WC per 25 occupants (non-residential) |
| Means of escape | ≥ 2 exits when > 49 occupants |
| Site coverage | ≤ 50% |
| Structural adequacy | preliminary load check |

> **IMPORTANT DISCLAIMER:** All compliance rules are marked **"approximate — verify with local authority."** This tool provides preliminary design-stage guidance only and does **not** replace professional review by a registered architect, structural engineer, or building control officer. Local by-laws, specific site conditions, and detailed engineering assessments may require different values. Always verify compliance with the relevant local authority before proceeding to construction.

## Quality & Stability

- **864 tests** across 47 files — all passing (17 new in SADC compliance phase)
- **0 TypeScript errors**, **0 ESLint errors** (exactly 9 warnings, baseline)
- **Production build** green with PWA (30 precached entries)
- **28 compliance rules** across 4 jurisdictions (Zimbabwe: 9, South Africa: 10, Zambia: 9, Botswana: 9)
- All rules wrapped in try/catch — none throw; missing data produces `warn` status
- Unknown jurisdictions return empty results with warning (no crash)

## Known Limitations

- **Approximate values** — all rule thresholds are typical values from published regulations. Actual requirements may vary by municipality, site classification, or specific conditions.
- **Zambia & Botswana rules based on published acts** — values derived from the Zambia Public Health Act CAP 295 and Botswana Building Control Regulations. Local scheme variations may apply.
- **Not a substitute for professional sign-off** — structural, fire, and sanitary compliance require registered professional certification.
- **Energy efficiency is SANS-specific** — the SANS 10400-XA rule is South Africa-specific. Zambia and Botswana do not yet have energy-efficiency compliance rules in this release.

## File Inventory

### New Files (3)
- `src/engine/compliance/southAfrica.ts` — 10 SANS 10400 rules
- `src/engine/compliance/zambia.ts` — 9 Zambia CAP 295 rules
- `src/engine/compliance/botswana.ts` — 9 Botswana Building Control rules

### Changed Files (5)
- `src/engine/compliance/index.ts` — dispatch switch for 4 jurisdictions
- `src/components/dashboard/AnalysisPanel.tsx` — jurisdiction picker
- `src/components/dashboard/BoqExportPanel.tsx` — jurisdiction picker + PDF label
- `src/__tests__/compliance.test.ts` — 30 tests (up from 13)
- `CHANGELOG.md` — this release
