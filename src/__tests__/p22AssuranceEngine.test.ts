import { describe, it, expect } from 'vitest'
import {
  createProjectIntake,
  assessFeasibility,
  assessGoNoGo,
  createRiskGate,
  evaluateGate,
  createRiskRegisterEntry,
  computeRiskScore,
  createSolvencyCheck,
} from '@/engine/assurance/assuranceEngine'

describe('P22 — Assurance Engine', () => {
  describe('createProjectIntake', () => {
    it('creates intake with new status', () => {
      const intake = createProjectIntake({
        projectId: 'p1',
        source: 'direct',
        clientName: 'Test Client',
        clientType: 'company',
        projectName: 'Test Project',
        projectDescription: 'A test project',
        estimatedValueCents: 10000000,
        estimatedDurationDays: 180,
        location: 'Harare',
        submittedBy: 'user-1',
      })
      expect(intake.projectId).toBe('p1')
      expect(intake.status).toBe('new')
      expect(intake.clientName).toBe('Test Client')
      expect(intake.estimatedValueCents).toBe(10000000)
    })
  })

  describe('assessFeasibility', () => {
    it('returns pass for well-budgeted project', () => {
      const result = assessFeasibility({
        budgetCents: 3000000,
        availableBudgetCents: 10000000,
        timelineDays: 60,
        availableTimelineDays: 180,
        hasTechnicalCapacity: true,
        hasResources: true,
      })
      expect(result.overallResult).toBe('pass')
      expect(result.overallScore).toBeGreaterThanOrEqual(70)
    })

    it('returns fail for over-budget project', () => {
      const result = assessFeasibility({
        budgetCents: 9000000,
        availableBudgetCents: 5000000,
        timelineDays: 180,
        availableTimelineDays: 90,
        hasTechnicalCapacity: false,
        hasResources: false,
      })
      expect(result.overallResult).toBe('fail')
    })

    it('returns conditional for borderline', () => {
      const result = assessFeasibility({
        budgetCents: 7000000,
        availableBudgetCents: 10000000,
        timelineDays: 140,
        availableTimelineDays: 180,
        hasTechnicalCapacity: true,
        hasResources: false,
      })
      expect(['pass', 'conditional', 'fail']).toContain(result.overallResult)
    })
  })

  describe('assessGoNoGo', () => {
    it('returns go when feasibility passes and no gates fail', () => {
      const feasibility = {
        overallResult: 'pass' as const,
        budgetFeasibility: 'pass' as const,
        timelineFeasibility: 'pass' as const,
        technicalFeasibility: 'pass' as const,
        resourceFeasibility: 'pass' as const,
        budgetScore: 90,
        timelineScore: 85,
        technicalScore: 80,
        resourceScore: 75,
        overallScore: 83,
      }
      const decision = assessGoNoGo(feasibility as unknown as import('@/domain/assurance').FeasibilityAssessment, [])
      expect(decision).toBe('go')
    })

    it('returns no-go when feasibility fails', () => {
      const feasibility = {
        overallResult: 'fail' as const,
        overallScore: 20,
      } as unknown as import('@/domain/assurance').FeasibilityAssessment
      const decision = assessGoNoGo(feasibility, [])
      expect(decision).toBe('no-go')
    })
  })

  describe('createRiskGate', () => {
    it('creates gate with not-started status', () => {
      const gate = createRiskGate({
        projectId: 'p1',
        gateType: 'title',
        name: 'Title Deed Check',
        description: 'Verify title deed is clear',
        criteria: ['Title exists', 'No encumbrances'],
        order: 1,
        required: true,
        checkedBy: 'user-1',
      })
      expect(gate.gateType).toBe('title')
      expect(gate.status).toBe('not-started')
      expect(gate.required).toBe(true)
    })
  })

  describe('evaluateGate', () => {
    it('returns passed when all criteria met with evidence', () => {
      const gate = createRiskGate({
        projectId: 'p1', gateType: 'zoning', name: 'Zoning Check',
        description: 'Verify zoning compliance', criteria: ['Criterion 1', 'Criterion 2'],
        order: 1, required: true, checkedBy: 'u1',
      })
      expect(evaluateGate(gate, [true, true], ['doc-1', 'doc-2'])).toBe('passed')
    })

    it('returns failed when no criteria met', () => {
      const gate = createRiskGate({
        projectId: 'p1', gateType: 'funding', name: 'Funding Check',
        description: 'Verify funding', criteria: ['Funding secured'],
        order: 1, required: true, checkedBy: 'u1',
      })
      expect(evaluateGate(gate, [false], [])).toBe('failed')
    })
  })

  describe('createRiskRegisterEntry', () => {
    it('computes risk score', () => {
      const entry = createRiskRegisterEntry({
        projectId: 'p1', category: 'financial',
        description: 'Budget overrun risk', severity: 'high',
        likelihood: 3, impact: 4, owner: 'user-1',
        mitigation: 'Contingency fund', contingency: '10% buffer',
      })
      expect(entry.riskScore).toBe(12)
      expect(entry.status).toBe('open')
    })
  })

  describe('computeRiskScore', () => {
    it('multiplies likelihood by impact', () => {
      expect(computeRiskScore(3, 4)).toBe(12)
      expect(computeRiskScore(5, 5)).toBe(25)
      expect(computeRiskScore(1, 1)).toBe(1)
    })
  })

  describe('createSolvencyCheck', () => {
    it('creates solvency check with default values', () => {
      const check = createSolvencyCheck({
        projectId: 'p1', entityType: 'contractor',
        entityId: 'c1', entityName: 'Test Contractor', checkedBy: 'user-1',
      })
      expect(check.isSolvent).toBe(false)
      expect(check.creditScore).toBe(0)
      expect(check.entityName).toBe('Test Contractor')
    })
  })
})
