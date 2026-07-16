import { describe, it, expect } from 'vitest'
import {
  createProcurementRequest,
  createSupplierQuote,
  evaluateQuotes,
  selectBestQuote,
  createPurchaseOrder,
  issuePurchaseOrder,
  recordDelivery,
  advanceProcurementStatus,
  advancePOStatus,
} from '@/engine/procurement/procurementEngine'

describe('P22 — Procurement Engine', () => {
  describe('createProcurementRequest', () => {
    it('creates draft request', () => {
      const req = createProcurementRequest({
        projectId: 'p1', requestNumber: 'PR-001', title: 'Cement Order',
        description: '50kg cement bags', category: 'materials',
        priority: 'high', requestedBy: 'user-1',
        requiredByDate: '2026-08-15', budgetCents: 500000,
        estimatedCostCents: 450000, specifications: ['SABS 471'],
        deliveryLocation: 'Site A',
      })
      expect(req.status).toBe('draft')
      expect(req.requestNumber).toBe('PR-001')
      expect(req.priority).toBe('high')
    })
  })

  describe('createSupplierQuote', () => {
    it('creates quote with line items', () => {
      const quote = createSupplierQuote({
        procurementRequestId: 'pr-1', supplierId: 's-1',
        supplierName: 'BuildCo', quoteNumber: 'Q-001',
        quoteDate: '2026-07-01', validUntil: '2026-08-01',
        lineItems: [
          { description: 'Cement 50kg', quantity: 100, unit: 'bag', unitPriceCents: 1850, totalCents: 185000 },
        ],
        subtotalCents: 185000, taxCents: 27750, shippingCents: 10000,
        totalCents: 222750, currency: 'USD', deliveryDays: 7,
        paymentTerms: 'Net 30', warrantyTerms: '12 months',
      })
      expect(quote.lineItems).toHaveLength(1)
      expect(quote.totalCents).toBe(222750)
      expect(quote.supplierName).toBe('BuildCo')
    })
  })

  describe('evaluateQuotes', () => {
    it('scores and evaluates quotes', () => {
      const quotes = [
        { ...createSupplierQuote({ procurementRequestId: 'pr-1', supplierId: 's-1', supplierName: 'BuildCo', quoteNumber: 'Q-001', quoteDate: '', validUntil: '', lineItems: [], subtotalCents: 0, taxCents: 0, shippingCents: 0, totalCents: 200000, currency: 'USD', deliveryDays: 14, paymentTerms: '', warrantyTerms: '' }), evaluatedScore: undefined as number | undefined },
        { ...createSupplierQuote({ procurementRequestId: 'pr-1', supplierId: 's-2', supplierName: 'MatCo', quoteNumber: 'Q-002', quoteDate: '', validUntil: '', lineItems: [], subtotalCents: 0, taxCents: 0, shippingCents: 0, totalCents: 180000, currency: 'USD', deliveryDays: 21, paymentTerms: '', warrantyTerms: '' }), evaluatedScore: undefined as number | undefined },
      ]
      const evaluated = evaluateQuotes(quotes, { price: 0.5, delivery: 0.3, quality: 0.2 })
      expect(evaluated).toHaveLength(2)
      expect(evaluated[0].evaluatedScore).toBeDefined()
      expect(evaluated[0].status).toBe('evaluated')
    })
  })

  describe('selectBestQuote', () => {
    it('selects the highest scored quote', () => {
      const quotes = [
        { ...createSupplierQuote({ procurementRequestId: 'pr-1', supplierId: 's-1', supplierName: 'A', quoteNumber: 'Q1', quoteDate: '', validUntil: '', lineItems: [], subtotalCents: 0, taxCents: 0, shippingCents: 0, totalCents: 100, currency: 'USD', deliveryDays: 1, paymentTerms: '', warrantyTerms: '' }), evaluatedScore: 80 },
        { ...createSupplierQuote({ procurementRequestId: 'pr-1', supplierId: 's-2', supplierName: 'B', quoteNumber: 'Q2', quoteDate: '', validUntil: '', lineItems: [], subtotalCents: 0, taxCents: 0, shippingCents: 0, totalCents: 100, currency: 'USD', deliveryDays: 1, paymentTerms: '', warrantyTerms: '' }), evaluatedScore: 95 },
      ] as unknown as import('@/domain/procurement').SupplierQuote[]
      const best = selectBestQuote(quotes)
      expect(best?.supplierName).toBe('B')
    })

    it('returns null for empty quotes', () => {
      expect(selectBestQuote([])).toBeNull()
    })
  })

  describe('createPurchaseOrder', () => {
    it('creates draft PO', () => {
      const po = createPurchaseOrder({
        projectId: 'p1', procurementRequestId: 'pr-1',
        supplierQuoteId: 'q-1', supplierId: 's-1',
        poNumber: 'PO-001', title: 'Cement PO',
        lineItems: [{ description: 'Cement', quantity: 100, unit: 'bag', unitPriceCents: 1850, totalCents: 185000, deliveredQuantity: 0 }],
        subtotalCents: 185000, taxCents: 27750, shippingCents: 10000,
        totalCents: 222750, currency: 'USD',
        deliveryDate: '2026-08-15', deliveryLocation: 'Site A',
        paymentTerms: 'Net 30', issuedBy: 'user-1', approvedBy: 'manager-1',
      })
      expect(po.status).toBe('draft')
      expect(po.poNumber).toBe('PO-001')
    })
  })

  describe('issuePurchaseOrder', () => {
    it('sets status to issued', () => {
      const po = createPurchaseOrder({
        projectId: 'p1', procurementRequestId: 'pr-1', supplierQuoteId: 'q-1',
        supplierId: 's-1', poNumber: 'PO-001', title: 'PO',
        lineItems: [], subtotalCents: 0, taxCents: 0, shippingCents: 0,
        totalCents: 0, currency: 'USD', deliveryDate: '', deliveryLocation: '',
        paymentTerms: '', issuedBy: '', approvedBy: '',
      })
      const issued = issuePurchaseOrder(po)
      expect(issued.status).toBe('issued')
    })
  })

  describe('recordDelivery', () => {
    it('updates delivered quantities', () => {
      const po = createPurchaseOrder({
        projectId: 'p1', procurementRequestId: 'pr-1', supplierQuoteId: 'q-1',
        supplierId: 's-1', poNumber: 'PO-001', title: 'PO',
        lineItems: [{ description: 'Cement', quantity: 100, unit: 'bag', unitPriceCents: 1850, totalCents: 185000, deliveredQuantity: 0 }],
        subtotalCents: 185000, taxCents: 0, shippingCents: 0,
        totalCents: 185000, currency: 'USD', deliveryDate: '', deliveryLocation: '',
        paymentTerms: '', issuedBy: '', approvedBy: '',
      })
      const updated = recordDelivery(po, {
        purchaseOrderId: po.id,
        deliveryNote: 'DN-001',
        status: 'delivered',
        deliveryDate: '2026-08-10',
        receivedBy: 'site-1',
        items: [{ poLineItemId: po.lineItems[0].id, description: 'Cement', quantityOrdered: 100, quantityDelivered: 100, quantityAccepted: 100, quantityRejected: 0 }],
        notes: '',
      })
      expect(updated.lineItems[0].deliveredQuantity).toBe(100)
      expect(updated.status).toBe('delivered')
    })
  })

  describe('advanceProcurementStatus', () => {
    it('advances through sequence', () => {
      expect(advanceProcurementStatus('draft')).toBe('quotes-sought')
      expect(advanceProcurementStatus('quotes-sought')).toBe('quotes-received')
      expect(advanceProcurementStatus('quotes-received')).toBe('evaluation')
      expect(advanceProcurementStatus('evaluation')).toBe('awarded')
      expect(advanceProcurementStatus('awarded')).toBe('awarded')
    })
  })

  describe('advancePOStatus', () => {
    it('advances through sequence', () => {
      expect(advancePOStatus('draft')).toBe('issued')
      expect(advancePOStatus('issued')).toBe('acknowledged')
      expect(advancePOStatus('acknowledged')).toBe('in-transit')
      expect(advancePOStatus('in-transit')).toBe('delivered')
      expect(advancePOStatus('delivered')).toBe('closed')
      expect(advancePOStatus('closed')).toBe('closed')
    })
  })
})
