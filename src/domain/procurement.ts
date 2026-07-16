export type ProcurementStatus = 'draft' | 'quotes-sought' | 'quotes-received' | 'evaluation' | 'awarded' | 'cancelled'

export type QuoteStatus = 'pending' | 'received' | 'evaluated' | 'declined' | 'awarded'

export type PurchaseOrderStatus = 'draft' | 'issued' | 'acknowledged' | 'in-transit' | 'delivered' | 'partially-delivered' | 'closed' | 'cancelled'

export type DeliveryStatus = 'pending' | 'in-transit' | 'delivered' | 'partially-delivered' | 'delayed'

export interface ProcurementRequest {
  id: string
  projectId: string
  requestNumber: string
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: ProcurementStatus
  requestedBy: string
  requestedAt: string
  requiredByDate: string
  budgetCents: number
  estimatedCostCents: number
  linkedBOQLineIds: string[]
  linkedScheduleLineIds: string[]
  specifications: string[]
  deliveryLocation: string
  notes: string
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierQuote {
  id: string
  procurementRequestId: string
  supplierId: string
  supplierName: string
  quoteNumber: string
  quoteDate: string
  validUntil: string
  status: QuoteStatus
  lineItems: QuoteLineItem[]
  subtotalCents: number
  taxCents: number
  shippingCents: number
  totalCents: number
  currency: string
  deliveryDays: number
  paymentTerms: string
  warrantyTerms: string
  notes: string
  evaluatedScore?: number
  evaluatedBy?: string
  evaluatedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPriceCents: number
  totalCents: number
  linkedBOQLineId?: string
  linkedMaterialScheduleId?: string
}

export interface PurchaseOrder {
  id: string
  projectId: string
  procurementRequestId: string
  supplierQuoteId: string
  supplierId: string
  poNumber: string
  title: string
  status: PurchaseOrderStatus
  lineItems: PurchaseOrderLineItem[]
  subtotalCents: number
  taxCents: number
  shippingCents: number
  totalCents: number
  currency: string
  issuedDate: string
  deliveryDate: string
  deliveryLocation: string
  paymentTerms: string
  notes: string
  issuedBy: string
  approvedBy: string
  receivedBy?: string
  receivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPriceCents: number
  totalCents: number
  deliveredQuantity: number
  linkedBOQLineId?: string
}

export interface DeliveryRecord {
  id: string
  purchaseOrderId: string
  deliveryNote: string
  status: DeliveryStatus
  deliveryDate: string
  receivedBy: string
  items: DeliveryLineItem[]
  notes: string
  createdAt: string
}

export interface DeliveryLineItem {
  poLineItemId: string
  description: string
  quantityOrdered: number
  quantityDelivered: number
  quantityAccepted: number
  quantityRejected: number
  rejectionReason?: string
}
