// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { db } from '@/db/db'
import { TrueLedgerPanel } from '@/components/ledger/TrueLedgerPanel'
import { useLedgerStore } from '@/stores/ledgerStore'
import { useProcurementStore } from '@/stores/procurementStore'
import { useChangeStore } from '@/stores/changeStore'
import { analyzeChangeImpact } from '@/engine/change/changeLensEngine'
import type { PurchaseOrder } from '@/domain/procurement'
import type { ChangeOrder } from '@/domain/change'

afterEach(cleanup)

const projectId = 'p-ledger-ui'

function makePo(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
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
    ...overrides,
  }
}

function makeChange(overrides: Partial<ChangeOrder> = {}): ChangeOrder {
  return {
    id: 'co-1',
    projectId,
    changeOrderNumber: 'CO-001',
    title: 'Extra concrete',
    description: 'Additional slab area',
    originator: 'Site agent',
    status: 'pending-review',
    category: 'variation',
    reason: 'Design change',
    costImpactCents: 100_000_00,
    timeImpactDays: 5,
    scopeChange: '',
    linkedBOQLineIds: [],
    linkedDrawingIds: [],
    linkedMilestoneIds: [],
    linkedChangeOrderIds: [],
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(async () => {
  await db.ledgerEntries.clear()
  await db.changeLensAnalyses.clear()
  await db.purchaseOrders.clear()
  await db.changeOrders.clear()
  await db.boqs.clear()
  await db.rates.clear()
  useLedgerStore.setState({ entries: [], analyses: [], currentProjectId: null, isLoading: false })
  useProcurementStore.setState({ purchaseOrders: [], currentProjectId: null, isLoading: false })
  useChangeStore.setState({ changeOrders: [], currentProjectId: null, isLoading: false })
})

describe('TrueLedgerPanel', () => {
  it('renders the empty state and action buttons are disabled', async () => {
    render(<TrueLedgerPanel projectId={projectId} />)
    await waitFor(() => expect(screen.getByText('Total committed')).toBeTruthy())
    expect(screen.getByText('No ledger entries yet. Code a purchase order to start.')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Code 0 purchase order/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('auto-codes purchase orders end-to-end when the button is clicked', async () => {
    await db.purchaseOrders.add(makePo())
    render(<TrueLedgerPanel projectId={projectId} />)
    const button = await screen.findByRole('button', { name: /Code 1 purchase order/ })
    fireEvent.click(button)
    await waitFor(async () => {
      expect(await db.ledgerEntries.count()).toBe(2)
    })
    const codes = (await db.ledgerEntries.toArray()).map((e) => e.wbsCode).sort()
    expect(codes).toEqual(['02.01.02', '03.03.01'])
    await waitFor(() => expect(screen.getByText(/Coded/)).toBeTruthy())
  })

  it('renders change-order analyses after analysis is persisted', async () => {
    const change = makeChange()
    await db.changeOrders.add(change)
    await useLedgerStore.getState().setAnalysis(
      analyzeChangeImpact({
        change: { changeOrderNumber: change.changeOrderNumber, declaredImpactCents: change.costImpactCents },
      })
    )
    render(<TrueLedgerPanel projectId={projectId} />)
    await waitFor(() => expect(screen.getByText('CO-001 · Extra concrete')).toBeTruthy())
    expect(screen.getByText(/Recommended/)).toBeTruthy()
    expect(screen.getByText(/red pen/i)).toBeTruthy()
    expect(screen.getByText(/wipaa/i)).toBeTruthy()
  })

  it('shows a warning when entries are unallocated', async () => {
    await db.ledgerEntries.add({
      id: 'le-1',
      projectId,
      source: 'purchase-order',
      sourceId: 'po-x',
      sourceLineItemId: 'pl-x',
      description: 'Mystery service',
      quantity: 1,
      unit: 'each',
      unitPriceCents: 10_00,
      amountCents: 10_00,
      wbsCode: '99.00.00',
      wbsName: 'Unallocated / uncoded',
      wbsCategory: 'service',
      restockable: false,
      codingMethod: 'auto-fallback',
      confidence: 0,
      codedAt: '2026-01-01T00:00:00.000Z',
      codedBy: 'auto',
    })
    useLedgerStore.setState({ entries: await db.ledgerEntries.toArray() })
    render(<TrueLedgerPanel projectId={projectId} />)
    await waitFor(() => expect(screen.getByText('Needs manual coding')).toBeTruthy())
  })
})
