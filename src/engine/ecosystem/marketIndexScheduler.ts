import {
  FX_USD_TO_ZWG,
  fxConvert,
  type IndexSeriesPoint,
  type MarketIndex,
  type MarketRateLike,
} from '@/engine/ecosystem/priceIndex'

export type IndexSource = 'auto' | 'manual'

export interface MarketIndexSnapshot {
  id: string
  dayKey: string
  computedAt: string
  source: IndexSource
  currency: 'USD' | 'ZWG'
  fx: number
  symbolCount: number
  index: MarketIndex[]
}

function hashStr(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

export function dayKeyFor(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function deterministicPctForDate(symbol: string, dateKey: string): number {
  const seed = hashStr(`${symbol}:${dateKey}`)
  return ((seed % 1000) / 1000) * 0.1 - 0.05
}

export function valueForDate(symbol: string, baseCents: number, dateKey: string): number {
  return Math.round(baseCents * (1 + deterministicPctForDate(symbol, dateKey)))
}

export function seriesEndingAt(symbol: string, baseCents: number, endDate: Date | string, days = 30): IndexSeriesPoint[] {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  const points: IndexSeriesPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    points.push({
      dayOffset: days - 1 - i,
      valueCents: valueForDate(symbol, baseCents, dayKeyFor(d)),
    })
  }
  return points
}

export interface MarketIndexSnapshotOptions {
  fx?: number
  currency?: 'USD' | 'ZWG'
  source?: IndexSource
  days?: number
  now?: Date
}

export function buildMarketIndexSnapshot(
  rates: MarketRateLike[],
  options: MarketIndexSnapshotOptions = {}
): MarketIndexSnapshot {
  const now = options.now ?? new Date()
  const fx = options.fx ?? FX_USD_TO_ZWG
  const currency = options.currency ?? 'USD'
  const source = options.source ?? 'auto'
  const days = options.days ?? 30
  const dayKey = dayKeyFor(now)

  const index: MarketIndex[] = rates
    .filter((r) => r.baseRateCents > 0)
    .map((r) => {
      const series = seriesEndingAt(r.code, r.baseRateCents, now, days)
      const baseConverted = fxConvert(r.baseRateCents, fx, currency)
      const currentConverted = fxConvert(series[series.length - 1].valueCents, fx, currency)
      return {
        symbol: r.code,
        label: r.description,
        unit: r.unit,
        baseCents: baseConverted,
        currentCents: currentConverted,
        changePct: Math.round(((currentConverted - baseConverted) / baseConverted) * 10000) / 100,
        series,
        currency,
      }
    })

  return {
    id: dayKey,
    dayKey,
    computedAt: new Date().toISOString(),
    source,
    currency,
    fx,
    symbolCount: index.length,
    index,
  }
}

export function indexRefreshDue(
  snapshot: MarketIndexSnapshot | null,
  now: Date = new Date(),
  options: { intervalHours?: number } = {}
): boolean {
  if (!snapshot) return true
  const intervalHours = options.intervalHours ?? 24
  if (snapshot.dayKey !== dayKeyFor(now)) return true
  const ageMs = now.getTime() - new Date(snapshot.computedAt).getTime()
  return ageMs > intervalHours * 60 * 60 * 1000
}

export function sortSnapshotsDesc(snapshots: MarketIndexSnapshot[]): MarketIndexSnapshot[] {
  return [...snapshots].sort((a, b) => b.dayKey.localeCompare(a.dayKey))
}
