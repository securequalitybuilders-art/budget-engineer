import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/db'
import { saveRfq, saveQuote, saveAward, saveDelivery, saveRejectedDelivery, closeProject, reopenProject } from '@/lib/ecosystem/workflowActions'
import type { Project } from '@/types'

const project: Project = {
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
}

beforeEach(async () => {
  await db.projects.clear()
  await db.procurementRequests.clear()
  await db.supplierQuotes.clear()
  await db.purchaseOrders.clear()
  await db.deliveryRecords.clear()
  await db.escrows.clear()
})

describe('workflow actions (Dexie)', () => {
  it('saveRfq persists a request', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    expect(await db.procurementRequests.get(rfq.id)).toMatchObject({ title: 'Steel', status: 'quotes-sought' })
  })

  it('saveQuote persists the quote and updates the rfq status', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Steel Mart', totalCents: 27_000_00, deliveryDays: 6 })
    expect(await db.supplierQuotes.get(quote.id)).toMatchObject({ supplierName: 'Steel Mart', status: 'received' })
    expect((await db.procurementRequests.get(rfq.id))?.status).toBe('quotes-received')
  })

  it('saveAward creates PO + escrow and marks both awarded', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Steel Mart', totalCents: 27_000_00, deliveryDays: 6 })
    const { purchaseOrder, escrow } = await saveAward({ rfqId: rfq.id, quoteId: quote.id })
    expect((await db.purchaseOrders.get(purchaseOrder.id))?.status).toBe('issued')
    expect((await db.escrows.get(escrow.id))?.status).toBe('locked')
    expect((await db.procurementRequests.get(rfq.id))?.status).toBe('awarded')
    expect((await db.supplierQuotes.get(quote.id))?.status).toBe('awarded')
  })

  it('saveDelivery confirms the drop and releases the escrow milestone', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Steel Mart', totalCents: 27_000_00, deliveryDays: 6 })
    const { purchaseOrder, escrow } = await saveAward({ rfqId: rfq.id, quoteId: quote.id })
    const delivery = await saveDelivery(purchaseOrder.id)
    expect(await db.deliveryRecords.get(delivery.id)).toMatchObject({ status: 'delivered' })
    expect((await db.purchaseOrders.get(purchaseOrder.id))?.status).toBe('delivered')
    const updatedEscrow = await db.escrows.get(escrow.id)
    expect(updatedEscrow?.milestones[0].status).toBe('released')
  })

  it('saveDelivery works when no escrow exists (placeholder milestone)', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Roof sheets', category: 'Roofing', budgetCents: 20_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Roof Mart', totalCents: 19_000_00, deliveryDays: 4 })
    const { purchaseOrder } = await saveAward({ rfqId: rfq.id, quoteId: quote.id })
    await db.escrows.clear()
    const delivery = await saveDelivery(purchaseOrder.id)
    expect(delivery.status).toBe('delivered')
    expect((await db.purchaseOrders.get(purchaseOrder.id))?.status).toBe('delivered')
  })

  it('closeProject archives the project', async () => {
    await db.projects.add(project)
    await closeProject('p1')
    expect((await db.projects.get('p1'))?.isArchived).toBe(true)
  })

  it('reopenProject restores an archived project', async () => {
    await db.projects.add({ ...project, isArchived: true })
    await reopenProject('p1')
    expect((await db.projects.get('p1'))?.isArchived).toBe(false)
  })

  it('saveRejectedDelivery flags the delivery, PO and escrow milestone as disputed', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Steel Mart', totalCents: 27_000_00, deliveryDays: 6 })
    const { purchaseOrder, escrow } = await saveAward({ rfqId: rfq.id, quoteId: quote.id })
    await saveDelivery(purchaseOrder.id)
    const disputed = await saveRejectedDelivery({ purchaseOrderId: purchaseOrder.id, quantityRejected: 1, reason: 'Rusty rebars' })
    expect(disputed.items[0].quantityRejected).toBe(1)
    expect(disputed.items[0].rejectionReason).toBe('Rusty rebars')
    expect((await db.purchaseOrders.get(purchaseOrder.id))?.status).toBe('delivered')
    const updatedEscrow = await db.escrows.get(escrow.id)
    expect(updatedEscrow?.milestones[0].status).toBe('disputed')
    expect(updatedEscrow?.milestones[0].disputedReason).toBe('Rusty rebars')
  })

  it('saveRejectedDelivery throws when there is no delivery record', async () => {
    const rfq = await saveRfq({ projectId: project.id, projectName: project.name, title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Steel Mart', totalCents: 27_000_00, deliveryDays: 6 })
    const { purchaseOrder } = await saveAward({ rfqId: rfq.id, quoteId: quote.id })
    await expect(saveRejectedDelivery({ purchaseOrderId: purchaseOrder.id, quantityRejected: 1, reason: 'X' })).rejects.toThrow('No delivery record')
  })

  it('saveQuote throws for a missing rfq', async () => {
    await expect(saveQuote('nope', { supplierId: 's1', supplierName: 'S', totalCents: 100, deliveryDays: 1 })).rejects.toThrow('not found')
  })
})
