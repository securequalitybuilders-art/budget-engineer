import type {
  ProcurementRequest,
  SupplierQuote,
  QuoteLineItem,
  PurchaseOrder,
  PurchaseOrderLineItem,
  DeliveryRecord,
  ProcurementStatus,
  QuoteStatus,
  PurchaseOrderStatus,
} from '@/domain/procurement'

export function createProcurementRequest(input: {
  projectId: string
  requestNumber: string
  title: string
  description: string
  category: string
  priority: ProcurementRequest['priority']
  requestedBy: string
  requiredByDate: string
  budgetCents: number
  estimatedCostCents: number
  specifications: string[]
  deliveryLocation: string
}): ProcurementRequest {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    requestNumber: input.requestNumber,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: 'draft',
    requestedBy: input.requestedBy,
    requestedAt: new Date().toISOString(),
    requiredByDate: input.requiredByDate,
    budgetCents: input.budgetCents,
    estimatedCostCents: input.estimatedCostCents,
    linkedBOQLineIds: [],
    linkedScheduleLineIds: [],
    specifications: input.specifications,
    deliveryLocation: input.deliveryLocation,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createSupplierQuote(input: {
  procurementRequestId: string
  supplierId: string
  supplierName: string
  quoteNumber: string
  quoteDate: string
  validUntil: string
  lineItems: Omit<QuoteLineItem, 'id'>[]
  subtotalCents: number
  taxCents: number
  shippingCents: number
  totalCents: number
  currency: string
  deliveryDays: number
  paymentTerms: string
  warrantyTerms: string
}): SupplierQuote {
  return {
    id: crypto.randomUUID(),
    procurementRequestId: input.procurementRequestId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    quoteNumber: input.quoteNumber,
    quoteDate: input.quoteDate,
    validUntil: input.validUntil,
    status: 'pending',
    lineItems: input.lineItems.map((li) => ({ ...li, id: crypto.randomUUID() })),
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    shippingCents: input.shippingCents,
    totalCents: input.totalCents,
    currency: input.currency,
    deliveryDays: input.deliveryDays,
    paymentTerms: input.paymentTerms,
    warrantyTerms: input.warrantyTerms,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function evaluateQuotes(quotes: SupplierQuote[], weights: { price: number; delivery: number; quality: number }): SupplierQuote[] {
  if (quotes.length === 0) return quotes

  const maxPrice = Math.max(...quotes.map((q) => q.totalCents))
  const minDelivery = Math.min(...quotes.map((q) => q.deliveryDays))

  return quotes.map((q) => {
    const priceScore = maxPrice > 0 ? (1 - q.totalCents / maxPrice) * weights.price * 100 : 0
    const deliveryScore = minDelivery > 0 ? (minDelivery / q.deliveryDays) * weights.delivery * 100 : weights.delivery * 100
    const qualityScore = weights.quality * 100
    const evaluatedScore = Math.round(priceScore + deliveryScore + qualityScore)

    return { ...q, evaluatedScore, status: 'evaluated' as QuoteStatus }
  })
}

export function selectBestQuote(quotes: SupplierQuote[]): SupplierQuote | null {
  const evaluated = quotes.filter((q) => q.evaluatedScore !== undefined)
  if (evaluated.length === 0) return null
  return evaluated.reduce((best, q) => (q.evaluatedScore! > best.evaluatedScore! ? q : best))
}

export function createPurchaseOrder(input: {
  projectId: string
  procurementRequestId: string
  supplierQuoteId: string
  supplierId: string
  poNumber: string
  title: string
  lineItems: Omit<PurchaseOrderLineItem, 'id'>[]
  subtotalCents: number
  taxCents: number
  shippingCents: number
  totalCents: number
  currency: string
  deliveryDate: string
  deliveryLocation: string
  paymentTerms: string
  issuedBy: string
  approvedBy: string
}): PurchaseOrder {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    procurementRequestId: input.procurementRequestId,
    supplierQuoteId: input.supplierQuoteId,
    supplierId: input.supplierId,
    poNumber: input.poNumber,
    title: input.title,
    status: 'draft',
    lineItems: input.lineItems.map((li) => ({ ...li, id: crypto.randomUUID() })),
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    shippingCents: input.shippingCents,
    totalCents: input.totalCents,
    currency: input.currency,
    issuedDate: new Date().toISOString(),
    deliveryDate: input.deliveryDate,
    deliveryLocation: input.deliveryLocation,
    paymentTerms: input.paymentTerms,
    notes: '',
    issuedBy: input.issuedBy,
    approvedBy: input.approvedBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function issuePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return { ...po, status: 'issued', updatedAt: new Date().toISOString() }
}

export function recordDelivery(
  po: PurchaseOrder,
  delivery: Omit<DeliveryRecord, 'id' | 'createdAt'>
): PurchaseOrder {
  const updatedLineItems = po.lineItems.map((li) => {
    const deliveryItem = delivery.items.find((d) => d.poLineItemId === li.id)
    if (!deliveryItem) return li
    return {
      ...li,
      deliveredQuantity: li.deliveredQuantity + deliveryItem.quantityAccepted,
    }
  })

  const allDelivered = updatedLineItems.every((li) => li.deliveredQuantity >= li.quantity)
  const anyDelivered = updatedLineItems.some((li) => li.deliveredQuantity > 0)

  return {
    ...po,
    lineItems: updatedLineItems,
    status: allDelivered ? 'delivered' : anyDelivered ? 'partially-delivered' : po.status,
    updatedAt: new Date().toISOString(),
  }
}

export function advanceProcurementStatus(current: ProcurementStatus): ProcurementStatus {
  const sequence: ProcurementStatus[] = ['draft', 'quotes-sought', 'quotes-received', 'evaluation', 'awarded']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}

export function advancePOStatus(current: PurchaseOrderStatus): PurchaseOrderStatus {
  const sequence: PurchaseOrderStatus[] = ['draft', 'issued', 'acknowledged', 'in-transit', 'delivered', 'closed']
  const idx = sequence.indexOf(current)
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1]
  return current
}
