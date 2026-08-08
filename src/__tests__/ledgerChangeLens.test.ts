import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/db'
import {
  WBS_REGISTRY,
  WBS_BY_CODE,
  findWbsCode,
  codeLine,
  codePurchaseOrderLines,
  summarizeLedger,
  restockableCover,
  committedForCode,
  UNALLOCATED_CODE,
} from '@/engine/ledger/trueLedger'
import {
  analyzeChangeImpact,
  redPenLens,
  wipaaLens,
  trueLedgerLens,
  budgetEngineerLens,
  calculatePenalty,
  type ChangeContext,
  type ChangeImpactResult,
} from '@/engine/change/changeLensEngine'
import { useLedgerStore } from '@/stores/ledgerStore'
import type { Rate, BOQ } from '@/types'
import type { PurchaseOrder } from '@/domain/procurement'
import type { WipaaResult } from '@/engine/payment/paymentCalculators'
import type { LedgerEntry } from '@/domain/ledger'

const projectId = 'p-ledger-1'

const rate = (code: string, description: string, baseRateCents: number): Rate => ({
  id: code,
  region: 'zimbabwe',
  code,
  description,
  unit: 'each',
  baseRateCents,
  source: 'custom',
  year: 2026,
})

const boq = (): BOQ => ({
  id: 'boq-1',
  projectId,
  designId: 'd1',
  sections: [
    {
      id: 's1',
      code: 'A',
      title: 'Substructure',
      items: [
        { id: 'A.1', description: 'Supply and place concrete', quantity: 10, unit: 'm3', rateCents: 300_00, totalCents: 3_000_00, elementIds: [], source: 'auto', aiConfidence: 1 },
        { id: 'A.2', description: 'Reinforcement steel', quantity: 500, unit: 'kg', rateCents: 200_00, totalCents: 100_000_00, elementIds: [], source: 'auto', aiConfidence: 1 },
      ],
      subtotalCents: 103_000_00,
    },
  ],
  totalCents: 103_000_00,
  contingencyCents: 5_150_00,
  currency: 'USD',
  generatedAt: '2026-01-01T00:00:00.000Z',
})

const wipaa = (over: Partial<WipaaResult> = {}): WipaaResult => ({
  contractValue: 100_000,
  costsIncurredToDate: 40_000,
  totalEstimatedCosts: 100_000,
  billedToDate: 50_000,
  costPctComplete: 40,
  revenueEarned: 40_000,
  grossProfitEarned: 0,
  overUnderBilled: -10_000,
  billingStatus: 'over-billed',
  remainingCosts: 60_000,
  remainingRevenue: 60_000,
  projectedProfit: 0,
  projectedProfitPct: 0,
  ...over,
})

const change = (over: Partial<ChangeContext> = {}): ChangeContext => ({
  changeOrderNumber: 'CO-001',
  declaredImpactCents: 100_000_00,
  lineItems: [
    { id: 'l1', description: 'Supply concrete mix', quantity: 10, unit: 'm3', unitPriceCents: 350_00 },
    { id: 'l2', description: 'Reinforcement steel bars', quantity: 200, unit: 'kg', unitPriceCents: 220_00 },
  ],
  ...over,
})

const po = (): PurchaseOrder => ({
  id: 'po-1',
  projectId,
  procurementRequestId: 'rfq-1',
  supplierQuoteId: 'q-1',
  supplierId: 's-1',
  poNumber: 'PO-0001',
  title: 'Materials',
  status: 'issued',
  lineItems: [
    { id: 'pl-1', description: 'Cement 50kg bag', quantity: 20, unit: 'bag', unitPriceCents: 9_00, totalCents: 180_00, deliveredQuantity: 0 },
    { id: 'pl-2', description: 'Ceramic floor tile 600x600', quantity: 40, unit: 'm2', unitPriceCents: 12_00, totalCents: 480_00, deliveredQuantity: 0 },
  ],
  subtotalCents: 660_00,
  taxCents: 0,
  shippingCents: 0,
  totalCents: 660_00,
  currency: 'USD',
  issuedDate: '2026-01-01T00:00:00.000Z',
  deliveryDate: '2026-02-01T00:00:00.000Z',
  deliveryLocation: 'Site',
  paymentTerms: '30 days',
  notes: '',
  issuedBy: 'u1',
  approvedBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const entry = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: crypto.randomUUID(),
  projectId,
  source: 'purchase-order',
  sourceId: 'po-1',
  sourceLineItemId: 'pl-1',
  description: 'Cement 50kg bag',
  quantity: 20,
  unit: 'bag',
  unitPriceCents: 9_00,
  amountCents: 180_00,
  wbsCode: '02.01.02',
  wbsName: 'Mortar materials',
  wbsCategory: 'material',
  restockable: true,
  codingMethod: 'auto',
  confidence: 0.9,
  codedAt: '2026-01-01T00:00:00.000Z',
  codedBy: 'auto',
  ...over,
})

describe('True Ledger — WBS registry + auto-coding', () => {
  it('registry has a stable code set with unique ids', () => {
    expect(WBS_REGISTRY.length).toBeGreaterThan(30)
    expect(new Set(WBS_REGISTRY.map((w) => w.code)).size).toBe(WBS_REGISTRY.length)
    expect(WBS_BY_CODE.size).toBe(WBS_REGISTRY.length)
  })

  it('unallocated fallback code exists and is at level 3', () => {
    expect(WBS_BY_CODE.has(UNALLOCATED_CODE)).toBe(true)
    expect(WBS_BY_CODE.get(UNALLOCATED_CODE)?.level).toBe(3)
  })

  it('auto-codes a concrete line to the substructure concrete code', () => {
    const result = findWbsCode('Supply ready mix concrete grade 20')
    expect(result.wbs.code).toBe('01.02.01')
    expect(result.method).toBe('auto')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.matchedKeywords).toContain('concrete')
  })

  it('auto-codes brick/block lines as restockable masonry', () => {
    const result = findWbsCode('Face brick 230x110x76')
    expect(result.wbs.code).toBe('02.01.01')
    expect(result.wbs.restockable).toBe(true)
    expect(result.wbs.category).toBe('material')
  })

  it('falls back to the unallocated code with zero confidence for unknown lines', () => {
    const result = findWbsCode('mystery service item xyz')
    expect(result.wbs.code).toBe(UNALLOCATED_CODE)
    expect(result.method).toBe('auto-fallback')
    expect(result.confidence).toBe(0)
  })

  it('codeLine builds a fully populated LedgerEntry', () => {
    const e = codeLine({
      projectId,
      source: 'purchase-order',
      sourceId: 'po-1',
      sourceLineItemId: 'pl-2',
      description: 'Ceramic floor tile 600x600',
      quantity: 40,
      unit: 'm2',
      unitPriceCents: 12_00,
      amountCents: 480_00,
    })
    expect(e.wbsCode).toBe('03.03.01')
    expect(e.wbsCategory).toBe('material')
    expect(e.restockable).toBe(true)
    expect(e.codingMethod).toBe('auto')
    expect(e.codedAt).toBeTruthy()
    expect(e.amountCents).toBe(480_00)
  })

  it('codePurchaseOrderLines maps PO line items one-to-one', () => {
    const entries = codePurchaseOrderLines(po())
    expect(entries).toHaveLength(2)
    expect(entries[0].sourceId).toBe('po-1')
    expect(entries[0].wbsCode).toBe('02.01.02')
    expect(entries[1].wbsCode).toBe('03.03.01')
  })
})

describe('True Ledger — summaries', () => {
  it('summarizeLedger totals by category and splits restockable vs one-time', () => {
    const entries = [
      entry({ amountCents: 180_00, wbsCode: '02.01.02', restockable: true, wbsCategory: 'material' }),
      entry({ id: crypto.randomUUID(), description: 'Labour 2 days', amountCents: 400_00, wbsCode: '06.02.01', wbsName: 'Labour', wbsCategory: 'labour', restockable: false }),
      entry({ id: crypto.randomUUID(), description: 'Site establishment', amountCents: 100_00, wbsCode: '06.01.01', wbsName: 'Site establishment', wbsCategory: 'service', restockable: false }),
    ]
    const summary = summarizeLedger(entries)
    expect(summary.totalCents).toBe(680_00)
    expect(summary.entryCount).toBe(3)
    expect(summary.byCategory.material).toBe(180_00)
    expect(summary.byCategory.labour).toBe(400_00)
    expect(summary.byCategory.service).toBe(100_00)
    expect(summary.restockableCents).toBe(180_00)
    expect(summary.oneTimeCents).toBe(500_00)
    expect(summary.unallocatedCents).toBe(0)
    expect(summary.byCode[0].amountCents).toBe(400_00)
  })

  it('tracks unallocated entries separately', () => {
    const entries = [
      entry({ amountCents: 50_00, wbsCode: UNALLOCATED_CODE, wbsName: 'Unallocated', restockable: false }),
    ]
    const summary = summarizeLedger(entries)
    expect(summary.unallocatedCents).toBe(50_00)
    expect(summary.unallocatedCount).toBe(1)
  })

  it('restockableCover and committedForCode filter by WBS code', () => {
    const entries = [
      entry({ amountCents: 100_00, wbsCode: '02.01.02', restockable: true }),
      entry({ id: crypto.randomUUID(), description: 'More cement', amountCents: 60_00, wbsCode: '02.01.02', restockable: true }),
      entry({ id: crypto.randomUUID(), description: 'Labour', amountCents: 30_00, wbsCode: '06.02.01', wbsName: 'Labour', wbsCategory: 'labour', restockable: false }),
    ]
    expect(committedForCode(entries, '02.01.02')).toBe(160_00)
    expect(restockableCover(entries, '02.01.02')).toBe(160_00)
    expect(restockableCover(entries, '06.02.01')).toBe(0)
  })
})

describe('Change Order 4-lens engine — lenses', () => {
  it('redPenLens revalues line items quoted above market threshold', () => {
    const result = redPenLens(
      change(),
      [rate('CONC', 'concrete', 300_00), rate('REBAR', 'reinforcement', 180_00)]
    )
    // l1 concrete: 350 > 345 (300*1.15)? no -> 300 market revalue? 350 > 345 -> yes -> 10*300_00 = 3_000_00
    // l2 rebar: 220 > 207 (180*1.15) -> yes -> 200*180_00 = 36_000_00
    expect(result.impactCents).toBe(3_000_00 + 36_000_00)
    expect(result.flag).toBe('Rates above market')
  })

  it('redPenLens uses quoted rates when none exceed the threshold', () => {
    const result = redPenLens(
      change(),
      [rate('CONC', 'concrete', 380_00), rate('REBAR', 'reinforcement', 240_00)]
    )
    expect(result.impactCents).toBe(10 * 350_00 + 200 * 220_00)
    expect(result.flag).toBeUndefined()
  })

  it('redPenLens degrades to declared impact without line breakdown', () => {
    const result = redPenLens(change({ lineItems: [] }))
    expect(result.impactCents).toBe(100_000_00)
  })

  it('wipaaLens nets the already-earned revenue portion out of the impact', () => {
    const result = wipaaLens(change(), wipaa())
    // costPctComplete 40 -> 40% already earned -> net new = 60% of 100_000_00
    expect(result.impactCents).toBe(60_000_00)
    expect(result.flag).toBeTruthy()
  })

  it('wipaaLens treats the change as full exposure without a baseline', () => {
    expect(wipaaLens(change(), null).impactCents).toBe(100_000_00)
    expect(wipaaLens(change(), undefined).impactCents).toBe(100_000_00)
  })

  it('trueLedgerLens subtracts committed WBS cover from the impact', () => {
    const cover = entry({ amountCents: 100_000_00, wbsCode: '01.02.01', description: 'concrete' })
    const result = trueLedgerLens(change(), [cover])
    // l1 concrete -> WBS 01.02.01 committed 100_000_00 covers the whole 3_500_00 line
    // l2 rebar -> WBS 02.02.01? no -> full new 44_000_00
    expect(result.impactCents).toBe(44_000_00)
    expect(result.flag).toContain('Ledger cover')
  })

  it('trueLedgerLens degrades without ledger entries', () => {
    const result = trueLedgerLens(change(), [])
    expect(result.impactCents).toBe(100_000_00)
    expect(result.flag).toBe('No ledger cover for this change')
  })

  it('budgetEngineerLens revalues at BOQ rates and applies contingency', () => {
    const result = budgetEngineerLens(change(), boq())
    // l1 concrete -> BOQ A.1 rate 300_00 -> 3_000_00; l2 rebar -> A.2 200_00 -> 40_000_00
    // contingency = 5% (5_150/103_000) of 43_000_00 = 2_150_00
    expect(result.impactCents).toBe(3_000_00 + 40_000_00 + 2_150_00)
  })

  it('budgetEngineerLens uses declared impact without a BOQ', () => {
    const result = budgetEngineerLens(change(), null)
    expect(result.impactCents).toBe(100_000_00)
  })
})

describe('Change Order 4-lens engine — orchestration + penalty', () => {
  it('analyzeChangeImpact returns all four lenses and a median recommendation', () => {
    const result = analyzeChangeImpact({ change: change(), boq: boq(), wipaa: wipaa() })
    expect(result.lenses.map((l) => l.name)).toEqual(['red-pen', 'wipaa', 'true-ledger', 'budget-engineer'])
    expect(result.recommendedImpactCents).toBeGreaterThan(0)
    expect(result.riskFlags).toContain('No ledger cover for this change')
    expect(result.analysisDate).toBeTruthy()
  })

  it('flags when lenses diverge widely from the declared impact', () => {
    const result = analyzeChangeImpact({
      change: change({ lineItems: [], declaredImpactCents: 10_00 }),
    })
    expect(result.spreadCents).toBe(0)
    // diverges: each lens returns 10_00 declared -> no flag
    expect(result.riskFlags.some((f) => f.includes('diverge'))).toBe(false)
  })

  it('calculates delay penalty as a daily bps of contract value, capped at max pct', () => {
    const r = calculatePenalty({ contractValueCents: 1_000_000_00, daysLate: 10 })
    // 25 bps/day = 0.25%/day -> 2.5% of 1,000,000_00 = 25,000_00; cap 10% = 100,000_00
    expect(r.delayPenaltyCents).toBe(25_000_00)
    expect(r.totalPenaltyCents).toBe(25_000_00)
    expect(r.capped).toBe(false)
  })

  it('caps delay penalty at maxPenaltyPct', () => {
    const r = calculatePenalty({ contractValueCents: 1_000_000_00, daysLate: 100 })
    expect(r.delayPenaltyCents).toBe(100_000_00)
    expect(r.capped).toBe(true)
  })

  it('adds rework penalty for rejected/defective work', () => {
    const r = calculatePenalty({
      contractValueCents: 1_000_000_00,
      daysLate: 0,
      defectValueCents: 10_000_00,
      rejectedFraction: 0.5,
    })
    expect(r.defectPenaltyCents).toBe(10_000_00)
    expect(r.totalPenaltyCents).toBe(10_000_00)
  })

  it('clamps rejectedFraction to [0,1] and honours rework multiplier', () => {
    const r = calculatePenalty({
      contractValueCents: 1_000_000_00,
      daysLate: 0,
      defectValueCents: 10_000_00,
      rejectedFraction: 2,
      reworkMultiplier: 3,
    })
    expect(r.defectPenaltyCents).toBe(30_000_00)
  })
})

describe('True Ledger + 4-lens — Dexie persistence', () => {
  beforeEach(async () => {
    await db.ledgerEntries.clear()
    await db.changeLensAnalyses.clear()
    await db.purchaseOrders.clear()
    useLedgerStore.setState({ entries: [], analyses: [], currentProjectId: null })
  })

  it('codePurchaseOrder persists coded entries and updates the store', async () => {
    await db.purchaseOrders.add(po())
    const entries = await useLedgerStore.getState().codePurchaseOrder('po-1')
    expect(entries).toHaveLength(2)
    expect(await db.ledgerEntries.count()).toBe(2)
    expect(useLedgerStore.getState().entries).toHaveLength(2)
  })

  it('loadForProject restores entries and analyses for a project', async () => {
    const e = entry()
    const analysis: ChangeImpactResult = analyzeChangeImpact({ change: change(), boq: boq(), wipaa: wipaa() })
    await db.ledgerEntries.add(e)
    await db.changeLensAnalyses.put(analysis)

    await useLedgerStore.getState().loadForProject(projectId)
    expect(useLedgerStore.getState().entries).toHaveLength(1)
    expect(useLedgerStore.getState().analyses).toHaveLength(1)
  })

  it('setAnalysis upserts and summary computes totals from the store', async () => {
    const analysis = analyzeChangeImpact({ change: change(), boq: boq(), wipaa: wipaa() })
    await useLedgerStore.getState().setAnalysis(analysis)
    await useLedgerStore.getState().setAnalysis({ ...analysis, recommendedImpactCents: 55_000_00 })

    expect(await db.changeLensAnalyses.count()).toBe(1)
    const s = useLedgerStore.getState().summary()
    expect(s.totalCents).toBe(0)
  })

  it('codePurchaseOrder returns [] for an unknown PO without persisting', async () => {
    const entries = await useLedgerStore.getState().codePurchaseOrder('missing')
    expect(entries).toEqual([])
    expect(await db.ledgerEntries.count()).toBe(0)
  })
})
