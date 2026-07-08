import type { BOQ, BOQLineItem, BOQTotals, BuildingElement, DesignOption, RateCardItem } from '../domain/boq'
import { rateLookup, seedRates } from '../data/seedRates'
import { multiplyMoney } from '../lib/money'

const fallbackByType = new Map<string, string>([
  ['foundation', 'foundation'],
  ['foundation_wall', 'foundation_wall'],
  ['wall', 'wall'],
  ['column', 'column'],
  ['roof', 'roof'],
  ['floor_finish', 'floor_finish'],
  ['wall_finish', 'wall_finish'],
  ['electrical_point', 'electrical_point'],
  ['plumbing_point', 'plumbing_point'],
  ['external_works', 'external_works'],
])

const uid = () => Math.random().toString(36).slice(2, 10)

function resolveRate(element: BuildingElement): { rate: RateCardItem | null; estimated: boolean } {
  const exact = rateLookup.get(element.category)
  if (exact && exact.unit === element.unit) return { rate: exact, estimated: false }

  const fallbackCategory = fallbackByType.get(element.type)
  const fallback = fallbackCategory ? rateLookup.get(fallbackCategory) ?? null : null
  if (fallback) return { rate: fallback, estimated: true }

  const loose = seedRates.find((rate) => rate.unit === element.unit)
  if (loose) return { rate: loose, estimated: true }

  return { rate: null, estimated: true }
}

function lineItemFromElement(designOptionId: string, element: BuildingElement): BOQLineItem | null {
  const { rate, estimated } = resolveRate(element)
  if (!rate) return null

  return {
    id: uid(),
    designOptionId,
    rateCode: rate.code,
    title: rate.title,
    section: rate.section,
    unit: rate.unit,
    quantity: element.quantity,
    unitRateCents: rate.rateCents,
    amountCents: multiplyMoney(rate.rateCents, element.quantity),
    estimated,
    sourceElementIds: [element.id],
  }
}

function mergeLineItems(items: BOQLineItem[]): BOQLineItem[] {
  const grouped = new Map<string, BOQLineItem>()

  for (const item of items) {
    const key = `${item.rateCode}::${item.section}::${item.unit}`
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { ...item })
      continue
    }

    existing.quantity += item.quantity
    existing.amountCents += item.amountCents
    existing.estimated = existing.estimated || item.estimated
    existing.sourceElementIds.push(...item.sourceElementIds)
  }

  return Array.from(grouped.values()).sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title))
}

function calculateTotals(subtotalCents: number): BOQTotals {
  const contingencyCents = Math.round(subtotalCents * 0.05)
  const professionalFeesCents = Math.round(subtotalCents * 0.07)
  const vatBase = subtotalCents + contingencyCents + professionalFeesCents
  const vatCents = Math.round(vatBase * 0.15)
  const grandTotalCents = vatBase + vatCents

  return {
    subtotalCents,
    contingencyCents,
    professionalFeesCents,
    vatCents,
    grandTotalCents,
  }
}

export function generateBOQ(params: {
  projectId: string
  design: DesignOption
  currency?: string
}): BOQ {
  const items = params.design.elements
    .map((element) => lineItemFromElement(params.design.id, element))
    .filter((item): item is BOQLineItem => Boolean(item))

  const lineItems = mergeLineItems(items)
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0)

  return {
    id: uid(),
    projectId: params.projectId,
    designOptionId: params.design.id,
    currency: params.currency ?? 'USD',
    lineItems,
    totals: calculateTotals(subtotalCents),
    createdAt: new Date().toISOString(),
  }
}
