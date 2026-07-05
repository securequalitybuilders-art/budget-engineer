import { parseBrief } from '@/ai/briefParser'
import { generateDesignOptions } from '@/ai/designEngine'
import type { DesignOption } from '@/domain/boq'
import type { ParsedBrief } from '@/ai/schema'
import { uuid } from '@/lib/utils'

export interface AiDesignResult {
  designOptions: DesignOption[]
  parsed: ReturnType<typeof parseBrief>
  diagnostics: string[]
}

export function generateDesignOptionsFromBriefText(
  briefText: string,
  region = 'zimbabwe',
  buildingTypeOverride?: string,
): AiDesignResult {
  const diagnostics: string[] = []

  const parsed = parseBrief(briefText, region)
  if (buildingTypeOverride && buildingTypeOverride !== 'auto') {
    parsed.buildingType = buildingTypeOverride as ParsedBrief['buildingType']
  }
  diagnostics.push(`Building type: ${parsed.buildingType}`)
  diagnostics.push(`Bedrooms: ${parsed.bedrooms ?? '?'}, Bathrooms: ${parsed.bathrooms ?? '?'}`)
  diagnostics.push(`Floors: ${parsed.floors}, Area: ${parsed.areaM2 ?? 'auto'} m²`)
  if (parsed.budgetCents) {
    diagnostics.push(`Budget: $${(parsed.budgetCents / 100).toLocaleString()}`)
  }
  if (parsed.features.length > 0) {
    diagnostics.push(`Features: ${parsed.features.join(', ')}`)
  }
  diagnostics.push(`Location: ${parsed.location}`)

  const designs = generateDesignOptions('ai-generated', parsed)

  const designOptions: DesignOption[] = designs.map((design) => ({
    id: design.id,
    name: design.name,
    grossFloorArea: design.parameters.totalAreaM2 ?? parsed.areaM2 ?? 150,
    floors: design.parameters.floors ?? parsed.floors ?? 1,
    buildingType: parsed.buildingType,
    elements: design.elements.map((el) => ({
      id: el.id,
      type: el.category,
      category: el.category,
      name: el.category,
      unit: el.quantity.unit,
      quantity: el.quantity.value,
    })),
  }))

  diagnostics.push(`Generated ${designOptions.length} design options`)

  return { designOptions, parsed, diagnostics }
}

export function generateDefaultDesignOption(region = 'zimbabwe'): DesignOption {
  const fallbackText = 'Design a 3-bedroom house with 2 bathrooms'
  const result = generateDesignOptionsFromBriefText(fallbackText, region)
  return result.designOptions[0] ?? {
    id: uuid(),
    name: 'Standard House',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [],
  }
}
