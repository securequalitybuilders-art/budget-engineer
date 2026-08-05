import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/db'
import { createApiClient } from '@/lib/api/client'
import { LocalIndexedDbTransport, HttpTransport } from '@/lib/api/transport'
import { ApiError } from '@/lib/api/types'
import {
  addProofArtifact,
} from '@/engine/milestone/milestoneEngine'
import { completeMilestone, verifyMilestone } from '@/engine/marketplace/escrowEngine'
import type { Milestone } from '@/domain/milestone'

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 'ms-1',
    projectId: 'proj-1',
    name: 'Foundation',
    description: 'Strip footings poured',
    plannedDate: '2026-08-15',
    plannedCostCents: 20_000_00,
    linkedBOQSectionIds: [],
    linkedScheduleLineIds: [],
    requiredArtifacts: ['photo'],
    requiredReviewChecks: ['engineer'],
    proofArtifacts: [],
    reviewChecks: [
      {
        id: 'check-1',
        milestoneId: 'ms-1',
        checkType: 'site',
        description: 'Structural sign-off',
        required: true,
        assignedTo: 'Engineer',
      },
    ],
    releaseConditions: [],
    releaseState: 'locked',
    releaseDecisions: [],
    weight: 1,
    order: 0,
    category: 'construction',
    isCritical: true,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    notes: '',
    ...overrides,
  }
}

const api = createApiClient(new LocalIndexedDbTransport())

beforeEach(async () => {
  await db.projects.clear()
  await db.milestones.clear()
  await db.escrows.clear()
})

describe('local-first API layer — projects', () => {
  it('creates, lists, gets and updates a project', async () => {
    const created = await api.projects.create({ name: 'Avondale House', ownerId: 'owner-1' })
    expect(created.id).toBeTruthy()
    expect(created.slug).toBe('avondale-house')
    expect(created.ownerId).toBe('owner-1')

    const listed = await api.projects.list()
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe('Avondale House')

    const got = await api.projects.get(created.id)
    expect(got?.id).toBe(created.id)

    const updated = await api.projects.update(created.id, { name: 'Avondale House (rev 2)' })
    expect(updated.name).toBe('Avondale House (rev 2)')
    expect(updated.updatedAt).toBeTruthy()

    const reloaded = await api.projects.get(created.id)
    expect(reloaded?.name).toBe('Avondale House (rev 2)')
  })

  it('throws 404 for a missing project', async () => {
    await expect(api.projects.get('nope')).rejects.toMatchObject({ status: 404, code: 'not_found' })
  })

  it('delete cascades milestones and escrow for the project', async () => {
    const created = await api.projects.create({ name: 'Cascade' })
    await api.milestones.create(created.id, { name: 'M1', plannedCostCents: 500_00 })
    await api.escrow.create(created.id, {
      providerId: 'p1',
      totalAmount: 500,
      milestones: [{ title: 'M1', description: '', amount: 500, dueDate: '2026-09-01' }],
    })

    await api.projects.remove(created.id)

    expect(await db.projects.get(created.id)).toBeUndefined()
    expect(await db.milestones.count()).toBe(0)
    expect(await db.escrows.count()).toBe(0)
  })
})

describe('local-first API layer — milestones', () => {
  it('creates a milestone on a project, lists and updates it', async () => {
    const project = await api.projects.create({ name: 'Milo' })
    const created = await api.milestones.create(project.id, {
      name: 'Roof',
      plannedCostCents: 15_000_00,
      category: 'construction',
      order: 1,
    })
    expect(created.id).toBeTruthy()
    expect(created.projectId).toBe(project.id)
    expect(created.releaseState).toBe('locked')

    const listed = await api.milestones.listByProject(project.id)
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe('Roof')

    const updated = await api.milestones.update(created.id, { name: 'Roof structure' })
    expect(updated.name).toBe('Roof structure')
  })

  it('keeps projectId immutable on update', async () => {
    const project = await api.projects.create({ name: 'Immutable' })
    const created = await api.milestones.create(project.id, { name: 'M' })
    const updated = await api.milestones.update(created.id, { name: 'M2', projectId: 'hacked' })
    expect(updated.projectId).toBe(project.id)
  })
})

describe('local-first API layer — escrow', () => {
  it('creates, reads and summarizes an escrow', async () => {
    const project = await api.projects.create({ name: 'Escrow proj' })
    const escrow = await api.escrow.create(project.id, {
      providerId: 'builder-1',
      totalAmount: 1000,
      currency: 'USD',
      milestones: [
        { title: 'Footings', description: '', amount: 600, dueDate: '2026-09-01' },
        { title: 'Roof', description: '', amount: 400, dueDate: '2026-10-01' },
      ],
    })
    expect(escrow.status).toBe('locked')
    expect(escrow.milestones).toHaveLength(2)

    const fetched = await api.escrow.getByProject(project.id)
    expect(fetched?.id).toBe(escrow.id)

    const summary = await api.escrow.summary(project.id)
    expect(summary.total).toBe(1000)
    expect(summary.released).toBe(0)
    expect(summary.progress).toBe(0)
  })

  it('releases a verified milestone and updates the summary', async () => {
    const project = await api.projects.create({ name: 'Escrow flow' })
    const escrow = await api.escrow.create(project.id, {
      providerId: 'builder-1',
      totalAmount: 600,
      milestones: [{ title: 'Footings', description: '', amount: 600, dueDate: '2026-09-01' }],
    })

    const completed = completeMilestone(escrow, escrow.milestones[0].id, {
      type: 'photo',
      url: 'blob://footing',
      uploadedBy: 'site-agent',
      notes: 'Footings poured',
    })
    const verified = verifyMilestone(completed, escrow.milestones[0].id, true)
    await api.escrow.save(verified)

    const released = await api.escrow.releaseMilestone(project.id, escrow.milestones[0].id, 'Client')
    expect(released.milestones[0].status).toBe('released')
    expect(released.status).toBe('released')

    const summary = await api.escrow.summary(project.id)
    expect(summary.released).toBe(600)
    expect(summary.progress).toBe(100)
  })

  it('reports a zero summary when no escrow exists', async () => {
    const project = await api.projects.create({ name: 'No escrow' })
    expect(await api.escrow.summary(project.id)).toEqual({
      total: 0, released: 0, locked: 0, disputed: 0, progress: 0, overdueCount: 0,
    })
  })
})

describe('local-first API layer — approvals', () => {
  it('lists pending approvals derived from milestones with proof', async () => {
    const project = await api.projects.create({ name: 'Approvals' })
    const created = await api.milestones.create(project.id, { name: 'Foundation', plannedCostCents: 30_000_00 })

    const withProof = addProofArtifact(makeMilestone(created), {
      type: 'photo',
      title: 'Footing photo',
      description: '',
      capturedBy: 'site-agent',
      capturedAt: '2026-08-01T00:00:00Z',
    })
    await db.milestones.put(withProof)

    const approvals = await api.approvals.list(project.id)
    expect(approvals).toHaveLength(1)
    expect(approvals[0].title).toBe('Foundation')
    expect(approvals[0].amount).toBe(30000)
    expect(approvals[0].status).toBe('pending')
    expect(approvals[0].currency).toBe('USD')
  })

  it('applies a pass decision and returns the approved request', async () => {
    const project = await api.projects.create({ name: 'Decisions' })
    const created = await api.milestones.create(project.id, { name: 'Foundation', plannedCostCents: 30_000_00 })
    const withProof = addProofArtifact(makeMilestone(created), {
      type: 'photo',
      title: 'Footing photo',
      description: '',
      capturedBy: 'site-agent',
      capturedAt: '2026-08-01T00:00:00Z',
    })
    await db.milestones.put(withProof)

    const decided = await api.approvals.decide(created.id, {
      decision: 'pass',
      decidedBy: 'Client',
      reason: 'Looks good',
    })
    expect(decided.status).toBe('approved')

    const stored = await api.milestones.get(created.id)
    expect(stored?.releaseState).toBe('released')
    expect(stored?.releaseDecisions).toHaveLength(1)
    expect(stored?.releaseDecisions[0].decidedBy).toBe('Client')
  })

  it('applies a fail decision as rejected', async () => {
    const project = await api.projects.create({ name: 'Rejections' })
    const created = await api.milestones.create(project.id, { name: 'Foundation', plannedCostCents: 30_000_00 })
    const withProof = addProofArtifact(makeMilestone(created), {
      type: 'photo',
      title: 'Footing photo',
      description: '',
      capturedBy: 'site-agent',
      capturedAt: '2026-08-01T00:00:00Z',
    })
    await db.milestones.put(withProof)

    const decided = await api.approvals.decide(created.id, { decision: 'fail', reason: 'Cracking visible' })
    expect(decided.status).toBe('rejected')
  })

  it('throws 404 when deciding a missing approval', async () => {
    await expect(
      api.approvals.decide('missing', { decision: 'pass' })
    ).rejects.toMatchObject({ status: 404, code: 'not_found' })
  })
})

describe('local-first API layer — transport contract', () => {
  it('rejects unknown routes with 404', async () => {
    const transport = new LocalIndexedDbTransport()
    await expect(
      transport.request({ method: 'GET', path: '/unknown' })
    ).rejects.toMatchObject({ status: 404, code: 'route_not_found' })
  })

  it('HttpTransport is a drop-in adapter with an identical client surface', () => {
    const httpClient = createApiClient(new HttpTransport('https://backend.invalid'))
    expect(typeof httpClient.projects.list).toBe('function')
    expect(typeof httpClient.projects.create).toBe('function')
    expect(typeof httpClient.milestones.listByProject).toBe('function')
    expect(typeof httpClient.escrow.summary).toBe('function')
    expect(typeof httpClient.approvals.decide).toBe('function')
  })

  it('ApiError carries status and code', () => {
    const err = new ApiError(409, 'conflict', 'Already exists')
    expect(err.status).toBe(409)
    expect(err.code).toBe('conflict')
    expect(err.message).toBe('Already exists')
    expect(err).toBeInstanceOf(Error)
  })
})
