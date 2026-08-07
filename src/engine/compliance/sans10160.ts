import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'
import type { StructuralOccupancy } from '@/engine/calculators/structuralLoad'
import { classifyOccupancy, liveLoadKpaForClass, classLabel } from './occupancyMatrix'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'SANS 10160', title, status, actual, required, note }
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

/**
 * SANS 10160 — Basis of structural design and actions for buildings and
 * industrial structures (parts 2–5 relevant to design-stage verification):
 *
 *  - Part 2: Self-weight and imposed loads (occupancy live loads)
 *  - Part 3: Wind actions (Zimbabwe basic wind speed 25–28 m/s)
 *  - Part 4: Seismic actions (Zimbabwe zone factor 0.05, negligible)
 *  - Part 5: Basis for geotechnical design and actions
 */
export function evaluateSans10160Rules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = !['house', 'apartment', 'townhouse', 'dwelling'].includes(bt)
  const gfa = getGfa(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []

  // SANS 10160-2 — imposed (live) loads by occupancy
  const structural = input.analysis?.structural
  const occ = (structural?.occupancy ?? 'residential') as StructuralOccupancy
  const live = structural?.liveLoadKnm2 ?? 0
  const s10160Live = imposedLoadKpa(occ)
  const liveOk = live === 0 || live >= s10160Live - 0.01
  results.push(r(
    `${prefix}-s10160-2-live`, 'Imposed (live) loads (SANS 10160-2)',
    liveOk ? 'pass' : 'fail',
    live > 0 ? `${live.toFixed(2)} kN/m² used` : 'Loads not computed',
    `${s10160Live.toFixed(1)} kN/m² for ${occ} occupancy`,
    live > 0
      ? (liveOk
        ? `Applied live load ${live.toFixed(2)} kN/m² meets the ${s10160Live.toFixed(1)} kN/m² minimum for ${occ} occupancy${suffix}`
        : `Applied live load ${live.toFixed(2)} kN/m² is below the ${s10160Live.toFixed(1)} kN/m² minimum for ${occ} occupancy under SANS 10160-2 — check the occupancy category and increase the design load${suffix}`)
      : `Run design to compute structural loads; SANS 10160-2 prescribes ${s10160Live.toFixed(1)} kN/m² for ${occ} occupancy${suffix}`
  ))

  // SANS 10160-2 — imposed loads cross-checked against the SANS 10400-A class matrix
  const occClass = classifyOccupancy(bt)
  const matrixLive = liveLoadKpaForClass(occClass)
  const matrixLiveOk = live === 0 || live >= matrixLive - 0.01
  results.push(r(
    `${prefix}-s10160-2-live-class`, 'Imposed loads vs occupancy class matrix (SANS 10160-2 / 10400-A)',
    matrixLiveOk ? 'pass' : 'fail',
    live > 0 ? `${live.toFixed(2)} kN/m² used` : 'Loads not computed',
    `≥ ${matrixLive.toFixed(1)} kN/m² for class ${occClass} (${classLabel(occClass)})`,
    live > 0
      ? (matrixLiveOk
        ? `Applied live load ${live.toFixed(2)} kN/m² meets the ${matrixLive.toFixed(1)} kN/m² matrix minimum for occupancy class ${occClass} (${classLabel(occClass)})${suffix}`
        : `Applied live load ${live.toFixed(2)} kN/m² is below the ${matrixLive.toFixed(1)} kN/m² matrix minimum for occupancy class ${occClass} (${classLabel(occClass)}) under SANS 10400-A — check the occupancy category${suffix}`)
      : `Run design to compute structural loads; the ${occClass} occupancy matrix prescribes ${matrixLive.toFixed(1)} kN/m² live load${suffix}`
  ))

  // SANS 10160-2 — imposed load reduction / tributary check note
  if (live > 0) {
    results.push(r(
      `${prefix}-s10160-2-reduction`, 'Imposed load reduction & tributary verification (SANS 10160-2)',
      'warn',
      'Preliminary gravity check',
      'Reduction factors for columns/beams per §7',
      `SANS 10160-2 permits imposed-load reduction factors for members supporting large tributary areas (columns, transfer beams). Verify member-level loads and reductions with the structural engineer${suffix}`
    ))
  }

  // SANS 10160-3 — wind actions
  const windSpeed = zimbabweBasicWindSpeed(bt)
  results.push(r(
    `${prefix}-s10160-3-wind`, 'Wind actions (SANS 10160-3)',
    'warn',
    `Basic wind speed ≈ ${windSpeed} m/s (${bt === 'house' ? 'Zimbabwe low-rise' : 'site wind zone'})`,
    'Design for basic wind speed per regional zone',
    `Design wind pressures per SANS 10160-3 use a basic wind speed of ${windSpeed} m/s for Zimbabwe. For ${isNonRes ? 'non-residential or multi-storey' : 'low-rise'} buildings, confirm the terrain category, height exposure and dynamic response with the structural engineer${suffix}`
  ))

  // SANS 10160-4 — seismic actions
  results.push(r(
    `${prefix}-s10160-4-seismic`, 'Seismic actions (SANS 10160-4)',
    'pass', 'Zone factor 0.05 (low seismicity)', 'Zone factor per SANS 10160-4 map',
    `Zimbabwe lies in the low-seismicity zone of the SANS 10160-4 map (zone factor 0.05). Conventional construction is generally adequate, but higher-risk facilities (hospitals, tall structures) still require a seismic review${suffix}`
  ))

  // SANS 10160-5 — geotechnical design
  if (isNonRes || gfa > 800) {
    results.push(r(
      `${prefix}-s10160-5-geotech`, 'Geotechnical design (SANS 10160-5)',
      'warn', isNonRes ? 'Non-residential building' : `GFA ${gfa.toFixed(0)} m²`,
      'Geotechnical site investigation for ≥ moderate risk',
      `${isNonRes ? 'Non-residential' : 'Larger'} development requires a geotechnical site investigation (boreholes, bearing capacity, groundwater) per SANS 10160-5 before foundation design. SPT-based bearing verification recommended${suffix}`
    ))
  } else {
    results.push(r(
      `${prefix}-s10160-5-geotech`, 'Geotechnical design (SANS 10160-5)',
      'pass', 'Single-storey residential scale', 'Geotech investigation for ≥ moderate risk',
      `Single-storey residential development on competent ground may follow prescriptive foundation rules, but a geotechnical site investigation is still recommended where expansive soils (typical of Harare's black cotton clay areas) are suspected${suffix}`
    ))
  }

  return results
}

/** SANS 10160-2 imposed loads (kN/m²) by occupancy. */
export function imposedLoadKpa(occ: StructuralOccupancy): number {
  const map: Record<StructuralOccupancy, number> = {
    residential: 1.5,
    office: 2.5,
    retail: 4.0,
    industrial: 6.0,
    storage: 6.0,
    roof: 1.0,
    educational: 3.0,
    institutional: 3.0,
  }
  return map[occ] ?? 1.5
}

/** SANS 10160-3 basic wind speed (m/s) for Zimbabwe regions. */
export function zimbabweBasicWindSpeed(_bt: string): number {
  return 28
}
