// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '@/db/db'
import { useProviderStore } from '@/stores/providerStore'
import BulkProcurementDashboard from '@/pages/ecosystem/BulkProcurementDashboard'
import { SupplierMatch } from '@/components/ecosystem/procurement/SupplierMatch'
import { BoqDispatchIntake } from '@/components/ecosystem/procurement/BoqDispatchIntake'
import { DispatchBoard } from '@/components/ecosystem/procurement/DispatchBoard'
import { EscrowGatewayWidget } from '@/components/ecosystem/procurement/EscrowGatewayWidget'
import { createDispatchFromBoq, listDispatchOrders, listEscrowHolds } from '@/lib/dispatch/dispatchActions'
import type { BOQ, Project } from '@/types'
import type { Provider } from '@/domain/marketplace'

afterEach(cleanup)

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

const project: Project = {
  id: 'proj-1', slug: 'duplex', name: 'Harare Duplex', ownerId: 'u1', profile: 'first-time',
  region: 'zimbabwe', currency: 'USD', status: 'design', createdAt: '', updatedAt: '', version: 1,
}

const boq: BOQ = {
  id: 'boq-1', projectId: 'proj-1', designId: 'd1',
  sections: [{
    id: 's1', code: 'A', title: 'Materials',
    items: [
      { id: 'i1', description: 'Portland cement 50kg', quantity: 200, unit: 'bag', rateCents: 1850, totalCents: 370000, elementIds: [], source: 'manual' as const, aiConfidence: 1 },
    ],
    subtotalCents: 370000,
  }],
  totalCents: 370000, contingencyCents: 0, currency: 'USD', generatedAt: new Date().toISOString(),
}

const provider: Provider = {
  id: 'sup-1', name: 'Brick Co', type: 'supplier', email: '', phone: '',
  location: { address: '', city: 'Harare', country: 'ZW', coordinates: [-17.75, 31.1] },
  registrationDate: '', verificationStatus: 'verified', rating: 4.5, completedProjects: 12,
  totalContractValue: 500_000, credentials: [], catalog: [], services: [], portfolio: [],
  reviews: [], insurance: [],
  availability: { status: 'available', regions: [], preferredProjectTypes: [] },
}

beforeEach(async () => {
  useProviderStore.setState({ providers: [] })
  await Promise.all([
    db.projects.clear(),
    db.boqs.clear(),
    db.dispatchOrders.clear(),
    db.dispatchHolds.clear(),
  ])
})

describe('bulk procurement dashboard', () => {
  it('renders headers and empty states', async () => {
    wrap(<BulkProcurementDashboard />)
    expect(await screen.findByText(/Streamline procurement from the BOQ/)).toBeTruthy()
    expect(screen.getByText(/Uber-for-construction JIT dispatch/)).toBeTruthy()
    expect(await screen.findByText(/No dispatch orders yet/)).toBeTruthy()
    expect(screen.getByText(/No bills of quantities yet/)).toBeTruthy()
  })

  it('dispatches a BOQ to a supplier and holds escrow', async () => {
    await db.projects.add(project)
    await db.boqs.add(boq)
    useProviderStore.setState({ providers: [provider] })

    wrap(<BulkProcurementDashboard />)
    await screen.findByText(/Dispatch from BOQ/)
    fireEvent.change(await screen.findByLabelText('Bill of quantities'), { target: { value: 'boq-1' } })
    fireEvent.change(await screen.findByLabelText('Supplier'), { target: { value: 'sup-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dispatch order' }))

    expect(await screen.findByText('Brick Co', undefined, { timeout: 3000 })).toBeTruthy()
    expect(await screen.findByText('pending', undefined, { timeout: 3000 })).toBeTruthy()
    const orders = await listDispatchOrders()
    const holds = await listEscrowHolds()
    expect(orders).toHaveLength(1)
    expect(orders[0].totalCents).toBe(370000)
    expect(holds).toHaveLength(1)
    expect(holds[0].status).toBe('held')
    expect(screen.getByText('escrow held')).toBeTruthy()
  })

  it('runs the full JIT lifecycle end-to-end on the dispatch board', async () => {
    await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    wrap(<BulkProcurementDashboard />)

    expect((await screen.findAllByText('Brick Co', undefined, { timeout: 3000 })).length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('pending', undefined, { timeout: 3000 })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(await screen.findByText('accepted', undefined, { timeout: 3000 })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Simulate: leave yard/ }))
    expect(await screen.findByText('en-route', undefined, { timeout: 3000 })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Simulate: enter site/ }))
    expect(await screen.findByText('arrived', undefined, { timeout: 3000 })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mark delivered' }))
    expect(await screen.findByText('delivered', undefined, { timeout: 3000 })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Verify GPS + release escrow' }))
    expect(await screen.findByText('completed', undefined, { timeout: 3000 })).toBeTruthy()
    expect(await screen.findByText('escrow released', undefined, { timeout: 3000 })).toBeTruthy()
  })

  it('raises and shows a dispute on a held order', async () => {
    await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    wrap(<BulkProcurementDashboard />)
    await screen.findByText('pending')

    fireEvent.click(screen.getByRole('button', { name: 'Dispute hold' }))
    fireEvent.change(screen.getByLabelText('Dispute type'), { target: { value: 'shortage' } })
    fireEvent.click(screen.getByRole('button', { name: 'Raise dispute' }))

    expect(await screen.findByText('Quantity shortage')).toBeTruthy()
    expect(await screen.findByText('escrow disputed')).toBeTruthy()
  })
})

describe('bulk procurement widgets', () => {
  it('supplier match ranks suppliers around the site geofence', async () => {
    wrap(<SupplierMatch providers={[provider]} orders={[]} />)
    expect(await screen.findByText(/Best match: Brick Co/)).toBeTruthy()
    expect(screen.getByText(/#1/)).toBeTruthy()
  })

  it('supplier match shows an empty state without suppliers', () => {
    wrap(<SupplierMatch providers={[]} orders={[]} />)
    expect(screen.getByText(/No verified suppliers yet/)).toBeTruthy()
  })

  it('escrow gateway renders hold status and verification flags', async () => {
    const { hold } = await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    wrap(<EscrowGatewayWidget holds={[hold]} />)
    expect(screen.getByText(/Held in trust/)).toBeTruthy()
    expect(screen.getAllByText('$3,700').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/GPS ✗/)).toBeTruthy()
    expect(screen.getByText(/sign-off ✗/)).toBeTruthy()
  })

  it('dispatch board renders an empty state without orders', () => {
    wrap(<DispatchBoard orders={[]} holds={[]} onChanged={async () => undefined} />)
    expect(screen.getByText(/No dispatch orders yet/)).toBeTruthy()
  })

  it('boq intake shows empty state without boqs', () => {
    wrap(<BoqDispatchIntake projects={[]} boqs={[]} providers={[]} orders={[]} onChanged={async () => undefined} />)
    expect(screen.getByText(/No bills of quantities yet/)).toBeTruthy()
  })
})
