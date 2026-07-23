import { roomArea } from '@/lib/geometry/plan-geometry'
import type { ComplianceRuleDef, ComplianceInput, ComplianceResult, ComplianceStatus } from './types'
import { evaluateFireSafetyRules } from './fireSafety'
import { evaluateAccessibilityRules } from './accessibility'
import { evaluateStructuralRules } from './structural'
import { evaluateMepRules } from './mepServices'

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

export const ZAMBIA_RULES: ComplianceRuleDef[] = [

  {
    id: 'zambia-min-room-area',
    jurisdiction: 'zambia',
    category: 'Space Standards',
    title: 'Minimum habitable room area',
    requirement: 'Habitable rooms ≥ 6.0 m² (Zambia Public Health Act CAP 295, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const rooms = getHabitableRooms(input)
      if (rooms.length === 0) return r('zambia-min-room-area', 'Space Standards', 'Minimum habitable room area', 'warn', 'No habitable rooms', '≥ 6.0 m²', 'No habitable room data to check. Approximate — verify with local authority.')
      const smallest = rooms.reduce((a, b) => (a.area < b.area ? a : b))
      const ok = smallest.area >= 6.0
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok
        ? 'All habitable rooms meet minimum area requirement'
        : `"${smallest.name}" is ${smallest.area.toFixed(1)} m² — below 6.0 m² minimum`
      return r('zambia-min-room-area', 'Space Standards', 'Minimum habitable room area', status, `${smallest.area.toFixed(1)} m²`, '≥ 6.0 m²', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-min-room-width',
    jurisdiction: 'zambia',
    category: 'Space Standards',
    title: 'Minimum habitable room width',
    requirement: 'Habitable rooms minimum width ≥ 2.0 m (Zambia building regs, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const rooms = getHabitableRooms(input)
      if (rooms.length === 0) return r('zambia-min-room-width', 'Space Standards', 'Minimum habitable room width', 'warn', 'No habitable rooms', '≥ 2.0 m', 'No habitable room data to check. Approximate — verify with local authority.')
      const minWidth = Math.min(...rooms.map((r) => Math.min(r.width, r.height)))
      const ok = minWidth >= 2.0
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const worst = rooms.find((r) => Math.min(r.width, r.height) === minWidth)
      const note = ok
        ? 'All habitable rooms meet minimum width requirement'
        : `"${worst?.name}" has min dimension ${minWidth.toFixed(2)} m — below 2.0 m minimum`
      return r('zambia-min-room-width', 'Space Standards', 'Minimum habitable room width', status, `${minWidth.toFixed(2)} m`, '≥ 2.0 m', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-ceiling-height',
    jurisdiction: 'zambia',
    category: 'Space Standards',
    title: 'Minimum ceiling height',
    requirement: 'Habitable rooms minimum ceiling height ≥ 2.4 m (Zambia building regs, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const height = input.plan && input.plan.rooms.length > 0 ? (input.plan.rooms[0].height > 2.4 ? input.plan.rooms[0].height : 3.0) : 3.0
      const ok = height >= 2.4
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? 'Ceiling height ≥ 2.4 m (default 3.0 m assumed)' : 'Ceiling height may be below 2.4 m minimum'
      return r('zambia-ceiling-height', 'Space Standards', 'Minimum ceiling height', status, ok ? '≥ 2.4 m' : '< 2.4 m', '≥ 2.4 m', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-natural-light',
    jurisdiction: 'zambia',
    category: 'Health & Amenity',
    title: 'Natural light provision',
    requirement: 'Window area ≥ 10% of floor area for habitable rooms (Zambia building regs, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      if (!input.analysis?.daylight) return r('zambia-natural-light', 'Health & Amenity', 'Natural light provision', 'warn', 'No daylight data', '≥ 10% glazing/floor', 'Run design to generate daylight analysis. Approximate — verify with local authority.')
      const ratio = input.analysis.daylight.glazingToFloorRatio
      const ok = ratio >= 0.10
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Glazing/floor ratio ${(ratio * 100).toFixed(1)}% meets 10% minimum` : `Glazing/floor ratio ${(ratio * 100).toFixed(1)}% is below 10% minimum`
      return r('zambia-natural-light', 'Health & Amenity', 'Natural light provision', status, `${(ratio * 100).toFixed(1)}%`, '≥ 10%', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-natural-ventilation',
    jurisdiction: 'zambia',
    category: 'Health & Amenity',
    title: 'Natural ventilation provision',
    requirement: 'Openable window area ≥ 5% of floor area (Zambia building regs, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      if (!input.analysis?.daylight) return r('zambia-natural-ventilation', 'Health & Amenity', 'Natural ventilation provision', 'warn', 'No daylight data', '≥ 5% vent/floor', 'Run design to generate ventilation estimate. Approximate — verify with local authority.')
      const glazingRatio = input.analysis.daylight.glazingToFloorRatio
      const ventRatio = glazingRatio * 0.5
      const ok = ventRatio >= 0.05
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Estimated vent area ${(ventRatio * 100).toFixed(1)}% meets 5% minimum` : `Estimated vent area ${(ventRatio * 100).toFixed(1)}% is below 5% minimum`
      return r('zambia-natural-ventilation', 'Health & Amenity', 'Natural ventilation provision', status, `${(ventRatio * 100).toFixed(1)}%`, '≥ 5%', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-sanitary-provision',
    jurisdiction: 'zambia',
    category: 'Health & Amenity',
    title: 'Sanitary provision (non-residential)',
    requirement: 'Non-residential: min 1 WC per 25 occupants (Zambia Public Health Act CAP 295, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const occupantLoad = input.analysis?.egress?.occupantLoad ?? 0
      const bt = input.buildingType || 'house'
      const isResidential = ['house', 'apartment'].includes(bt)
      if (isResidential) return r('zambia-sanitary-provision', 'Health & Amenity', 'Sanitary provision (non-residential)', 'pass', 'N/A (residential)', 'N/A', 'Residential sanitary provision varies by local by-law. Approximate — verify with local authority.')
      if (occupantLoad === 0) return r('zambia-sanitary-provision', 'Health & Amenity', 'Sanitary provision (non-residential)', 'warn', 'No occupant load', '1 WC per 25 occupants', 'Run design to compute occupant load. Approximate — verify with local authority.')
      const requiredWcs = Math.max(1, Math.ceil(occupantLoad / 25))
      const note = `~${occupantLoad} occupants → recommend minimum ${requiredWcs} WC(s)`
      return r('zambia-sanitary-provision', 'Health & Amenity', 'Sanitary provision (non-residential)', 'warn', `${requiredWcs} WC(s) recommended`, '1 per 25 occupants', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-means-of-escape',
    jurisdiction: 'zambia',
    category: 'Life Safety',
    title: 'Means of escape / egress',
    requirement: 'Min 2 exits when occupant load > 49 (Zambia building regs, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const egress = input.analysis?.egress
      if (!egress || egress.occupantLoad === 0) return r('zambia-means-of-escape', 'Life Safety', 'Means of escape / egress', 'warn', 'No occupant load', '≥ 2 exits (>49 occ)', 'Run design to generate egress analysis. Approximate — verify with local authority.')
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
      return r('zambia-means-of-escape', 'Life Safety', 'Means of escape / egress', status, `${egress.numberOfExits} exit(s) for ${egress.occupantLoad} occ`, needsTwo ? '≥ 2 exits' : '≥ 1 exit', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-site-coverage',
    jurisdiction: 'zambia',
    category: 'Site Planning',
    title: 'Site coverage / setbacks',
    requirement: 'Building footprint ≤ 50% of site area (Zambia Urban & Regional Planning Act, approximate)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const footprint = input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
      if (footprint <= 0) return r('zambia-site-coverage', 'Site Planning', 'Site coverage / setbacks', 'warn', 'No building data', '≤ 50%', 'Enter site dimensions for coverage check. Approximate — verify with local authority.')
      const siteArea = footprint * 2
      const coverage = (footprint / siteArea) * 100
      const ok = coverage <= 50
      const status: ComplianceStatus = ok ? 'pass' : 'fail'
      const note = ok ? `Coverage ${coverage.toFixed(1)}% within limit (est. site ${siteArea.toFixed(0)} m²)` : `Coverage ${coverage.toFixed(1)}% exceeds 50% limit`
      return r('zambia-site-coverage', 'Site Planning', 'Site coverage / setbacks', status, `${coverage.toFixed(1)}%`, '≤ 50%', note + '. Approximate — verify with local authority.')
    },
  },

  {
    id: 'zambia-structural-adequacy',
    jurisdiction: 'zambia',
    category: 'Structural',
    title: 'Structural adequacy (preliminary)',
    requirement: 'Preliminary structural load check performed (Zambia building regs — consult engineer)',
    evaluate(input: ComplianceInput): ComplianceResult {
      const structure = input.analysis?.structural
      if (!structure || structure.grandTotalKn === 0) return r('zambia-structural-adequacy', 'Structural', 'Structural adequacy (preliminary)', 'warn', 'Not computed', 'Preliminary load check', 'Run design to compute structural loads. Approximate — verify with local authority.')
      const note = `Dead: ${structure.deadLoadKnm2.toFixed(1)} kN/m², Live: ${structure.liveLoadKnm2.toFixed(1)} kN/m², Total: ${structure.grandTotalKn.toFixed(0)} kN — PRELIMINARY only. A registered structural engineer must verify all loads and design structural members. Approximate — verify with local authority.`
      return r('zambia-structural-adequacy', 'Structural', 'Structural adequacy (preliminary)', 'warn', `${structure.grandTotalKn.toFixed(0)} kN (preliminary)`, 'Preliminary load check', note)
    },
  },
]

export function evaluateZambiaRules(input: ComplianceInput): ComplianceResult[] {
  const base: ComplianceResult[] = ZAMBIA_RULES.map((rule) => {
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
  const fire = evaluateFireSafetyRules(input, 'zambia', 'CAP 295 Part VIII')
  const access = evaluateAccessibilityRules(input, 'zambia', 'CAP 295 Part VI')
  const struct = evaluateStructuralRules(input, 'zambia', 'CAP 295 Part IV')
  const mep = evaluateMepRules(input, 'zambia', 'CAP 295 Part VII / Part IX')
  return [...base, ...fire, ...access, ...struct, ...mep]
}
