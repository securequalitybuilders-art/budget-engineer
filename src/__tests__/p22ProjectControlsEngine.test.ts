import { describe, it, expect } from 'vitest'
import {
  createMilestone,
} from '@/engine/milestone/milestoneEngine'
import {
  createProjectControlsBaseline,
  createProjectControlsSnapshot,
  getProjectHealth,
} from '@/engine/projectControls/projectControlsEngine'
import type { Milestone } from '@/domain/milestone'

function makeTestMilestones(projectId: string): Milestone[] {
  return [
    createMilestone({ projectId, name: 'Foundation', description: '', plannedDate: '2026-07-01', plannedCostCents: 5000000, weight: 20, order: 1, category: 'construction', isCritical: true }),
    createMilestone({ projectId, name: 'Structure', description: '', plannedDate: '2026-08-01', plannedCostCents: 8000000, weight: 30, order: 2, category: 'construction', isCritical: true }),
    createMilestone({ projectId, name: 'Roof', description: '', plannedDate: '2026-09-01', plannedCostCents: 3000000, weight: 15, order: 3, category: 'construction', isCritical: false }),
    createMilestone({ projectId, name: 'Finishes', description: '', plannedDate: '2026-10-01', plannedCostCents: 4000000, weight: 20, order: 4, category: 'construction', isCritical: false }),
  ]
}

describe('P22 — Project Controls Engine', () => {
  describe('createProjectControlsBaseline', () => {
    it('creates baseline with planned progress', () => {
      const milestones = makeTestMilestones('p1')
      const baseline = createProjectControlsBaseline({
        projectId: 'p1',
        plannedStartDate: '2026-06-01',
        plannedEndDate: '2026-12-01',
        totalPlannedCostCents: 20000000,
        milestones,
      })
      expect(baseline.totalPlannedCostCents).toBe(20000000)
      expect(baseline.milestoneCount).toBe(4)
      expect(baseline.plannedProgress).toHaveLength(4)
    })
  })

  describe('createProjectControlsSnapshot', () => {
    it('creates snapshot with computed metrics', () => {
      const milestones = makeTestMilestones('p1')
      const baseline = createProjectControlsBaseline({
        projectId: 'p1',
        plannedStartDate: '2026-06-01',
        plannedEndDate: '2026-12-01',
        totalPlannedCostCents: 20000000,
        milestones,
      })

      const snapshot = createProjectControlsSnapshot({
        projectId: 'p1',
        baseline,
        milestones,
        ncrs: [],
        rfis: [],
        snags: [],
        changeOrders: [],
        inspections: [],
        actualCostCents: 5000000,
        elapsedDays: 45,
      })

      expect(snapshot.actualCostCents).toBe(5000000)
      expect(snapshot.milestoneStatuses).toHaveLength(4)
      expect(snapshot.issueCounts).toBeDefined()
      expect(snapshot.delayFlags).toBeDefined()
      expect(snapshot.alertConditions).toBeDefined()
      expect(snapshot.budgetUtilizationPct).toBeGreaterThan(0)
    })

    it('generates delay flags for overdue milestones', () => {
      const milestones = makeTestMilestones('p1')
      milestones[0].plannedDate = '2025-01-01'
      const baseline = createProjectControlsBaseline({
        projectId: 'p1',
        plannedStartDate: '2025-01-01',
        plannedEndDate: '2026-12-01',
        totalPlannedCostCents: 20000000,
        milestones,
      })
      const snapshot = createProjectControlsSnapshot({
        projectId: 'p1',
        baseline,
        milestones,
        ncrs: [],
        rfis: [],
        snags: [],
        changeOrders: [],
        inspections: [],
        actualCostCents: 5000000,
        elapsedDays: 300,
      })
      expect(snapshot.delayFlags.length).toBeGreaterThan(0)
    })

    it('generates alert conditions for schedule issues', () => {
      const milestones = makeTestMilestones('p1')
      milestones[0].plannedDate = '2025-01-01'
      const baseline = createProjectControlsBaseline({
        projectId: 'p1',
        plannedStartDate: '2025-01-01',
        plannedEndDate: '2026-12-01',
        totalPlannedCostCents: 20000000,
        milestones,
      })
      const snapshot = createProjectControlsSnapshot({
        projectId: 'p1',
        baseline,
        milestones,
        ncrs: Array(6).fill(null).map(() => ({ status: 'open' as const, id: '', projectId: '', ncrNumber: '', title: '', description: '', severity: 'minor' as const, originator: '', originatorRole: '', location: '', category: 'other' as const, linkedDrawingIds: [], linkedSpecSectionIds: [], photoRefs: [], notes: '', createdAt: '', updatedAt: '' })),
        rfis: [],
        snags: [],
        changeOrders: [],
        inspections: [],
        actualCostCents: 5000000,
        elapsedDays: 500,
      })
      expect(snapshot.alertConditions.length).toBeGreaterThan(0)
    })
  })

  describe('getProjectHealth', () => {
    it('returns on-track for healthy project', () => {
      const snapshot = {
        alertConditions: [],
        milestoneStatuses: [],
        scheduleVariance: 0,
      } as unknown as import('@/domain/projectControls').ProjectControlsSnapshot
      expect(getProjectHealth(snapshot)).toBe('on-track')
    })

    it('returns critical with critical alerts', () => {
      const snapshot = {
        alertConditions: [{ severity: 'critical', type: 'cost', message: 'Overrun', triggeredAt: '', acknowledged: false, id: '1' }],
        milestoneStatuses: [],
        scheduleVariance: 0,
      } as unknown as import('@/domain/projectControls').ProjectControlsSnapshot
      expect(getProjectHealth(snapshot)).toBe('critical')
    })

    it('returns at-risk with warnings', () => {
      const snapshot = {
        alertConditions: [{ severity: 'warning', type: 'schedule', message: 'Behind', triggeredAt: '', acknowledged: false, id: '1' }],
        milestoneStatuses: [],
        scheduleVariance: -5,
      } as unknown as import('@/domain/projectControls').ProjectControlsSnapshot
      expect(getProjectHealth(snapshot)).toBe('at-risk')
    })
  })
})
