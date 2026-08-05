// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClientPortal from '@/pages/ClientPortal'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { db } from '@/db/db'
import { addProofArtifact } from '@/engine/milestone/milestoneEngine'
import { PHASES } from '@/engine/construction/constructionPhases'
import type { Project } from '@/types'

const PHASE_LIST = Object.values(PHASES)

function renderPortal(initialEntries = ['/portal']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ClientPortal />
    </MemoryRouter>
  )
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    slug: 'avondale',
    name: 'Avondale Residential',
    ownerId: 'client-1',
    profile: 'first-time',
    region: 'zimbabwe',
    currency: 'USD',
    status: 'design',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-20T00:00:00Z',
    version: 1,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.projects.clear()
  await db.boqs.clear()
  await db.milestones.clear()
  useMilestoneStore.setState({ milestones: [], currentProjectId: null, isLoading: false })
})

afterEach(cleanup)

describe('ClientPortal — real milestone data', () => {
  it('loads the active project and seeds real construction milestones (no mocks)', async () => {
    await db.projects.add(makeProject())
    await db.boqs.add({
      id: 'boq-1',
      projectId: 'proj-1',
      designId: 'd1',
      sections: [],
      totalCents: 2_000_000_00,
      contingencyCents: 0,
      currency: 'USD',
      generatedAt: '2026-07-21T00:00:00Z',
    })

    renderPortal()

    expect(await screen.findByText('Avondale Residential')).toBeTruthy()
    await waitFor(() => {
      expect(useMilestoneStore.getState().milestones).toHaveLength(5)
    })

    const seeded = useMilestoneStore.getState().milestones
    expect(seeded.map((m) => m.name)).toEqual(PHASE_LIST.map((p) => p.title))
    expect(seeded[0].plannedCostCents).toBeGreaterThan(0)

    expect(screen.queryByText('Foundation Excavation Complete')).toBeNull()
    expect(screen.queryByText('Site Preparation & Clearance')).toBeNull()
    expect(screen.getByText('You\'re all caught up. No pending approvals.')).toBeTruthy()
  })

  it('shows a provider-submitted milestone as a pending approval with real values', async () => {
    await db.projects.add(makeProject())
    await db.boqs.add({
      id: 'boq-1',
      projectId: 'proj-1',
      designId: 'd1',
      sections: [],
      totalCents: 2_000_000_00,
      contingencyCents: 0,
      currency: 'USD',
      generatedAt: '2026-07-21T00:00:00Z',
    })

    renderPortal()
    await waitFor(() => {
      expect(useMilestoneStore.getState().milestones).toHaveLength(5)
    })

    const first = useMilestoneStore.getState().milestones[0]
    const withProof = addProofArtifact(first, {
      type: 'photo',
      title: 'Rough-in photos',
      description: 'Slab and services photos uploaded by provider',
      fileRef: '#photo-1',
      capturedAt: new Date().toISOString(),
      capturedBy: 'provider',
    })
    await useMilestoneStore.getState().setMilestone(withProof)

    const card = await screen.findByText('Rough-in & Infrastructure')
    expect(card).toBeTruthy()
    expect(screen.getByText(PHASE_LIST[0].trade)).toBeTruthy()
    expect(screen.getByText(PHASE_LIST[0].description)).toBeTruthy()
    expect(screen.getByText('Approve Release')).toBeTruthy()
    expect(screen.getByText('Reject')).toBeTruthy()

    const expectedAmount = `$${Math.round(withProof.plannedCostCents / 100).toLocaleString('en-US')}`
    expect(screen.getByText(expectedAmount)).toBeTruthy()
  })

  it('approves a pending milestone through the real milestone engine', async () => {
    await db.projects.add(makeProject())

    renderPortal()
    await waitFor(() => {
      expect(useMilestoneStore.getState().milestones).toHaveLength(5)
    })

    const first = useMilestoneStore.getState().milestones[0]
    const withProof = addProofArtifact(first, {
      type: 'photo',
      title: 'Rough-in photos',
      description: 'Slab and services photos',
      fileRef: '#photo-1',
      capturedAt: new Date().toISOString(),
      capturedBy: 'provider',
    })
    await useMilestoneStore.getState().setMilestone(withProof)

    await screen.findByText('Rough-in & Infrastructure')
    fireEvent.click(screen.getByText('Approve Release'))

    await waitFor(() => {
      const m = useMilestoneStore.getState().milestones.find((x) => x.id === first.id)
      expect(m?.releaseState).toBe('released')
      expect(m?.releaseDecisions[0].decision).toBe('pass')
      expect(m?.releaseDecisions[0].decidedBy).toBe('Client')
    })

    expect(await screen.findByText('Approved')).toBeTruthy()
  })

  it('rejects a pending milestone through the real milestone engine', async () => {
    await db.projects.add(makeProject())

    renderPortal()
    await waitFor(() => {
      expect(useMilestoneStore.getState().milestones).toHaveLength(5)
    })

    const first = useMilestoneStore.getState().milestones[0]
    const withProof = addProofArtifact(first, {
      type: 'photo',
      title: 'Rough-in photos',
      description: 'Slab and services photos',
      fileRef: '#photo-1',
      capturedAt: new Date().toISOString(),
      capturedBy: 'provider',
    })
    await useMilestoneStore.getState().setMilestone(withProof)

    await screen.findByText('Rough-in & Infrastructure')
    fireEvent.click(screen.getByText('Reject'))

    await waitFor(() => {
      const m = useMilestoneStore.getState().milestones.find((x) => x.id === first.id)
      expect(m?.releaseState).toBe('rejected')
      expect(m?.releaseDecisions[0].decision).toBe('fail')
    })

    expect(await screen.findByText('Rejected')).toBeTruthy()
  })

  it('shows no-pending state and counts for a fresh plan', async () => {
    await db.projects.add(makeProject())

    renderPortal()
    await waitFor(() => {
      expect(useMilestoneStore.getState().milestones).toHaveLength(5)
    })

    expect(screen.getByText('You\'re all caught up. No pending approvals.')).toBeTruthy()
    expect(screen.getByText('No recent activity.')).toBeTruthy()
    expect(screen.getByText('Total Milestones')).toBeTruthy()
    expect(screen.getByText('Awaiting Approval')).toBeTruthy()
    expect(screen.getByText('Funds Released')).toBeTruthy()
  })
})
