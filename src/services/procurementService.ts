import { db } from '@/db/db'
import type { ProcurementRequest, SupplierQuote, PurchaseOrder, DeliveryRecord } from '@/domain/procurement'
import { createProcurementRequest, createSupplierQuote, evaluateQuotes, selectBestQuote, createPurchaseOrder, issuePurchaseOrder, recordDelivery } from '@/engine/procurement/procurementEngine'

export async function saveProcurementRequest(req: ProcurementRequest): Promise<void> {
  await db.procurementRequests.put(req)
}

export async function getProcurementRequests(projectId: string): Promise<ProcurementRequest[]> {
  return db.procurementRequests.where({ projectId }).toArray()
}

export async function createAndSaveProcurementRequest(input: Parameters<typeof createProcurementRequest>[0]): Promise<ProcurementRequest> {
  const req = createProcurementRequest(input)
  await db.procurementRequests.add(req)
  return req
}

export async function saveSupplierQuote(quote: SupplierQuote): Promise<void> {
  await db.supplierQuotes.put(quote)
}

export async function getQuotesForRequest(procurementRequestId: string): Promise<SupplierQuote[]> {
  return db.supplierQuotes.where({ procurementRequestId }).toArray()
}

export async function createAndSaveSupplierQuote(input: Parameters<typeof createSupplierQuote>[0]): Promise<SupplierQuote> {
  const quote = createSupplierQuote(input)
  await db.supplierQuotes.add(quote)
  return quote
}

export async function evaluateAndSelectBestQuote(procurementRequestId: string, weights?: { price: number; delivery: number; quality: number }): Promise<SupplierQuote | null> {
  const quotes = await getQuotesForRequest(procurementRequestId)
  const evaluated = evaluateQuotes(quotes, weights || { price: 0.4, delivery: 0.3, quality: 0.3 })
  for (const q of evaluated) {
    await db.supplierQuotes.put(q)
  }
  return selectBestQuote(evaluated)
}

export async function savePurchaseOrder(po: PurchaseOrder): Promise<void> {
  await db.purchaseOrders.put(po)
}

export async function getPurchaseOrders(projectId: string): Promise<PurchaseOrder[]> {
  return db.purchaseOrders.where({ projectId }).toArray()
}

export async function createAndSavePurchaseOrder(input: Parameters<typeof createPurchaseOrder>[0]): Promise<PurchaseOrder> {
  const po = createPurchaseOrder(input)
  await db.purchaseOrders.add(po)
  return po
}

export async function issueAndSavePurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
  const po = await db.purchaseOrders.get(poId)
  if (!po) return null
  const issued = issuePurchaseOrder(po)
  await db.purchaseOrders.put(issued)
  return issued
}

export async function recordDeliveryOnPO(poId: string, delivery: Omit<DeliveryRecord, 'id' | 'createdAt'>): Promise<PurchaseOrder | null> {
  const po = await db.purchaseOrders.get(poId)
  if (!po) return null
  const updated = recordDelivery(po, delivery)
  await db.purchaseOrders.put(updated)
  return updated
}

export async function saveDeliveryRecord(record: DeliveryRecord): Promise<void> {
  await db.deliveryRecords.put(record)
}
