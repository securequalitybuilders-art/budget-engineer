# Sprint 5 — Engineering Analysis Panels

**Date:** 2026-07-01  
**Goal:** Wire existing WS4 engineering analysis modules (clash detection, solar/orientation analysis, MEP takeoff) into the visible Dashboard workflow.

## Files Inspected

| File | Purpose |
|------|---------|
| `src/lib/analysis/clash-checker.ts` | 3-rule BIM clash detection on CadDocument — outputs `ClashReportSummary` with severity count + status rating |
| `src/lib/analysis/solar-analyzer.ts` | Cardinal solar heat gain analysis on CadDocument — outputs `SolarAnalysisSummary` with efficiency rating |
| `src/lib/quantities/mep-takeoff.ts` | MEP services takeoff from BimModel room zones — outputs `MepTakeoffSummary` with point counts and cost |
| `src/lib/portfolio/executive-portfolio.ts` | Multi-project portfolio from IndexedDB — not wired (not useful for single design) |
| `src/adapters/designToBim.ts` | Existing DesignOption → BimModel adapter (Sprint 2) |
| `src/adapters/designToBoq.ts` | Existing DesignOption → BOQ adapter (Sprint 4) |
| `src/pages/Dashboard.tsx` | Dashboard page — right sidebar with panels |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Existing Engineering Studio (Sprint 1) — has its own `buildSampleCad`/`buildSampleBim` |
| `src/components/dashboard/BoqExportPanel.tsx` | Existing BOQ export panel (Sprint 4) |
| `src/domain/cad.ts` | Canonical CadDocument type (walls, openings, blocks, floors) |
| `src/domain/bim.ts` | Canonical BimModel type with roomZone elements |

## Adapter Behavior

**File:** `src/adapters/designToAnalysis.ts`

### Exports

`buildAnalysisFromDesignOption(design: DesignOption | null): AnalysisResult`

Where `AnalysisResult` = `{ bim, cad, clashes, solar, mep, warnings }`

| Field | Type | Source |
|-------|------|--------|
| `bim` | `BimModel \| null` | From `designOptionToBimModel()` — enriched with roomZone elements |
| `cad` | `CadDocument \| null` | New `buildCadFromDesignOption()` — maps BIM geometry to 2D CadDocument |
| `clashes` | `ClashReportSummary \| null` | From `detectBimClashes(cad)` |
| `solar` | `SolarAnalysisSummary \| null` | From `computeSolarAnalysis(cad)` |
| `mep` | `MepTakeoffSummary \| null` | From `computeMepTakeoff(bim)` |
| `warnings` | `string[]` | Error messages per failed analysis |

### Adapter Rules
- **Null design** → returns all-null result
- **Each analysis independently caught** — one failure doesn't block others
- **`safe()` wrapper** guards NaN and exceptions
- **Room zones generated** for MEP takeoff — one "Open Plan Studio Space" per floor
- **CadDocument has 4 perimeter walls** per floor, matching `designOptionToBimModel` geometry
- **No openings/blocks** in generated CadDocument — clash/solar run on walls only

## Analysis Modules Used

### 1. Clash Detection (`detectBimClashes`)
- Input: `CadDocument` (canonical `@/domain/cad`)
- Output: `ClashReportSummary` with:
  - `clashes: BimClashItem[]` — individual clash records
  - `highSeverityCount` / `moderateSeverityCount`
  - `statusRating`: 'Coordination Clash-Free Standard' | 'Moderate Interference' | 'Critical Structural Clash'
- 3 rules: opening-near-corner, opening-overlap, block-wall-overlap
- **Without openings/blocks in generated CAD, only outputs "Clash-Free" status** — real clashes require full CadDocument

### 2. Solar Analysis (`computeSolarAnalysis`)
- Input: `CadDocument`
- Output: `SolarAnalysisSummary` with:
  - `cardinalMetrics[]` — N/E/S/W wall/window area, WRR%, peak irradiance, cooling load
  - `totalWallArea`, `totalWindowArea`, `overallWwrPct`
  - `totalPeakCoolingLoadKw`
  - `efficiencyRating`: 'Optimized' | 'Standard' | 'High Exposure Warning'
  - `recommendations[]`
- **Generated CAD has 4 walls per floor** → meaningful solar orientation analysis

### 3. MEP Takeoff (`computeMepTakeoff`)
- Input: `BimModel` (requires `roomZone` elements)
- Output: `MepTakeoffSummary` with:
  - `spaceSchedules[]` — per-zone point counts
  - `totalElecPoints`, `totalLightPoints`, `totalPlumbPoints`
  - `totalMepCostUsd` — estimated at $65/point (elec/light) + $180/point (plumbing)
  - `efficiencyScore`
- **Generated room zones** → one "Open Plan Studio Space" per floor

## Sample Results

### 150 m² Single-Storey House ("Compact Plan")

| Analysis | Result |
|----------|--------|
| **Clash** | Coordination Clash-Free Standard (0 high, 0 moderate) |
| **Solar** | Optimized — 1.8 kW peak cooling, 0% glazing |
| **MEP** | 6 elec, 25 light, 0 plumbing, $2,015 est. cost |

### 240 m² Duplex ("Standard Plan")

| Analysis | Result |
|----------|--------|
| **Clash** | Coordination Clash-Free Standard (0 high, 0 moderate) |
| **Solar** | Optimized — 2.0 kW peak cooling, 0% glazing |
| **MEP** | 12 elec, 50 light, 0 plumbing, $4,030 est. cost |

*Note: Without real openings/blocks, clash and solar results are approximate. Full CadDocument with openings would yield real clash detections and higher solar exposure.*

## No-Paid-API Statement

**Zero paid API dependencies.** All analysis modules are pure TypeScript math:
- Clash checker — line intersections + AABB overlap
- Solar analyzer — wall orientation + window area trig
- MEP takeoff — program-based density rules + simple arithmetic
- Adapter — pure data transformations, no network calls

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` (tsc --noEmit) | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors (6 pre-existing warnings) |
| `npm run build` (tsc && vite build) | ✅ 3366 modules, 16 precache |

### Manually Verified Flows

1. **No design selected** → engineering analysis shows "Select or generate a design option" empty state
2. **150 m² house** → clash, solar, MEP results appear for all 3 analyses
3. **240 m² duplex** → scaled results (double area = double MEP points)
4. **2D view** still works after analysis runs
5. **3D view** still works — no interference with BimViewer
6. **BOQ export** still works — BoqExportPanel untouched
7. **Engineering Studio** still works — has its own `buildSampleCad`/`buildSampleBim`, not affected
8. **No NaN output** — all values guarded with `safe()` wrapper
9. **No crash on missing fields** — optional chaining and null coalescing throughout

## Known Limitations

| Limitation | Details | Resolution |
|------------|---------|------------|
| **No real openings/blocks** | Generated CadDocument has only perimeter walls, no doors/windows/furniture | Full Design→CadDocument pipeline needed |
| **Clash always "Clash-Free"** | Without openings and blocks, rule 1/2/3 can't trigger | Add opening/block generation from DesignOption |
| **Solar no window area** | 0% glazing ratio since no windows generated | Add window generation from DesignOption |
| **MEP single zone per floor** | "Open Plan Studio Space" — no kitchen/bath/bedroom differentiation | Multi-zone generation from DesignOption |
| **Executive Portfolio not wired** | Portfolio module loads from IndexedDB, not useful for single-design analysis | Deferred to cross-project sprint |
