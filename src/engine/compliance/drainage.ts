import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Drainage / Water', title, status, actual, required, note }
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

function getRoomsNamed(input: ComplianceInput, keywords: string[]): number {
  if (!input.plan?.rooms) return 0
  return input.plan.rooms.filter((r) => keywords.some((k) => r.name.toLowerCase().includes(k))).length
}

export interface FixtureUnitSpec {
  fixture: string
  units: number
}

/**
 * Fixture-unit loading per fixture type (SANS 10400-P / SABS 0140-2).
 * Used to size drain pipes: each fixture contributes a nominal loading so a
 * 100 mm drain at 1:60 handles ~90 FU, 150 mm at 1:80 handles ~180 FU.
 */
export const FIXTURE_UNIT_TABLE: FixtureUnitSpec[] = [
  { fixture: 'WC', units: 4 },
  { fixture: 'Wash basin', units: 1 },
  { fixture: 'Bath', units: 2 },
  { fixture: 'Shower', units: 2 },
  { fixture: 'Kitchen sink', units: 2 },
  { fixture: 'Laundry tub', units: 3 },
  { fixture: 'Urinal', units: 2 },
]

const FIXTURE_UNITS_BY_NAME: Record<string, number> = Object.fromEntries(
  FIXTURE_UNIT_TABLE.map((f) => [f.fixture, f.units])
)

interface RoomFixtureProfile {
  matches: string[]
  fixtures: { fixture: string; count: number }[]
}

const ROOM_FIXTURE_PROFILES: RoomFixtureProfile[] = [
  { matches: ['bathroom', 'ensuite'], fixtures: [{ fixture: 'WC', count: 1 }, { fixture: 'Wash basin', count: 1 }, { fixture: 'Bath', count: 1 }, { fixture: 'Shower', count: 1 }] },
  { matches: ['toilet', 'wc'], fixtures: [{ fixture: 'WC', count: 1 }] },
  { matches: ['kitchen'], fixtures: [{ fixture: 'Kitchen sink', count: 1 }] },
  { matches: ['laundry'], fixtures: [{ fixture: 'Laundry tub', count: 1 }] },
  { matches: ['urinal'], fixtures: [{ fixture: 'Urinal', count: 1 }] },
]

export function countFixtureUnits(input: ComplianceInput): { total: number; perFixture: Record<string, number>; rooms: number } {
  const rooms = input.plan?.rooms ?? []
  if (rooms.length === 0) return { total: 0, perFixture: {}, rooms: 0 }
  const perFixture: Record<string, number> = {}
  let matchedRooms = 0
  for (const room of rooms) {
    const name = room.name.toLowerCase()
    const profile = ROOM_FIXTURE_PROFILES.find((p) => p.matches.some((m) => name.includes(m)))
    if (!profile) continue
    matchedRooms += 1
    for (const f of profile.fixtures) {
      perFixture[f.fixture] = (perFixture[f.fixture] ?? 0) + f.count
    }
  }
  const total = Object.entries(perFixture).reduce(
    (sum, [fixture, count]) => sum + (FIXTURE_UNITS_BY_NAME[fixture] ?? 0) * count,
    0
  )
  return { total, perFixture, rooms: matchedRooms }
}

export function suggestDrainSize(totalFu: number): string {
  if (totalFu <= 0) return 'n/a'
  if (totalFu <= 30) return '75 mm'
  if (totalFu <= 90) return '100 mm'
  if (totalFu <= 180) return '150 mm'
  return '≥ 150 mm (check stack sizing)'
}

export function evaluateDrainageRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`
  const gfa = getGfa(input)
  const wetRooms = getRoomsNamed(input, ['bathroom', 'ensuite', 'kitchen', 'laundry', 'toilet'])
  const bathroomCount = getRoomsNamed(input, ['bathroom', 'ensuite', 'toilet'])
  const results: ComplianceResult[] = []

  // DRN-01: Stormwater drainage
  if (gfa > 0) {
    results.push(r(
      `${prefix}-drn-01`, 'Stormwater drainage provision',
      'warn', `${gfa.toFixed(0)} m² building`, 'Stormwater system to handle 1:20 year storm event',
      `Building of ${gfa.toFixed(0)}m² requires stormwater drainage to safely convey roof and site runoff to approved discharge point. Soakaways or stormwater mains. Verify with civil engineer${suffix}`
    ))
  }

  // DRN-02: Foul water drainage (sewer connection)
  results.push(r(
    `${prefix}-drn-02`, 'Foul water / sewer connection',
    'warn', wetRooms > 0 ? `${wetRooms} wet room(s)` : 'No wet rooms', 'Connect to mains sewer or septic tank system',
    wetRooms > 0
      ? `${wetRooms} wet room(s) detected. Connect foul drainage to mains sewer where available, or provide septic tank with soakaway. Verify with local authority${suffix}`
      : `No wet rooms detected — foul drainage not applicable${suffix}`
  ))

  // DRN-03: Drain pipe gradient
  results.push(r(
    `${prefix}-drn-03`, 'Drain pipe gradient (self-cleansing velocity)',
    'warn', 'Pipe gradients not in plan', 'Min 1:60 (100mm), Min 1:80 (150mm)',
    `Drain pipes must be laid to minimum gradients for self-cleansing velocity: 100mm pipe at 1:60, 150mm pipe at 1:80. Inspection chambers at every change of direction. Verify with plumber${suffix}`
  ))

  // DRN-04: Inspection chambers / manholes
  results.push(r(
    `${prefix}-drn-04`, 'Inspection chambers / manholes',
    'warn', 'Drainage layout not in plan', 'At every change of direction, junction, and max 30m spacing',
    `Inspection chambers required at every change of direction, junction, and at maximum 30m intervals on straight runs. Minimum 450mm diameter for access. Verify with plumber${suffix}`
  ))

  // DRN-05: Soakaway / on-site infiltration
  if (bathroomCount > 0) {
    results.push(r(
      `${prefix}-drn-05`, 'Soakaway / on-site effluent disposal',
      'warn', `${bathroomCount} WC(s) detected`, 'Soakaway size based on percolation test',
      `For on-site sewage disposal, percolation test required to determine soakaway size. Minimum 1.5m from buildings, 15m from water supply. Verify with environmental health officer${suffix}`
    ))
  }

  // DRN-06: Gutters and downpipes
  if (gfa > 0) {
    const estRoofArea = gfa * 0.7
    results.push(r(
      `${prefix}-drn-06`, 'Gutters and downpipes',
      'warn', `Est. ${estRoofArea.toFixed(0)} m² roof area`, '100mm min gutter, 75mm downpipe, 1 per 15m roof length',
      `Gutters (min 100mm half-round) and downpipes (min 75mm) required. One downpipe per 15m of roof length. Adequate overflow provision. Verify with plumber${suffix}`
    ))
  }

  // DRN-07: Water supply backflow prevention
  results.push(r(
    `${prefix}-drn-07`, 'Water supply backflow prevention',
    'warn', 'Backflow prevention not specified', 'RPZ valve on mains connection (non-residential)',
    `Backflow prevention device required on mains water connection. Residential: dual-check valve. Non-residential: reduced pressure zone (RPZ) valve. Verify with water authority${suffix}`
  ))

  // DRN-08: Fixture units per fixture type (SANS 10400-P)
  const fu = countFixtureUnits(input)
  if (fu.total > 0) {
    const breakdown = Object.entries(fu.perFixture)
      .map(([fixture, count]) => `${count}× ${fixture}`)
      .join(', ')
    results.push(r(
      `${prefix}-drn-08`, 'Fixture units per fixture type (SANS 10400-P)',
      'warn', `${fu.total} FU across ${fu.rooms} fixture room(s) (${breakdown})`, 'Pipe sized for total FU: ≤30 → 75mm, ≤90 → 100mm, ≤180 → 150mm',
      `Estimated fixture-unit loading is ${fu.total} FU. Recommended drain size: ${suggestDrainSize(fu.total)} at 1:60 gradient (100mm) or 1:80 (150mm). Verify with plumber${suffix}`
    ))
  } else {
    results.push(r(
      `${prefix}-drn-08`, 'Fixture units per fixture type (SANS 10400-P)',
      'warn', 'No fixture rooms in plan', 'Pipe sized for total FU (75/100/150mm)', `Add bathroom/kitchen/laundry rooms to estimate fixture-unit loading for drain sizing${suffix}`
    ))
  }

  return results
}
