import { roomArea } from '@/lib/geometry/plan-geometry'
import type { ComplianceRuleDef, ComplianceInput, ComplianceResult, ComplianceStatus } from './types'
import { evaluateFireSafetyRules } from './fireSafety'
import { evaluateAccessibilityRules } from './accessibility'
import { evaluateStructuralRules } from './structural'

const HABITABLE_KEYWORDS = ['bedroom', 'living', 'dining', 'lounge', 'kitchen', 'classroom', 'office', 'consultation', 'ward', 'patient']

function isHabitable(name: string): boolean {
  const lower = name.toLowerCase()
  return HABITABLE_KEYWORDS.some((kw) => lower.includes(kw))
}

function getHabitableRooms(input: ComplianceInput): { name: string; width: number; height: number; area: number }[] {
  if (!input.plan?.rooms) return []
  return input.plan.rooms
    .filter((r) => isHabitable(r.name))
    .map((r) => ({ name: r.name, width: r.width, height: r.height, area: roomArea(r) }))
}

function r(ruleId: string, category: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category, title, status, actual, required, note }
}

export const SANS_RULES: ComplianceRuleDef[] = [

  {
    id: 'sans-min-room-area',
    jurisdiction: 'south-africa',
    category: 'Space Standards',
    title: 'Minimum habitable room area',
    requirement: 'First habitable room ≥ 6.0 m², others ≥ 4.5 m² (SANS 10400-C, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const rooms = getHabitableRooms(input)
      if (rooms.length === 0) return r('sans-min-room-area', 'Space Standards', 'Minimum habitable room area', 'warn', 'No habitable rooms', '≥ 6.0 / 4.5 m²', 'No habitable room data to check. Approximate — verify with local authority.')
      const sorted = [...rooms].sort((a, b) => b.area - a.area)
      const first = sorted[0]
      const rest = sorted.slice(1)
      const firstOk = first.area >= 6.0
      const restOk = rest.length === 0 || rest.every((r) => r.area >= 4.5)
      const anyFail = !firstOk || !restOk
      const status: ComplianceStatus = anyFail ? 'fail' : 'pass'
      const failures: string[] = []
      if (!firstOk) failures.push(`"${first.name}" is ${first.area.toFixed(1)} m² — below 6.0 m² minimum`)
      for (const r of rest) {
        if (r.area < 4.5) failures.push(`"${r.name}" is ${r.area.toFixed(1)} m² — below 4.5 m² minimum`)
      }
      const note = failures.length > 0
        ? failures.join('; ')
        : `All habitable rooms meet minimum area requirements (first ≥ 6.0, others ≥ 4.5 m²)`
      return r('sans-min-room-area', 'Space Standards', 'Minimum habitable room area', status, `${first.area.toFixed(1)} m² (first)`, '≥ 6.0 / 4.5 m²', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-min-room-width',
    jurisdiction: 'south-africa',
    category: 'Space Standards',
    title: 'Minimum habitable room dimension',
    requirement: 'Habitable rooms minimum width ≥ 2.0 m (SANS 10400-C, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const rooms = getHabitableRooms(input)
      if (rooms.length === 0) return r('sans-min-room-width', 'Space Standards', 'Minimum habitable room dimension', 'warn', 'No habitable rooms', '≥ 2.0 m', 'No habitable room data to check. Approximate — verify with local authority.')
      const minWidth = Math.min(...rooms.map((r) => Math.min(r.width, r.height)))
      const ok = minWidth >= 2.0
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const worst = rooms.find((r) => Math.min(r.width, r.height) === minWidth)
      const note = ok
        ? 'All habitable rooms meet minimum dimension requirement'
        : `"${worst?.name}" has min dimension ${minWidth.toFixed(2)} m — below 2.0 m minimum`
      return r('sans-min-room-width', 'Space Standards', 'Minimum habitable room dimension', status, `${minWidth.toFixed(2)} m`, '≥ 2.0 m', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-ceiling-height',
    jurisdiction: 'south-africa',
    category: 'Space Standards',
    title: 'Minimum ceiling height',
    requirement: 'Habitable rooms ≥ 2.4 m, passages ≥ 2.1 m (SANS 10400-C, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const height = input.plan && input.plan.rooms.length > 0 ? (input.plan.rooms[0].height > 2.4 ? input.plan.rooms[0].height : 3.0) : 3.0
      const ok = height >= 2.4
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? 'Ceiling height ≥ 2.4 m (default 3.0 m assumed)' : 'Ceiling height may be below 2.4 m minimum'
      return r('sans-ceiling-height', 'Space Standards', 'Minimum ceiling height', status, ok ? '≥ 2.4 m' : '< 2.4 m', '≥ 2.4 m', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-natural-light',
    jurisdiction: 'south-africa',
    category: 'Health & Amenity',
    title: 'Natural light provision',
    requirement: 'Glazing area ≥ 10% of floor area for habitable rooms (SANS 10400-O, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      if (!input.analysis?.daylight) return r('sans-natural-light', 'Health & Amenity', 'Natural light provision', 'warn', 'No daylight data', '≥ 10% glazing/floor', 'Run design to generate daylight analysis. Approximate — verify with local authority.')
      const ratio = input.analysis.daylight.glazingToFloorRatio
      const ok = ratio >= 0.10
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Glazing/floor ratio ${(ratio * 100).toFixed(1)}% meets 10% minimum` : `Glazing/floor ratio ${(ratio * 100).toFixed(1)}% is below 10% minimum`
      return r('sans-natural-light', 'Health & Amenity', 'Natural light provision', status, `${(ratio * 100).toFixed(1)}%`, '≥ 10%', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-natural-ventilation',
    jurisdiction: 'south-africa',
    category: 'Health & Amenity',
    title: 'Natural ventilation provision',
    requirement: 'Openable area ≥ 5% of floor area for habitable rooms (SANS 10400-O, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      if (!input.analysis?.daylight) return r('sans-natural-ventilation', 'Health & Amenity', 'Natural ventilation provision', 'warn', 'No daylight data', '≥ 5% vent/floor', 'Run design to generate ventilation estimate. Approximate — verify with local authority.')
      const glazingRatio = input.analysis.daylight.glazingToFloorRatio
      const ventRatio = glazingRatio * 0.5
      const ok = ventRatio >= 0.05
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Estimated vent area ${(ventRatio * 100).toFixed(1)}% meets 5% minimum` : `Estimated vent area ${(ventRatio * 100).toFixed(1)}% is below 5% minimum`
      return r('sans-natural-ventilation', 'Health & Amenity', 'Natural ventilation provision', status, `${(ventRatio * 100).toFixed(1)}%`, '≥ 5%', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-sanitary-provision',
    jurisdiction: 'south-africa',
    category: 'Health & Amenity',
    title: 'Sanitary provision (non-residential)',
    requirement: 'Non-residential: min 1 WC per 25 male + 1 per 15 female (SANS 10400-P/Q, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const occupantLoad = input.analysis?.egress?.occupantLoad ?? 0
      const bt = input.buildingType || 'house'
      const isResidential = ['house', 'apartment'].includes(bt)
      if (isResidential) return r('sans-sanitary-provision', 'Health & Amenity', 'Sanitary provision (non-residential)', 'pass', 'N/A (residential)', 'N/A', 'Residential sanitary provision varies by local by-law. Approximate — verify with local authority.')
      if (occupantLoad === 0) return r('sans-sanitary-provision', 'Health & Amenity', 'Sanitary provision (non-residential)', 'warn', 'No occupant load', '1 WC per 25/15', 'Run design to compute occupant load. Approximate — verify with local authority.')
      const maleWcs = Math.max(1, Math.ceil(occupantLoad / 25))
      const femaleWcs = Math.max(1, Math.ceil(occupantLoad / 15))
      const note = `~${occupantLoad} occupants → recommend min ${maleWcs} male WC(s) + ${femaleWcs} female WC(s)`
      return r('sans-sanitary-provision', 'Health & Amenity', 'Sanitary provision (non-residential)', 'warn', `${maleWcs}M/${femaleWcs}F WC(s) recommended`, '1 per 25M / 15F', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-means-of-escape',
    jurisdiction: 'south-africa',
    category: 'Life Safety',
    title: 'Means of escape / egress',
    requirement: 'Min 2 exits when occupant load > 49 (SANS 10400-T, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const egress = input.analysis?.egress
      if (!egress || egress.occupantLoad === 0) return r('sans-means-of-escape', 'Life Safety', 'Means of escape / egress', 'warn', 'No occupant load', '≥ 2 exits (>49 occ)', 'Run design to generate egress analysis. Approximate — verify with local authority.')
      const needsTwo = egress.occupantLoad > 49
      const hasTwo = egress.numberOfExits >= 2
      const ok = !needsTwo || hasTwo
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      let note: string
      if (needsTwo && hasTwo) {
        note = `${egress.occupantLoad} occupants, ${egress.numberOfExits} exit(s) — meets requirement`
      } else if (needsTwo && !hasTwo) {
        note = `${egress.occupantLoad} occupants need ≥ 2 exits but only ${egress.numberOfExits} provided`
      } else {
        note = `${egress.occupantLoad} occupants — 1 exit is sufficient`
      }
      return r('sans-means-of-escape', 'Life Safety', 'Means of escape / egress', status, `${egress.numberOfExits} exit(s) for ${egress.occupantLoad} occ`, needsTwo ? '≥ 2 exits' : '≥ 1 exit', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-site-coverage',
    jurisdiction: 'south-africa',
    category: 'Site Planning',
    title: 'Site coverage / building lines',
    requirement: 'Building footprint ≤ 50% of site area (typical municipal, SANS 10400 — check local scheme)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const footprint = input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
      if (footprint <= 0) return r('sans-site-coverage', 'Site Planning', 'Site coverage / building lines', 'warn', 'No building data', '≤ 50%', 'Enter site dimensions for coverage check. Approximate — verify with local authority.')
      const siteArea = footprint * 2
      const coverage = (footprint / siteArea) * 100
      const ok = coverage <= 50
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Coverage ${coverage.toFixed(1)}% within limit (est. site ${siteArea.toFixed(0)} m²)` : `Coverage ${coverage.toFixed(1)}% exceeds 50% limit`
      return r('sans-site-coverage', 'Site Planning', 'Site coverage / building lines', status, `${coverage.toFixed(1)}%`, '≤ 50%', note + '. Approximate — verify with local municipal scheme.')
    },
  },

  {
    id: 'sans-energy-efficiency',
    jurisdiction: 'south-africa',
    category: 'Energy & Sustainability',
    title: 'Energy efficiency / fenestration',
    requirement: 'Glazing area ≤ 20% of total wall area for energy compliance (SANS 10400-XA, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      if (!input.analysis?.daylight) return r('sans-energy-efficiency', 'Energy & Sustainability', 'Energy efficiency / fenestration', 'warn', 'No daylight data', 'Glazing ≤ 20% wall area', 'Run design to generate fenestration estimate. Approximate — verify with local authority.')
      const glazingRatio = input.analysis.daylight.glazingToFloorRatio
      const wallGlazingPct = Math.min(glazingRatio * 3 * 100, 40)
      const ok = wallGlazingPct <= 20
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Est. glazing/wall area ${wallGlazingPct.toFixed(1)}% within 20% limit` : `Est. glazing/wall area ${wallGlazingPct.toFixed(1)}% exceeds 20% limit — consider shading or low-E glazing`
      return r('sans-energy-efficiency', 'Energy & Sustainability', 'Energy efficiency / fenestration', status, `${wallGlazingPct.toFixed(1)}%`, '≤ 20%', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'sans-structural-adequacy',
    jurisdiction: 'south-africa',
    category: 'Structural',
    title: 'Structural adequacy (preliminary)',
    requirement: 'Preliminary structural load check performed (SANS 10400-B — consult structural engineer)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const structure = input.analysis?.structural
      if (!structure || structure.grandTotalKn === 0) return r('sans-structural-adequacy', 'Structural', 'Structural adequacy (preliminary)', 'warn', 'Not computed', 'Preliminary load check', 'Run design to compute structural loads. Approximate — verify with local authority.')
      const note = `Dead: ${structure.deadLoadKnm2.toFixed(1)} kN/m², Live: ${structure.liveLoadKnm2.toFixed(1)} kN/m², Total: ${structure.grandTotalKn.toFixed(0)} kN — PRELIMINARY only. A registered structural engineer must verify all loads and design structural members per SANS 10400-B. Approximate — verify with local authority.`
      return r('sans-structural-adequacy', 'Structural', 'Structural adequacy (preliminary)', 'warn', `${structure.grandTotalKn.toFixed(0)} kN (preliminary)`, 'Per SANS 10400-B', note)
    },
  },
]

export function evaluateSouthAfricaRules(input: ComplianceInput): ComplianceResult[] {
  const base: ComplianceResult[] = SANS_RULES.map((rule) => {
    try {
      return rule.evaluate(input)
    } catch {
      return {
        ruleId: rule.id,
        category: rule.category,
        title: rule.title,
        status: 'warn' as const,
        actual: 'Error evaluating rule',
        required: rule.requirement,
        note: 'Compliance rule evaluation failed. Approximate — verify with local authority.',
      }
    }
  })
  const fire = evaluateFireSafetyRules(input, 'sans', 'SANS 10400 Part T')
  const access = evaluateAccessibilityRules(input, 'sans', 'SANS 10400 Part S')
  const struct = evaluateStructuralRules(input, 'sans', 'SANS 10400 Part B')
  return [...base, ...fire, ...access, ...struct]
}
