import { RATE_CARDS, type RateCard } from '@/lib/rates/rate-card'

export interface RateAssumption {
  itemKey: string
  label: string
  rate: number
  currency: string
  source: 'rate-card' | 'fallback'
  warning?: string
}

export interface ResolvedRate {
  rate: number
  currency: string
  source: 'rate-card' | 'fallback'
  warning?: string
}

export function getDefaultRegionId(): string {
  return 'zimbabwe'
}

export function getRegionRateCard(regionId: string): RateCard {
  const normalized = regionId.replace(/-/g, '').toLowerCase()
  return RATE_CARDS[normalized] ?? RATE_CARDS.zimbabwe
}

export function getSupportedRegions(): { id: string; label: string; currency: string }[] {
  return Object.values(RATE_CARDS).map((c) => ({
    id: c.id,
    label: `${c.region} — ${c.currency}`,
    currency: c.currency,
  }))
}

function getNested(card: RateCard, key: string): number | undefined {
  const plumbing = card.plumbing as unknown as Record<string, number>
  const electrical = card.electrical as unknown as Record<string, number>
  const hvac = card.hvac as unknown as Record<string, number>
  const finishes = card.finishes as unknown as Record<string, number>
  const earthworks = card.earthworks as unknown as Record<string, number>
  const concrete = card.concrete as unknown as Record<string, number>
  const steel = card.steel as unknown as Record<string, number>
  const prelims = card.prelims as unknown as Record<string, number>
  return plumbing[key] ?? electrical[key] ?? hvac[key] ?? finishes[key]
    ?? earthworks[key] ?? concrete[key] ?? steel[key] ?? prelims[key]
}

function rawRateForKey(card: RateCard, key: string): number | undefined {
  const map: Record<string, number | (() => number)> = {
    wall: card.wall.concrete,
    slab: card.slab_m2,
    roof: card.roof_m2,
    'concrete-slab': card.roof_m2,
    'cgi-truss': Math.round(card.roof_m2 * 0.73 * 100) / 100,
    opening: card.opening_each,
    object: card.object_each,
    door: card.opening_each,
    window: card.opening_each,
    partition: Math.round(card.wall.concrete * 0.7 * 100) / 100,
    footing: card.footing_m3,
    rebar: card.rebar_tonne,
    excavation: card.excavation_m3,
    formwork: card.formwork_m2,
    finishes: card.finishes_m2,
    services: card.services_m2,
  }
  const result = map[key]
  if (result !== undefined) return typeof result === 'function' ? result() : result
  return getNested(card, key)
}

export function resolveBoqRate(regionId: string, itemKey: string, fallbackRate: number): ResolvedRate {
  const card = getRegionRateCard(regionId)
  const rate = rawRateForKey(card, itemKey)
  if (rate !== undefined) {
    return { rate, currency: card.currency, source: 'rate-card' }
  }
  return {
    rate: fallbackRate,
    currency: card.currency,
    source: 'fallback',
    warning: `No rate card entry for "${itemKey}" in ${card.region}, using fallback ${fallbackRate}`,
  }
}

export function getBoqRateAssumptions(regionId: string): RateAssumption[] {
  const keys = [
    { key: 'wall', label: 'External walls (concrete)' },
    { key: 'slab', label: 'Floor slabs' },
    { key: 'roof', label: 'Roof' },
    { key: 'partition', label: 'Internal partitions' },
    { key: 'door', label: 'Doors' },
    { key: 'window', label: 'Windows' },
    { key: 'opening', label: 'Other openings' },
    { key: 'object', label: 'Fixtures & furniture' },
  ]
  return keys.map(({ key, label }) => {
    const fb = key === 'partition' ? 65 : key === 'door' ? 180 : key === 'window' ? 320 : 120
    const resolved = resolveBoqRate(regionId, key, fb)
    return {
      itemKey: key,
      label,
      rate: resolved.rate,
      currency: resolved.currency,
      source: resolved.source,
      warning: resolved.warning,
    }
  })
}

export function getContingencyRate(regionId: string): number {
  return getRegionRateCard(regionId).contingency
}

export function getFeesRate(regionId: string): number {
  return getRegionRateCard(regionId).fees
}

export function getVatRate(regionId: string): number {
  return getRegionRateCard(regionId).vat
}
