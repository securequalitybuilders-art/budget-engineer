// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '@/db/db'
import type { Project } from '@/types'
import type { EscrowAgreement } from '@/domain/marketplace'
import type { EcosystemData } from '@/components/ecosystem/useEcosystemData'
import { PortfolioWidget } from '@/components/ecosystem/contractor/PortfolioWidget'
import { RfqCreateWidget } from '@/components/ecosystem/contractor/RfqCreateWidget'
import { ProcurementTcoWidget } from '@/components/ecosystem/contractor/ProcurementTcoWidget'
import { PipelineWidget } from '@/components/ecosystem/supplier/PipelineWidget'
import { FleetWidget } from '@/components/ecosystem/supplier/FleetWidget'
import { EscrowLinkWidget } from '@/components/ecosystem/supplier/EscrowLinkWidget'
import { WorkflowPipeline } from '@/components/ecosystem/WorkflowPipeline'
import { saveRfq, saveQuote, saveAward } from '@/lib/ecosystem/workflowActions'

afterEach(cleanup)

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

function makeEscrow(overrides: Partial<EscrowAgreement> = {}): EscrowAgreement {
  return {
    id: 'e1',
    projectId: 'p1',
    providerId: 's1',
    clientId: 'p1',
    contractReference: 'PO-001',
    totalAmount: 440,
    currency: 'USD',
    milestones: [{ id: 'm1', escrowId: 'e1', title: 'Delivery', description: '', amount: 440, dueDate: '2026-02-01', status: 'pending' }],
    status: 'locked',
    terms: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeData(overrides: Partial<EcosystemData> = {}): EcosystemData {
  return {
    loading: false,
    projects: [],
    boqs: [],
    milestones: [],
    escrows: [],
    procurementRequests: [],
    supplierQuotes: [],
    purchaseOrders: [],
    deliveryRecords: [],
    changeOrders: [],
    rfis: [],
    rates: [],
    providers: [],
    refresh: async () => {},
    ...overrides,
  }
}

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(async () => {
  await db.procurementRequests.clear()
  await db.supplierQuotes.clear()
  await db.purchaseOrders.clear()
  await db.deliveryRecords.clear()
  await db.escrows.clear()
  await db.projects.clear()
})

describe('contractor workflow widgets', () => {
  it('portfolio widget buckets projects by lifecycle and offers procurement', () => {
    const proc = vi.fn()
    wrap(<PortfolioWidget
      projects={[project, { ...project, id: 'p2' }, { ...project, id: 'p3', isArchived: true }]}
      escrows={[makeEscrow({ projectId: 'p1' })]}
      onStartProcurement={proc}
    />)
    expect(screen.getByText(/1 bidding · 1 active · 1 closed/)).toBeTruthy()
    const buttons = screen.getAllByRole('button', { name: /Procure/ })
    expect(buttons.length).toBe(1)
    fireEvent.click(buttons[0])
    expect(proc).toHaveBeenCalledWith('p2')
  })

  it('rfq create widget issues a request into the db', async () => {
    const refresh = vi.fn()
    wrap(<RfqCreateWidget projects={[project]} onCreated={refresh} />)
    fireEvent.change(screen.getByLabelText('Package title'), { target: { value: 'Steel columns' } })
    fireEvent.click(screen.getByRole('button', { name: 'Issue RFQ' }))
    expect(await screen.findByText(/issued/)).toBeTruthy()
    expect(await db.procurementRequests.count()).toBe(1)
    const row = await db.procurementRequests.toArray()
    expect(row[0].title).toBe('Steel columns')
    expect(refresh).toHaveBeenCalled()
  })

  it('tco widget awards the winning quote and creates PO + escrow', async () => {
    const rfq = await saveRfq({ projectId: 'p1', projectName: 'Test House', title: 'Steel', category: 'Steel & fixings', budgetCents: 30_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Steel Mart', totalCents: 27_000_00, deliveryDays: 6 })
    const refresh = vi.fn()
    wrap(<ProcurementTcoWidget supplierQuotes={[quote]} procurementRequests={[rfq]} onAwarded={refresh} />)
    fireEvent.click(screen.getByRole('button', { name: 'Award' }))
    expect(await screen.findByText('Awarded')).toBeTruthy()
    expect(await db.purchaseOrders.count()).toBe(1)
    expect(await db.escrows.count()).toBe(1)
    expect(refresh).toHaveBeenCalled()
  })

  it('tco widget shows a dash when nothing to compare', () => {
    wrap(<ProcurementTcoWidget supplierQuotes={[]} procurementRequests={[]} onAwarded={async () => {}} />)
    expect(screen.getByText(/No supplier quotes to compare/)).toBeTruthy()
  })
})

describe('supplier workflow widgets', () => {
  it('pipeline widget lets a supplier price an open rfq', async () => {
    const rfq = await saveRfq({ projectId: 'p1', projectName: 'Test House', title: 'Roof sheets', category: 'Roofing', budgetCents: 20_000_00 })
    const refresh = vi.fn()
    wrap(<PipelineWidget supplierQuotes={[]} procurementRequests={[rfq]} providers={[]} onChanged={refresh} />)
    fireEvent.click(screen.getByRole('button', { name: /Quote →/ }))
    const form = screen.getByLabelText('Quote total').closest('div')?.parentElement as HTMLElement
    fireEvent.change(within(form).getByLabelText('Quote total'), { target: { value: '18500' } })
    fireEvent.change(within(form).getByLabelText('Lead days'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit quote' }))
    expect(await screen.findByText(/submitted/)).toBeTruthy()
    expect(await db.supplierQuotes.count()).toBe(1)
    const quote = (await db.supplierQuotes.toArray())[0]
    expect(quote.totalCents).toBe(1_850_000)
    expect(quote.deliveryDays).toBe(5)
    expect(quote.supplierName).toBe('My Supply Co.')
    expect(refresh).toHaveBeenCalled()
  })

  it('escrow link widget shows proof-of-funds badges per status', () => {
    wrap(<EscrowLinkWidget escrows={[
      makeEscrow({ id: 'e1', status: 'locked' }),
      makeEscrow({ id: 'e2', status: 'released' }),
      makeEscrow({ id: 'e3', status: 'disputed' }),
    ]} />)
    expect(screen.getByText('Proof of funds ✓')).toBeTruthy()
    expect(screen.getByText('Settled')).toBeTruthy()
    expect(screen.getByText('Disputed')).toBeTruthy()
    expect(screen.getByText(/\$440 held in trust/)).toBeTruthy()
  })

  it('fleet widget confirms a drop and releases the escrow milestone', async () => {
    const rfq = await saveRfq({ projectId: 'p1', projectName: 'Test House', title: 'Cement', category: 'Cement & masonry', budgetCents: 50_000_00 })
    const quote = await saveQuote(rfq.id, { supplierId: 's1', supplierName: 'Cement Co', totalCents: 44_000_00, deliveryDays: 4 })
    const { purchaseOrder, escrow } = await saveAward({ rfqId: rfq.id, quoteId: quote.id })
    const refresh = vi.fn()
    wrap(<FleetWidget deliveryRecords={[]} purchaseOrders={[purchaseOrder]} onChanged={refresh} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm drop' }))
    await vi.waitFor(async () => {
      expect(await db.deliveryRecords.count()).toBe(1)
    })
    const po = await db.purchaseOrders.get(purchaseOrder.id)
    expect(po?.status).toBe('delivered')
    const updated = await db.escrows.get(escrow.id)
    expect(updated?.milestones[0].status).toBe('released')
    expect(refresh).toHaveBeenCalled()
  })
})

describe('shared workflow pipeline', () => {
  it('renders all six steps with handoff links', () => {
    const { container } = wrap(<WorkflowPipeline data={makeData()} />)
    expect(screen.getByText(/End-to-end workflow/)).toBeTruthy()
    expect(screen.getByText('1. RFQ')).toBeTruthy()
    expect(screen.getByText('6. Dispute')).toBeTruthy()
    expect(screen.getAllByRole('link').length).toBe(6)
    const rfqStep = container.querySelector('[data-workflow-step="rfq"]')
    expect(rfqStep?.getAttribute('data-active')).toBe('false')
  })

  it('flags steps that have open work', () => {
    const summary = {
      procurementRequests: [{ id: 'r1', status: 'quotes-sought' }] as unknown as EcosystemData['procurementRequests'],
    }
    const { container } = wrap(<WorkflowPipeline data={makeData(summary)} />)
    expect(container.querySelector('[data-workflow-step="rfq"]')?.getAttribute('data-active')).toBe('true')
  })
})
