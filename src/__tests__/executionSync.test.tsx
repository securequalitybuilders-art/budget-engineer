// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import {
  seedMilestonesFromPhases,
  milestonesToGanttTasks,
  milestonesToBudgetCategories,
  deriveEscrowFromMilestones,
  totalDaysForPhases,
} from '@/engine/construction/executionSync'
import { PHASES } from '@/engine/construction/constructionPhases'
import type { Milestone } from '@/domain/milestone'
import ExecutionPanel from '@/components/execution/ExecutionPanel'

afterEach(cleanup)

const PHASE_LIST = Object.values(PHASES)
const TOTAL_DAYS = PHASE_LIST.reduce((s, p) => s + p.estimatedDays, 0)

describe('executionSync seedMilestonesFromPhases', () => {
  it('creates one milestone per construction phase, in order', () => {
    const milestones = seedMilestonesFromPhases({
      projectId: 'p1',
      phases: PHASE_LIST,
      totalBudgetCents: 2_000_000_00,
      startDate: '2026-01-05',
    })
    expect(milestones).toHaveLength(5)
    expect(milestones[0].name).toBe('Rough-in & Infrastructure')
    expect(milestones[1].name).toBe('Substrates & Enclosures')
    expect(milestones[4].name).toBe('Appliances & Staging')
  })

  it('distributes cost proportionally to estimated days, summing to the total budget', () => {
    const totalBudgetCents = 2_000_000_00
    const milestones = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents })
    const sum = milestones.reduce((s, m) => s + m.plannedCostCents, 0)
    expect(sum).toBe(totalBudgetCents)
    const first = PHASE_LIST[0]
    expect(milestones[0].plannedCostCents).toBe(Math.round(totalBudgetCents * (first.estimatedDays / TOTAL_DAYS)))
  })

  it('sequences planned dates by cumulative estimated days', () => {
    const milestones = seedMilestonesFromPhases({
      projectId: 'p1',
      phases: PHASE_LIST,
      totalBudgetCents: 100_000_00,
      startDate: '2026-01-05',
    })
    expect(milestones[0].plannedDate).toBe('2026-01-05')
    const expectedSecond = new Date(new Date('2026-01-05').getTime() + PHASE_LIST[0].estimatedDays * 86400000)
      .toISOString()
      .split('T')[0]
    expect(milestones[1].plannedDate).toBe(expectedSecond)
  })

  it('marks the first phase as critical, all as construction and locked', () => {
    const milestones = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 100_000_00 })
    expect(milestones[0].isCritical).toBe(true)
    expect(milestones[1].isCritical).toBe(false)
    expect(milestones.every((m) => m.category === 'construction')).toBe(true)
    expect(milestones.every((m) => m.releaseState === 'locked')).toBe(true)
  })

  it('returns an empty array when no phases are provided', () => {
    expect(seedMilestonesFromPhases({ projectId: 'p1', phases: [], totalBudgetCents: 100 })).toEqual([])
  })
})

describe('executionSync totalDaysForPhases', () => {
  it('sums estimatedDays across phases', () => {
    expect(totalDaysForPhases(PHASE_LIST)).toBe(TOTAL_DAYS)
  })
})

describe('executionSync milestonesToGanttTasks', () => {
  it('maps milestones to cumulative gantt tasks', () => {
    const milestones = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 100_000_00 })
    const tasks = milestonesToGanttTasks(milestones, PHASE_LIST)
    expect(tasks).toHaveLength(5)
    expect(tasks[0].startOffset).toBe(0)
    expect(tasks[0].duration).toBe(PHASE_LIST[0].estimatedDays)
    expect(tasks[1].startOffset).toBe(PHASE_LIST[0].estimatedDays)
    expect(tasks[1].duration).toBe(PHASE_LIST[1].estimatedDays)
  })

  it('maps release state to status and computes progress', () => {
    const seeded = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 100_000_00 })
    const released = { ...seeded[0], releaseState: 'released' as const, completedAt: new Date().toISOString() }
    const heldDelayed = { ...seeded[1], releaseState: 'held' as const, delayDays: 4 }
    const inReview = { ...seeded[2], releaseState: 'pending-review' as const }
    const locked = { ...seeded[3], releaseState: 'locked' as const }
    const rejected = { ...seeded[4], releaseState: 'rejected' as const }

    const tasks = milestonesToGanttTasks([released, heldDelayed, inReview, locked, rejected], PHASE_LIST)
    expect(tasks[0].status).toBe('completed')
    expect(tasks[1].status).toBe('delayed')
    expect(tasks[2].status).toBe('in-progress')
    expect(tasks[3].status).toBe('pending')
    expect(tasks[4].status).toBe('in-progress')
    expect(tasks[0].progress).toBe(100)
  })
})

describe('executionSync milestonesToBudgetCategories', () => {
  it('converts cents to currency and defaults actual spend to 0', () => {
    const seeded = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 2_000_000_00 })
    const withActual = { ...seeded[0], actualCostCents: Math.round(seeded[0].plannedCostCents / 2) }
    const categories = milestonesToBudgetCategories([withActual, seeded[1]])
    expect(categories[0].budgeted).toBe(Math.round(seeded[0].plannedCostCents / 100))
    expect(categories[0].actual).toBe(Math.round(withActual.actualCostCents! / 100))
    expect(categories[1].actual).toBe(0)
  })
})

describe('executionSync deriveEscrowFromMilestones', () => {
  it('builds escrow milestones that sum to the total amount', () => {
    const milestones = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 2_000_000_00 })
    const escrow = deriveEscrowFromMilestones('p1', milestones)
    expect(escrow.milestones).toHaveLength(5)
    expect(escrow.totalAmount).toBe(escrow.milestones.reduce((s, m) => s + m.amount, 0))
    expect(escrow.totalAmount).toBe(2_000_000)
    expect(escrow.status).toBe('locked')
    expect(escrow.milestones.every((m) => m.status === 'pending')).toBe(true)
  })

  it('marks the escrow released when every milestone is released', () => {
    const seeded = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 100_000_00 })
    const released = seeded.map((m) => ({
      ...m,
      releaseState: 'released' as const,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    const escrow = deriveEscrowFromMilestones('p1', released)
    expect(escrow.status).toBe('released')
    expect(escrow.milestones.every((m) => m.status === 'released')).toBe(true)
  })

  it('maps proof artifacts into verification proof records', () => {
    const seeded = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 100_000_00 })
    const withProof: Milestone = {
      ...seeded[0],
      proofArtifacts: [
        {
          id: 'a1',
          milestoneId: seeded[0].id,
          type: 'photo',
          title: 'Foundation photo',
          description: 'Slab photos',
          capturedAt: new Date().toISOString(),
          capturedBy: 'contractor',
          createdAt: new Date().toISOString(),
        },
      ],
    }
    const escrow = deriveEscrowFromMilestones('p1', [withProof])
    expect(escrow.milestones[0].verificationProof).toHaveLength(1)
    expect(escrow.milestones[0].verificationProof![0].type).toBe('photo')
    expect(escrow.milestones[0].verificationProof![0].uploadedBy).toBe('contractor')
  })

  it('honours provided client/provider ids and contract reference', () => {
    const milestones = seedMilestonesFromPhases({ projectId: 'p1', phases: PHASE_LIST, totalBudgetCents: 100_000_00 })
    const escrow = deriveEscrowFromMilestones('p1', milestones, {
      clientId: 'client-9',
      providerId: 'provider-7',
      contractReference: 'CT-X',
    })
    expect(escrow.clientId).toBe('client-9')
    expect(escrow.providerId).toBe('provider-7')
    expect(escrow.contractReference).toBe('CT-X')
  })
})

describe('ExecutionPanel wiring', () => {
  it('renders real milestone names from the construction phases, not mocks', async () => {
    render(<ExecutionPanel projectId="proj-x" budgetCents={100_000_00} />)
    expect(await screen.findByText('Project Gantt Chart')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('Rough-in & Infrastructure')).toBeTruthy()
      expect(screen.getByText('Appliances & Staging')).toBeTruthy()
    })
    expect(screen.queryByText('Substructure Brickwork')).toBeNull()
    expect(screen.queryByText('Site Preparation & Clearance')).toBeNull()
  })
})
