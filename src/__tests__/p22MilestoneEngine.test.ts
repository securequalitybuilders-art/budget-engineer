import { describe, it, expect } from 'vitest'
import {
  createMilestone,
  addProofArtifact,
  addReviewCheck,
  addReleaseCondition,
  performReviewCheck,
  satisfyReleaseCondition,
  computeReleaseState,
  makeReleaseDecision,
  calculateMilestoneProgress,
  detectMilestoneDelay,
} from '@/engine/milestone/milestoneEngine'

describe('P22 — Milestone Engine', () => {
  describe('createMilestone', () => {
    it('creates milestone with locked release state', () => {
      const m = createMilestone({
        projectId: 'p1',
        name: 'Foundation Completion',
        description: 'All foundation works completed',
        plannedDate: '2026-08-01',
        plannedCostCents: 5000000,
        weight: 20,
        order: 1,
        category: 'construction',
        isCritical: true,
      })
      expect(m.releaseState).toBe('locked')
      expect(m.name).toBe('Foundation Completion')
      expect(m.isCritical).toBe(true)
      expect(m.proofArtifacts).toHaveLength(0)
    })
  })

  describe('addProofArtifact', () => {
    it('adds artifact to milestone', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      const updated = addProofArtifact(m, {
        type: 'photo',
        title: 'Foundation Photo',
        description: 'Photo of completed foundation',
        capturedAt: new Date().toISOString(),
        capturedBy: 'user-1',
        geotag: { lat: -17.825, lng: 31.033 },
      })
      expect(updated.proofArtifacts).toHaveLength(1)
      expect(updated.proofArtifacts[0].type).toBe('photo')
      expect(updated.proofArtifacts[0].geotag?.lat).toBe(-17.825)
    })
  })

  describe('addReviewCheck', () => {
    it('adds review check to milestone', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      const updated = addReviewCheck(m, {
        checkType: 'structural-inspection',
        description: 'Verify rebar placement',
        required: true,
        assignedTo: 'engineer-1',
      })
      expect(updated.reviewChecks).toHaveLength(1)
      expect(updated.reviewChecks[0].assignedTo).toBe('engineer-1')
    })
  })

  describe('addReleaseCondition', () => {
    it('adds release condition', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      const updated = addReleaseCondition(m, { condition: 'All concrete tests passed', met: false })
      expect(updated.releaseConditions).toHaveLength(1)
      expect(updated.releaseConditions[0].condition).toBe('All concrete tests passed')
    })
  })

  describe('performReviewCheck', () => {
    it('updates review check decision', () => {
      let m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      m = addReviewCheck(m, { checkType: 'test', description: 'Test', required: true, assignedTo: 'u1' })
      const checkId = m.reviewChecks[0].id
      const updated = performReviewCheck(m, checkId, 'pass', 'All good', 'engineer-1')
      expect(updated.reviewChecks[0].decision).toBe('pass')
      expect(updated.reviewChecks[0].decidedAt).toBeDefined()
    })
  })

  describe('satisfyReleaseCondition', () => {
    it('marks condition as met', () => {
      let m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      m = addReleaseCondition(m, { condition: 'Tests passed', met: false })
      const conditionId = m.releaseConditions[0].id
      const updated = satisfyReleaseCondition(m, conditionId, 'test-report.pdf', 'engineer-1')
      expect(updated.releaseConditions[0].met).toBe(true)
      expect(updated.releaseConditions[0].evidenceRef).toBe('test-report.pdf')
    })
  })

  describe('computeReleaseState', () => {
    it('returns released when all conditions met', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      expect(computeReleaseState(m)).toBe('released')
    })

    it('returns held when conditions unmet', () => {
      let m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      m = addReleaseCondition(m, { condition: 'Tests passed', met: false })
      expect(computeReleaseState(m)).toBe('held')
    })

    it('returns held when required artifacts missing', () => {
      let m = createMilestone({
        projectId: 'p1', name: 'Test', description: '',
        plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1,
        category: 'construction', isCritical: false,
      })
      m = { ...m, requiredArtifacts: ['photo' as unknown as import('@/domain/milestone').ProofArtifactType, 'inspection-report' as unknown as import('@/domain/milestone').ProofArtifactType] }
      expect(computeReleaseState(m)).toBe('held')
    })

    it('returns rejected when review failed', () => {
      let m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      m = addReviewCheck(m, { checkType: 'test', description: 'Test', required: true, assignedTo: 'u1' })
      m = performReviewCheck(m, m.reviewChecks[0].id, 'fail', 'Failed', 'u1')
      expect(computeReleaseState(m)).toBe('rejected')
    })
  })

  describe('makeReleaseDecision', () => {
    it('releases milestone on pass decision', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      const result = makeReleaseDecision(m, 'pass', 'reviewer-1', 'All conditions satisfied')
      expect(result.releaseState).toBe('released')
      expect(result.milestone.completedAt).toBeDefined()
    })

    it('rejects milestone on fail decision', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      const result = makeReleaseDecision(m, 'fail', 'reviewer-1', 'Not acceptable')
      expect(result.releaseState).toBe('rejected')
    })
  })

  describe('calculateMilestoneProgress', () => {
    it('returns 100% when fully complete', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      expect(calculateMilestoneProgress(m)).toBe(100)
    })

    it('returns partial progress', () => {
      let m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-08-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      m = addReleaseCondition(m, { condition: 'C1', met: false })
      m = addReleaseCondition(m, { condition: 'C2', met: true })
      expect(calculateMilestoneProgress(m)).toBeGreaterThan(0)
      expect(calculateMilestoneProgress(m)).toBeLessThan(100)
    })
  })

  describe('detectMilestoneDelay', () => {
    it('returns null for completed milestone', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-01-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      expect(detectMilestoneDelay({ ...m, completedAt: '2026-06-01' }, '2026-07-01')).toBeNull()
    })

    it('returns delay days for overdue milestone', () => {
      const m = createMilestone({ projectId: 'p1', name: 'Test', description: '', plannedDate: '2026-01-01', plannedCostCents: 0, weight: 10, order: 1, category: 'construction', isCritical: false })
      const delay = detectMilestoneDelay(m, '2026-07-01')
      expect(delay).toBeGreaterThan(0)
    })
  })
})
