import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Fire Safety', title, status, actual, required, note }
}

function getIsNonResidential(bt: string): boolean {
  return !['house', 'apartment', 'townhouse', 'dwelling'].includes(bt)
}

function getOccupantLoad(input: ComplianceInput): number {
  return input.analysis?.egress?.occupantLoad ?? 0
}

function getNumberOfExits(input: ComplianceInput): number {
  return input.analysis?.egress?.numberOfExits ?? 0
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

function getHasGarage(input: ComplianceInput): boolean {
  if (!input.plan?.rooms) return false
  return input.plan.rooms.some((r) => r.name.toLowerCase().includes('garage'))
}

function countStoreys(_input: ComplianceInput): number {
  return 1
}

export function evaluateFireSafetyRules(input: ComplianceInput, jurisdictionPrefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = getIsNonResidential(bt)
  const occLoad = getOccupantLoad(input)
  const exits = getNumberOfExits(input)
  const gfa = getGfa(input)
  const hasGarage = getHasGarage(input)
  const storeys = countStoreys(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []

  // FIRE-01: Travel distance to exit
  const maxTravelResidential = 9
  const maxTravelSprinklered = 45
  const maxTravelUnprotected = 18
  const travelDist = input.analysis?.egress?.maxTravelDistanceM
  if (travelDist != null && travelDist > 0) {
    const limit = isNonRes ? (travelDist <= maxTravelSprinklered ? maxTravelSprinklered : maxTravelUnprotected) : maxTravelResidential
    results.push(r(
      `${jurisdictionPrefix}-fire-01`, 'Travel distance to exit',
      travelDist <= limit ? 'pass' : 'fail',
      `${travelDist} m`, `≤ ${limit} m`,
      travelDist <= limit ? `Travel distance ${travelDist}m within ${limit}m limit` : `Travel distance ${travelDist}m exceeds ${limit}m limit — consider additional exits or sprinklering${suffix}`
    ))
  } else {
    results.push(r(
      `${jurisdictionPrefix}-fire-01`, 'Travel distance to exit',
      'warn', 'Not computed', '≤ 9 m (residential) / ≤ 18-45 m (non-residential)',
      `Run design to compute max travel distance${suffix}`
    ))
  }

  // FIRE-02: Exit count
  let requiredExits = 1
  if (occLoad > 500) requiredExits = 3
  else if (occLoad > 49) requiredExits = 2
  const exitOk = exits >= requiredExits || occLoad === 0
  results.push(r(
    `${jurisdictionPrefix}-fire-02`, 'Exit count by occupancy',
    occLoad === 0 ? 'warn' : exitOk ? 'pass' : 'fail',
    `${exits} exit(s) for ${occLoad} occupants`,
    `≥ ${requiredExits} exit(s)`,
    occLoad === 0 ? `Run design to compute occupant load${suffix}` : exitOk ? `${exits} exit(s) adequate for ${occLoad} occupants${suffix}` : `Need ${requiredExits} exits for ${occLoad} occupants, only ${exits} provided${suffix}`
  ))

  // FIRE-03: Garage fire separation
  if (hasGarage) {
    results.push(r(
      `${jurisdictionPrefix}-fire-03`, 'Garage fire separation from habitable rooms',
      'warn', 'Garage detected in plan', 'FRL 30/30 separation required',
      `Garage detected. Ensure 30-minute fire-rated construction between garage and habitable areas (walls, ceilings). Include self-closing fire door if direct access.${suffix}`
    ))
  } else {
    results.push(r(
      `${jurisdictionPrefix}-fire-03`, 'Garage fire separation from habitable rooms',
      'pass', 'No garage detected', 'FRL 30/30 if garage present',
      `No garage in current plan${suffix}`
    ))
  }

  // FIRE-04: Kitchen-sleeping separation (multi-storey)
  if (storeys > 1) {
    results.push(r(
      `${jurisdictionPrefix}-fire-04`, 'Kitchen/sleeping separation',
      'warn', `${storeys}-storey building`, 'FRL 30/30 in multi-storey',
      `Multi-storey building. Ensure floor-ceiling assembly between kitchen/sleeping areas has minimum 30-min fire resistance. Verify with local authority.${suffix}`
    ))
  }

  // FIRE-05: Compartment size (non-residential)
  if (isNonRes && gfa > 0) {
    const maxCompartment = 2000
    results.push(r(
      `${jurisdictionPrefix}-fire-05`, 'Compartment size limit',
      gfa <= maxCompartment ? 'pass' : 'warn',
      `${gfa.toFixed(0)} m² total`, `≤ ${maxCompartment} m² per compartment`,
      gfa <= maxCompartment ? `Floor area ${gfa.toFixed(0)}m² within typical compartment limit` : `Floor area ${gfa.toFixed(0)}m² exceeds ${maxCompartment}m² — compartmentation or sprinklers may be required${suffix}`
    ))
  }

  // FIRE-06: Exit door width
  const minDoorWidth = isNonRes ? 1.0 : 0.85
  if (input.plan?.openings && input.plan.openings.length > 0) {
    const doors = input.plan.openings.filter((o) => o.kind === 'door')
    if (doors.length > 0) {
      const minWidth = Math.min(...doors.map((d) => d.width))
      results.push(r(
        `${jurisdictionPrefix}-fire-06`, 'Exit door width',
        minWidth >= minDoorWidth ? 'pass' : 'fail',
        `${(minWidth * 1000).toFixed(0)} mm (narrowest door)`,
        `≥ ${(minDoorWidth * 1000).toFixed(0)} mm`,
        minWidth >= minDoorWidth ? `All exit doors meet minimum width${suffix}` : `Narrowest door is ${(minWidth * 1000).toFixed(0)}mm — below ${(minDoorWidth * 1000).toFixed(0)}mm minimum${suffix}`
      ))
    } else {
      results.push(r(`${jurisdictionPrefix}-fire-06`, 'Exit door width', 'warn', 'No doors in plan', `≥ ${(minDoorWidth * 1000).toFixed(0)} mm`, `No door data to check${suffix}`))
    }
  } else {
    results.push(r(`${jurisdictionPrefix}-fire-06`, 'Exit door width', 'warn', 'No opening data', `≥ ${(minDoorWidth * 1000).toFixed(0)} mm`, `Add openings to the plan for door width check${suffix}`))
  }

  // FIRE-07: Stairwell enclosure (>2 storeys)
  if (storeys > 2) {
    results.push(r(
      `${jurisdictionPrefix}-fire-07`, 'Stairwell enclosure',
      'warn', `${storeys}-storey building`, 'FRL 60/60 for >2 storeys',
      `Building exceeds 2 storeys. Stairwells serving upper floors require 60-min fire-rated enclosure with self-closing fire doors at each level.${suffix}`
    ))
  }

  // FIRE-08: Smoke detection
  results.push(r(
    `${jurisdictionPrefix}-fire-08`, 'Smoke detection provision',
    'warn', gfa > 0 ? `${gfa.toFixed(0)} m² building` : 'No building data',
    'All habitable rooms + circulation',
    `Smoke detection recommended in all habitable rooms and circulation spaces. Hard-wired with battery backup per current codes.${suffix}`
  ))

  // FIRE-09: Emergency lighting (non-residential)
  if (isNonRes) {
    results.push(r(
      `${jurisdictionPrefix}-fire-09`, 'Emergency lighting (non-residential)',
      'warn', 'Non-residential building', 'Escape routes must have emergency lighting',
      `Non-residential building requires emergency lighting along escape routes with min 1-hour duration. Verify system design with fire engineer.${suffix}`
    ))
  }

  // FIRE-10: Fire extinguishers (non-residential)
  if (isNonRes && gfa > 0) {
    const extinguishersNeeded = Math.max(1, Math.ceil(gfa / 200))
    results.push(r(
      `${jurisdictionPrefix}-fire-10`, 'Fire extinguisher provision',
      'warn', `${extinguishersNeeded} extinguisher(s) recommended`, '1 per 200 m²',
      `Approximately ${extinguishersNeeded} fire extinguisher(s) needed. Position on escape routes, max 20m travel to extinguisher.${suffix}`
    ))
  }

  // FIRE-11: Fire hydrant access
  results.push(r(
    `${jurisdictionPrefix}-fire-11`, 'Fire hydrant / fire-fighting access',
    'warn', gfa > 0 ? `${gfa.toFixed(0)} m² building` : 'No building data',
    'Hydrant within 100m / fire engine access within 45m',
    `Verify fire hydrant location relative to building entry. Fire appliance access road required within 45m of fire main inlet. Confirm with fire authority.${suffix}`
  ))

  // FIRE-12: Fire-rated ceiling/floor
  if (storeys > 1) {
    const frl = storeys > 2 ? '90/90' : '60/60'
    results.push(r(
      `${jurisdictionPrefix}-fire-12`, 'Fire-rated floor/ceiling assembly',
      'warn', `${storeys}-storey building`, `FRL ${frl} between floors`,
      `Multi-storey building requires minimum ${frl} fire-resistance rating for floor/ceiling assemblies between levels. Verify structural fire protection with engineer.${suffix}`
    ))
  }

  // FIRE-13: Roof covering
  results.push(r(
    `${jurisdictionPrefix}-fire-13`, 'Roof covering classification',
    'warn', 'Not specified', 'Non-combustible or Class A/B',
    `Roof covering should be non-combustible or Class A/B rated. Common materials: concrete tiles (A), fibre-cement (A), metal sheeting (B). Verify specification.${suffix}`
  ))

  return results
}
