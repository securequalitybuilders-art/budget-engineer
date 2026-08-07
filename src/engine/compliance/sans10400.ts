import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'
import { getIsNonResidential } from './helpers'
import {
  classifyOccupancy,
  classLabel,
  compatibleOccupanciesForClass,
  isDwellingClass,
  liveLoadKpaForClass,
  maxTravelDistanceForClass,
  fireRatingMinForClass,
  accessibilityRequiredForClass,
  sprinklerThresholdForClass,
} from './occupancyMatrix'

export { classifyOccupancy, classLabel }

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'SANS 10400', title, status, actual, required, note }
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

/**
 * SANS 10400 — Parts A (Occupancy classes), K (Walls), W (Fire installation).
 *
 * Occupancy classification drives every other requirement in the code, so a
 * plan's building type is mapped to a classification letter (A1–A3 assembly /
 * instruction, B1–B3 dwellings, E1 office, F1–F3 business, G1 storage,
 * H1–H2 hotel/dormitory, J1–J3 industrial) via the occupancy matrix
 * (gemini.md §4.4).
 */
export function evaluateSans10400Rules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = getIsNonResidential(bt)
  const gfa = getGfa(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []

  // SANS 10400-A — occupancy classification
  const occClass = classifyOccupancy(bt)
  const occupancy = input.analysis?.structural?.occupancy
  const occupancyOk = !occupancy || compatibleOccupanciesForClass(occClass).includes(occupancy)
  results.push(r(
    `${prefix}-s10400-a-occupancy`, 'Occupancy classification (SANS 10400-A)',
    occupancyOk ? 'pass' : 'warn',
    `Classified ${occClass} (${classLabel(occClass)})`,
    classLabel(occClass),
    occupancyOk
      ? `Building type "${bt}" maps to occupancy class ${occClass} — the design's structural occupancy (${occupancy ?? 'n/a'}) is consistent${suffix}`
      : `Building type "${bt}" maps to occupancy class ${occClass} but structural analysis used "${occupancy}". Re-classify so all downstream requirements use the same class${suffix}`
  ))

  // SANS 10400-A — occupancy matrix parameters (live load / travel / fire / access)
  const liveLoad = liveLoadKpaForClass(occClass)
  const travelLimit = maxTravelDistanceForClass(occClass)
  const fireRatingMin = fireRatingMinForClass(occClass)
  const accessRequired = accessibilityRequiredForClass(occClass)
  results.push(r(
    `${prefix}-s10400-a-matrix`, 'Occupancy matrix parameters (SANS 10400-A)',
    'warn',
    `Class ${occClass} — ${liveLoad.toFixed(1)} kPa, ${travelLimit} m travel, ${fireRatingMin} min FRR, access ${accessRequired ? 'required' : 'not required'}`,
    'Per SANS 10400-A occupancy matrix',
    `For class ${occClass} (${classLabel(occClass)}): design live load ≥ ${liveLoad.toFixed(1)} kPa, max travel distance ≤ ${travelLimit} m, minimum fire resistance ${fireRatingMin} min, and ${accessRequired ? 'wheelchair accessibility required' : 'no accessibility requirement under the class matrix'}. Confirm with the design team${suffix}`
  ))

  // SANS 10400-A — sprinkler triggers by occupancy
  const sprinklerArea = sprinklerThresholdForClass(occClass)
  const isDwelling = isDwellingClass(occClass)
  if (isDwelling) {
    results.push(r(
      `${prefix}-s10400-a-sprinkler`, 'Sprinkler / fire-system trigger (SANS 10400-A/W)',
      'pass', `Class ${occClass} dwelling`, 'No automatic suppression required for dwellings',
      `Individual dwelling occupancies (class ${occClass}) are not required to install automatic fire suppression on floor-area grounds — portable extinguishers per SANS 10400-W apply${suffix}`
    ))
  } else if (gfa > 0) {
    const needsSprinkler = gfa > sprinklerArea
    results.push(r(
      `${prefix}-s10400-a-sprinkler`, 'Sprinkler / fire-system trigger (SANS 10400-A/W)',
      needsSprinkler ? 'warn' : 'pass',
      `${gfa.toFixed(0)} m² gross floor area`,
      `≤ ${sprinklerArea} m² before automatic fire suppression required`,
      needsSprinkler
        ? `Gross floor area ${gfa.toFixed(0)} m² exceeds the ${sprinklerArea} m² threshold for class ${occClass} — an automatic fire suppression system is likely required${suffix}`
        : `Gross floor area ${gfa.toFixed(0)} m² is within the ${sprinklerArea} m² threshold for class ${occClass}${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-s10400-a-sprinkler`, 'Sprinkler / fire-system trigger (SANS 10400-A/W)', 'warn', 'No floor area data', `≤ ${sprinklerArea} m²`, `Run design to compute gross floor area${suffix}`))
  }

  // SANS 10400-K — wall thickness & strength
  const walls = input.plan?.walls ?? []
  const externalWalls = walls.filter((w) => w.type === 'external')
  const wallThk = externalWalls.length > 0
    ? Math.min(...externalWalls.map((w) => w.thickness)) * 1000
    : walls.length > 0
      ? Math.min(...walls.map((w) => w.thickness)) * 1000
      : 0
  const kOk = wallThk === 0 || wallThk >= 90
  results.push(r(
    `${prefix}-s10400-k-walls`, 'Wall thickness & strength (SANS 10400-K)',
    kOk ? 'pass' : 'fail',
    wallThk > 0 ? `Narrowest wall ${wallThk.toFixed(0)} mm` : 'Wall thickness not in plan data',
    'Internal ≥ 90 mm, external ≥ 110 mm, load-bearing ≥ 140 mm (masonry ≥ 7 MPa)',
    wallThk > 0
      ? (kOk
        ? `Walls meet the SANS 10400-K minimum thickness schedule (≥ 90 mm non-load-bearing masonry)${suffix}`
        : `Narrowest wall is ${wallThk.toFixed(0)} mm — below the 90 mm minimum for masonry walls under SANS 10400-K${suffix}`)
      : `SANS 10400-K requires masonry walls at least 90mm thick with mortar strength matching the block strength (commonly ≥ 7 MPa). Add wall thickness data to the plan to verify${suffix}`
  ))

  // SANS 10400-K — cavity wall / damp proofing
  results.push(r(
    `${prefix}-s10400-k-dpc`, 'Damp-proofing & cavity walls (SANS 10400-K)',
    'warn', 'DPC not in plan data', 'DPC below first masonry course; cavity ≥ 50 mm with ties ≤ 900 mm',
    `Provide a damp-proof course at least 150mm above ground and wall ties at max 900mm horizontal / 450mm vertical spacing in cavity walls. Full-height cavity needed where cavity construction is used${suffix}`
  ))

  // SANS 10400-W — fire installation (extinguishers / hose reels)
  if (isNonRes && gfa > 0) {
    const extinguishers = Math.max(1, Math.ceil(gfa / 200))
    const hoseReels = Math.max(1, Math.ceil(gfa / 1000))
    results.push(r(
      `${prefix}-s10400-w-fire-install`, 'Fire installation provision (SANS 10400-W)',
      'warn',
      `${extinguishers} extinguisher(s), ${hoseReels} hose reel(s) approx.`,
      'Extinguishers per 200 m², hose reels per 1000 m² (non-residential)',
      `SANS 10400-W requires fire extinguishers (1 per ~200 m², within 30m travel) and, for larger premises, hose reels (1 per ~1000 m²) on escape routes. Confirm with the fire authority${suffix}`
    ))
  } else if (gfa > 0) {
    results.push(r(
      `${prefix}-s10400-w-fire-install`, 'Fire installation provision (SANS 10400-W)',
      'pass', 'Residential — small extinguisher set', 'Extinguisher on each floor near escape route',
      `Residential occupancy requires a suitable portable extinguisher (e.g. 2 kg dry chemical) on each floor, typically mounted near the kitchen and escape route${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-s10400-w-fire-install`, 'Fire installation provision (SANS 10400-W)', 'warn', 'No floor area data', 'Per SANS 10400-W', `Run design to compute floor area for fire installation requirements${suffix}`))
  }

  return results
}
