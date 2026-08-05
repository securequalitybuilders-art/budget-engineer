import type { Project } from '@/types'
import type { EscrowAgreement, EscrowMilestone } from '@/domain/marketplace'
import type {
  ProcurementRequest,
  SupplierQuote,
  PurchaseOrder,
  DeliveryRecord,
  DeliveryLineItem,
  QuoteLineItem,
} from '@/domain/procurement'

export type ProjectStage = 'bidding' | 'active' | 'closed'

export type WorkflowStepId = 'rfq' | 'quote' | 'award' | 'escrow' | 'delivery' | 'dispute'

let idCounter = 0
const seqCounters: Record<string, number> = {}

function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${idCounter}`
}

function seqNumber(prefix: string): string {
  const n = (seqCounters[prefix] ?? 0) + 1
  seqCounters[prefix] = n
  return `${prefix}-${String(n).padStart(3, '0')}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ── Project lifecycle ──

export function projectStage(project: Project, escrows: EscrowAgreement[]): ProjectStage {
  if (project.isArchived) return 'closed'
  const mine = escrows.filter((e) => e.projectId === project.id)
  if (mine.length === 0) return 'bidding'
  if (mine.every((e) => e.status === 'released' || e.status === 'refunded')) return 'closed'
  return 'active'
}

export function nextStage(stage: ProjectStage): ProjectStage | null {
  if (stage === 'bidding') return 'active'
  if (stage === 'active') return 'closed'
  return null
}

export function lifecycleStats(projects: Project[], escrows: EscrowAgreement[]): Record<ProjectStage, number> {
  const out: Record<ProjectStage, number> = { bidding: 0, active: 0, closed: 0 }
  for (const p of projects) {
    out[projectStage(p, escrows)] += 1
  }
  return out
}

// ── RFQ → Quote → Award → Escrow → Delivery ──

export interface CreateRfqInput {
  projectId: string
  projectName: string
  title: string
  description?: string
  category: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  budgetCents: number
  deliveryLocation?: string
  requestedBy?: string
  requiredByDate?: string
}

export function createRfq(input: CreateRfqInput): ProcurementRequest {
  const now = nowIso()
  return {
    id: uid('RFQ'),
    projectId: input.projectId,
    requestNumber: seqNumber('RFQ'),
    quotes: [],
    title: input.title,
    description: input.description ?? '',
    category: input.category,
    priority: input.priority ?? 'medium',
    status: 'quotes-sought',
    requestedBy: input.requestedBy ?? 'Project Manager',
    requestedAt: now,
    requiredByDate: input.requiredByDate ?? daysFromNow(21),
    budgetCents: input.budgetCents,
    estimatedCostCents: Math.round(input.budgetCents * 0.85),
    linkedBOQLineIds: [],
    linkedScheduleLineIds: [],
    specifications: [input.title],
    deliveryLocation: input.deliveryLocation ?? input.projectName,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export interface SubmitQuoteInput {
  supplierId: string
  supplierName: string
  totalCents: number
  shippingCents?: number
  deliveryDays: number
  currency?: string
  notes?: string
  validUntil?: string
}

export interface SubmitQuoteResult {
  quote: SupplierQuote
  rfqUpdated: Pick<ProcurementRequest, 'status' | 'updatedAt'>
}

export function submitQuote(rfq: ProcurementRequest, input: SubmitQuoteInput): SubmitQuoteResult {
  const now = nowIso()
  const shippingCents = input.shippingCents ?? 0
  const lineItem: QuoteLineItem = {
    id: uid('LI'),
    description: rfq.title,
    quantity: 1,
    unit: 'lot',
    unitPriceCents: input.totalCents - shippingCents,
    totalCents: input.totalCents,
  }
  const quote: SupplierQuote = {
    id: uid('QT'),
    procurementRequestId: rfq.id,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    quoteNumber: seqNumber('QT'),
    quoteDate: now,
    validUntil: input.validUntil ?? daysFromNow(14),
    status: 'received',
    lineItems: [lineItem],
    subtotalCents: input.totalCents - shippingCents,
    taxCents: 0,
    shippingCents,
    totalCents: input.totalCents,
    currency: input.currency ?? 'USD',
    deliveryDays: input.deliveryDays,
    paymentTerms: 'Milestone escrow release on delivery acceptance',
    warrantyTerms: 'Defects liability 12 months',
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
  }
  return {
    quote,
    rfqUpdated: { status: 'quotes-received', updatedAt: now },
  }
}

export interface AwardQuoteResult {
  rfqUpdated: Pick<ProcurementRequest, 'status' | 'updatedAt'>
  quoteUpdated: Pick<SupplierQuote, 'status' | 'updatedAt'>
  purchaseOrder: PurchaseOrder
  escrow: EscrowAgreement
}

export function awardQuote(rfq: ProcurementRequest, quote: SupplierQuote): AwardQuoteResult {
  const now = nowIso()
  const totalAmount = Math.round(quote.totalCents / 100)
  const escrowId = uid('ESC')
  const milestone: EscrowMilestone = {
    id: uid('ESCM'),
    escrowId,
    title: 'Delivery & acceptance',
    description: `Payment for ${rfq.title} released on accepted delivery`,
    amount: totalAmount,
    dueDate: daysFromNow(quote.deliveryDays),
    status: 'pending',
  }
  const poNumber = seqNumber('PO')
  const purchaseOrder: PurchaseOrder = {
    id: uid('PO'),
    projectId: rfq.projectId,
    procurementRequestId: rfq.id,
    supplierQuoteId: quote.id,
    supplierId: quote.supplierId,
    poNumber,
    title: rfq.title,
    status: 'issued',
    lineItems: [
      {
        id: uid('LI'),
        description: rfq.title,
        quantity: 1,
        unit: 'lot',
        unitPriceCents: quote.totalCents,
        totalCents: quote.totalCents,
        deliveredQuantity: 0,
      },
    ],
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    shippingCents: quote.shippingCents,
    totalCents: quote.totalCents,
    currency: quote.currency,
    issuedDate: now,
    deliveryDate: daysFromNow(quote.deliveryDays),
    deliveryLocation: rfq.deliveryLocation,
    paymentTerms: quote.paymentTerms,
    notes: `Awarded to ${quote.supplierName}`,
    issuedBy: 'Project Manager',
    approvedBy: 'Procurement',
    createdAt: now,
    updatedAt: now,
  }
  const escrow: EscrowAgreement = {
    id: escrowId,
    projectId: rfq.projectId,
    providerId: quote.supplierId,
    clientId: rfq.projectId,
    contractReference: poNumber,
    totalAmount,
    currency: quote.currency,
    milestones: [milestone],
    status: 'locked',
    terms: 'Funds released to supplier only after geo-fenced delivery + photo verification.',
    disputeResolution: 'Rejected materials trigger instant 90/10 credit note.',
    createdAt: now,
    updatedAt: now,
  }
  return {
    rfqUpdated: { status: 'awarded', updatedAt: now },
    quoteUpdated: { status: 'awarded', updatedAt: now },
    purchaseOrder,
    escrow,
  }
}

export interface ConfirmDeliveryResult {
  delivery: DeliveryRecord
  purchaseOrder: PurchaseOrder
  escrowMilestone: EscrowMilestone
}

export function confirmDelivery(purchaseOrder: PurchaseOrder, escrow: EscrowAgreement): ConfirmDeliveryResult {
  const now = nowIso()
  const deliveredLine: DeliveryLineItem = {
    poLineItemId: purchaseOrder.lineItems[0]?.id ?? uid('LI'),
    description: purchaseOrder.title,
    quantityOrdered: purchaseOrder.lineItems[0]?.quantity ?? 1,
    quantityDelivered: purchaseOrder.lineItems[0]?.quantity ?? 1,
    quantityAccepted: purchaseOrder.lineItems[0]?.quantity ?? 1,
    quantityRejected: 0,
  }
  const delivery: DeliveryRecord = {
    id: uid('DN'),
    purchaseOrderId: purchaseOrder.id,
    deliveryNote: seqNumber('DN'),
    status: 'delivered',
    deliveryDate: now,
    receivedBy: 'Site Manager',
    items: [deliveredLine],
    notes: 'Geo-fenced drop confirmed by driver app.',
    createdAt: now,
  }
  const milestone = escrow.milestones[0]
    ? { ...escrow.milestones[0], status: 'released' as const, releasedAt: now }
    : null
  return {
    delivery,
    purchaseOrder: { ...purchaseOrder, status: 'delivered', receivedAt: now, receivedBy: 'Site Manager', updatedAt: now },
    escrowMilestone: milestone ?? {
      id: uid('ESCM'),
      escrowId: escrow.id,
      title: 'Delivery & acceptance',
      description: 'Released on accepted delivery',
      amount: escrow.totalAmount,
      dueDate: now,
      status: 'released',
      releasedAt: now,
    },
  }
}

export interface RejectDeliveryResult {
  delivery: DeliveryRecord
  purchaseOrder: PurchaseOrder
  escrowMilestone: EscrowMilestone
}

export function rejectDelivery(params: {
  purchaseOrder: PurchaseOrder
  escrow: EscrowAgreement
  delivery: DeliveryRecord
  quantityRejected: number
  reason: string
}): RejectDeliveryResult {
  const { purchaseOrder, escrow, delivery } = params
  const now = nowIso()
  const rejected = Math.min(Math.max(Math.round(params.quantityRejected), 0), delivery.items[0]?.quantityDelivered ?? 1)
  const accepted = Math.max((delivery.items[0]?.quantityDelivered ?? 1) - rejected, 0)
  const partiallyRejected = accepted > 0 && rejected > 0
  const items: DeliveryLineItem[] = delivery.items.map((i, idx) => {
    if (idx === 0) {
      return {
        ...i,
        quantityRejected: rejected,
        quantityAccepted: Math.min(accepted, i.quantityAccepted),
        rejectionReason: rejected > 0 ? params.reason : i.rejectionReason,
      }
    }
    return i
  })
  const updatedDelivery: DeliveryRecord = {
    ...delivery,
    status: partiallyRejected ? 'partially-delivered' : 'delivered',
    items,
    notes: rejected > 0 ? `${delivery.notes} · ${rejected} rejected: ${params.reason}` : delivery.notes,
  }
  const milestone = escrow.milestones[0]
    ? { ...escrow.milestones[0], status: 'disputed' as const, disputedReason: params.reason, releasedAt: now }
    : null
  return {
    delivery: updatedDelivery,
    purchaseOrder: {
      ...purchaseOrder,
      status: partiallyRejected ? 'partially-delivered' : 'delivered',
      updatedAt: now,
    },
    escrowMilestone: milestone ?? {
      id: uid('ESCM'),
      escrowId: escrow.id,
      title: 'Delivery & acceptance',
      description: `Disputed delivery: ${params.reason}`,
      amount: escrow.totalAmount,
      dueDate: now,
      status: 'disputed',
      disputedReason: params.reason,
    },
  }
}

// ── Pipeline summary ──

export interface WorkflowStepSummary {
  step: WorkflowStepId
  label: string
  owner: 'contractor' | 'supplier'
  count: number
  active: boolean
  hint: string
}

export function pipelineSummary(params: {
  procurementRequests: ProcurementRequest[]
  supplierQuotes: SupplierQuote[]
  purchaseOrders: PurchaseOrder[]
  deliveryRecords: DeliveryRecord[]
  escrows: EscrowAgreement[]
}): WorkflowStepSummary[] {
  const openRfqs = params.procurementRequests.filter((r) => r.status === 'quotes-sought' || r.status === 'quotes-received')
  const quotesInFlight = params.supplierQuotes.filter((q) => q.status === 'pending' || q.status === 'received' || q.status === 'evaluated')
  const awardedPes = params.purchaseOrders.filter((p) => p.status !== 'cancelled')
  const lockedEscrows = params.escrows.filter((e) => e.status === 'locked')
  const inTransitOrDelivered = params.purchaseOrders.filter((p) => p.status === 'in-transit' || p.status === 'delivered')
  const disputed = params.deliveryRecords.filter((d) => d.items.some((i) => i.quantityRejected > 0))
  return [
    { step: 'rfq', label: 'RFQ', owner: 'contractor', count: openRfqs.length, active: openRfqs.length > 0, hint: 'Contractor sends an RFQ' },
    { step: 'quote', label: 'Quote', owner: 'supplier', count: quotesInFlight.length, active: quotesInFlight.length > 0, hint: 'Supplier prices it' },
    { step: 'award', label: 'Award', owner: 'contractor', count: awardedPes.length, active: awardedPes.length > 0, hint: 'Best TCO wins a PO' },
    { step: 'escrow', label: 'Escrow', owner: 'contractor', count: lockedEscrows.length, active: lockedEscrows.length > 0, hint: 'Funds ring-fenced' },
    { step: 'delivery', label: 'Delivery', owner: 'supplier', count: inTransitOrDelivered.length, active: inTransitOrDelivered.length > 0, hint: 'Geo-fenced drop' },
    { step: 'dispute', label: 'Dispute', owner: 'supplier', count: disputed.length, active: disputed.length > 0, hint: '90/10 credit note' },
  ]
}
