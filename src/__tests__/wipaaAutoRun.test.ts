import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import type { Milestone } from '@/domain/milestone'
import type { EscrowAgreement, EscrowMilestone } from '@/domain/marketplace'
import {
  monthKeyFor,
  sumActualCostsCents,
  monthRolloverDue,
  computeWipaaSnapshot,
  sortSnapshotsDesc,
  type WipaaSnapshot,
} from '@/engine/payment/wipaaAutoRun'
import { useWipaaStore } from '@/stores/wipaaStore'

const PID = 'p-wipaa-auto'
const now = '2026-06-01T00:00:00.000Z'

function makeMilestone(i: number, overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: `ms-${i}`, projectId: PID, name: `Milestone ${i}`, description: '',
    plannedDate: '2026-06-01', plannedCostCents: 100_00,
    linkedBOQSectionIds: [], linkedScheduleLineIds: [],
    requiredArtifacts: [], requiredReviewChecks: [],
    proofArtifacts: [], reviewChecks: [], releaseConditions: [], releaseDecisions: [],
    releaseState: 'locked', weight: 1, order: i, category: 'construction',
    isCritical: i === 0, createdAt: now, updatedAt: now, notes: '',
    ...overrides,
  }
}

function makeMilestones(released: boolean[], actual: number[]): Milestone[] {
  return released.map((isReleased, i) =>
    makeMilestone(i, {
      releaseState: isReleased ? 'released' : 'locked',
      actualCostCents: actual[i],
    })
  )
}

function makeEscrow(projectId: string, amounts: number[], released: number[]): EscrowAgreement {
  const milestones: EscrowMilestone[] = amounts.map((amount, i) => ({
    id: `em-${i}`, escrowId: `escrow-${projectId}`, title: `MS ${i}`, description: '',
    amount, dueDate: '2026-06-01', status: released[i] ? 'released' : 'pending',
    verificationProof: [],
    releasedAt: released[i] ? now : undefined,
  }))
  const total = amounts.reduce((s, a) => s + a, 0)
  return {
    id: `escrow-${projectId}`, projectId, providerId: 'provider-1', clientId: projectId,
    contractReference: 'CT-TEST', totalAmount: total, currency: 'USD',
    terms: '', status: released.every(Boolean) ? 'released' : 'locked',
    createdAt: now, updatedAt: now, milestones,
  }
}

beforeEach(async () => {
  await db.milestones.clear()
  await db.escrows.clear()
  await db.wipaaSnapshots.clear()
  useWipaaStore.setState({ snapshots: [], isLoading: false, currentProjectId: null })
})

describe('WIPAA auto-run — pure helpers', () => {
  it('monthKeyFor formats YYYY-MM from Date and string', () => {
    expect(monthKeyFor(new Date(2026, 5, 15))).toBe('2026-06')
    expect(monthKeyFor('2026-12-31T10:00:00Z')).toBe('2026-12')
  })

  it('sumActualCostsCents totals actual costs, ignoring undefined', () => {
    const milestones = makeMilestones([true, true], [80_00, undefined as unknown as number])
    expect(sumActualCostsCents(milestones)).toBe(80_00)
  })

  it('monthRolloverDue is true when no snapshot exists for the month', () => {
    expect(monthRolloverDue([], new Date(2026, 5, 15))).toBe(true)
    expect(monthRolloverDue([{ monthKey: '2026-06' }], new Date(2026, 5, 15))).toBe(false)
    expect(monthRolloverDue([{ monthKey: '2026-05' }], new Date(2026, 5, 15))).toBe(true)
  })

  it('sortSnapshotsDesc orders newest month first', () => {
    const snapshots = [
      { monthKey: '2026-05' },
      { monthKey: '2026-07' },
      { monthKey: '2026-06' },
    ] as WipaaSnapshot[]
    expect(sortSnapshotsDesc(snapshots).map((s) => s.monthKey)).toEqual(['2026-07', '2026-06', '2026-05'])
  })
})

describe('WIPAA auto-run — computeWipaaSnapshot', () => {
  it('computes an over-billed snapshot from released milestones', () => {
    // Contract $400, $200 billed (2 of 4 released), $120 incurred → 30% complete → earned $120 → $80 over-billed.
    const escrow = makeEscrow(PID, [100, 100, 100, 100], [1, 1, 0, 0])
    const snapshot = computeWipaaSnapshot(escrow, makeMilestones([true, true, false, false], [80_00, 40_00, 0, 0]), {
      asOf: '2026-06-15T00:00:00.000Z',
    })
    expect(snapshot.monthKey).toBe('2026-06')
    expect(snapshot.contractValueCents).toBe(400_00)
    expect(snapshot.billedToDateCents).toBe(200_00)
    expect(snapshot.costsIncurredToDateCents).toBe(120_00)
    expect(snapshot.costPctComplete).toBe(30)
    expect(snapshot.revenueEarnedCents).toBe(120_00)
    expect(snapshot.overUnderBilledCents).toBe(-80_00)
    expect(snapshot.billingStatus).toBe('over-billed')
    expect(snapshot.source).toBe('auto')
  })

  it('computes an under-billed snapshot when earned revenue exceeds billings', () => {
    // Contract $400, $100 billed, $320 incurred → 80% → earned $320 → $220 under-billed.
    const escrow = makeEscrow(PID, [100, 100, 100, 100], [1, 0, 0, 0])
    const snapshot = computeWipaaSnapshot(escrow, makeMilestones([true, false, false, false], [320_00, 0, 0, 0]))
    expect(snapshot.costPctComplete).toBe(80)
    expect(snapshot.revenueEarnedCents).toBe(320_00)
    expect(snapshot.overUnderBilledCents).toBe(220_00)
    expect(snapshot.billingStatus).toBe('under-billed')
  })

  it('honours explicit cost overrides', () => {
    const escrow = makeEscrow(PID, [100, 100, 100, 100], [1, 1, 0, 0])
    const snapshot = computeWipaaSnapshot(escrow, [], {
      costsIncurredToDateCents: 200_00,
      totalEstimatedCostsCents: 200_00,
    })
    expect(snapshot.costPctComplete).toBe(100)
    expect(snapshot.revenueEarnedCents).toBe(400_00)
    expect(snapshot.overUnderBilledCents).toBe(200_00)
  })
})

describe('WIPAA auto-run — Dexie store rollover', () => {
  it('runAutoRollover persists an idempotent snapshot per month', async () => {
    await db.milestones.bulkAdd(makeMilestones([true, true, false, false], [80_00, 40_00, 0, 0]) as never[])

    const first = await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 5, 15) })
    expect(first.ran).toBe(true)
    if (first.ran) {
      expect(first.snapshot.monthKey).toBe('2026-06')
      expect(first.snapshot.billingStatus).toBe('over-billed')
    }

    const second = await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 5, 20) })
    expect(second).toEqual({ ran: false, reason: 'already-ran' })
    expect(await db.wipaaSnapshots.count()).toBe(1)
  })

  it('rollover into a new month writes a second snapshot', async () => {
    await db.milestones.bulkAdd(makeMilestones([true, true, false, false], [80_00, 40_00, 0, 0]) as never[])
    await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 5, 15) })
    const july = await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 6, 10) })
    expect(july.ran).toBe(true)
    if (july.ran) expect(july.snapshot.monthKey).toBe('2026-07')
    expect(await db.wipaaSnapshots.count()).toBe(2)
  })

  it('returns no-data when the project has no milestones or escrow', async () => {
    const result = await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 5, 15) })
    expect(result).toEqual({ ran: false, reason: 'no-data' })
  })

  it('uses a real escrow when present', async () => {
    await db.escrows.add(makeEscrow(PID, [250, 250], [1, 0]) as never)
    await db.milestones.bulkAdd(makeMilestones([true, false], [150_00, 0]) as never[])
    const result = await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 5, 15) })
    expect(result.ran).toBe(true)
    if (result.ran) {
      expect(result.snapshot.contractValueCents).toBe(500_00)
      expect(result.snapshot.billedToDateCents).toBe(250_00)
    }
  })

  it('runManualSnapshot forces a recompute for the current month (upsert)', async () => {
    await db.milestones.bulkAdd(makeMilestones([true, true, false, false], [80_00, 40_00, 0, 0]) as never[])
    await useWipaaStore.getState().runAutoRollover(PID, { now: new Date(2026, 5, 15) })
    const manual = await useWipaaStore.getState().runManualSnapshot(PID, { now: new Date(2026, 5, 25) })
    expect(manual).not.toBeNull()
    expect(manual!.source).toBe('manual')
    expect(manual!.monthKey).toBe('2026-06')
    expect(await db.wipaaSnapshots.count()).toBe(1)
  })

  it('loadForProject returns snapshots sorted newest first', async () => {
    const snap1 = computeWipaaSnapshot(makeEscrow(PID, [400], [1]), [], { asOf: '2026-06-15T00:00:00.000Z' })
    const snap2 = computeWipaaSnapshot(makeEscrow(PID, [400], [1]), [], { asOf: '2026-07-10T00:00:00.000Z' })
    await db.wipaaSnapshots.bulkAdd([snap1, snap2] as never[])
    await useWipaaStore.getState().loadForProject(PID)
    expect(useWipaaStore.getState().snapshots.map((s) => s.monthKey)).toEqual(['2026-07', '2026-06'])
  })
})
