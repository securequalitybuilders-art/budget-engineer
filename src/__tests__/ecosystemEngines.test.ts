import { describe, it, expect } from 'vitest'
import { assessCashVsScope } from '@/engine/ecosystem/walletToWall'
import { aggregateMaterialDemand, estimateBulkDiscount, aggregateDemandSummary } from '@/engine/ecosystem/groupBuy'
import { calculateTco, compareSuppliers } from '@/engine/ecosystem/tco'
import { buildMarketIndex, buildIndexSeries, fxConvert, FX_USD_TO_ZWG } from '@/engine/ecosystem/priceIndex'
import { generateCreditNote, settleCreditNote, creditNoteTotals } from '@/engine/ecosystem/creditNote'
import { useSelectionsStore } from '@/stores/selectionsStore'
import { useFlashDealStore } from '@/stores/flashDealStore'

describe('walletToWall — cash vs scope feasibility', () => {
  it('proceeds when cash covers build plus contingency', () => {
    const result = assessCashVsScope({ cashOnHandCents: 100_000_00, estimatedBuildCostCents: 75_000_00 })
    expect(result.verdict).toBe('proceed')
    expect(result.requiredCashCents).toBe(90_000_00)
    expect(result.fundingGapCents).toBe(0)
  })

  it('warns on caution when only the base build is covered', () => {
    const result = assessCashVsScope({ cashOnHandCents: 80_000_00, estimatedBuildCostCents: 75_000_00 })
    expect(result.verdict).toBe('caution')
    expect(result.fundingGapCents).toBe(10_000_00)
  })

  it('flags white-elephant risk when cash is far below scope', () => {
    const result = assessCashVsScope({
      cashOnHandCents: 30_000_00,
      estimatedBuildCostCents: 100_000_00,
      monthlyIncomeCents: 2_000_00,
      monthsToBuild: 6,
    })
    expect(result.verdict).toBe('white-elephant')
    expect(result.affordabilityRatio).toBe(0.3)
  })

  it('caution + financing closes the gap', () => {
    const result = assessCashVsScope({
      cashOnHandCents: 50_000_00,
      estimatedBuildCostCents: 100_000_00,
      monthlyIncomeCents: 10_000_00,
      monthsToBuild: 12,
    })
    expect(result.verdict).toBe('caution')
    expect(result.reasons.some((r) => r.includes('close'))).toBe(true)
  })
})

describe('groupBuy — demand aggregation', () => {
  const lines = [
    { id: 'l1', projectId: 'p1', description: 'Portland cement 50kg', quantity: 200, unit: 'bag', unitCostCents: 1850 },
    { id: 'l2', projectId: 'p2', description: 'Portland cement 50kg', quantity: 300, unit: 'bag', unitCostCents: 1900 },
    { id: 'l3', projectId: 'p3', description: 'Steel rebar 12mm', quantity: 500, unit: 'm', unitCostCents: 450 },
  ]

  it('aggregates like materials across projects', () => {
    const demand = aggregateMaterialDemand(lines)
    const cement = demand.find((d) => d.label.includes('cement'))
    expect(cement?.quantity).toBe(500)
    expect(cement?.projectCount).toBe(2)
    expect(demand).toHaveLength(2)
  })

  it('computes bulk discount tiers', () => {
    expect(estimateBulkDiscount(50, 1000).discountPct).toBe(0)
    expect(estimateBulkDiscount(100, 1000).discountPct).toBe(3)
    expect(estimateBulkDiscount(1000, 1000).discountPct).toBe(6)
    expect(estimateBulkDiscount(10000, 1000).discountPct).toBe(9)
    expect(estimateBulkDiscount(50000, 1000).discountPct).toBe(12)
  })

  it('summarizes total order value and savings', () => {
    const demand = aggregateMaterialDemand(lines)
    const summary = aggregateDemandSummary(demand)
    expect(summary.materialCount).toBe(2)
    expect(summary.totalOrderValueCents).toBeGreaterThan(0)
    expect(summary.totalSavingCents).toBeGreaterThan(0)
  })
})

describe('tco — total cost of ownership', () => {
  it('adds downtime and defect costs to price', () => {
    const result = calculateTco({
      priceCents: 100_000,
      freightCents: 10_000,
      onTimeDeliveryPct: 90,
      defectRatePct: 2,
      laborDowntimeCostCentsPerDay: 20_000,
      leadDays: 7,
      typicalLeadDays: 14,
    })
    expect(result.totalCostCents).toBeGreaterThan(result.priceCents + result.freightCents)
    expect(result.downtimeCostCents).toBeGreaterThan(0)
    expect(result.defectCostCents).toBe(4000)
  })

  it('ranks suppliers by TCO, not raw price', () => {
    const rows = compareSuppliers([
      { id: 'a', name: 'Cheap but slow', input: { priceCents: 90_000, freightCents: 5_000, onTimeDeliveryPct: 60, defectRatePct: 8, laborDowntimeCostCentsPerDay: 20_000, leadDays: 21, typicalLeadDays: 7 } },
      { id: 'b', name: 'Pricier but reliable', input: { priceCents: 110_000, freightCents: 5_000, onTimeDeliveryPct: 99, defectRatePct: 0.5, laborDowntimeCostCentsPerDay: 20_000, leadDays: 7, typicalLeadDays: 7 } },
    ])
    expect(rows[0].id).toBe('b')
    expect(rows[0].rank).toBe(1)
    expect(rows.find((r) => r.id === 'a')?.priceRank).toBe(1)
  })
})

describe('priceIndex — SADC market index', () => {
  it('builds a deterministic 30-day series per material', () => {
    const index = buildMarketIndex([
      { code: 'MAT-CEM-001', description: 'Portland cement 50kg', unit: 'bag', baseRateCents: 1850, year: 2026 },
      { code: 'MAT-STL-001', description: 'Steel rebar 12mm', unit: 'm', baseRateCents: 450, year: 2026 },
    ])
    expect(index).toHaveLength(2)
    expect(index[0].series).toHaveLength(30)
    const first = buildIndexSeries('MAT-CEM-001', 1850)
    expect(first).toEqual(buildIndexSeries('MAT-CEM-001', 1850))
  })

  it('converts to ZWG using the FX rate', () => {
    expect(fxConvert(1000, FX_USD_TO_ZWG, 'ZWG')).toBe(26000)
    expect(fxConvert(1000, FX_USD_TO_ZWG, 'USD')).toBe(1000)
  })
})

describe('creditNote — dispute resolution', () => {
  it('issues a 90/10 credit note', () => {
    const note = generateCreditNote({ rejectedAmountCents: 100_000, reason: 'Cracked bricks rejected' })
    expect(note.immediateCents).toBe(90_000)
    expect(note.heldCents).toBe(10_000)
    expect(note.status).toBe('issued')
  })

  it('settles the held portion and totals correctly', () => {
    const a = generateCreditNote({ rejectedAmountCents: 100_000, reason: 'a' })
    const b = generateCreditNote({ rejectedAmountCents: 50_000, reason: 'b' })
    const settled = settleCreditNote(a)
    const totals = creditNoteTotals([settled, b])
    expect(totals.count).toBe(2)
    expect(totals.totalCents).toBe(150_000)
    expect(totals.immediateCents).toBe(135_000)
    expect(totals.heldCents).toBe(15_000)
    expect(totals.settledCents).toBe(10_000)
  })
})

describe('ecosystem stores', () => {
  it('selections store tracks allowance vs actual', () => {
    useSelectionsStore.setState({ items: [] })
    useSelectionsStore.getState().add({ name: 'Tiles', category: 'Finishes', budgetAllowanceCents: 50_000, actualCostCents: 40_000 })
    expect(useSelectionsStore.getState().items).toHaveLength(1)
    const id = useSelectionsStore.getState().items[0].id
    useSelectionsStore.getState().update(id, { actualCostCents: 45_000 })
    expect(useSelectionsStore.getState().items[0].actualCostCents).toBe(45_000)
    useSelectionsStore.getState().remove(id)
    expect(useSelectionsStore.getState().items).toHaveLength(0)
  })

  it('flash deal store adds, toggles and removes deals', () => {
    useFlashDealStore.setState({ deals: [] })
    useFlashDealStore.getState().add({
      providerId: 'p1', providerName: 'Brick Co', itemName: 'Common brick',
      normalPriceCents: 25, dealPriceCents: 22, discountPct: 12, expiresAt: '2026-12-31',
    })
    expect(useFlashDealStore.getState().deals).toHaveLength(1)
    const id = useFlashDealStore.getState().deals[0].id
    expect(useFlashDealStore.getState().deals[0].active).toBe(true)
    useFlashDealStore.getState().toggleActive(id)
    expect(useFlashDealStore.getState().deals[0].active).toBe(false)
    useFlashDealStore.getState().remove(id)
    expect(useFlashDealStore.getState().deals).toHaveLength(0)
  })
})
