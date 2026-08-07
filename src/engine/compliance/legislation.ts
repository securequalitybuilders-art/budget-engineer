import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'
import { countStoreys, getIsNonResidential } from './helpers'
import { getRoomStandard } from '@/engine/standards/roomStandards'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Zimbabwean Legislation', title, status, actual, required, note }
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

/**
 * Zimbabwean legislation rules (gemini.md §4.1) — the primary statutes that
 * govern construction in Zimbabwe:
 *
 *  - Model Building By-laws 1977 (masonry/construction standards)
 *  - Regional, Town & Country Planning Act [Chapter 29:12] (setbacks, coverage, FAR)
 *  - Housing Standards and Control Act [Chapter 29:08] (room minimums)
 *  - Urban Councils Act [Chapter 29:15] (storey height limits)
 *  - Factories and Works Act [Chapter 14:08] (workplace health & safety)
 *  - Environmental Management Act [Chapter 20:27] (wetlands, EIA)
 *
 * NOTE: the Architects Act (SI 56/2025) is enforced separately via
 * `architectRegistry.ts` and is intentionally not duplicated here.
 */
export function evaluateLegislationRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = input.buildingType || 'house'
  const isNonRes = getIsNonResidential(bt)
  const gfa = getGfa(input)
  const storeys = countStoreys(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`

  const results: ComplianceResult[] = []

  // MBB 1977 — masonry construction
  const walls = input.plan?.walls ?? []
  const externalWalls = walls.filter((w) => w.type === 'external')
  const wallThk = externalWalls.length > 0
    ? Math.min(...externalWalls.map((w) => w.thickness)) * 1000
    : walls.length > 0
      ? Math.min(...walls.map((w) => w.thickness)) * 1000
      : 0
  results.push(r(
    `${prefix}-leg-mbb-masonry`, 'Masonry construction (Model Building By-laws 1977)',
    'warn',
    wallThk > 0 ? `Narrowest external wall ${wallThk.toFixed(0)} mm` : 'Wall thickness not in plan data',
    'External walls ≥ 230 mm load-bearing / ≥ 110 mm partition',
    wallThk > 0
      ? `Minimum external wall thickness is 230mm (two-skin / cavity) for load-bearing masonry; 110mm for internal partitions. Current narrowest is ${wallThk.toFixed(0)}mm. Confirm the wall schedule with the plans${suffix}`
      : `Model Building By-laws require masonry walls with a minimum 7 MPa brick/block strength. Add wall thickness data to the plan to verify${suffix}`
  ))

  // RT&CP Act Ch 29:12 — building line setbacks
  results.push(r(
    `${prefix}-leg-rtcp-setbacks`, 'Building line setbacks (RT&CP Act Ch 29:12)',
    'warn', 'Setbacks not in plan data', 'Front ≥ 4.5 m, side ≥ 1.5 m, rear ≥ 1.5 m',
    `Setbacks are set by the local authority's model scheme under the Regional, Town and Country Planning Act. Typical Harare rules: front building line 4.5m from the road reserve, side/rear 1.5m. Confirm against the scheme plan${suffix}`
  ))

  // RT&CP Act Ch 29:12 — floor area ratio
  if (gfa > 0) {
    const siteArea = gfa * 1.5
    const far = gfa / siteArea
    const ok = far <= 0.6
    results.push(r(
      `${prefix}-leg-rtcp-far`, 'Floor area ratio (RT&CP Act Ch 29:12)',
      ok ? 'pass' : 'fail',
      `FAR ≈ ${far.toFixed(2)} (est. site ${siteArea.toFixed(0)} m²)`,
      'FAR ≤ 0.6 (residential, typical)',
      ok
        ? `Floor area ratio ${far.toFixed(2)} within typical 0.6 limit for residential zones${suffix}`
        : `Floor area ratio ${far.toFixed(2)} exceeds typical 0.6 limit — consider reducing the building footprint or floor count${suffix}`
    ))
  } else {
    results.push(r(`${prefix}-leg-rtcp-far`, 'Floor area ratio (RT&CP Act Ch 29:12)', 'warn', 'No building data', 'FAR ≤ 0.6', `Enter building dimensions for a floor area ratio check${suffix}`))
  }

  // Housing Standards and Control Act Ch 29:08 — room minimums (registry-backed)
  const rooms = input.plan?.rooms ?? []
  if (rooms.length > 0) {
    const failures: string[] = []
    for (const room of rooms) {
      const std = getRoomStandard(room.name)
      const minW = Math.min(std.minWidth, std.minDepth)
      const minD = Math.max(std.minWidth, std.minDepth)
      const w = Math.min(room.width, room.height)
      const d = Math.max(room.width, room.height)
      if (w < minW - 0.001 || d < minD - 0.001) {
        failures.push(`"${room.name}" needs ≥ ${minW}×${minD} m (has ${w.toFixed(2)}×${d.toFixed(2)} m)`)
      }
    }
    const status: ComplianceStatus = failures.length === 0 ? 'pass' : 'fail'
    results.push(r(
      `${prefix}-leg-housing-room-min`, 'Room minimums (Housing Standards & Control Act Ch 29:08)',
      status,
      failures.length === 0 ? 'All rooms meet statutory minimums' : `${failures.length} room(s) undersized`,
      'Per housing standards schedule',
      failures.length === 0
        ? `All rooms satisfy the minimum dimensions schedule in the Housing Standards and Control Act (registry-backed: Bedroom 2.7×3.0, Kitchen 2.1×2.4, etc.)${suffix}`
        : failures.join('; ') + suffix
    ))
  } else {
    results.push(r(`${prefix}-leg-housing-room-min`, 'Room minimums (Housing Standards & Control Act Ch 29:08)', 'warn', 'No room data', 'Per housing standards schedule', `Add rooms to the plan to check minimum dimensions${suffix}`))
  }

  // Housing Standards Act Ch 29:08 — ceiling height
  const ceiling = input.plan && input.plan.rooms.length > 0 ? (input.plan.rooms[0].height > 2.4 ? input.plan.rooms[0].height : 3.0) : 3.0
  results.push(r(
    `${prefix}-leg-housing-ceiling`, 'Ceiling height (Housing Standards & Control Act Ch 29:08)',
    ceiling >= 2.4 ? 'pass' : 'fail',
    okCeiling(ceiling), '≥ 2.4 m habitable rooms / ≥ 2.1 m corridors',
    ceiling >= 2.4
      ? `Ceiling height ${formatCeiling(ceiling)} satisfies the 2.4m minimum for habitable rooms${suffix}`
      : `Ceiling height ${formatCeiling(ceiling)} is below the 2.4m minimum for habitable rooms${suffix}`
  ))

  // Urban Councils Act Ch 29:15 — storey height limit
  results.push(r(
    `${prefix}-leg-urban-storeys`, 'Storey height limit (Urban Councils Act Ch 29:15)',
    storeys <= 3 ? 'pass' : 'warn',
    `${storeys}-storey building`,
    'Typically ≤ 3 storeys in suburban residential zones',
    storeys <= 3
      ? `Building at ${storeys} storey(s) is within typical suburban limits; commercial/industrial zones permit more with council approval${suffix}`
      : `${storeys} storeys requires special council consent, fire-fighting vehicle access and a registered architect's certification under the Urban Councils Act${suffix}`
  ))

  // Factories & Works Act Ch 14:08 — workplace health & safety (non-residential)
  if (isNonRes) {
    const occupantLoad = input.analysis?.egress?.occupantLoad ?? 0
    results.push(r(
      `${prefix}-leg-factories-safety`, 'Workplace health & safety (Factories & Works Act Ch 14:08)',
      'warn',
      occupantLoad > 0 ? `~${occupantLoad} occupants` : 'Occupant load not computed',
      'Means of escape, ventilation, first aid per workplace regulations',
      `Non-residential premises are subject to the Factories and Works Act. Provide adequate means of escape, ventilation, lighting, sanitation and first-aid facilities as prescribed${suffix}`
    ))
  }

  // EMA Ch 20:27 — wetlands / watercourses
  results.push(r(
    `${prefix}-leg-ema-wetlands`, 'Wetlands & watercourses (Environmental Management Act Ch 20:27)',
    'warn', 'Site environs not assessed', 'No development within 30 m of a wetland/watercourse without EIA',
    `The Environmental Management Act protects wetlands and watercourses. A minimum 30m buffer from any wetland/watercourse is typically enforced and an EIA may be required before site works${suffix}`
  ))

  // EMA Ch 20:27 — sustainability / stormwater
  if (gfa > 0) {
    results.push(r(
      `${prefix}-leg-ema-stormwater`, 'Stormwater management (EMA Ch 20:27)',
      'warn', `${gfa.toFixed(0)} m² building`, 'On-site stormwater retention / discharge permit',
      `EMA requires stormwater plans for developments — manage runoff on site with retention/slow-release systems and obtain an EMA discharge permit before commencing works${suffix}`
    ))
  }

  return results
}

function okCeiling(ceiling: number): string {
  return ceiling >= 2.4 ? '≥ 2.4 m' : `< 2.4 m`
}

function formatCeiling(ceiling: number): string {
  return ceiling >= 2.4 ? '2.4 m+' : ceiling.toFixed(1)
}
