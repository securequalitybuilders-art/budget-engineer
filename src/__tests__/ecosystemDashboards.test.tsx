// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EcosystemLanding from '@/pages/ecosystem/EcosystemLanding'
import BuilderDashboard from '@/pages/ecosystem/BuilderDashboard'
import ContractorDashboard from '@/pages/ecosystem/ContractorDashboard'
import SupplierDashboard from '@/pages/ecosystem/SupplierDashboard'
import { BudgetDial } from '@/components/ecosystem/builder/BudgetDial'
import { RedPenAuditWidget } from '@/components/ecosystem/builder/RedPenAuditWidget'
import { GroupBuyWidget } from '@/components/ecosystem/builder/GroupBuyWidget'
import { FeasibilityWidget } from '@/components/ecosystem/builder/FeasibilityWidget'
import { MustHavesWidget } from '@/components/ecosystem/builder/MustHavesWidget'
import { P4pWidget } from '@/components/ecosystem/contractor/P4pWidget'
import { PriceIndexWidget } from '@/components/ecosystem/contractor/PriceIndexWidget'
import { PendingAlertsWidget } from '@/components/ecosystem/contractor/PendingAlertsWidget'
import { ScorecardWidget } from '@/components/ecosystem/supplier/ScorecardWidget'
import { QuotingToolWidget } from '@/components/ecosystem/supplier/QuotingToolWidget'
import { FlashDealsWidget } from '@/components/ecosystem/supplier/FlashDealsWidget'
import { DisputeWidget } from '@/components/ecosystem/supplier/DisputeWidget'
import { supplierScore } from '@/lib/ecosystem/scorecard'
import type { Provider } from '@/domain/marketplace'
import type { Rate } from '@/types'

afterEach(cleanup)

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('ecosystem landing + dashboards', () => {
  it('landing shows all three hub cards', () => {
    wrap(<EcosystemLanding />)
    expect(screen.getByRole('heading', { name: 'Builder' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Contractor' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Supplier' })).toBeTruthy()
  })

  it('builder dashboard renders with empty-state widgets', async () => {
    wrap(<BuilderDashboard />)
    expect(await screen.findByText(/My build, at a glance/)).toBeTruthy()
    expect(await screen.findByText(/Project roadmap/)).toBeTruthy()
  })

  it('contractor dashboard renders its headers', async () => {
    wrap(<ContractorDashboard />)
    expect(await screen.findByText(/Portfolio command centre/)).toBeTruthy()
    expect(await screen.findByText(/P&L · budget vs actual/)).toBeTruthy()
  })

  it('supplier dashboard renders its headers', async () => {
    wrap(<SupplierDashboard />)
    expect(await screen.findByText(/Sell to the build market/)).toBeTruthy()
    expect(await screen.findByText(/Sales pipeline/)).toBeTruthy()
  })
})

describe('builder widgets', () => {
  it('budget dial computes committed vs remaining', () => {
    wrap(<BudgetDial
      boqs={[{ id: 'b1', projectId: 'p1', designId: 'd1', sections: [], totalCents: 100_000_00, contingencyCents: 10_000_00, currency: 'USD', generatedAt: '' }]}
      purchaseOrders={[{ id: 'po1', projectId: 'p1', procurementRequestId: '', supplierQuoteId: '', supplierId: '', poNumber: '', title: 'PO', status: 'issued', lineItems: [], subtotalCents: 0, taxCents: 0, shippingCents: 0, totalCents: 40_000_00, currency: 'USD', issuedDate: '', deliveryDate: '', deliveryLocation: '', paymentTerms: '', notes: '', issuedBy: '', approvedBy: '', createdAt: '', updatedAt: '' }]}
      milestones={[]}
    />)
    expect(screen.getByText('$100,000')).toBeTruthy()
    expect(screen.getByText('$60,000')).toBeTruthy()
  })

  it('red-pen audit flags items priced above market', () => {
    const rates: Rate[] = [
      { id: 'r1', region: 'zimbabwe', code: 'MAT-CEM-001', description: 'Portland cement 50kg bag', unit: 'bag', baseRateCents: 1000, source: 'zimbabwe', year: 2026 },
    ]
    wrap(<RedPenAuditWidget boqs={[{
      id: 'b1', projectId: 'p1', designId: 'd1', sections: [{ id: 's1', code: 'A', title: 'Materials', items: [{ id: 'i1', description: 'Portland cement 50kg', quantity: 1, unit: 'bag', rateCents: 1500, totalCents: 1500, elementIds: [], source: 'manual', aiConfidence: 1 }], subtotalCents: 1500 }], totalCents: 1500, contingencyCents: 0, currency: 'USD', generatedAt: '' }]} rates={rates} />)
    expect(screen.getByText('+50%')).toBeTruthy()
  })

  it('group buy aggregates like materials and shows savings', () => {
    wrap(<GroupBuyWidget boqs={[{
      id: 'b1', projectId: 'p1', designId: 'd1', sections: [{ id: 's1', code: 'A', title: 'M', items: [{ id: 'i1', description: 'Portland cement 50kg', quantity: 200, unit: 'bag', rateCents: 1850, totalCents: 370000, elementIds: [], source: 'manual', aiConfidence: 1 }], subtotalCents: 370000 }], totalCents: 370000, contingencyCents: 0, currency: 'USD', generatedAt: '' }]} />)
    expect(screen.getByText(/200 bag · 1 project/)).toBeTruthy()
  })

  it('feasibility widget shows a verdict', () => {
    wrap(<FeasibilityWidget estimatedCostCents={75_000_00} />)
    expect(screen.getByText(/Can the cash cover the build/)).toBeTruthy()
  })

  it('must-haves widget adds and lists an item', () => {
    wrap(<MustHavesWidget />)
    fireEvent.change(screen.getByPlaceholderText('e.g. Porcelain tiles'), { target: { value: 'Granite tops' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Granite tops')).toBeTruthy()
  })
})

describe('contractor widgets', () => {
  const milestone = {
    id: 'm1', projectId: 'p1', name: 'Foundation', description: '', plannedDate: '2026-01-01',
    plannedCostCents: 50_000_00, actualCostCents: 45_000_00, linkedBOQSectionIds: [], linkedScheduleLineIds: [],
    requiredArtifacts: [], requiredReviewChecks: [], proofArtifacts: [], reviewChecks: [], releaseConditions: [],
    releaseState: 'released' as const, releaseDecisions: [], weight: 1, order: 1, category: 'construction' as const,
    isCritical: false, createdAt: '', updatedAt: '', notes: '',
  }

  it('P4P widget renders earned value and amount due', () => {
    wrap(<P4pWidget milestones={[milestone]} />)
    expect(screen.getAllByText('$50,000').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('price index renders a ticker row', () => {
    const rates: Rate[] = [
      { id: 'r1', region: 'zimbabwe', code: 'MAT-CEM-001', description: 'Portland cement 50kg bag', unit: 'bag', baseRateCents: 1000, source: 'zimbabwe', year: 2026 },
    ]
    wrap(<PriceIndexWidget rates={rates} />)
    expect(screen.getByText(/Portland cement/)).toBeTruthy()
  })

  it('pending alerts aggregates open items', () => {
    wrap(<PendingAlertsWidget
      changeOrders={[{ id: 'co1', projectId: 'p1', changeOrderNumber: 'CO-1', title: 'Extra lintels', description: '', originator: '', status: 'pending-review', category: 'variation', reason: '', costImpactCents: 2000, timeImpactDays: 0, scopeChange: '', linkedBOQLineIds: [], linkedDrawingIds: [], linkedMilestoneIds: [], linkedChangeOrderIds: [], notes: '', createdAt: '', updatedAt: '' }]}
      rfis={[{ id: 'rfi1', projectId: 'p1', rfiNumber: 'RFI-1', title: 'Window size', question: '', status: 'open', originator: 'PM', originatorRole: 'contractor', assignedTo: '', discipline: 'ARCH', priority: 'medium', linkedDrawingIds: [], linkedSpecSectionIds: [], linkedSubmittalIds: [], linkedChangeOrderIds: [], daysToRespond: 7, createdAt: '', updatedAt: '' }]}
      purchaseOrders={[]} milestones={[]}
    />)
    expect(screen.getByText(/Extra lintels/)).toBeTruthy()
  })
})

describe('supplier widgets', () => {
  const provider: Provider = {
    id: 'p1', name: 'Brick Co', type: 'supplier', email: '', phone: '', location: { address: '', city: '', country: '' },
    registrationDate: '', verificationStatus: 'verified', rating: 4.5, completedProjects: 12, totalContractValue: 500_000,
    credentials: [], catalog: [], services: [], portfolio: [], reviews: [], insurance: [],
    availability: { status: 'available', regions: [], preferredProjectTypes: [] },
  }

  it('scorecard helper ranks by on-time/quality/lead', () => {
    const s = supplierScore(provider)
    expect(s.score).toBeGreaterThanOrEqual(60)
    expect(s.score).toBeLessThanOrEqual(100)
    expect(s.onTime).toBe(87)
  })

  it('scorecard widget renders supplier rows', () => {
    wrap(<ScorecardWidget providers={[provider]} />)
    expect(screen.getByText('Brick Co')).toBeTruthy()
  })

  it('quoting tool computes TCO from inputs', () => {
    wrap(<QuotingToolWidget />)
    expect(screen.getByText('Total cost of ownership')).toBeTruthy()
    expect(screen.getByText(/Total cost of ownership/).parentElement).toBeTruthy()
    expect(screen.getAllByText(/\$\d,\d{3}/).length).toBeGreaterThanOrEqual(1)
  })

  it('flash deals widget creates and ends a deal', () => {
    wrap(<FlashDealsWidget />)
    fireEvent.change(screen.getByPlaceholderText('Item name'), { target: { value: 'Roof sheets' } })
    fireEvent.change(screen.getByPlaceholderText('Store name'), { target: { value: 'Steel Mart' } })
    fireEvent.click(screen.getByRole('button', { name: 'List flash deal' }))
    expect(screen.getByText(/Roof sheets · Steel Mart/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'End deal' }))
    expect(screen.queryByText(/Roof sheets · Steel Mart/)).toBeNull()
  })

  it('dispute widget issues and settles a credit note', () => {
    wrap(<DisputeWidget />)
    fireEvent.change(screen.getByPlaceholderText('Reason (e.g. rejected delivery)'), { target: { value: 'Damaged bricks' } })
    fireEvent.click(screen.getByRole('button', { name: 'Issue credit' }))
    expect(screen.getByText('Damaged bricks')).toBeTruthy()
    expect(screen.getByText('$4,500')).toBeTruthy()
  })
})
