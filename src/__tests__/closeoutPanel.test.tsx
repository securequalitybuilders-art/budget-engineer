// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useCloseoutStore } from '@/stores/closeoutStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { CloseoutPanel } from '@/components/closeout/CloseoutPanel'
import { P4pWidget } from '@/components/ecosystem/contractor/P4pWidget'
import { validatePlanAgainstRegistry } from '@/engine/compliance/architectRegistry'
import { ARCHITECT_REGISTRY } from '@/engine/compliance/architectRegistry'
import type { Milestone } from '@/domain/milestone'

afterEach(() => {
  cleanup()
  useCloseoutStore.setState({
    sovs: [],
    finalAccounts: [],
    lienWaivers: [],
    gainFades: [],
    historicalCosts: [],
    lessons: [],
    planValidations: [],
  })
  useMilestoneStore.setState({ milestones: [] })
})

function makeMilestone(overrides: Partial<Milestone>): Milestone {
  return {
    id: 'm1',
    projectId: 'p1',
    name: 'Foundations',
    description: '',
    plannedDate: '2026-01-01',
    plannedCostCents: 100_000,
    linkedBOQSectionIds: [],
    linkedScheduleLineIds: [],
    requiredArtifacts: [],
    requiredReviewChecks: [],
    proofArtifacts: [],
    reviewChecks: [],
    releaseConditions: [],
    releaseState: 'locked',
    releaseDecisions: [],
    weight: 1,
    order: 0,
    category: 'construction',
    isCritical: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    notes: '',
    ...overrides,
  }
}

beforeEach(() => {
  useMilestoneStore.setState({
    milestones: [
      makeMilestone({ id: 'm1', name: 'Foundations', plannedCostCents: 400_000, order: 0 }),
      makeMilestone({ id: 'm2', name: 'Roof', plannedCostCents: 600_000, order: 1, releaseState: 'released' }),
    ],
  })
})

describe('CloseoutPanel', () => {
  it('renders all five tabs', () => {
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /Schedule of Values/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Financial Closeout/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Gain \/ Fade/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /ROM & Historical/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Lessons Learned/ })).toBeTruthy()
  })

  it('builds SOV from milestones and shows released totals', async () => {
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Build from milestones/ }))
    expect(await screen.findByText('Schedule of Values · 2 lines')).toBeTruthy()
    expect(screen.getByText('Foundations')).toBeTruthy()
    expect(screen.getByText('$4,000.00')).toBeTruthy()
    expect(screen.getByText('Released')).toBeTruthy()
  })

  it('financial closeout computes a balance due and status pill', async () => {
    useCloseoutStore.setState({
      sovs: [{
        id: 'sov1',
        projectId: 'p1',
        contractValueCents: 1_000_000,
        lines: [{ id: 'l1', code: 'SOV-01', description: 'Foundations', amountCents: 1_000_000, weightPct: 100, category: 'construction', linkedMilestoneIds: ['m1'], linkedBOQSectionIds: [] }],
        createdAt: new Date().toISOString(),
      }],
    })
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Financial Closeout/ }))
    fireEvent.change(screen.getByLabelText(/Payments to date/), { target: { value: '700000' } })
    fireEvent.change(screen.getByLabelText(/Retention held/), { target: { value: '100000' } })
    fireEvent.click(screen.getByRole('button', { name: /Compute final account/ }))
    expect(await screen.findByText('balance due')).toBeTruthy()
    expect(screen.getByText('Retention withheld')).toBeTruthy()
    expect(screen.getByText('$2,500.00')).toBeTruthy()
  })

  it('issues and acknowledges a lien waiver', async () => {
    useCloseoutStore.setState({
      finalAccounts: [{
        projectId: 'p1',
        grossValueCents: 1_000_000,
        retentionReleasableCents: 50_000,
        retentionWithheldCents: 50_000,
        balanceDueCents: 300_000,
        status: 'balance-due',
        computedAt: new Date().toISOString(),
      }],
    })
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Financial Closeout/ }))
    fireEvent.click(screen.getByRole('button', { name: /Issue final lien waiver/ }))
    expect(await screen.findByText(/final lien waiver ·/)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: /Acknowledge/ }))
    expect(await screen.findByText(/by Owner/)).toBeTruthy()
  })

  it('gain/fade analysis shows verdict per line and saves analysis', async () => {
    useCloseoutStore.setState({
      sovs: [{
        id: 'sov1',
        projectId: 'p1',
        contractValueCents: 1_000_000,
        lines: [{ id: 'l1', code: 'SOV-01', description: 'Foundations', amountCents: 400_000, weightPct: 40, category: 'construction', linkedMilestoneIds: ['m1'], linkedBOQSectionIds: [] }],
        createdAt: new Date().toISOString(),
      }],
    })
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Gain \/ Fade/ }))
    const input = screen.getByDisplayValue('0') as HTMLInputElement
    fireEvent.change(input, { target: { value: '300000' } })
    expect((await screen.findAllByText('gain')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Save analysis/ }))
    await waitFor(() => {
      expect(useCloseoutStore.getState().gainFades.some((g) => g.projectId === 'p1')).toBe(true)
    })
  })

  it('ROM estimator shows best and range from seeded pool', () => {
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /ROM & Historical/ }))
    fireEvent.change(screen.getByLabelText(/Area \(m²\)/), { target: { value: '100' } })
    expect(screen.getByText('Best')).toBeTruthy()
    expect(screen.getByText('Range low')).toBeTruthy()
    expect(screen.getByText('Range high')).toBeTruthy()
  })

  it('captures a lesson and shows summary', async () => {
    render(<MemoryRouter><CloseoutPanel projectId="p1" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Lessons Learned/ }))
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'Underbid rebar' } })
    fireEvent.change(screen.getByPlaceholderText('What happened'), { target: { value: 'Rebar spiked' } })
    fireEvent.click(screen.getByRole('button', { name: /Save lesson/ }))
    expect(await screen.findByText('Underbid rebar')).toBeTruthy()
    expect(screen.getByText(/1 total/)).toBeTruthy()
  })
})

describe('P4pWidget SI 56/2025 gate', () => {
  it('blocks and warns when no plan is validated against the ACZ registry', () => {
    render(<MemoryRouter><P4pWidget milestones={[]} /></MemoryRouter>)
    expect(screen.getAllByText(/SI 56\/2025/).length).toBeGreaterThan(0)
    expect(screen.getByText(/ACZ Architect Registry/)).toBeTruthy()
  })

  it('clears the warning when a validated plan exists', () => {
    const validation = validatePlanAgainstRegistry('plan-1', ARCHITECT_REGISTRY[0])
    useCloseoutStore.setState({ planValidations: validation ? [validation] : [] })
    render(<MemoryRouter><P4pWidget milestones={[]} /></MemoryRouter>)
    expect(screen.queryByText(/SI 56\/2025/)).toBeNull()
  })
})
