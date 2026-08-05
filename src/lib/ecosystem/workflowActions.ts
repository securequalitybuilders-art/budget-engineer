import { db } from '@/db/db'
import type { ProcurementRequest, SupplierQuote, PurchaseOrder, DeliveryRecord } from '@/domain/procurement'
import type { EscrowAgreement } from '@/domain/marketplace'
import {
  createRfq,
  submitQuote,
  awardQuote,
  confirmDelivery,
  rejectDelivery,
  type CreateRfqInput,
  type SubmitQuoteInput,
} from '@/engine/ecosystem/workflow'

export interface AwardInput {
  rfqId: string
  quoteId: string
}

export async function saveRfq(input: CreateRfqInput): Promise<ProcurementRequest> {
  const rfq = createRfq(input)
  await db.procurementRequests.add(rfq)
  return rfq
}

export async function saveQuote(rfqId: string, input: SubmitQuoteInput): Promise<SupplierQuote> {
  const rfq = await db.procurementRequests.get(rfqId)
  if (!rfq) throw new Error(`RFQ ${rfqId} not found`)
  const { quote, rfqUpdated } = submitQuote(rfq, input)
  await db.supplierQuotes.add(quote)
  await db.procurementRequests.update(rfqId, { status: rfqUpdated.status, updatedAt: rfqUpdated.updatedAt })
  return quote
}

export async function saveAward(input: AwardInput): Promise<{ purchaseOrder: PurchaseOrder; escrow: EscrowAgreement }> {
  const rfq = await db.procurementRequests.get(input.rfqId)
  const quote = await db.supplierQuotes.get(input.quoteId)
  if (!rfq || !quote) throw new Error('RFQ or quote not found for award')
  const { rfqUpdated, quoteUpdated, purchaseOrder, escrow } = awardQuote(rfq, quote)
  await db.procurementRequests.update(rfq.id, { status: rfqUpdated.status, updatedAt: rfqUpdated.updatedAt })
  await db.supplierQuotes.update(quote.id, { status: quoteUpdated.status, updatedAt: quoteUpdated.updatedAt })
  await db.purchaseOrders.add(purchaseOrder)
  await db.escrows.add(escrow)
  return { purchaseOrder, escrow }
}

export async function saveDelivery(purchaseOrderId: string): Promise<DeliveryRecord> {
  const po = await db.purchaseOrders.get(purchaseOrderId)
  if (!po) throw new Error(`PO ${purchaseOrderId} not found`)
  const escrow = (await db.escrows.toArray()).find((e) => e.contractReference === po.poNumber)
  const { delivery, purchaseOrder, escrowMilestone } = confirmDelivery(po, escrow ?? buildPlaceholderEscrow(po))
  await db.deliveryRecords.add(delivery)
  await db.purchaseOrders.update(po.id, {
    status: purchaseOrder.status,
    receivedAt: purchaseOrder.receivedAt,
    receivedBy: purchaseOrder.receivedBy,
    updatedAt: purchaseOrder.updatedAt,
  })
  if (escrow) {
    const nextMilestones = escrow.milestones.map((m) =>
      m.id === escrowMilestone.id ? escrowMilestone : m
    )
    await db.escrows.update(escrow.id, { milestones: nextMilestones, updatedAt: escrowMilestone.releasedAt ?? new Date().toISOString() })
  }
  return delivery
}

export async function closeProject(projectId: string): Promise<void> {
  await db.projects.update(projectId, { isArchived: true, updatedAt: new Date().toISOString() })
}

export async function reopenProject(projectId: string): Promise<void> {
  await db.projects.update(projectId, { isArchived: false, updatedAt: new Date().toISOString() })
}

export async function saveRejectedDelivery(params: {
  purchaseOrderId: string
  quantityRejected: number
  reason: string
}): Promise<DeliveryRecord> {
  const po = await db.purchaseOrders.get(params.purchaseOrderId)
  if (!po) throw new Error(`PO ${params.purchaseOrderId} not found`)
  const delivery = await db.deliveryRecords.where('purchaseOrderId').equals(po.id).first()
  if (!delivery) throw new Error('No delivery record to dispute')
  const escrow = (await db.escrows.toArray()).find((e) => e.contractReference === po.poNumber)
  const { delivery: updatedDelivery, purchaseOrder, escrowMilestone } = rejectDelivery({
    purchaseOrder: po,
    escrow: escrow ?? buildPlaceholderEscrow(po),
    delivery,
    quantityRejected: params.quantityRejected,
    reason: params.reason,
  })
  await db.deliveryRecords.put(updatedDelivery)
  await db.purchaseOrders.update(po.id, { status: purchaseOrder.status, updatedAt: purchaseOrder.updatedAt })
  if (escrow) {
    const nextMilestones = escrow.milestones.map((m) =>
      m.id === escrowMilestone.id ? escrowMilestone : m
    )
    await db.escrows.update(escrow.id, { milestones: nextMilestones, updatedAt: escrowMilestone.releasedAt ?? new Date().toISOString() })
  }
  return updatedDelivery
}

function buildPlaceholderEscrow(po: PurchaseOrder): EscrowAgreement {
  const now = new Date().toISOString()
  return {
    id: `ESC-${po.id}`,
    projectId: po.projectId,
    providerId: po.supplierId,
    clientId: po.projectId,
    contractReference: po.poNumber,
    totalAmount: Math.round(po.totalCents / 100),
    currency: po.currency,
    milestones: [
      {
        id: `ESCM-${po.id}`,
        escrowId: `ESC-${po.id}`,
        title: 'Delivery & acceptance',
        description: po.title,
        amount: Math.round(po.totalCents / 100),
        dueDate: po.deliveryDate,
        status: 'pending',
      },
    ],
    status: 'locked',
    terms: '',
    createdAt: now,
    updatedAt: now,
  }
}
