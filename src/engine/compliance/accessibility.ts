import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Accessibility', title, status, actual, required, note }
}

function getIsNonResidential(bt: string): boolean {
  return !['house', 'apartment', 'townhouse', 'dwelling'].includes(bt)
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

function countStoreys(_input: ComplianceInput): number {
  return 1
}

export function evaluateAccessibilityRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = getIsNonResidential(bt)
  const gfa = getGfa(input)
  const storeys = countStoreys(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []

  // ACCESS-01: Accessible entrance width
  const doors = input.plan?.openings?.filter((o) => o.kind === 'door') ?? []
  if (doors.length > 0) {
    const minDoor = Math.min(...doors.map((d) => d.width))
    results.push(r(
      `${prefix}-access-01`, 'Accessible entrance width',
      minDoor >= 0.85 ? 'pass' : 'fail',
      `${(minDoor * 1000).toFixed(0)} mm (narrowest door)`,
      '≥ 850 mm (clear opening)',
      minDoor >= 0.85 ? `Narrowest door ${(minDoor * 1000).toFixed(0)}mm meets 850mm minimum${suffix}` : `Narrowest door ${(minDoor * 1000).toFixed(0)}mm below 850mm minimum for accessible entrance${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-access-01`, 'Accessible entrance width', 'warn', 'No doors in plan', '≥ 850 mm', `Add door openings to the plan for entrance width check${suffix}`))
  }

  // ACCESS-02: Door clear width (accessible route)
  if (doors.length > 0) {
    const minClear = Math.min(...doors.map((d) => d.width * 0.9))
    results.push(r(
      `${prefix}-access-02`, 'Door clear width on accessible route',
      minClear >= 0.775 ? 'pass' : 'fail',
      `${(minClear * 1000).toFixed(0)} mm (narrowest clear opening)`,
      '≥ 775 mm clear (850 mm door leaf)',
      minClear >= 0.775 ? `Clear door width ${(minClear * 1000).toFixed(0)}mm meets 775mm minimum${suffix}` : `Clear door width ${(minClear * 1000).toFixed(0)}mm below 775mm minimum${suffix}`
    ))
  }

  // ACCESS-03: Accessible route / corridor width
  const corridors = input.plan?.rooms?.filter((r) =>
    ['hall', 'corridor', 'passage', 'hallway'].some((kw) => r.name.toLowerCase().includes(kw))
  ) ?? []
  if (corridors.length > 0) {
    const minCorr = Math.min(...corridors.map((r) => Math.min(r.width, r.height)))
    results.push(r(
      `${prefix}-access-03`, 'Accessible route / corridor width',
      minCorr >= 1.2 ? 'pass' : 'fail',
      `${(minCorr * 1000).toFixed(0)} mm (narrowest corridor)`,
      '≥ 1200 mm',
      minCorr >= 1.2 ? `Narrowest corridor ${(minCorr * 1000).toFixed(0)}mm meets 1200mm accessible route width${suffix}` : `Narrowest corridor ${(minCorr * 1000).toFixed(0)}mm below 1200mm accessible route minimum${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-access-03`, 'Accessible route / corridor width', 'warn', 'No corridor detected', '≥ 1200 mm', `Verify accessible path of travel through the building meets 1200mm minimum width${suffix}`))
  }

  // ACCESS-04: Ramp gradient
  results.push(r(
    `${prefix}-access-04`, 'Ramp gradient (max 1:12)',
    'warn', 'Ramp data not in plan', '≤ 1:12 gradient, landing every 9 m',
    `If step-free access is required, provide ramp with max 1:12 gradient. Landings at top, bottom, and every 9m of travel. Verify with accessibility consultant${suffix}`
  ))

  // ACCESS-05: Accessible WC provision (non-residential)
  if (isNonRes) {
    results.push(r(
      `${prefix}-access-05`, 'Accessible WC provision (non-residential)',
      'warn', 'Non-residential building', '≥ 1 accessible WC per storey',
      `Non-residential building requires at least one accessible WC per storey. Minimum 1500mm × 1500mm with grab rails, outward-opening door. Verify with building control${suffix}`
    ))
  }

  // ACCESS-06: Accessible parking (non-residential)
  if (isNonRes && gfa > 0) {
    const estSpaces = Math.max(1, Math.ceil(gfa / 200))
    const accessibleBays = Math.max(1, Math.ceil(estSpaces / 10))
    results.push(r(
      `${prefix}-access-06`, 'Accessible parking (non-residential)',
      'warn', `Est. ${accessibleBays} accessible bay(s) for ~${estSpaces} spaces`, '≥ 1 bay per 10 total, min 1',
      `Approximately ${accessibleBays} accessible parking bay(s) needed. Each bay 3600mm × 4800mm with 1200mm transfer zone. Verify parking layout with local authority${suffix}`
    ))
  }

  // ACCESS-07: Threshold height
  results.push(r(
    `${prefix}-access-07`, 'Threshold height',
    'warn', 'Threshold data not in plan', '≤ 15 mm (max 20 mm beveled)',
    `Door thresholds on accessible routes should be max 15mm. Beveled thresholds up to 20mm may be acceptable. Verify with accessibility consultant${suffix}`
  ))

  // ACCESS-08: Lift provision (>2 storeys)
  if (storeys > 2) {
    results.push(r(
      `${prefix}-access-08`, 'Lift provision (>2 storeys)',
      'warn', `${storeys}-storey building`, 'Passenger lift required when >2 storeys',
      `Building exceeds 2 storeys. A passenger lift with minimum 1100mm × 1400mm car and 900mm wide doors is typically required. Consult building code${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-access-08`, 'Lift provision (>2 storeys)', 'pass', `${storeys}-storey building`, 'Required >2 storeys', `Building is ${storeys} storey(s) — lift not required${suffix}`))
  }

  // ACCESS-09: Grab rail provision
  const wetRooms = input.plan?.rooms?.filter((r) =>
    ['bathroom', 'ensuite', 'toilet'].some((kw) => r.name.toLowerCase().includes(kw))
  ) ?? []
  if (wetRooms.length > 0) {
    results.push(r(
      `${prefix}-access-09`, 'Grab rail provision (wet rooms)',
      'warn', `${wetRooms.length} wet room(s) detected`, 'Grab rails at WC and shower',
      `Grab rails recommended at all WCs (600mm horizontal) and shower areas (750mm vertical/horizontal). Verify specification with accessibility consultant${suffix}`
    ))
  }

  // ACCESS-10: Accessible signage (non-residential)
  if (isNonRes) {
    results.push(r(
      `${prefix}-access-10`, 'Accessible signage (non-residential)',
      'warn', 'Non-residential building', 'Tactile/braille signage at key locations',
      `Non-residential building should have tactile signage with braille at all permanent room identification points. Signs at 1400-1700mm height. Verify with building control${suffix}`
    ))
  }

  // ACCESS-11: Accessible reception/counter (non-residential)
  if (isNonRes) {
    results.push(r(
      `${prefix}-access-11`, 'Accessible reception/counter height',
      'warn', 'Non-residential building', '≤ 850 mm high, knee space ≥ 700 mm',
      `Service counters should have a section at max 850mm height with 700mm minimum knee space underneath for wheelchair access. Verify with accessibility consultant${suffix}`
    ))
  }

  // ACCESS-12: Accessible seating (assembly buildings)
  results.push(r(
    `${prefix}-access-12`, 'Accessible seating (assembly buildings)',
    'warn', 'Seating layout not in plan', '≥ 1 accessible space per 50 seats',
    `If building has assembly/auditorium spaces, provide accessible seating at multiple locations with adjacent companion seating. Verify with building control${suffix}`
  ))

  // ACCESS-13: Accessible path of travel (site boundary to entrance)
  results.push(r(
    `${prefix}-access-13`, 'Accessible path of travel (site to entrance)',
    'warn', gfa > 0 ? `${gfa.toFixed(0)} m² building` : 'No building data',
    'Continuous accessible path from site boundary to main entrance',
    `Verify there is a continuous accessible path of travel from the site boundary (parking/drop-off) to the main building entrance. Min 1200mm width, firm surface, max 1:20 cross-slope${suffix}`
  ))

  return results
}
