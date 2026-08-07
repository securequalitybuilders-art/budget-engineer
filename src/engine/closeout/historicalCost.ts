import type { HistoricalCostRecord, RomEstimateResult } from '@/domain/closeout'

export function seedHistoricalCosts(): HistoricalCostRecord[] {
  const now = new Date().toISOString()
  const rows: Array<[string, string, string, number, number, number]> = [
    ['Substructure & foundations', 'substructure', 'Zimbabwe', 120, 21_000_000, 90],
    ['Substructure & foundations', 'substructure', 'Zimbabwe', 150, 27_000_000, 96],
    ['Superstructure & masonry', 'superstructure', 'Zimbabwe', 130, 31_000_000, 120],
    ['Superstructure & masonry', 'superstructure', 'South Africa', 140, 38_000_000, 132],
    ['Roof & cladding', 'roof', 'Zimbabwe', 100, 18_500_000, 85],
    ['Roof & cladding', 'roof', 'South Africa', 110, 23_000_000, 95],
    ['Finishes & interiors', 'finishes', 'Zimbabwe', 100, 20_000_000, 80],
    ['Finishes & interiors', 'finishes', 'Kenya', 90, 15_000_000, 75],
    ['MEP services', 'mep', 'Zimbabwe', 100, 17_000_000, 70],
    ['MEP services', 'mep', 'South Africa', 120, 26_000_000, 88],
  ]
  return rows.map(([description, category, region, areaM2, totalCostCents, costPerM2Cents], i) => ({
    id: crypto.randomUUID(),
    projectId: `seed-${i}`,
    description,
    category,
    region,
    areaM2,
    totalCostCents,
    costPerM2Cents,
    completedAt: now,
  }))
}

export function addHistoricalCostRecord(
  records: HistoricalCostRecord[],
  record: Omit<HistoricalCostRecord, 'id' | 'costPerM2Cents'>,
): HistoricalCostRecord[] {
  const costPerM2Cents = record.areaM2 > 0 ? Math.round(record.totalCostCents / record.areaM2) : 0
  const full: HistoricalCostRecord = { ...record, id: crypto.randomUUID(), costPerM2Cents }
  return [...records, full]
}

export function romEstimate(
  records: HistoricalCostRecord[],
  opts: { description: string; areaM2: number; region: string; category?: string },
): RomEstimateResult | null {
  if (opts.areaM2 <= 0) return null
  let pool = records.filter((r) => r.region === opts.region && (!opts.category || r.category === opts.category))
  if (pool.length === 0) pool = records.filter((r) => r.region === opts.region)
  if (pool.length === 0) pool = records.filter((r) => !opts.category || r.category === opts.category)
  if (pool.length === 0) return null

  const perM2 = pool.map((r) => r.costPerM2Cents).sort((a, b) => a - b)
  const best = perM2[Math.floor(perM2.length / 2)]
  const rangeLow = Math.round(best * 0.8)
  const rangeHigh = Math.round(best * 1.2)
  const confidence = perM2.length < 3 ? 'low' : perM2.length < 6 ? 'medium' : 'high'

  return {
    bestCents: best * opts.areaM2,
    rangeLowCents: rangeLow * opts.areaM2,
    rangeHighCents: rangeHigh * opts.areaM2,
    bestPerM2Cents: best,
    matchedRecords: pool.length,
    confidence,
  }
}

export function anonymizeHistoricalRecord(
  record: HistoricalCostRecord,
): Omit<HistoricalCostRecord, 'projectId'> {
  return {
    id: record.id,
    description: record.description,
    category: record.category,
    region: record.region,
    areaM2: record.areaM2,
    totalCostCents: record.totalCostCents,
    costPerM2Cents: record.costPerM2Cents,
    completedAt: record.completedAt,
  }
}
