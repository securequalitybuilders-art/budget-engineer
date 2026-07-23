import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

export type Severity = 'critical' | 'major' | 'minor' | 'info'
export type CheckState = 'pass' | 'warn' | 'fail' | 'info'

export interface CodeCheck {
  id: string
  category: string
  title: string
  severity: Severity
  state: CheckState
  requirement: string
  actual: string
  location?: string
  note: string
}

export interface CodeReviewResult {
  checks: CodeCheck[]
  summary: {
    pass: number
    warn: number
    fail: number
    info: number
    critical: number
    major: number
    score: number
  }
  decision: 'PASS' | 'CONDITIONAL PASS' | 'REVISE'
}

export interface CodeReviewInput {
  plan: PlanModel | null
  design: DesignOption | null
  buildingType: string
  occupantLoad?: number
  numberOfExits?: number
  maxTravelDistanceM?: number
  grossFloorArea?: number
}

function c(
  id: string, category: string, title: string, severity: Severity,
  state: CheckState, requirement: string, actual: string,
  note: string, location?: string,
): CodeCheck {
  return { id, category, title, severity, state, requirement, actual, note, location }
}

function getHabitableRooms(plan: PlanModel | null): { name: string; width: number; height: number; area: number }[] {
  const keywords = ['bedroom', 'living', 'dining', 'lounge', 'kitchen', 'classroom', 'office', 'consultation', 'ward', 'patient', 'study', 'playroom', 'gym', 'cinema', 'hall']
  if (!plan?.rooms) return []
  return plan.rooms
    .filter((r) => keywords.some((kw) => r.name.toLowerCase().includes(kw)))
    .map((r) => ({ name: r.name, width: r.width, height: r.height, area: r.width * r.height }))
}

function getWetRooms(plan: PlanModel | null): { name: string; width: number; height: number; area: number }[] {
  const keywords = ['bathroom', 'ensuite', 'kitchen', 'laundry', 'toilet', 'pantry']
  if (!plan?.rooms) return []
  return plan.rooms
    .filter((r) => keywords.some((kw) => r.name.toLowerCase().includes(kw)))
    .map((r) => ({ name: r.name, width: r.width, height: r.height, area: r.width * r.height }))
}

export function runCodeReview(input: CodeReviewInput): CodeReviewResult {
  const checks: CodeCheck[] = []
  const plan = input.plan
  const design = input.design
  const bt = input.buildingType || 'house'
  const isResidential = ['house', 'apartment', 'townhouse'].includes(bt)
  const occLoad = input.occupantLoad ?? (design ? Math.max(1, Math.round(design.grossFloorArea / 10)) : 0)
  const exits = input.numberOfExits ?? (occLoad > 49 ? 1 : 1)
  const gfa = input.grossFloorArea ?? design?.grossFloorArea ?? 0

  // 1. Room minimums
  const habitable = getHabitableRooms(plan)
  if (habitable.length > 0) {
    const minArea = isResidential ? 9 : 7.5
    const smallest = habitable.reduce((a, b) => (a.area < b.area ? a : b))
    checks.push(c(
      'cr-room-min-area', 'Room Minimums', 'Minimum habitable room area',
      'major', smallest.area >= minArea ? 'pass' : 'fail',
      isResidential ? '≥ 9 m² (bedroom/living)' : '≥ 7.5 m²',
      `${smallest.area.toFixed(1)} m² (${smallest.name})`,
      smallest.area >= minArea
        ? 'All habitable rooms meet minimum area'
        : `"${smallest.name}" is ${smallest.area.toFixed(1)} m² — below ${minArea} m² minimum`,
      smallest.name,
    ))

    const minWidth = isResidential ? 2.4 : 2.0
    const narrowest = habitable.reduce((a, b) => (Math.min(a.width, a.height) < Math.min(b.width, b.height) ? a : b))
    const narrowDim = Math.min(narrowest.width, narrowest.height)
    checks.push(c(
      'cr-room-min-width', 'Room Minimums', 'Minimum habitable room width',
      'major', narrowDim >= minWidth ? 'pass' : 'fail',
      isResidential ? '≥ 2.4 m' : '≥ 2.0 m',
      `${narrowDim.toFixed(2)} m (${narrowest.name})`,
      narrowDim >= minWidth ? 'All rooms meet minimum width' : `"${narrowest.name}" width ${narrowDim.toFixed(2)} m below ${minWidth} m`,
      narrowest.name,
    ))
  } else {
    checks.push(c('cr-room-min-area', 'Room Minimums', 'Minimum habitable room area', 'info', 'info', 'N/A', 'No habitable rooms', 'Use the AI Brief tab to generate a design with rooms.', ''))
  }

  // 2. Egress
  const needsTwo = occLoad > 49
  const hasTwo = exits >= 2
  let egressState: CheckState = 'pass'
  if (needsTwo && !hasTwo) egressState = 'fail'
  else if (!needsTwo && occLoad > 0) egressState = 'pass'
  else egressState = 'info'
  checks.push(c(
    'cr-egress-exits', 'Egress', 'Minimum number of exits',
    'critical', egressState,
    needsTwo ? '≥ 2 exits (>49 occupants)' : '≥ 1 exit',
    `${exits} exit(s) for ${occLoad} occupants`,
    egressState === 'pass' ? 'Egress provision adequate' : egressState === 'fail' ? `Need ≥ 2 exits for ${occLoad} occupants, only ${exits} provided` : 'No occupant load data',
    '',
  ))

  if (input.maxTravelDistanceM != null) {
    const maxDist = isResidential ? 30 : 45
    checks.push(c(
      'cr-egress-travel', 'Egress', 'Travel distance to exit',
      'critical', input.maxTravelDistanceM <= maxDist ? 'pass' : 'fail',
      `≤ ${maxDist} m`,
      `${input.maxTravelDistanceM} m`,
      input.maxTravelDistanceM <= maxDist ? 'Within allowable travel distance' : `Travel distance ${input.maxTravelDistanceM}m exceeds ${maxDist}m limit`,
      '',
    ))
  }

  // 3. Corridor widths
  if (plan?.walls) {
    const corridors = plan.rooms.filter((r) => r.name.toLowerCase().includes('hall') || r.name.toLowerCase().includes('corridor') || r.name.toLowerCase().includes('passage'))
    if (corridors.length > 0) {
      const minCorridor = 0.9
      const narrowest = corridors.reduce((a, b) => (Math.min(a.width, a.height) < Math.min(b.width, b.height) ? a : b))
      const cw = Math.min(narrowest.width, narrowest.height)
      checks.push(c(
        'cr-corridor-width', 'Corridor Widths', 'Minimum corridor width',
        'major', cw >= minCorridor ? 'pass' : 'fail',
        '≥ 0.9 m (standard), ≥ 1.2 m (accessible)',
        `${cw.toFixed(2)} m`,
        cw >= minCorridor ? 'Corridor width adequate' : `Corridor "${narrowest.name}" is ${cw.toFixed(2)} m — below 0.9 m minimum`,
        narrowest.name,
      ))
    }
  }

  // 4. Stair geometry
  checks.push(c(
    'cr-stair-geometry', 'Stair Geometry', 'Stair rise/going (max 175mm rise, min 250mm going)',
    'major', 'info',
    'Max rise 175mm, min going 250mm',
    'Not computed — stair dimensions not in plan data',
    'Add stair runs with rise and going dimensions to verify compliance with building code.',
    '',
  ))

  // 5. Accessibility
  const hasAccessiblePath = exits >= 2
  checks.push(c(
    'cr-accessibility', 'Accessibility', 'Accessible path to entrance',
    'major', hasAccessiblePath ? 'warn' : 'info',
    '≥ 1 accessible entrance at grade',
    hasAccessiblePath ? `${exits} exit(s) available` : 'No exit data',
    hasAccessiblePath
      ? 'Multiple exits suggest accessible path possible. Verify ramp gradients (max 1:12) and door widths (min 850mm).'
      : 'Generate a design to check accessible path requirements.',
    '',
  ))

  checks.push(c(
    'cr-accessibility-door', 'Accessibility', 'Clear door widths',
    'major', 'info',
    'Min 850 mm clear opening (SANS 10400 Part S / ZBC Part 6)',
    'Door width data not available',
    'Assign door widths in the plan. All habitable room doors should provide min 850mm clear opening width.',
    '',
  ))

  // 6. Daylight / ventilation
  if (habitable.length > 0) {
    checks.push(c(
      'cr-daylight-factor', 'Daylight / Ventilation', 'Minimum daylight factor for habitable rooms',
      'minor', 'warn',
      '≥ 2% average daylight factor',
      `${habitable.length} habitable room(s)`,
      'Daylight analysis requires window data. Ensure window area ≥ 10% of floor area for each habitable room.',
      '',
    ))
  }

  // 7. Sanitary counts
  const wetRooms = getWetRooms(plan)
  const hasWc = wetRooms.some((r) =>
    ['bathroom', 'ensuite', 'toilet'].some((kw) => r.name.toLowerCase().includes(kw)),
  )
  if (isResidential) {
    checks.push(c(
      'cr-sanitary-wc', 'Sanitary Counts', 'Minimum WC provision (residential)',
      'major', hasWc ? 'pass' : 'warn',
      '≥ 1 WC per dwelling',
      hasWc ? 'WC detected in plan' : 'No WC room detected',
      hasWc ? 'WC provision adequate for dwelling' : 'No WC room detected. Ensure at least one WC per dwelling unit.',
      '',
    ))
  }

  // 8. Occupancy
  checks.push(c(
    'cr-occupancy-load', 'Occupancy', 'Estimated occupant load vs. design intent',
    'minor', occLoad > 0 ? 'info' : 'warn',
    'Per building code occupancy classification',
    `${occLoad} persons (estimated from ${gfa.toFixed(0)} m²)`,
    occLoad > 0
      ? `Estimated ${occLoad} occupants at ~10 m²/person. Verify against use group classification.`
      : 'No occupant load data. Generate a design to compute.',
    '',
  ))

  // 9. Setbacks / site coverage
  if (gfa > 0) {
    const estSiteArea = gfa * 1.5
    const coverage = (gfa / estSiteArea) * 100
    checks.push(c(
      'cr-setbacks', 'Setbacks / Site Coverage', 'Building footprint vs. site area',
      'major', coverage <= 60 ? 'pass' : 'warn',
      '≤ 60% site coverage (typical)',
      `${coverage.toFixed(1)}% (est. site ${estSiteArea.toFixed(0)} m²)`,
      coverage <= 60
        ? 'Estimated site coverage within typical limit. Verify against local zoning by-laws.'
        : `Estimated coverage ${coverage.toFixed(1)}% exceeds 60%. Site boundary required for accurate check.`,
      '',
    ))
  }

  // 10. Fire separation
  const hasGarage = plan?.rooms?.some((r) => r.name.toLowerCase().includes('garage'))
  if (hasGarage) {
    checks.push(c(
      'cr-fire-garage', 'Fire Separation', 'Garage separation from habitable rooms',
      'critical', 'warn',
      'Garage to be separated by 30-min fire-rated construction',
      'Garage detected in plan',
      'Garage detected. Ensure 30-minute fire-rated wall/ceiling between garage and habitable areas. Verify with local authority.',
      '',
    ))
  } else {
    checks.push(c(
      'cr-fire-separation', 'Fire Separation', 'Party wall / fire separation',
      'major', 'info',
      'Per building code fire separation requirements',
      'No fire separation check performed',
      'Fire separation requirements depend on building size, use group, and proximity to boundaries. Verify with local authority.',
      '',
    ))
  }

  // Compute summary
  const passCount = checks.filter((c) => c.state === 'pass').length
  const warnCount = checks.filter((c) => c.state === 'warn').length
  const failCount = checks.filter((c) => c.state === 'fail').length
  const infoCount = checks.filter((c) => c.state === 'info').length
  const criticalCount = checks.filter((c) => c.severity === 'critical' && (c.state === 'fail' || c.state === 'warn')).length
  const majorCount = checks.filter((c) => c.severity === 'major' && (c.state === 'fail' || c.state === 'warn')).length

  const totalScored = passCount + warnCount + failCount
  const score = totalScored > 0 ? Math.round((passCount / totalScored) * 100) : 0

  let decision: 'PASS' | 'CONDITIONAL PASS' | 'REVISE'
  if (failCount === 0 && criticalCount === 0) {
    decision = warnCount > 0 ? 'CONDITIONAL PASS' : 'PASS'
  } else {
    decision = 'REVISE'
  }

  return {
    checks,
    summary: { pass: passCount, warn: warnCount, fail: failCount, info: infoCount, critical: criticalCount, major: majorCount, score },
    decision,
  }
}
