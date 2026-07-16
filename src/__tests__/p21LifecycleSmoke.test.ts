import { describe, it, expect, beforeAll } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { computeProjectReadiness, computeMilestoneLifecycleSummary, computeProjectHealthSummary } from '@/lib/lifecycle/lifecycleSummary'
import { assessHandoverReadiness } from '@/lib/lifecycle/handoverReadiness'
import type { ProjectIntake, FeasibilityAssessment, RiskGate, RiskRegisterEntry, SolvencyCheck } from '@/domain/assurance'
import type { Milestone } from '@/domain/milestone'
import type { CompletionStage, SnagList, HandoverPackage } from '@/domain/handover'
import type { ProjectControlsSnapshot } from '@/domain/projectControls'
import type { NCR, SnagItem } from '@/domain/change'

const PID = 'lifecycle-smoke-1'
const now = new Date().toISOString()
const uid = (s: string) => `ls-${s}`

function makeIntakes(n: number): ProjectIntake[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`intake-${i}`), projectId: PID, status: 'submitted',
    submittedAt: now, documents: [], decision: 'go',
    source: 'client', clientName: 'Test', clientType: 'individual',
    projectName: 'Test', projectDescription: '', estimatedBudget: 0,
    requestedBy: '', contactEmail: '', contactPhone: '', createdAt: now, updatedAt: now,
  } as unknown as ProjectIntake))
}

function makeAssessments(n: number, verdict: 'pass' | 'fail' | 'conditional'): FeasibilityAssessment[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`feas-${i}`), projectId: PID, verdict,
    assessedAt: now, budgetCents: 100000, feasibilityScore: 85,
    findings: [], recommendations: [],
    assessmentDate: now, assessor: 'PM', overallResult: verdict,
    budgetFeasibility: { isAdequate: true, confidencePct: 80, contingencies: [] },
    siteFeasibility: { soilCondition: 'good', accessRoute: 'ok', utilitiesAvailable: true },
    scheduleFeasibility: { isAchievable: true, criticalPathItems: [] },
    riskFeasibility: { riskLevel: 'low', keyRisks: [] },
    resourceFeasibility: { labourAvailable: true, materialsAvailable: true, equipmentAvailable: true },
    createdAt: now, updatedAt: now,
  } as unknown as FeasibilityAssessment))
}

function makeGates(n: number, status: 'passed' | 'failed' | 'not-started'): RiskGate[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`gate-${i}`), projectId: PID, gateType: 'design-review', status,
    assessedAt: now, assessedBy: 'PM', criteria: [
      { id: uid(`crit-${i}`), description: 'Criterion', met: status === 'passed', evidence: '', completionStageId: uid('cs'), completionStage: '' },
    ],
    name: `Gate ${i}`, required: true, order: i,
    description: `Gate ${i} description`,
    category: 'design', createdAt: now, updatedAt: now,
  } as unknown as RiskGate))
}

function makeRiskEntries(n: number): RiskRegisterEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`risk-${i}`), projectId: PID, category: 'technical', status: 'open',
    description: `Risk ${i}`, likelihood: 2, impact: 3, createdAt: now, updatedAt: now,
    riskScore: 6, mitigation: '', owner: '',
    severity: 'medium', contingency: '',
  } as unknown as RiskRegisterEntry))
}

function makeSolvencyChecks(n: number, status: 'cleared' | 'flagged'): SolvencyCheck[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`solv-${i}`), projectId: PID, status,
    checkedAt: now, creditScore: 700, debtRatio: 0.3, assessedBy: 'Finance',
    entityType: 'contractor', entityId: uid('entity'), entityName: 'Test',
    checkDate: now, entityTypeLabel: 'contractor',
    financialStatements: [], isSolvent: status === 'cleared',
    createdAt: now, updatedAt: now,
  } as unknown as SolvencyCheck))
}

function makeMilestones(total: number, released: number): Milestone[] {
  return Array.from({ length: total }, (_, i) => ({
    id: uid(`ms-${i}`), projectId: PID,
    name: `Milestone ${i}`, plannedDate: '2026-06-01',
    category: 'design', releaseState: i < released ? 'released' : 'locked',
    createdAt: now, updatedAt: now,
    description: '', plannedCostCents: 0,
    linkedBOQSectionIds: [], linkedScheduleLineIds: [],
    deliverables: [], status: 'pending',
    conditionIds: [], dependencyIds: [],
  } as unknown as Milestone))
}

function makeCompletionStages(n: number, achieved: number): CompletionStage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`cs-${i}`), projectId: PID,
    stage: 'practical-completion', status: i < achieved ? 'achieved' : 'in-progress',
    targetDate: '2026-06-01', conditions: [], certificates: [],
    notes: '', createdAt: now, updatedAt: now,
  } as unknown as CompletionStage))
}

function makeSnagLists(totalSnags: number, openSnags: number): SnagList[] {
  const items: SnagItem[] = Array.from({ length: totalSnags }, (_, i) => ({
    id: uid(`snagitem-${i}`), projectId: PID,
    title: `Snag ${i}`, description: '', priority: 'low',
    status: i < openSnags ? 'open' : 'verified',
    area: 'finishes', createdAt: now, updatedAt: now,
    snagNumber: `S-${i}`, category: 'finish', location: 'Room',
    originator: 'Inspector', originatorRole: 'QA',
    assignedTo: '', linkedNcrId: '', photos: [],
    resolutionDate: '', verifiedBy: '',
  } as unknown as SnagItem))
  return [{ id: uid('snaglist-1'), projectId: PID, name: 'Final snags', snagItems: items, createdAt: now, updatedAt: now }] as unknown as SnagList[]
}

function makeHandoverPackages(n: number): HandoverPackage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid(`hp-${i}`), projectId: PID,
    name: `Package ${i}`, recipient: 'Client', recipientType: 'client',
    status: 'draft', contents: [],
    certificateRefs: [], notes: '', createdAt: now, updatedAt: now,
  } as unknown as HandoverPackage))
}

function makeSnapshot(health: 'on-track' | 'at-risk' | 'critical'): ProjectControlsSnapshot {
  return {
    id: uid('pcs-1'), projectId: PID, snapshotDate: now,
    actualCostCents: 4800000, earnedValueCents: 4900000, plannedValueCents: 5000000,
    scheduleVariance: -2, costVariance: 2, budgetUtilizationPct: 96,
    alertConditions: health === 'critical'
      ? [{ type: 'schedule', severity: 'critical', description: 'Delay', category: 'schedule', isActive: true, triggeredAt: now }]
      : health === 'at-risk'
        ? [{ type: 'budget', severity: 'warning', description: 'Over budget', category: 'budget', isActive: true, triggeredAt: now }]
        : [],
    delayFlags: [],
    createdAt: now, updatedAt: now,
    spi: 0.98, cpi: 1.02, plannedProgressPct: 50, actualProgressPct: 48,
    costPerformanceIndex: 1.02, schedulePerformanceIndex: 0.98,
    baselineId: uid('bl'),
  } as unknown as ProjectControlsSnapshot
}

beforeAll(async () => {
  await db.open()
})

describe('P21 — Lifecycle Platform Smoke Tests', () => {
  it('full lifecycle workflow: assurance → readiness → health → controls', () => {
    const intakes = makeIntakes(1)
    const assessments = makeAssessments(1, 'pass')
    const gates = makeGates(2, 'passed')
    const riskEntries = makeRiskEntries(1)
    const solvencyChecks = makeSolvencyChecks(1, 'cleared')

    const readiness = computeProjectReadiness({ intakes, feasibilityAssessments: assessments, riskGates: gates, riskRegister: riskEntries, solvencyChecks })
    expect(readiness.overallState).toBe('cleared')
    expect(readiness.blockers).toHaveLength(0)

    const milestones = makeMilestones(5, 4)
    const milestoneSummary = computeMilestoneLifecycleSummary(milestones)
    expect(milestoneSummary.total).toBe(5)
    expect(milestoneSummary.released).toBe(4)
    expect(milestoneSummary.overallProgressPct).toBeGreaterThan(0)

    const snapshot = makeSnapshot('on-track')
    const health = computeProjectHealthSummary({
      readiness, milestoneSummary,
      controlsSnapshot: snapshot,
      ncrs: [], rfis: [], snags: [],
    })
    expect(health.health).toBe('on-track')
    expect(health.readinessState).toBe('cleared')
    expect(health.milestoneProgressPct).toBeGreaterThan(0)
  })

  it('handover readiness with mixed blockers works correctly', () => {
    const stages = makeCompletionStages(4, 2)
    const snagLists = makeSnagLists(10, 3)
    const milestones = makeMilestones(5, 3)
    const pkgs = makeHandoverPackages(1)
    const ncrs: NCR[] = []

    const assessment = assessHandoverReadiness({ completionStages: stages, snagLists, handoverPackages: pkgs, milestones, ncrs })
    expect(assessment.stageCompletionPct).toBe(50)
    expect(assessment.isReady).toBe(false)
    expect(assessment.blockers.length).toBeGreaterThan(0)

    const stageBlocker = assessment.blockers.find((b) => b.category === 'stage')
    expect(stageBlocker).toBeDefined()
    expect(stageBlocker!.severity).toBe('blocking')

    const snagBlocker = assessment.blockers.find((b) => b.category === 'snag')
    expect(snagBlocker).toBeDefined()
  })

  it('handover readiness signals ready when all conditions met', () => {
    const stages = makeCompletionStages(5, 5)
    const snagLists = makeSnagLists(5, 0)
    const milestones = makeMilestones(5, 5)
    const pkgs = makeHandoverPackages(2)
    const ncrs: NCR[] = []

    const assessment = assessHandoverReadiness({ completionStages: stages, snagLists, handoverPackages: pkgs, milestones, ncrs })
    expect(assessment.stageCompletionPct).toBe(100)
    expect(assessment.isReady).toBe(true)
    expect(assessment.readinessState).toBe('ready')
    expect(assessment.overallScore).toBeGreaterThanOrEqual(80)
  })

  it('project health transitions through states correctly', () => {
    const intakes = makeIntakes(1)
    const assessments = makeAssessments(1, 'pass')
    const gates = makeGates(1, 'failed')
    const riskEntries = makeRiskEntries(2)
    const solvencyChecks = makeSolvencyChecks(1, 'flagged')

    const readiness = computeProjectReadiness({ intakes, feasibilityAssessments: assessments, riskGates: gates, riskRegister: riskEntries, solvencyChecks })
    expect(readiness.overallState).not.toBe('cleared')
    expect(readiness.blockers.length).toBeGreaterThan(0)

    const milestones = makeMilestones(3, 1)
    const milestoneSummary = computeMilestoneLifecycleSummary(milestones)
    const snapshot = makeSnapshot('critical')

    const health = computeProjectHealthSummary({
      readiness, milestoneSummary, controlsSnapshot: snapshot,
      ncrs: [{
        id: uid('ncr-1'), projectId: PID, title: 'Critical NCR',
        description: 'Failed inspection', severity: 'major',
        status: 'open', createdAt: now, updatedAt: now,
        ncrNumber: 'NCR-001', originator: 'Inspector', originatorRole: 'QA',
        location: 'Foundation', assignedTo: 'Contractor',
        linkedRfiId: '', linkedSnagId: '', linkedChangeOrderId: '',
        correctionDueDate: now, correctedDate: '', verifiedDate: '',
        verifiedBy: '', rootCause: '', correctionAction: '',
        preventionPlan: '', attachments: [],
        category: 'quality', linkedDrawingIds: [],
        linkedSpecSectionIds: [], photoRefs: [], notes: '',
      } as unknown as NCR],
      rfis: [], snags: [],
    })
    expect(health.health).toBe('critical')
    expect(health.openIssues).toBeGreaterThan(0)
  })

  it('cross-domain data flows through Dexie stores survive roundtrip', async () => {
    await db.projectIntakes.clear()
    await db.feasibilityAssessments.clear()
    await db.riskGates.clear()
    await db.riskRegister.clear()
    await db.solvencyChecks.clear()
    await db.milestones.clear()
    await db.completionStages.clear()
    await db.snagLists.clear()
    await db.handoverPackages.clear()
    await db.ncrs.clear()
    await db.projectControlsSnapshots.clear()

    await db.projectIntakes.bulkAdd(makeIntakes(1) as never[])
    await db.feasibilityAssessments.bulkAdd(makeAssessments(1, 'pass') as never[])
    await db.riskGates.bulkAdd(makeGates(2, 'passed') as never[])
    await db.riskRegister.bulkAdd(makeRiskEntries(1) as never[])
    await db.solvencyChecks.bulkAdd(makeSolvencyChecks(1, 'cleared') as never[])
    await db.milestones.bulkAdd(makeMilestones(5, 4) as never[])
    await db.completionStages.bulkAdd(makeCompletionStages(4, 4) as never[])
    await db.snagLists.bulkAdd(makeSnagLists(0, 0) as never[])
    await db.handoverPackages.bulkAdd(makeHandoverPackages(1) as never[])
    await db.projectControlsSnapshots.put(makeSnapshot('on-track') as never)

    const intakes = await db.projectIntakes.where({ projectId: PID }).toArray()
    const assessments = await db.feasibilityAssessments.where({ projectId: PID }).toArray()
    const gates = await db.riskGates.where({ projectId: PID }).toArray()
    const riskEntries = await db.riskRegister.where({ projectId: PID }).toArray()
    const solvencyChecks = await db.solvencyChecks.where({ projectId: PID }).toArray()
    const milestones = await db.milestones.where({ projectId: PID }).toArray()
    const stages = await db.completionStages.where({ projectId: PID }).toArray()
    const pkgs = await db.handoverPackages.where({ projectId: PID }).toArray()
    const snapshots = await db.projectControlsSnapshots.where({ projectId: PID }).toArray()

    expect(intakes).toHaveLength(1)
    expect(assessments).toHaveLength(1)
    expect(gates).toHaveLength(2)
    expect(riskEntries).toHaveLength(1)
    expect(solvencyChecks).toHaveLength(1)
    expect(milestones).toHaveLength(5)
    expect(stages).toHaveLength(4)
    expect(pkgs).toHaveLength(1)
    expect(snapshots).toHaveLength(1)

    const readiness = computeProjectReadiness({
      intakes: intakes as unknown as ProjectIntake[],
      feasibilityAssessments: assessments as unknown as FeasibilityAssessment[],
      riskGates: gates as unknown as RiskGate[],
      riskRegister: riskEntries as unknown as RiskRegisterEntry[],
      solvencyChecks: solvencyChecks as unknown as SolvencyCheck[],
    })
    expect(readiness.overallState).toBe('cleared')

    const milestoneSummary = computeMilestoneLifecycleSummary(milestones as unknown as Milestone[])
    const health = computeProjectHealthSummary({
      readiness, milestoneSummary,
      controlsSnapshot: (snapshots[0] ?? null) as unknown as ProjectControlsSnapshot,
      ncrs: [], rfis: [], snags: [],
    })
    expect(health.health).toBe('on-track')

    const handover = assessHandoverReadiness({ completionStages: stages as unknown as CompletionStage[], handoverPackages: pkgs as unknown as HandoverPackage[] })
    expect(handover.isReady).toBe(true)
  })
})
