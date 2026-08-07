import type { ConstraintRule, ExtractedConstraint, TextChunk } from './types'

const UNIT_RE = '(mm|m²|sqm|sq\\s*m|m|kPa|MPa|kN/m²|kN/m2|percent|%|kN|mm²|seconds|minutes|hours|days)'

const MIN_PATTERNS: RegExp[] = [
  new RegExp(`(?:not\\s+(?:be\\s+)?(?:less|under)\\s+than|minimum\\s+of|at\\s+least|a\\s+minimum\\s+of)\\s+([0-9]+(?:\\.[0-9]+)?)\\s*${UNIT_RE}?`, 'gi'),
  new RegExp(`\\bminimum\\b(?:[a-z\\s]+?)\\bof\\s+([0-9]+(?:\\.[0-9]+)?)\\s*${UNIT_RE}?`, 'gi'),
  new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*${UNIT_RE}?\\s+(?:minimum|min\\.)`, 'gi'),
]

const MAX_PATTERNS: RegExp[] = [
  new RegExp(`(?:not\\s+(?:be\\s+)?(?:more|greater)\\s+than|shall\\s+not\\s+exceed|maximum\\s+of|no\\s+more\\s+than|at\\s+most)\\s+([0-9]+(?:\\.[0-9]+)?)\\s*${UNIT_RE}?`, 'gi'),
  new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*${UNIT_RE}?\\s+(?:maximum|max\\.)`, 'gi'),
]

const EXACT_PATTERNS: RegExp[] = [
  new RegExp(`(?:exactly|shall\\s+be)\\s+([0-9]+(?:\\.[0-9]+)?)\\s*${UNIT_RE}?`, 'gi'),
]

function normalizeUnit(unit: string | undefined, value: number): { unit: string; value: number } {
  const u = unit?.toLowerCase() ?? ''
  if (u === 'm' && value < 100) return { unit: 'm', value }
  if (u === 'mm') return { unit: 'mm', value }
  if (u === 'percent' || u === '%') return { unit: '%', value }
  if (u === 'm²' || u === 'sqm' || u === 'sq m') return { unit: 'm²', value }
  if (u === 'kn/m²' || u === 'kpa') return { unit: u === 'kn/m²' ? 'kN/m²' : 'kPa', value }
  if (u === 'seconds' || u === 'minutes' || u === 'hours' || u === 'days') return { unit: u, value }
  if (u) return { unit: u, value }
  return { unit: '', value }
}

function classifyCategory(text: string): string {
  const t = text.toLowerCase()
  if (/(ceiling|height)/.test(t)) return 'ceiling-height'
  if (/(room|habitable|bedroom|floor area|min area)/.test(t)) return 'room-area'
  if (/(setback|boundary|building line)/.test(t)) return 'setback'
  if (/(travel|exit|escape|egress)/.test(t)) return 'egress'
  if (/(ventilation|vent)/.test(t)) return 'ventilation'
  if (/(daylight|window|glazing|natural light)/.test(t)) return 'daylight'
  if (/(fire|resistance|rating)/.test(t)) return 'fire'
  if (/(stair|rise|tread)/.test(t)) return 'stair'
  if (/(bathroom|wc|toilet|sanitary|wet)/.test(t)) return 'sanitary'
  return 'general'
}

function extractFromText(text: string, clauseRef: string): ExtractedConstraint[] {
  const out: ExtractedConstraint[] = []
  const clauses = text.split(/\n{2,}/)

  clauses.forEach((para, pi) => {
    const run = (patterns: RegExp[], operator: ConstraintRule['operator']) => {
      for (const re of patterns) {
        re.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(para)) !== null) {
          const value = Number(m[1])
          const { unit, value: normalized } = normalizeUnit(m[2], value)
          const category = classifyCategory(para.slice(0, Math.min(120, m.index + m[0].length)))
          const id = `c-${pi + 1}-${operator}-${out.length + 1}`
          out.push({
            id,
            clauseRef,
            rule: { id, category, operator, value: normalized, unit, source: para.trim().slice(0, 200) },
            sourceText: para.trim().slice(0, 200),
          })
        }
      }
    }
    run(MIN_PATTERNS, 'min')
    run(MAX_PATTERNS, 'max')
    run(EXACT_PATTERNS, 'eq')
  })

  const seen = new Set<string>()
  return out.filter((c) => {
    const key = `${c.rule.operator}|${c.rule.value}|${c.rule.unit}|${c.rule.category}|${c.sourceText}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function extractConstraintsFromChunks(chunks: TextChunk[]): ExtractedConstraint[] {
  const out: ExtractedConstraint[] = []
  for (const chunk of chunks) {
    out.push(...extractFromText(chunk.text, chunk.sectionId))
  }
  return out
}

export function extractConstraintsFromText(text: string, clauseRef = 'text'): ExtractedConstraint[] {
  return extractFromText(text, clauseRef)
}
