# v0.3.2 — Design Intelligence: Enterprise Calculators, Analysis UI, ZBC Compliance

**Date:** 2026-07-06  
**Tag:** `v0.3.2`  
**Live demo:** https://budget-engineer.vercel.app/  
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Summary

v0.3.2 is a **Design Intelligence** release covering Sprints 51–55. It introduces three major additions:

1. **7 enterprise design calculators** — area scheduling, U-value (ISO 6946), daylight factor (BRE), egress (IBC 2018), structural gravity loads (ASCE 7), energy demand (degree-day), and cost estimation. All pure TypeScript, local-only, MIT-attributed.
2. **Analysis panel in Engineering Studio** — a new "Analysis" tab surfaces all 7 calculators as branded cards with units, pass/fail indicators, and preliminary-estimate notes. A "Design Analysis" section also appears in the PDF cost report.
3. **ZBC building-code compliance** — 9 rule-based checks (min room area, min width, ceiling height, natural light, ventilation, sanitary provision, means of escape, site coverage, structural adequacy) against Zimbabwe (ZBC 1996) minimums. Integrated into the quality gate, Analysis panel, and PDF. Jurisdiction-keyed for SADC extensibility.

Quality improvements: Lighthouse CI tooling, WCAG-AA color contrast fix, favicon optimization, robots.txt / sitemap.xml / canonical URLs for SEO, and test hardening.

All validated with **559 automated tests** across 37 files. No paid APIs, no backend, no cloud LLM.

---

## What Changed Since v0.3.1

### Enterprise Design Calculators (Sprint 53)
- **`areaSchedule.ts`** — `computeAreaSchedule(rooms, GFA?)` → gross/net/circulation/efficiency. Reuses existing `roomArea()` helper.
- **`uValue.ts`** — `computeUValue(layers, target?)` → U-value (W/m²K). ISO 6946 R_total method with Rsi/Rso.
- **`daylight.ts`** — `estimateDaylightFactor(input, targetDF?)` → average DF % (BRE formula). Flags rooms below 2%.
- **`egress.ts`** — `computeOccupancyAndEgress(input)` → occupant load (IBC 2018), exit width, exits, travel distance.
- **`structuralLoad.ts`** — `computeGravityLoads(input)` → dead + live load (kN/m², kN). Preliminary — consult engineer.
- **`energyDemand.ts`** — `estimateEnergyDemand(input)` → annual heating/cooling (kWh, kWh/m²/yr) via degree-day method.
- **`costEstimate.ts`** — `estimateCost(input)` → reuses existing BOQ engine and `getCostPerM2`. No duplication.
- **+29 tests** (512 → 541).

### Analysis UI (Sprint 54)
- **`analysisAssembly.ts`** — orchestrates all 7 calculators from PlanModel + DesignOption + BOQ. Default envelope assemblies per building type. Individual try/catch per calculator.
- **`AnalysisPanel.tsx`** — new Engineering Studio tab: 7 branded cards (Area, Envelope, Daylight, Egress, Structural, Energy, Cost) with units, pass/fail, preliminary notes. WCAG-AA compliant.
- **PDF "Design Analysis" section** — renders between disclaimer and BOQ table. Gracefully skipped when unavailable.
- **StructuralOccupancy type** extended with `educational` / `institutional`.
- **+5 tests** (541 → 546).

### ZBC Compliance (Sprint 55)
- **Jurisdiction-keyed engine** (`src/engine/compliance/`) — `runCompliance(jurisdiction, input)` routes to per-jurisdiction files. Default: 'zimbabwe'. TODO seam for South Africa, Zambia, Botswana.
- **9 ZBC rules**: min habitable room area (6 m²), min room width (2 m), ceiling height (2.4 m), natural light (10% glazing/floor), ventilation (5%), sanitary (1 WC/25 occ, non-res), means of escape (≥2 exits >49 occ), site coverage (≤60%), structural adequacy (preliminary). All marked "approximate — verify with local authority".
- **Analysis panel card** — score badge, pass/warn/fail counts, per-rule status with actual vs required.
- **PDF compliance section** — summary line + disclaimer after Design Analysis.
- **+13 tests** (546 → 559).

### Quality & Infrastructure (Sprints 51–52)
- **Lighthouse CI tooling** (`@lhci/cli`) — repeatable local audit. Three routes, three runs, median aggregation. `npm run lighthouse`.
- **Accessibility fixes** — `htmlFor`/`id` on all `<select>` elements; `text-stone-500`→`text-stone-400` (WCAG AA 4.5:1); `<main>` landmark in router.
- **SEO** — `robots.txt`, `sitemap.xml`, per-route canonical URL (no hardcoded), optimised icons (935KB→18KB).
- **+13 tests** (499 → 512).

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (9 pre-existing warnings) |
| `npm test` | **559 passed, 37 files** |
| `npm run build` | Success, PWA intact, 30 precache entries |

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for the full sprint-by-sprint breakdown.

---

## Attribution

Seven calculator implementations adapt formulas from MIT-licensed [Skills-Architects](https://github.com/Abhinavbwj/Skills-Architects) and [Claude-skills-for-Computational-Designers](https://github.com/Abhinavbwj/Claude-skills-for-Computational-Designers) (see `ATTRIBUTIONS.md`). Compliance rule structure inspired by Skills-Architects country-code dossiers. All TypeScript code is original.
