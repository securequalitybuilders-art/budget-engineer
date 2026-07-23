import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'MEP Services', title, status, actual, required, note }
}

function getIsNonResidential(bt: string): boolean {
  return !['house', 'apartment', 'townhouse', 'dwelling'].includes(bt)
}

function getWetRooms(input: ComplianceInput): { name: string; width: number; height: number }[] {
  const kw = ['bathroom', 'ensuite', 'kitchen', 'laundry', 'toilet', 'pantry']
  if (!input.plan?.rooms) return []
  return input.plan.rooms.filter((r) => kw.some((k) => r.name.toLowerCase().includes(k)))
}

function getHabitableRooms(input: ComplianceInput): { name: string }[] {
  const kw = ['bedroom', 'living', 'dining', 'lounge', 'study', 'office', 'kitchen', 'classroom', 'ward', 'patient']
  if (!input.plan?.rooms) return []
  return input.plan.rooms.filter((r) => kw.some((k) => r.name.toLowerCase().includes(k)))
}

function countStoreys(_input: ComplianceInput): number {
  return 1
}

function hasCommercialKitchen(plan: ComplianceInput['plan']): boolean {
  if (!plan?.rooms) return false
  return plan.rooms.some((r) => r.name.toLowerCase().includes('kitchen') && !r.name.toLowerCase().includes('residential'))
}

export function evaluateMepRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = getIsNonResidential(bt)
  const storeys = countStoreys(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []
  const wetRooms = getWetRooms(input)
  const habitable = getHabitableRooms(input)

  // ═══════════════ ELECTRICAL ═══════════════

  // MEP-E01: Socket outlet count
  const habitableCount = habitable.length
  const wetCount = wetRooms.length
  if (habitableCount > 0 || wetCount > 0) {
    results.push(r(
      `${prefix}-mep-e01`, 'Socket outlet provision',
      'warn', `${habitableCount + wetCount} room(s) detected`, 'Living/bedroom ≥ 4, Kitchen ≥ 6, Other ≥ 2',
      `Ensure adequate socket outlets in each room. Bedrooms/living: minimum 4 double sockets. Kitchen: minimum 6. Verify compliance with ${jurisdictionLabel}${suffix}`
    ))
  }

  // MEP-E02: Circuit breaker sizing
  results.push(r(
    `${prefix}-mep-e02`, 'Circuit breaker sizing',
    'warn', 'Circuit schedule not in plan', 'Lighting 6A, Sockets 20A, Stove 32A, Geyser 20A, AC 20A',
    `Standard circuit breaker ratings: lighting 6A/10A, socket outlets 20A, stove 32A, geyser 20A, air conditioner 20A. Verify with electrical engineer${suffix}`
  ))

  // MEP-E03: Earth leakage protection
  results.push(r(
    `${prefix}-mep-e03`, 'Earth leakage / RCD protection',
    'warn', 'Not verified from plan', '30mA RCD on all socket and lighting circuits',
    `All socket outlet circuits and lighting circuits must be protected by 30mA residual current devices (RCD/earth leakage). Verify with electrical engineer${suffix}`
  ))

  // MEP-E04: DB location
  results.push(r(
    `${prefix}-mep-e04`, 'Distribution board location',
    'warn', 'DB location not in plan', 'Accessible location, not in bathroom or outside',
    `Distribution board should be in an accessible location (hallway or utility), not in a bathroom, wet room, or external location without weather protection. Verify with electrical engineer${suffix}`
  ))

  // MEP-E05: Wet area electrical zones
  if (wetRooms.length > 0) {
    const bathroomCount = wetRooms.filter((r) =>
      ['bathroom', 'ensuite', 'toilet'].some((k) => r.name.toLowerCase().includes(k))
    ).length
    results.push(r(
      `${prefix}-mep-e05`, 'Wet area electrical zones',
      'warn', `${bathroomCount} bathroom(s) detected`, 'No sockets in Zone 0, IPX4 min in Zone 1-2',
      `${bathroomCount} bathroom(s) detected. No sockets permitted in Zone 0 (inside bath/shower). Zone 1 requires IPX4 minimum. Zone 2 requires IPX4. Verify with electrical engineer${suffix}`
    ))
  }

  // MEP-E06: Solar PV readiness
  results.push(r(
    `${prefix}-mep-e06`, 'Solar PV / renewable energy readiness',
    'warn', 'Not specified in plan', 'Conduit provision for future solar PV',
    `Recommend provision for future solar PV installation: 25mm conduit from DB to roof space, dedicated breaker way in DB, and roof space allocation. Verify with electrical engineer${suffix}`
  ))

  // ═══════════════ PLUMBING ═══════════════

  // MEP-P01: WC provision
  if (isNonRes) {
    const occLoad = input.analysis?.egress?.occupantLoad ?? 0
    if (occLoad > 0) {
      const wcsNeeded = Math.max(1, Math.ceil(occLoad / 25))
      results.push(r(
        `${prefix}-mep-p01`, 'WC provision (non-residential)',
        'warn', `${wcsNeeded} WC(s) recommended for ${occLoad} occupants`, '≥ 1 WC per 25 occupants',
        `Non-residential: approximately ${wcsNeeded} WC(s) needed. Separate male/female for >50 occupants. Verify with building control${suffix}`
      ))
    } else {
      results.push(r(`${prefix}-mep-p01`, 'WC provision (non-residential)', 'warn', 'No occupant load data', '≥ 1 WC per 25 occupants', `Run design to compute occupant load for WC count${suffix}`))
    }
  } else {
    results.push(r(`${prefix}-mep-p01`, 'WC provision (residential)', 'pass', 'Residential dwelling', '≥ 1 WC per dwelling', `Residential dwelling — minimum 1 WC required${suffix}`))
  }

  // MEP-P02: Trap provision
  if (wetRooms.length > 0) {
    results.push(r(
      `${prefix}-mep-p02`, 'Plumbing trap provision',
      'warn', `${wetRooms.length} wet room(s)`, 'Every fixture must have a trap (min 50mm seal)',
      `Every plumbing fixture requires a trap with minimum 50mm water seal to prevent sewer gas ingress. Bathroom basins and sinks typically have P-traps. Verify with plumber${suffix}`
    ))
  }

  // MEP-P03: Vent stack (multi-storey)
  if (storeys > 1) {
    results.push(r(
      `${prefix}-mep-p03`, 'Vent stack / soil stack ventilation',
      'warn', `${storeys}-storey building`, 'Vent stack required for multi-storey drainage',
      `Multi-storey building requires a vent stack connected to the soil stack, extending through the roof. Minimum 50mm diameter. Verify with plumber${suffix}`
    ))
  }

  // MEP-P04: Grease trap (commercial kitchens)
  if (hasCommercialKitchen(input.plan)) {
    results.push(r(
      `${prefix}-mep-p04`, 'Grease trap for commercial kitchen',
      'warn', 'Commercial kitchen detected', 'Grease interceptor / grease trap required',
      `Commercial kitchen requires a grease trap/interceptor to prevent fat/oil/grease entering the sewer system. Size based on flow rate. Verify with plumber${suffix}`
    ))
  }

  // MEP-P05: Hot water system
  results.push(r(
    `${prefix}-mep-p05`, 'Hot water system / solar readiness',
    'warn', 'Hot water system not specified', 'Solar water heating recommended',
    `Solar water heating recommended for energy efficiency. Minimum 150L geyser for 3-bedroom house. Alternative: heat pump. Verify with plumber and local by-laws${suffix}`
  ))

  // ═══════════════ VENTILATION ═══════════════

  // MEP-V01: Minimum air changes
  const bedrooms = habitable.filter((r) => r.name.toLowerCase().includes('bedroom')).length
  if (habitable.length > 0) {
    results.push(r(
      `${prefix}-mep-v01`, 'Minimum ventilation / air changes',
      'warn', `${habitable.length} habitable room(s), ${bedrooms} bedroom(s)`, 'Bedroom 2 ACH, Living 1.5 ACH, Kitchen 10 ACH',
      `Minimum air changes per hour: Bedrooms 2 ACH, Living areas 1-1.5 ACH (openable window 5% of floor), Kitchen 10 ACH (mechanical), Bathrooms 5 ACH (mechanical). Verify with building services engineer${suffix}`
    ))
  }

  // MEP-V02: Extract fan in wet rooms
  if (wetRooms.length > 0) {
    const roomsNeedingFan = wetRooms.filter((r) =>
      ['bathroom', 'ensuite', 'toilet', 'kitchen', 'laundry'].some((k) => r.name.toLowerCase().includes(k))
    ).length
    results.push(r(
      `${prefix}-mep-v02`, 'Extract fan provision in wet rooms',
      'warn', `${roomsNeedingFan} wet room(s) need mechanical extraction`, 'All wet rooms require extract fan (min 25 L/s)',
      `Extract fans required in all wet rooms: bathrooms (25 L/s), kitchens (60 L/s), laundry. Ducted to outside. Verify with building services engineer${suffix}`
    ))
  }

  return results
}
