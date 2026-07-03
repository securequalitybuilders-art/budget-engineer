import type { Tier1ParsedBrief, SiteInfo, Constraints, QualityGate, QualityIssue, ProgramItem } from './tier1-types'
import { detectTypology, getAllTypologies } from './typology-kb'
import { detectClimate } from './climate-kb'
import { detectHeritage } from './heritage-kb'

const DEFAULT_SITE_AREA = 300

function extractSiteInfo(text: string): SiteInfo {
  const dimMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/)
  if (dimMatch) {
    const w = parseFloat(dimMatch[1])
    const d = parseFloat(dimMatch[2])
    const area = w * d
    return {
      widthM: w,
      depthM: d,
      areaM2: area,
      aspect: w > 0 && d > 0 ? (w / d).toFixed(2) : null,
    }
  }

  const areaMatch = text.match(/(\d+)\s*(?:sqm|m2|m²|square\s*m)/)
  if (areaMatch) {
    const a = parseFloat(areaMatch[1])
    const side = Math.sqrt(a)
    return {
      widthM: side,
      depthM: side,
      areaM2: a,
      aspect: '1.00',
    }
  }

  return {
    widthM: null,
    depthM: null,
    areaM2: null,
    aspect: null,
  }
}

function extractConstraints(text: string): Constraints {
  const budgetMatch = text.match(/(?:budget|cost|total|price)\s*(?::|\sof)?\s*\$?\s*([\d,]{4,})\s*(?:USD|ZWG|\$)?/) || text.match(/\$?\s*([\d,]{5,})\s*(?:USD|ZWG)?/)
  const budgetUsd = budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : null
  const timelineMatch = text.match(/(\d+)\s*(month|week|year)/)
  const materialKeywords = ['brick', 'concrete', 'steel', 'timber', 'thatch', 'glass', 'stone', 'solar', 'thatched', 'rammed earth', 'stabilised earth', 'cavity wall']
  const materials = materialKeywords.filter((m) => text.toLowerCase().includes(m))

  return {
    budgetCents: budgetUsd !== null ? Math.round(budgetUsd * 100) : null,
    budgetUsd,
    timeline: timelineMatch ? timelineMatch[0] : null,
    materials,
  }
}

function extractProgramFromText(text: string): ProgramItem[] {
  const items: ProgramItem[] = []
  const roomPatterns: [RegExp, string, number][] = [
    [/(\d+)?\s*bed(?:room)?/i, 'Bedroom', 2],
    [/(\d+)?\s*bath(?:room)?/i, 'Bathroom', 1],
    [/(\d+)?\s*kitchen/i, 'Kitchen', 1],
    [/(\d+)?\s*living\s*room/i, 'Living Room', 1],
    [/(\d+)?\s*dining/i, 'Dining Room', 1],
    [/(\d+)?\s*lounge/i, 'Lounge', 1],
    [/(\d+)?\s*classroom/i, 'Classroom', 4],
    [/(\d+)?\s*consultation/i, 'Consultation Room', 2],
    [/(\d+)?\s*office/i, 'Office', 2],
    [/(\d+)?\s*store(?: room)?/i, 'Store', 1],
    [/(\d+)?\s*garage/i, 'Garage', 1],
  ]
  for (const [regex, name, defaultCount] of roomPatterns) {
    const m = text.match(regex)
    if (m) {
      const count = m[1] ? parseInt(m[1], 10) : defaultCount
      items.push({ name, count, areaM2: 0 })
    }
  }
  return items
}

function buildQualityGate(
  brief: Tier1ParsedBrief,
  siteArea: number | null,
  buildingArea: number | null,
): QualityGate {
  const issues: QualityIssue[] = []
  let score = 100

  // Typology confidence
  if (brief.typology) {
    if (brief.typologyConfidence < 0.7) {
      issues.push({ severity: 'warning', message: `Typology confidence ${Math.round(brief.typologyConfidence * 100)}% — consider adding more detail (e.g. "${brief.typology.aliases[0]}")` })
      score -= 15
    }
  } else {
    issues.push({ severity: 'warning', message: 'No typology detected from text. Select a building type or describe your project more specifically.' })
    score -= 25
  }

  // Site dimensions
  if (siteArea !== null) {
    if (siteArea < 50) {
      issues.push({ severity: 'error', message: `Site area (${siteArea.toFixed(0)} m²) is very small. Minimum ~50 m² for even a tiny dwelling.` })
      score -= 30
    } else if (siteArea < 100) {
      issues.push({ severity: 'warning', message: `Site area (${siteArea.toFixed(0)} m²) is tight. Consider a compact or 2-storey design.` })
      score -= 10
    }
  } else {
    issues.push({ severity: 'info', message: 'No site dimensions found. Defaulting to ~300 m² site. Add dimensions like "20x25" for better accuracy.' })
    score -= 5
  }

  // Building area vs site area
  if (siteArea !== null && buildingArea !== null) {
    const ratio = buildingArea / siteArea
    if (ratio > 0.7) {
      issues.push({ severity: 'warning', message: `Building footprint (${buildingArea.toFixed(0)} m²) occupies >70% of site (${siteArea.toFixed(0)} m²). Consider adding storeys or reducing size.` })
      score -= 10
    }
  }

  // Budget adequacy
  if (brief.constraints.budgetUsd !== null) {
    if (buildingArea !== null) {
      const costPerM2 = brief.constraints.budgetUsd / buildingArea
      if (costPerM2 < 300) {
        issues.push({ severity: 'warning', message: `Budget ($${brief.constraints.budgetUsd.toLocaleString()}) yields ~$${costPerM2.toFixed(0)}/m². Typical construction is $600–1200/m² in Zimbabwe.` })
        score -= 10
      }
    }
  } else {
    issues.push({ severity: 'info', message: 'No budget mentioned. An estimate can still be generated.' })
    score -= 5
  }

  // Climate response
  if (brief.climateZone) {
    if (brief.climateZone.id === 'GENERIC_Zimbabwe') {
      issues.push({ severity: 'info', message: 'No specific city/region detected. Using generic Zimbabwe climate strategy. Add a city name (e.g. "in Harare") for precise guidance.' })
      score -= 5
    }
  }

  // Heritage coherence
  if (brief.heritagePattern) {
    score += 10 // bonus for cultural awareness
  }

  // Program
  if (brief.program.length === 0) {
    issues.push({ severity: 'warning', message: 'No room types detected in brief. Using typology default program.' })
    score -= 10
  }

  const clampedScore = Math.max(0, Math.min(100, score))

  const recommendations: string[] = []
  if (brief.typology === null || brief.typologyConfidence < 0.7) {
    recommendations.push('Add a clear building type description (e.g. "clinic", "school", "3-bedroom house")')
  }
  if (siteArea === null) {
    recommendations.push('Include site dimensions (e.g. "site is 20m x 25m")')
  }
  if (brief.constraints.budgetUsd === null) {
    recommendations.push('Include a budget figure for cost adequacy checks')
  }
  if (brief.climateZone?.id === 'GENERIC_Zimbabwe') {
    recommendations.push('Specify a city (e.g. "in Harare" or "near Victoria Falls") for climate-specific design guidance')
  }
  if (recommendations.length === 0) {
    recommendations.push('Brief is well-formed. Proceed with design generation.')
  }

  return {
    passed: clampedScore >= 70,
    score: clampedScore,
    issues,
    recommendations,
  }
}

export function parseBrief(
  text: string,
  uiOverrides?: { buildingType?: string },
): Tier1ParsedBrief {
  const lower = text?.trim() ? text.toLowerCase() : ''

  const { typology, confidence } = detectTypology(lower)

  let finalTypology = typology
  let finalConfidence = confidence

  if (uiOverrides?.buildingType && uiOverrides.buildingType !== 'other') {
    const all = getAllTypologies()
    const matched = all.find(
      (t) => t.id.startsWith(uiOverrides!.buildingType!) || t.aliases.includes(uiOverrides!.buildingType!),
    )
    if (matched) {
      finalTypology = matched
      finalConfidence = Math.max(confidence, 0.95)
    }
  }

  const climateZone = detectClimate(lower)
  const heritagePattern = detectHeritage(lower)
  const siteInfo = extractSiteInfo(lower)
  const constraints = extractConstraints(lower)
  const textProgram = extractProgramFromText(lower)
  const program = textProgram.length > 0
    ? textProgram
    : finalTypology
      ? finalTypology.defaultProgram.map((p) => ({ ...p }))
      : []

  const buildingArea = siteInfo.areaM2 ?? (program.length > 0 ? program.reduce((s, p) => s + p.count * (p.areaM2 || 15), 0) : DEFAULT_SITE_AREA)

  const result: Tier1ParsedBrief = {
    rawText: text ?? '',
    typology: finalTypology,
    typologyConfidence: finalConfidence,
    climateZone,
    heritagePattern,
    siteInfo,
    program,
    constraints,
    qualityGate: null as unknown as QualityGate,
  }

  result.qualityGate = buildQualityGate(result, siteInfo.areaM2 ?? null, buildingArea)

  return result
}
