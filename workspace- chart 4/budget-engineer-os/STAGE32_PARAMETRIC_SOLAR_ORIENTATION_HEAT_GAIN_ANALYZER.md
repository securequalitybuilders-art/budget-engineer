# Stage 32 — Parametric Solar Orientation & Heat Gain Analyzer (SHGC Physics)

## Overview & Executive Summary
In accordance with the **BLAST Framework** and Dzenhare OS computational sustainability principles (*"Construction Affordable for Everyone"*), Stage 32 introduces parametric solar physics. Computational architects and mechanical engineers can now evaluate thermal solar envelope exposure across all cardinal orientations (*North*, *East*, *South*, *West*). The engine calculates exact normal azimuth vectors, derives window-to-wall ratios (WWR %), models peak irradiance heat fluxes, and computes HVAC peak cooling kW loads.

## Key Architectural Additions

### 1. Azimuthal Normal Vector Solar Mathematical Takeoff (`src/lib/solarAnalyzer.ts`)
- Implemented `computeSolarAnalysis(cadDoc)` analyzing exterior perimeter wall geometry:
  - Derives outward normal azimuth angles `θ` (degrees clockwise from North `+Y`).
  - Aggregates physical wall areas (`m²`) and hosted window rough openings (`m²`) into cardinal facade groups (*North*, *East*, *South*, *West*).
  - Models regional peak Solar Heat Gain Coefficient (SHGC / Irradiance `W/m²`) fluxes:
    - **West Glazing Peak Heat Flux:** `450 W/m²` (intense afternoon equatorial sun).
    - **East Glazing Peak Heat Flux:** `380 W/m²` (morning solar radiation).
    - **North Glazing Peak Heat Flux:** `280 W/m²` (midday high angle sun).
    - **South Glazing Peak Heat Flux:** `120 W/m²` (diffuse shade radiation).
  - Computes total peak HVAC thermal cooling load (`kW`) and assigns envelope efficiency ratings (*Optimized*, *Standard*, *High Exposure Warning*).

### 2. UI/UX Pro Max Analytics Dashboard Card (`src/components/panels/SolarOrientationPanel.tsx`)
- Contextually mounts a high-contrast amber solar dashboard inside the Enterprise Control Stack:
  - **KPI Header Cards Row:** Emerald and amber callouts detailing total glazed envelope area, overall WWR %, peak cooling kW loads, and thermal efficiency ratings.
  - **Cardinal Breakdown Grid:** 4 Bento boxes breaking down wall vs window areas, WWR percentages, and peak cooling loads per facade.
  - **Recommendations Callout:** Automated envelope advice (e.g. suggesting Low-E coatings or external solar louvers when high West WWR is detected).

## Takeoff Physics Verification

Ran verification script (`verify_stage32.mjs`) analyzing active scheme *Standard Budget Engineering Scheme*:

| Cardinal Facade Orientation | Wall Area | Window Area | WWR (%) | Peak Irradiance | Peak Cooling kW Load |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **North Facade** | `74.2 m²` | `0.00 m²` | `0.0%` | `280 W/m²` | `0.00 kW` |
| **East Facade** | `36.0 m²` | `0.00 m²` | `0.0%` | `380 W/m²` | `0.00 kW` |
| **South Facade** | `24.0 m²` | `0.00 m²` | `0.0%` | `120 W/m²` | `0.00 kW` |
| **West Facade** | `72.0 m²` | `2.52 m²` | `3.5%` | `450 W/m²` | `1.13 kW` |
| **Combined Envelope** | **206.2 m²** | **2.52 m²** | **1.22%** | — | **1.13 kW (Optimized) ✓** |

## Deliverables & Deliverable Presentation
- **Stage Document:** `STAGE32_PARAMETRIC_SOLAR_ORIENTATION_HEAT_GAIN_ANALYZER.md` (Presented in viewer)
- **Codebase:** Complete local SPA validated with clean TypeScript compilation and clean production build.

## Next Highest-Value Strategic Candidates
1. **Automated MEP Plumbing & Electrical Points Takeoff** (auto-calculating fixture points from space schedules).
2. **Automated BIM IFC Clash & Spatial Interference Checker** (clash detection between objects/openings and structural walls).
3. **Automated Structural Concrete Beam Grid Generator** (auto-connecting structural pilaster columns with floor beams).

Say **proceed** to continue with candidate #1, or name your preferred priority.
