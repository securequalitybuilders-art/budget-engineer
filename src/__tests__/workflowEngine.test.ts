import { describe, it, expect } from 'vitest'
import {
  projectStage,
  nextStage,
  lifecycleStats,
  createRfq,
  submitQuote,
  awardQuote,
  confirmDelivery,
  pipelineSummary,
} from '@/engine/ecosystem/workflow'
import type { Project } from '@/types'
import type { EscrowAgreement } from '@/domain/marketplace'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    slug: 'p1',
    name: 'Test House',
    ownerId: 'o1',
    profile: 'first-time',
    region: 'zimbabwe',
    currency: 'USD',
    status: 'design',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    ...overrides,
  }
}

function makeEscrow(overrides: Partial<EscrowAgreement> = {}): EscrowAgreement {
  return {
    id: 'e1',
    projectId: 'p1',
    providerId: 's1',
    clientId: 'p1',
    contractReference: 'PO-001',
    totalAmount: 5000,
    currency: 'USD',
    milestones: [{ id: 'm1', escrowId: 'e1', title: 'Delivery', description: '', amount: 5000, dueDate: '2026-02-01', status: 'pending' }],
    status: 'locked',
    terms: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('project lifecycle', () => {
  it('archived projects are closed', () => {
    expect(projectStage(makeProject({ isArchived: true }), [])).toBe('closed')
  })

  it('no escrows means bidding', () => {
    expect(projectStage(makeProject(), [])).toBe('bidding')
  })

  it('locked escrow means active', () => {
    expect(projectStage(makeProject(), [makeEscrow()])).toBe('active')
  })

  it('fully settled escrows close the project', () => {
    expect(projectStage(makeProject(), [makeEscrow({ status: 'released' })])).toBe('closed')
    expect(projectStage(makeProject(), [makeEscrow({ status: 'refunded' })])).toBe('closed')
  })

  it('nextStage advances bidding → active → closed → null', () => {
    expect(nextStage('bidding')).toBe('active')
    expect(nextStage('active')).toBe('closed')
    expect(nextStage('closed')).toBeNull()
  })

  it('lifecycleStats buckets all projects', () => {
    const escrows = [makeEscrow({ projectId: 'p1' })]
    const stats = lifecycleStats(
      [
        makeProject({ id: 'p1' }),
        makeProject({ id: 'p2' }),
        makeProject({ id: 'p3', isArchived: true }),
      ],
      escrows
    )
    expect(stats).toEqual({ bidding: 1, active: 1, closed: 1 })
  })
})

describe('RFQ → quote → award → delivery', () => {
  const rfq = createRfq({
    projectId: 'p1',
    projectName: 'Test House',
    title: 'Cement package',
    category: 'Cement & masonry',
    priority: 'high',
    budgetCents: 50_000_00,
    deliveryLocation: 'Site A',
  })

  it('createRfq produces a quotes-sought request with a sequential number', () => {
    expect(rfq.status).toBe('quotes-sought')
    expect(rfq.requestNumber).toMatch(/^RFQ-\d{3}$/)
    expect(rfq.projectId).toBe('p1')
    expect(rfq.budgetCents).toBe(50_000_00)
    expect(rfq.estimatedCostCents).toBe(42_500_00)
    expect(rfq.deliveryLocation).toBe('Site A')
    expect(rfq.title).toBe('Cement package')
  })

  it('submitQuote prices the rfq and flips it to quotes-received', () => {
    const { quote, rfqUpdated } = submitQuote(rfq, {
      supplierId: 's1',
      supplierName: 'Brick Co',
      totalCents: 44_000_00,
      shippingCents: 2_000_00,
      deliveryDays: 7,
    })
    expect(quote.status).toBe('received')
    expect(quote.quoteNumber).toMatch(/^QT-\d{3}$/)
    expect(quote.supplierName).toBe('Brick Co')
    expect(quote.subtotalCents).toBe(42_000_00)
    expect(quote.totalCents).toBe(44_000_00)
    expect(quote.deliveryDays).toBe(7)
    expect(rfqUpdated.status).toBe('quotes-received')
  })

  it('awardQuote issues a PO and locks escrow at the dollar amount', () => {
    const { quote } = submitQuote(rfq, { supplierId: 's1', supplierName: 'Brick Co', totalCents: 44_000_00, deliveryDays: 10 })
    const { purchaseOrder, escrow, rfqUpdated, quoteUpdated } = awardQuote(rfq, quote)
    expect(purchaseOrder.status).toBe('issued')
    expect(purchaseOrder.poNumber).toMatch(/^PO-\d{3}$/)
    expect(purchaseOrder.totalCents).toBe(44_000_00)
    expect(purchaseOrder.deliveryDate).toBeTruthy()
    expect(escrow.status).toBe('locked')
    expect(escrow.totalAmount).toBe(44000)
    expect(escrow.contractReference).toBe(purchaseOrder.poNumber)
    expect(escrow.milestones[0].status).toBe('pending')
    expect(escrow.milestones[0].amount).toBe(44000)
    expect(rfqUpdated.status).toBe('awarded')
    expect(quoteUpdated.status).toBe('awarded')
  })

  it('confirmDelivery records the drop and releases the escrow milestone', () => {
    const { quote } = submitQuote(rfq, { supplierId: 's1', supplierName: 'Brick Co', totalCents: 44_000_00, deliveryDays: 10 })
    const { purchaseOrder, escrow } = awardQuote(rfq, quote)
    const { delivery, purchaseOrder: poUpdated, escrowMilestone } = confirmDelivery(purchaseOrder, escrow)
    expect(delivery.status).toBe('delivered')
    expect(delivery.deliveryNote).toMatch(/^DN-\d{3}$/)
    expect(delivery.items[0].quantityAccepted).toBe(1)
    expect(poUpdated.status).toBe('delivered')
    expect(escrowMilestone.status).toBe('released')
  })
})

describe('pipeline summary', () => {
  const rfq = createRfq({ projectId: 'p1', projectName: 'T', title: 'X', category: 'C', budgetCents: 1000 })
  const { quote } = submitQuote(rfq, { supplierId: 's1', supplierName: 'S', totalCents: 900, deliveryDays: 5 })
  const { purchaseOrder, escrow } = awardQuote(rfq, quote)

  it('counts open work per step and flags active ones', () => {
    const { delivery, purchaseOrder: deliveredPo } = confirmDelivery(purchaseOrder, escrow)
    const steps = pipelineSummary({
      procurementRequests: [{ ...rfq, status: 'quotes-received' }],
      supplierQuotes: [quote],
      purchaseOrders: [deliveredPo],
      deliveryRecords: [delivery],
      escrows: [escrow],
    })
    const byStep = Object.fromEntries(steps.map((s) => [s.step, s]))
    expect(byStep.rfq.count).toBe(1)
    expect(byStep.rfq.active).toBe(true)
    expect(byStep.quote.count).toBe(1)
    expect(byStep.award.count).toBe(1)
    expect(byStep.escrow.count).toBe(1)
    expect(byStep.delivery.count).toBe(1)
    expect(byStep.dispute.count).toBe(0)
    expect(byStep.dispute.active).toBe(false)
    expect(byStep.delivery.label).toBe('Delivery')
  })

  it('flags dispute when a delivery has rejected quantities', () => {
    const rfq2 = createRfq({ projectId: 'p1', projectName: 'T', title: 'Y', category: 'C', budgetCents: 1000 })
    const { quote: q2 } = submitQuote(rfq2, { supplierId: 's1', supplierName: 'S', totalCents: 900, deliveryDays: 5 })
    const { purchaseOrder: po2, escrow: esc2 } = awardQuote(rfq2, q2)
    const { delivery } = confirmDelivery(po2, esc2)
    const disputed = { ...delivery, items: delivery.items.map((i) => ({ ...i, quantityRejected: 1, quantityAccepted: 0 })) }
    const steps = pipelineSummary({
      procurementRequests: [],
      supplierQuotes: [],
      purchaseOrders: [],
      deliveryRecords: [disputed],
      escrows: [esc2],
    })
    expect(steps.find((s) => s.step === 'dispute')?.count).toBe(1)
    expect(steps.find((s) => s.step === 'dispute')?.active).toBe(true)
  })

  it('returns empty rfq step when every request is awarded', () => {
    const steps = pipelineSummary({
      procurementRequests: [{ ...rfq, status: 'awarded' }],
      supplierQuotes: [],
      purchaseOrders: [],
      deliveryRecords: [],
      escrows: [],
    })
    expect(steps.find((s) => s.step === 'rfq')?.active).toBe(false)
    expect(steps.find((s) => s.step === 'rfq')?.count).toBe(0)
  })
})
