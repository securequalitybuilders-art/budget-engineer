# Sprint 53 — Enterprise Design Calculators (TypeScript Ports)

**Date:** July 2026
**Commit:** (to be filled after push)

## Overview

Ported 7 enterprise architectural/engineering calculators from MIT-licensed Python reference implementations to clean TypeScript. All calculators are pure, deterministic, locally runnable functions — no DOM, no paid APIs, no backend. No UI wiring yet (Sprint 54).

## Calculator Details

### 1. `areaSchedule.ts` — `computeAreaSchedule()`

| Field | Detail |
|---|---|
| **Formula** | Net area = sum of all room areas; gross = explicit input or net/(1−circulationPct); circulation = gross − net; efficiency = net/gross |
| **Units** | m² (area), % (circulation/efficiency) |
| **Defaults** | Circulation factor = 0.25 (25%) |
| **Citations** | Standard architectural practice (RIBA Plan of Work); adapted from Skills-Architects |
| **Reused** | Accepts pre-computed `room.area` from existing `roomArea()` helper — no new area formula |

### 2. `uValue.ts` — `computeUValue()`

| Field | Detail |
|---|---|
| **Formula** | R_total = Rsi + Σ(thickness_i / λ_i) + Rso; U = 1 / R_total |
| **Units** | U-value in W/m²K; resistances in m²K/W |
| **Defaults** | Rsi = 0.13 (inside, horizontal), Rso = 0.04 (outside) per BS EN ISO 6946 / CIBSE Guide A |
| **Citations** | ISO 6946 / BS EN ISO 6946; CIBSE Guide A; common UK building regs targets (0.18–0.30 W/m²K) |
| **Attribution** | Adapted from Skills-Architects U-value calculator (MIT) |

### 3. `daylight.ts` — `estimateDaylightFactor()`

| Field | Detail |
|---|---|
| **Formula** | ADF = (W × θ × τ × M) / (A × (1−R²)) — BRE daylight factor formula |
| **Units** | Average Daylight Factor (%) |
| **Defaults** | θ = 45° (visible sky angle), τ = 0.85 (glass transmittance), M = 0.9 (maintenance), R = 0.5 (surface reflectance). Target DF = 2% |
| **Citations** | BRE Digest 209 (Daylighting); CIBSE LG10; BS 8206-2 |
| **Attribution** | Adapted from Skills-Architects daylight calculator (MIT) |

### 4. `egress.ts` — `computeOccupancyAndEgress()`

| Field | Detail |
|---|---|
| **Formula** | Occupant load = area / occupant load factor; exits = 1/≤49, 2/50–500, 3/501–1000, 4/>1000; exit width = load × 0.0076 m |
| **Units** | Occupant load (persons), exit width (m), travel distance (m) |
| **Defaults** | Load factors per IBC 2018 Table 1004.5: residential (18.6), office (9.3), assembly-concentrated (0.65), etc. |
| **Citations** | IBC 2018 (International Building Code) Chapter 10 |
| **Attribution** | Adapted from Skills-Architects egress calculator (MIT) |

### 5. `structuralLoad.ts` — `computeGravityLoads()`

| Field | Detail |
|---|---|
| **Formula** | Total load = dead load + live load (kN/m²); total force = load × area × floors; tributary = tribArea × totalLoad |
| **Units** | kN/m², kN |
| **Defaults** | Dead loads: residential/office 4.0, retail 5.0, industrial 6.0, roof 2.0 kN/m². Live loads: residential 1.92, office 2.40, retail/assembly 4.79 kN/m² (IBC Table 1607.1) |
| **Citations** | ASCE 7-16 / IBC 2018 |
| **Status** | **PRELIMINARY estimate only** — not a stamped engineering design. Flagged in output as `isPreliminary: true`. |
| **Attribution** | Adapted from Skills-Architects structural calculator (MIT) |

### 6. `energyDemand.ts` — `estimateEnergyDemand()`

| Field | Detail |
|---|---|
| **Method** | Degree-day envelope method: Q_cond = U × A_env × DD × 24 / 1000 (kWh); Q_inf = 0.33 × n × V × DD × 24 / 1000 (kWh) |
| **Units** | kWh/yr, kWh/m²/yr |
| **Defaults** | HDD = 1000, CDD = 500 (temperate climate); infiltration/ventilation = 0.5 ACH; internal gains = 5 W/m²; efficiency = 0.7 |
| **Citations** | CIBSE TM41 (Degree-days); BS EN ISO 13790 (simplified method) |
| **Status** | **Simplified estimate** — not a detailed energy model. Flagged in warnings. |
| **Attribution** | Adapted from Skills-Architects energy calculator (MIT) |

### 7. `costEstimate.ts` — `estimateCost()`

| Field | Detail |
|---|---|
| **Method** | Thin wrapper — calls existing `buildBoqFromDesignOption()` + `getCostPerM2()` |
| **Units** | Cost ($, ZAR, KES, etc.), cost/m² |
| **Reused** | 100% BOQ engine reuse — does NOT duplicate the BOQ generator. Uses existing `designToBoq` adapter, rate cards, and currency formatting. |
| **Attribution** | Adapted from Skills-Architects cost calculator pattern (MIT) |

## Validation

- **Tests:** 541 total (512 existing + 29 new)
- **Typecheck:** 0 errors
- **Lint:** 0 errors, 9 warnings (baseline unchanged)
- **Build:** Succeeds, code-split intact
- **New test file:** `src/__tests__/calculators.test.ts` (29 tests: known-value, edge cases for zero/negative/missing input)

## Attribution

See `ATTRIBUTIONS.md` at repo root for MIT license credits.
