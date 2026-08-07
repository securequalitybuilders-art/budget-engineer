import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'
import { getIsNonResidential } from './helpers'

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
 * plan's building type is mapped to a classification letter (A1–A3 dwelling,
 * F1–F3 business, G1 warehouse, H1–H2 factory, etc.).
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
  const occupancyOk = !occupancy || occupancyForClass(occClass) === occupancy
  results.push(r(
    `${prefix}-s10400-a-occupancy`, 'Occupancy classification (SANS 10400-A)',
    occupancyOk ? 'pass' : 'warn',
    `Classified ${occClass} (${classLabel(occClass)})`,
    classLabel(occClass),
    occupancyOk
      ? `Building type "${bt}" maps to occupancy class ${occClass} — the design's structural occupancy (${occupancy ?? 'n/a'}) is consistent${suffix}`
      : `Building type "${bt}" maps to occupancy class ${occClass} but structural analysis used "${occupancy}". Re-classify so all downstream requirements use the same class${suffix}`
  ))

  // SANS 10400-A — sprinkler triggers by occupancy
  const sprinklerArea = sprinklerThreshold(occClass)
  const isDwelling = ['A1', 'A2', 'A3'].includes(occClass)
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

/** SANS 10400-A occupancy class from a building type string. */
export function classifyOccupancy(bt: string): string {
  const b = bt.toLowerCase()
  if (b.includes('warehouse')) return 'G1'
  if (b.includes('factory') || b.includes('industrial') || b.includes('workshop') || b.includes('manufacturing')) return 'H1'
  if (b.includes('school') || b.includes('classroom') || b.includes('education') || b.includes('college')) return 'A2'
  if (b.includes('hotel') || b.includes('guest') || b.includes('boarding')) return 'A3'
  if (b.includes('clinic') || b.includes('hospital') || b.includes('medical') || b.includes('health')) return 'E1'
  if (b.includes('office')) return 'F1'
  if (b.includes('shop') || b.includes('retail') || b.includes('store')) return 'F2'
  if (b.includes('restaurant') || b.includes('cafe') || b.includes('bar')) return 'F3'
  if (b.includes('church') || b.includes('hall') || b.includes('assembly') || b.includes('theatre')) return 'J1'
  if (['house', 'apartment', 'townhouse', 'dwelling', 'flat'].some((k) => b.includes(k))) return 'A1'
  return isNonResidentialType(b) ? 'F1' : 'A1'
}

function isNonResidentialType(b: string): boolean {
  return !['house', 'apartment', 'townhouse', 'dwelling', 'flat'].some((k) => b.includes(k))
}

function classLabel(cls: string): string {
  const labels: Record<string, string> = {
    A1: 'Dwelling house (A1)',
    A2: 'Dwelling/boarding house — educational (A2)',
    A3: 'Dwelling/boarding house — hotel/guest (A3)',
    E1: 'Place of care — clinic/hospital (E1)',
    F1: 'Business & commerce — offices (F1)',
    F2: 'Business & commerce — shops (F2)',
    F3: 'Business & commerce — restaurants/bars (F3)',
    G1: 'Storage — warehouse (G1)',
    H1: 'Factory / industrial (H1)',
    J1: 'Assembly — church/hall/theatre (J1)',
  }
  return labels[cls] ?? `Class ${cls}`
}

function occupancyForClass(cls: string): string {
  const map: Record<string, string> = {
    A1: 'residential',
    A2: 'educational',
    A3: 'residential',
    E1: 'institutional',
    F1: 'office',
    F2: 'retail',
    F3: 'retail',
    G1: 'storage',
    H1: 'industrial',
    J1: 'institutional',
  }
  return map[cls] ?? 'residential'
}

function sprinklerThreshold(cls: string): number {
  const map: Record<string, number> = {
    A1: 0, // dwellings exempt; handled above
    A2: 0,
    A3: 0,
    E1: 500,
    F1: 1000,
    F2: 1000,
    F3: 500,
    G1: 2000,
    H1: 1000,
    J1: 500,
  }
  return map[cls] ?? 1000
}
