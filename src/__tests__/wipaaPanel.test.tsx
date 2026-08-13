// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import type { Milestone } from '@/domain/milestone'
import type { EscrowAgreement } from '@/domain/marketplace'
import { computeWipaaSnapshot, monthKeyFor } from '@/engine/payment/wipaaAutoRun'
import { useWipaaStore } from '@/stores/wipaaStore'
import { WipaaPanel } from '@/components/payment/WipaaPanel'
import { ProjectLifecycleDashboard } from '@/components/lifecycle/ProjectLifecycleDashboard'

const PID = 'p-wipaa-panel'

function milestone(i: number, overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: `ms-${i}`, projectId: PID, name: `M${i}`, description: '',
    plannedDate: '2026-06-01', plannedCostCents: 100_00,
    linkedBOQSectionIds: [], linkedScheduleLineIds: [],
    requiredArtifacts: [], requiredReviewChecks: [],
    proofArtifacts: [], reviewChecks: [], releaseConditions: [], releaseDecisions: [],
    releaseState: 'locked', weight: 1, order: i, category: 'construction',
    isCritical: false, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
    notes: '', ...overrides,
  }
}

function escrow(): EscrowAgreement {
  const now = '2026-06-01T00:00:00.000Z'
  return {
    id: `escrow-${PID}`, projectId: PID, providerId: 'p1', clientId: PID,
    contractReference: 'CT', totalAmount: 400, currency: 'USD', terms: '',
    status: 'locked', createdAt: now, updatedAt: now,
    milestones: [0, 1, 2, 3].map((i) => ({
      id: `em-${i}`, escrowId: `escrow-${PID}`, title: `MS${i}`, description: '',
      amount: 100, dueDate: '2026-06-01', status: i < 2 ? 'released' : 'pending',
      verificationProof: [],
    })),
  }
}

async function seedData() {
  await db.milestones.clear()
  await db.escrows.clear()
  await db.wipaaSnapshots.clear()
  useWipaaStore.setState({ snapshots: [], isLoading: false, currentProjectId: null })
  await db.milestones.bulkAdd([
    milestone(0, { releaseState: 'released', actualCostCents: 80_00 }),
    milestone(1, { releaseState: 'released', actualCostCents: 40_00 }),
    milestone(2, { releaseState: 'locked' }),
    milestone(3, { releaseState: 'locked' }),
  ] as never[])
  await db.escrows.add(escrow() as never)
}

beforeEach(async () => {
  await seedData()
})

afterEach(() => {
  cleanup()
})

describe('WipaaPanel', () => {
  it('renders stat cards with dashes before any snapshot', async () => {
    await db.milestones.clear()
    await db.escrows.clear()
    render(<WipaaPanel projectId={PID} />)
    expect(await screen.findByText('Contract value')).toBeTruthy()
    expect(screen.getByText('No WIPAA snapshot yet. Open the project page to auto-run this month, or click "Run now".')).toBeTruthy()
    expect(screen.getByText('No snapshots recorded yet.')).toBeTruthy()
    cleanup()
  })

  it('auto-runs a snapshot on open and shows the latest billing position', async () => {
    render(<WipaaPanel projectId={PID} />)
    expect(await screen.findByText('Latest snapshot')).toBeTruthy()
    // 2 of 4 milestones released → $200 billed; $120 incurred of $400 → 30% → earned $120 → $80 over-billed
    expect((await screen.findAllByText('over-billed')).length).toBeGreaterThanOrEqual(2)
    const month = monthKeyFor(new Date())
    expect(screen.getAllByText(month).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('$80')).toBeTruthy() // over-billed magnitude
    // notice is set in the effect AFTER the rollover resolves — await it (parallel-run race)
    expect(await screen.findByText('Auto-computed snapshot for this month.')).toBeTruthy()
    expect(useWipaaStore.getState().snapshots[0].billingStatus).toBe('over-billed')
  })

  it('Run now recomputes and marks the snapshot manual', async () => {
    render(<WipaaPanel projectId={PID} />)
    await screen.findByText('Latest snapshot')
    // Wait for the mount auto-rollover to settle FIRST — if its Dexie put/upsert
    // lands after the manual one, it clobbers source back to 'auto' (parallel-run race).
    await waitFor(() => {
      expect(useWipaaStore.getState().snapshots.length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByText('Run now'))
    expect(await screen.findByText('Snapshot recomputed.')).toBeTruthy()
    await waitFor(() => {
      expect(useWipaaStore.getState().snapshots[0].source).toBe('manual')
    })
    cleanup()
  })
})

describe('ProjectLifecycleDashboard WIPAA card', () => {
  it('shows the WIPAA module card with the latest billing status', async () => {
    const snapshot = computeWipaaSnapshot(escrow(), [
      milestone(0, { releaseState: 'released', actualCostCents: 80_00 }),
      milestone(1, { releaseState: 'released', actualCostCents: 40_00 }),
    ], { asOf: '2026-06-15T00:00:00.000Z' })
    useWipaaStore.setState({ snapshots: [snapshot], currentProjectId: PID })
    render(
      <MemoryRouter>
        <ProjectLifecycleDashboard projectId={PID} />
      </MemoryRouter>
    )
    expect(screen.getByText('WIPAA')).toBeTruthy()
    expect(screen.getByText('over-billed')).toBeTruthy()
    const link = screen.getByRole('link', { name: /WIPAA/ })
    expect(link.getAttribute('href')).toBe(`/project/${PID}/studio/wipaa`)
    cleanup()
  })

  it('shows a dash card when no snapshot exists', async () => {
    await db.milestones.clear()
    await db.escrows.clear()
    useWipaaStore.setState({ snapshots: [], currentProjectId: PID })
    render(
      <MemoryRouter>
        <ProjectLifecycleDashboard projectId={PID} />
      </MemoryRouter>
    )
    expect(screen.getByText('WIPAA')).toBeTruthy()
    expect(screen.getByText('No snapshot yet')).toBeTruthy()
    cleanup()
  })
})
