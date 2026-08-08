import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import type { MarketRateLike } from '@/engine/ecosystem/priceIndex'
import {
  dayKeyFor,
  deterministicPctForDate,
  valueForDate,
  seriesEndingAt,
  indexRefreshDue,
  buildMarketIndexSnapshot,
  sortSnapshotsDesc,
  type MarketIndexSnapshot,
} from '@/engine/ecosystem/marketIndexScheduler'
import { useMarketIndexStore } from '@/stores/marketIndexStore'

function makeRate(i: number, overrides: Partial<MarketRateLike> = {}): MarketRateLike {
  return {
    code: `MAT-${i}`,
    description: `Material ${i}`,
    unit: 'each',
    baseRateCents: 1000,
    year: 2026,
    ...overrides,
  }
}

function makeRates(): MarketRateLike[] {
  return [
    makeRate(1, { description: 'Cement 50kg', unit: 'bag', baseRateCents: 1850 }),
    makeRate(2, { description: 'Common brick', unit: 'each', baseRateCents: 25 }),
    makeRate(3, { description: 'Steel rebar 12mm', unit: 'm', baseRateCents: 450 }),
    makeRate(4, { description: 'Zero-priced item', baseRateCents: 0 }),
  ]
}

beforeEach(async () => {
  await db.marketIndexSnapshots.clear()
  await db.rates.clear()
  useMarketIndexStore.setState({ snapshot: null, history: [], isLoading: false })
})

describe('Market index scheduler — pure helpers', () => {
  it('dayKeyFor formats YYYY-MM-DD from Date and string', () => {
    expect(dayKeyFor(new Date(2026, 7, 8))).toBe('2026-08-08')
    expect(dayKeyFor('2026-12-31T10:00:00Z')).toBe('2026-12-31')
  })

  it('deterministicPctForDate is stable and within ±5%', () => {
    const a = deterministicPctForDate('MAT-1', '2026-08-08')
    expect(deterministicPctForDate('MAT-1', '2026-08-08')).toBe(a)
    expect(a).toBeGreaterThanOrEqual(-0.05)
    expect(a).toBeLessThanOrEqual(0.05)
  })

  it('prices vary across dates and symbols', () => {
    const day1 = deterministicPctForDate('MAT-1', '2026-08-08')
    const day2 = deterministicPctForDate('MAT-1', '2026-08-09')
    const other = deterministicPctForDate('MAT-2', '2026-08-08')
    expect([day1 !== day2, day1 !== other]).toContain(true)
  })

  it('valueForDate rounds base × (1 + pct)', () => {
    const pct = deterministicPctForDate('MAT-1', '2026-08-08')
    expect(valueForDate('MAT-1', 1000, '2026-08-08')).toBe(Math.round(1000 * (1 + pct)))
  })

  it('seriesEndingAt returns 30 ordered points ending today', () => {
    const end = new Date(2026, 7, 8)
    const series = seriesEndingAt('MAT-1', 1000, end)
    expect(series).toHaveLength(30)
    expect(series[0].dayOffset).toBe(0)
    expect(series[29].dayOffset).toBe(29)
    expect(series[29].valueCents).toBe(valueForDate('MAT-1', 1000, '2026-08-08'))
    expect(series[0].valueCents).toBe(valueForDate('MAT-1', 1000, '2026-07-10'))
  })

  it('indexRefreshDue triggers when absent, day-changed, or stale', () => {
    const now = new Date(2026, 7, 8, 12)
    expect(indexRefreshDue(null, now)).toBe(true)
    const fresh = buildMarketIndexSnapshot([makeRate(1)], { now })
    expect(indexRefreshDue(fresh, new Date(2026, 7, 8, 13))).toBe(false)
    expect(indexRefreshDue(fresh, new Date(2026, 7, 9, 10))).toBe(true)
    const old = buildMarketIndexSnapshot([makeRate(1)], { now: new Date(2026, 7, 7, 0) })
    expect(indexRefreshDue(old, new Date(2026, 7, 8, 12), { intervalHours: 24 })).toBe(true)
  })

  it('sortSnapshotsDesc orders newest day first', () => {
    const snapshots = [
      { dayKey: '2026-05-01' },
      { dayKey: '2026-07-01' },
      { dayKey: '2026-06-01' },
    ] as MarketIndexSnapshot[]
    expect(sortSnapshotsDesc(snapshots).map((s) => s.dayKey)).toEqual(['2026-07-01', '2026-06-01', '2026-05-01'])
  })
})

describe('Market index scheduler — buildMarketIndexSnapshot', () => {
  it('builds a USD snapshot keyed by day with only positive-priced rates', () => {
    const snapshot = buildMarketIndexSnapshot(makeRates(), { now: new Date(2026, 7, 8) })
    expect(snapshot.id).toBe('2026-08-08')
    expect(snapshot.dayKey).toBe('2026-08-08')
    expect(snapshot.currency).toBe('USD')
    expect(snapshot.fx).toBe(26)
    expect(snapshot.source).toBe('auto')
    expect(snapshot.symbolCount).toBe(3)
    expect(snapshot.index.map((i) => i.symbol)).toEqual(['MAT-1', 'MAT-2', 'MAT-3'])
  })

  it('currentCents equals today value and changePct is vs base', () => {
    const rate = makeRate(1, { code: 'MAT-CEM', baseRateCents: 1000 })
    const snapshot = buildMarketIndexSnapshot([rate], { now: new Date(2026, 7, 8) })
    const item = snapshot.index[0]
    expect(item.baseCents).toBe(1000)
    expect(item.currentCents).toBe(valueForDate('MAT-CEM', 1000, '2026-08-08'))
    expect(item.changePct).toBe(Math.round(((item.currentCents - 1000) / 1000) * 10000) / 100)
    expect(item.series).toHaveLength(30)
  })

  it('converts to ZWG when currency and fx are supplied', () => {
    const snapshot = buildMarketIndexSnapshot([makeRate(1, { code: 'MAT-CEM', baseRateCents: 1000 })], {
      now: new Date(2026, 7, 8),
      currency: 'ZWG',
      fx: 26,
    })
    const item = snapshot.index[0]
    expect(item.currency).toBe('ZWG')
    expect(item.baseCents).toBe(26000)
    expect(item.currentCents).toBe(Math.round(valueForDate('MAT-CEM', 1000, '2026-08-08')) * 26)
  })

  it('honours manual source override and per-day series moves', () => {
    const manual = buildMarketIndexSnapshot([makeRate(1)], { now: new Date(2026, 7, 8), source: 'manual' })
    expect(manual.source).toBe('manual')
    const nextDay = buildMarketIndexSnapshot([makeRate(1)], { now: new Date(2026, 7, 9), source: 'manual' })
    expect(nextDay.id).toBe('2026-08-09')
  })
})

describe('Market index scheduler — Dexie store', () => {
  it('autoRefresh persists an idempotent snapshot per day', async () => {
    const rates = makeRates()
    const first = await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8), rates })
    expect(first.ran).toBe(true)
    if (first.ran) {
      expect(first.snapshot.dayKey).toBe('2026-08-08')
      expect(first.snapshot.symbolCount).toBe(3)
    }
    const second = await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8, 15), rates })
    expect(second).toEqual({ ran: false, reason: 'fresh' })
    expect(await db.marketIndexSnapshots.count()).toBe(1)
  })

  it('autoRefresh writes a new snapshot when the day changes', async () => {
    const rates = makeRates()
    await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8), rates })
    const next = await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 9), rates })
    expect(next.ran).toBe(true)
    if (next.ran) expect(next.snapshot.dayKey).toBe('2026-08-09')
    expect(await db.marketIndexSnapshots.count()).toBe(2)
  })

  it('autoRefresh returns no-rates when the catalogue is empty', async () => {
    const result = await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8), rates: [] })
    expect(result).toEqual({ ran: false, reason: 'no-rates' })
  })

  it('reads rates from the db catalogue when none supplied', async () => {
    await db.rates.bulkAdd(makeRates().map((r, i) => ({ ...r, id: `r-${i}`, region: 'zimbabwe', source: 'zimbabwe' })) as never[])
    const result = await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8) })
    expect(result.ran).toBe(true)
    if (result.ran) expect(result.snapshot.symbolCount).toBe(3)
  })

  it('runNow forces a manual recompute even on the same day (upsert)', async () => {
    const rates = makeRates()
    await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8), rates })
    const manual = await useMarketIndexStore.getState().runNow({ now: new Date(2026, 7, 8, 20), rates })
    expect(manual).not.toBeNull()
    expect(manual!.source).toBe('manual')
    expect(await db.marketIndexSnapshots.count()).toBe(1)
    expect(useMarketIndexStore.getState().snapshot?.source).toBe('manual')
    expect(useMarketIndexStore.getState().history).toHaveLength(1)
  })

  it('load returns the latest snapshot sorted newest first', async () => {
    const rates = makeRates()
    await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 8), rates })
    await useMarketIndexStore.getState().autoRefresh({ now: new Date(2026, 7, 9), rates })
    useMarketIndexStore.setState({ snapshot: null, history: [] })
    await useMarketIndexStore.getState().load()
    expect(useMarketIndexStore.getState().snapshot?.dayKey).toBe('2026-08-09')
    expect(useMarketIndexStore.getState().history.map((s) => s.dayKey)).toEqual(['2026-08-09', '2026-08-08'])
  })
})
