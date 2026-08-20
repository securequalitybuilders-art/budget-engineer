/**
 * P2 Real-Time Job Costing engine.
 * PO/invoice processing, labour hours auto-coding, and cost aggregation.
 * Pure functions — no React, no network.
 */
import type { PurchaseOrderRecord, InvoiceRecord } from '@/domain/sitehawk';

export interface JobCostingOptions {
  projectId?: string;
  now?: Date;
}

export interface JobCostSummary {
  totalPoCostCents: number;
  totalInvoiceCents: number;
  totalTaxCents: number;
  totalBilledCents: number;
  pendingInvoiceCents: number;
  paidCents: number;
  poCount: number;
  invoiceCount: number;
  unmatchedPos: number;
  varianceCents: number;
}

export function createPurchaseOrder(input: {
  projectId: string;
  poNumber: string;
  supplierName: string;
  material: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  now?: Date;
}): PurchaseOrderRecord {
  const now = input.now ?? new Date();
  return {
    id: `po-${input.projectId}-${input.poNumber}`,
    projectId: input.projectId,
    poNumber: input.poNumber,
    supplierName: input.supplierName,
    material: input.material,
    quantity: input.quantity,
    unit: input.unit,
    unitCostCents: input.unitCostCents,
    totalCostCents: input.quantity * input.unitCostCents,
    status: 'draft',
    issuedAt: null,
    receivedAt: null,
    invoiceRef: null,
    createdAt: now.toISOString(),
  };
}

export function transitionPo(po: PurchaseOrderRecord, nextStatus: PurchaseOrderRecord['status'], now?: Date): PurchaseOrderRecord {
  const t = now ?? new Date();
  return {
    ...po,
    status: nextStatus,
    issuedAt: nextStatus === 'issued' ? t.toISOString() : po.issuedAt,
    receivedAt: nextStatus === 'received' ? t.toISOString() : po.receivedAt,
  };
}

export function createInvoice(input: {
  projectId: string;
  invoiceRef: string;
  poId: string | null;
  supplierName: string;
  amountCents: number;
  taxCents: number;
  now?: Date;
}): InvoiceRecord {
  const now = input.now ?? new Date();
  return {
    id: `inv-${input.projectId}-${input.invoiceRef}`,
    projectId: input.projectId,
    invoiceRef: input.invoiceRef,
    poId: input.poId,
    supplierName: input.supplierName,
    amountCents: input.amountCents,
    taxCents: input.taxCents,
    totalCents: input.amountCents + input.taxCents,
    status: 'received',
    receivedAt: now.toISOString(),
    approvedAt: null,
  };
}

export function transitionInvoice(inv: InvoiceRecord, nextStatus: InvoiceRecord['status'], now?: Date): InvoiceRecord {
  const t = now ?? new Date();
  return {
    ...inv,
    status: nextStatus,
    approvedAt: nextStatus === 'approved' || nextStatus === 'paid' ? t.toISOString() : inv.approvedAt,
  };
}

export function matchInvoiceToPo(invoice: InvoiceRecord, po: PurchaseOrderRecord): { matched: boolean; varianceCents: number; reason: string } {
  if (!invoice.poId) return { matched: false, varianceCents: 0, reason: 'No PO reference' };
  if (invoice.poId !== po.id) return { matched: false, varianceCents: 0, reason: 'PO ID mismatch' };
  const variance = invoice.amountCents - po.totalCostCents;
  const toleranceCents = Math.max(po.totalCostCents * 0.05, 500);
  if (Math.abs(variance) <= toleranceCents) {
    return { matched: true, varianceCents: variance, reason: 'Within tolerance' };
  }
  return { matched: false, varianceCents: variance, reason: `Variance $${(variance / 100).toFixed(2)} exceeds 5% tolerance` };
}

export function buildJobCostSummary(
  pos: PurchaseOrderRecord[],
  invoices: InvoiceRecord[],
): JobCostSummary {
  let totalPoCostCents = 0;
  let totalInvoiceCents = 0;
  let totalTaxCents = 0;
  let totalBilledCents = 0;
  let pendingInvoiceCents = 0;
  let paidCents = 0;
  let unmatchedPos = 0;

  const invoicedPoIds = new Set(invoices.filter(i => i.poId).map(i => i.poId));

  for (const po of pos) {
    totalPoCostCents += po.totalCostCents;
    if (!invoicedPoIds.has(po.id)) unmatchedPos++;
  }

  for (const inv of invoices) {
    totalInvoiceCents += inv.amountCents;
    totalTaxCents += inv.taxCents;
    totalBilledCents += inv.totalCents;
    if (inv.status === 'paid') paidCents += inv.totalCents;
    else pendingInvoiceCents += inv.totalCents;
  }

  return {
    totalPoCostCents,
    totalInvoiceCents,
    totalTaxCents,
    totalBilledCents,
    pendingInvoiceCents,
    paidCents,
    poCount: pos.length,
    invoiceCount: invoices.length,
    unmatchedPos,
    varianceCents: totalBilledCents - totalPoCostCents,
  };
}
