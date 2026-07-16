import type { ProjectIntake, FeasibilityAssessment, RiskGate, RiskRegisterEntry, GoNoGoDecision } from '@/domain/assurance'
import type { Milestone } from '@/domain/milestone'
import type { NCR, RFI, SnagItem } from '@/domain/change'
import type { CompletionStage, SnagList } from '@/domain/handover'
import type { ProcurementRequest } from '@/domain/procurement'
import type { ProjectControlsSnapshot } from '@/domain/projectControls'

export type ProjectReadiness = {
  overallState: 'not-started' | 'in-feasibility' | 'cleared' | 'blocked' | 'deferred' | 'rejected'
  goNoGoDecision: GoNoGoDecision | null
  feasibilityPassed: boolean
  allRequiredGatesPassed: boolean
  blockedGateNames: string[]
  openRisksCritical: number
  openRisksHigh: number
  solvencyConfirmed: boolean
  blockers: string[]
}

export function computeProjectReadiness(params: {
  intakes?: ProjectIntake[]
  feasibilityAssessments?: FeasibilityAssessment[]
  riskGates?: RiskGate[]
  riskRegister?: RiskRegisterEntry[]
  solvencyChecks?: { isSolvent: boolean }[]
}): ProjectReadiness {
  const intakes = params.intakes ?? []
  const assessments = params.feasibilityAssessments ?? []
  const gates = params.riskGates ?? []
  const register = params.riskRegister ?? []
  const solvency = params.solvencyChecks ?? []
  const latestIntake = intakes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
  const latestAssessment = assessments.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]
  const requiredGates = gates.filter((g) => g.required)
  const failedGates = requiredGates.filter((g) => g.status === 'failed')
  const openRequiredGates = requiredGates.filter((g) => g.status !== 'passed' && g.status !== 'waived')
  const criticalRisks = register.filter((r) => r.severity === 'critical' && r.status === 'open')
  const highRisks = register.filter((r) => r.severity === 'high' && r.status === 'open')
  const allSolvent = solvency.length === 0 || solvency.every((c) => c.isSolvent)

  const blockers: string[] = []
  if (failedGates.length > 0) blockers.push(`Failed required gates: ${failedGates.map((g) => g.name).join(', ')}`)
  if (criticalRisks.length > 0) blockers.push(`${criticalRisks.length} critical risk(s) open`)
  if (!allSolvent) blockers.push('Solvency checks not passed')

  let overallState: ProjectReadiness['overallState'] = 'not-started'
  let goNoGoDecision: GoNoGoDecision | null = null
  let feasibilityPassed = false
  const allRequiredGatesPassed = openRequiredGates.length === 0

  if (latestIntake) {
    overallState = 'in-feasibility'
    if (latestIntake.decision) {
      goNoGoDecision = latestIntake.decision
      if (latestIntake.decision === 'go') {
        overallState = 'cleared'
        feasibilityPassed = true
      } else if (latestIntake.decision === 'no-go') {
        overallState = 'rejected'
      } else {
        overallState = 'deferred'
      }
    }
  }

  if (latestAssessment && !goNoGoDecision) {
    feasibilityPassed = latestAssessment.overallResult !== 'fail'
    if (latestAssessment.overallResult === 'fail') {
      overallState = 'blocked'
      blockers.push('Feasibility assessment failed')
    } else if (latestAssessment.overallResult === 'conditional') {
      overallState = 'deferred'
      blockers.push('Conditional feasibility — risks must be addressed')
    }
  }

  if (failedGates.length > 0) {
    overallState = 'blocked'
  }

  return {
    overallState,
    goNoGoDecision,
    feasibilityPassed,
    allRequiredGatesPassed,
    blockedGateNames: failedGates.map((g) => g.name),
    openRisksCritical: criticalRisks.length,
    openRisksHigh: highRisks.length,
    solvencyConfirmed: allSolvent,
    blockers,
  }
}

export type MilestoneLifecycleSummary = {
  total: number
  released: number
  held: number
  rejected: number
  pending: number
  criticalDelayed: Milestone[]
  overallProgressPct: number
  byCategory: Record<string, { total: number; released: number; progressPct: number }>
}

export function computeMilestoneLifecycleSummary(milestones: Milestone[]): MilestoneLifecycleSummary {
  const total = milestones.length
  const released = milestones.filter((m) => m.releaseState === 'released').length
  const held = milestones.filter((m) => m.releaseState === 'held').length
  const rejected = milestones.filter((m) => m.releaseState === 'rejected').length
  const pending = milestones.filter((m) => m.releaseState === 'locked' || m.releaseState === 'pending-review').length
  const criticalDelayed = milestones.filter((m) => m.isCritical && m.delayDays !== undefined && m.delayDays > 0)
  const overallProgressPct = total > 0 ? Math.round((released / total) * 100) : 0

  const byCategory: Record<string, { total: number; released: number; progressPct: number }> = {}
  for (const m of milestones) {
    if (!byCategory[m.category]) byCategory[m.category] = { total: 0, released: 0, progressPct: 0 }
    byCategory[m.category].total++
    if (m.releaseState === 'released') byCategory[m.category].released++
  }
  for (const key of Object.keys(byCategory)) {
    byCategory[key].progressPct = byCategory[key].total > 0
      ? Math.round((byCategory[key].released / byCategory[key].total) * 100) : 0
  }

  return { total, released, held, rejected, pending, criticalDelayed, overallProgressPct, byCategory }
}

export type ProcurementLifecycleSummary = {
  totalRequests: number
  openRequests: number
  awardedRequests: number
  totalPurchaseOrders: number
  deliveredPOs: number
  totalSpendCents: number
  linkedBOQLinesCount: number
}

export function computeProcurementLifecycleSummary(params: {
  requests: ProcurementRequest[]
  purchaseOrders: { status: string; totalCents: number }[]
}): ProcurementLifecycleSummary {
  const openRequests = params.requests.filter((r) => r.status !== 'awarded' && r.status !== 'cancelled')
  const awardedRequests = params.requests.filter((r) => r.status === 'awarded')
  const deliveredPOs = params.purchaseOrders.filter((p) => p.status === 'delivered' || p.status === 'closed')
  const totalSpendCents = params.purchaseOrders.reduce((sum, p) => sum + p.totalCents, 0)
  const linkedBOQLinesCount = params.requests.reduce((sum, r) => sum + r.linkedBOQLineIds.length, 0)

  return {
    totalRequests: params.requests.length,
    openRequests: openRequests.length,
    awardedRequests: awardedRequests.length,
    totalPurchaseOrders: params.purchaseOrders.length,
    deliveredPOs: deliveredPOs.length,
    totalSpendCents,
    linkedBOQLinesCount,
  }
}

export type HandoverLifecycleSummary = {
  completionStagesTotal: number
  completionStagesAchieved: number
  openSnagItems: number
  resolvedSnagItems: number
  packagesIssued: number
  packagesTotal: number
  assetsRegistered: number
  warrantiesActive: number
  isHandoverReady: boolean
}

export function computeHandoverLifecycleSummary(params: {
  completionStages: CompletionStage[]
  snagLists: SnagList[]
  handoverPackages: { status: string }[]
  assetRegister: unknown[]
  warrantyRecords: { status: string }[]
}): HandoverLifecycleSummary {
  const completionStagesAchieved = params.completionStages.filter((s) => s.status === 'achieved').length
  const allSnagItems = params.snagLists.flatMap((l) => l.snagItems)
  const openSnagItems = allSnagItems.filter((s) => s.status === 'open' || s.status === 'in-progress').length
  const packagesIssued = params.handoverPackages.filter((p) => p.status === 'issued' || p.status === 'acknowledged').length
  const warrantiesActive = params.warrantyRecords.filter((w) => w.status === 'active').length

  const allStagesAchieved = params.completionStages.length > 0 && completionStagesAchieved === params.completionStages.length
  const allSnagsResolved = openSnagItems === 0
  const isHandoverReady = allStagesAchieved && allSnagsResolved && packagesIssued > 0

  return {
    completionStagesTotal: params.completionStages.length,
    completionStagesAchieved,
    openSnagItems,
    resolvedSnagItems: allSnagItems.filter((s) => s.status === 'resolved' || s.status === 'verified').length,
    packagesIssued,
    packagesTotal: params.handoverPackages.length,
    assetsRegistered: params.assetRegister.length,
    warrantiesActive,
    isHandoverReady,
  }
}

export type ProjectHealthSummary = {
  health: 'on-track' | 'at-risk' | 'critical' | 'unknown'
  readinessState: ProjectReadiness['overallState']
  milestoneProgressPct: number
  openIssues: number
  budgetUtilizationPct: number
  scheduleVariance: number
  costVariance: number
}

export function computeProjectHealthSummary(params: {
  readiness: ProjectReadiness
  milestoneSummary: MilestoneLifecycleSummary
  controlsSnapshot: ProjectControlsSnapshot | null
  ncrs: NCR[]
  rfis: RFI[]
  snags: SnagItem[]
}): ProjectHealthSummary {
  const openIssues = params.ncrs.filter((n) => n.status === 'open' || n.status === 'in-progress').length +
    params.rfis.filter((r) => r.status === 'open').length +
    params.snags.filter((s) => s.status === 'open' || s.status === 'in-progress').length

  if (params.controlsSnapshot) {
    const criticalAlerts = params.controlsSnapshot.alertConditions.filter((a) => a.severity === 'critical').length
    const health: ProjectHealthSummary['health'] = criticalAlerts > 0 ? 'critical'
      : params.controlsSnapshot.alertConditions.filter((a) => a.severity === 'warning').length > 0 ? 'at-risk'
      : 'on-track'

    return {
      health,
      readinessState: params.readiness.overallState,
      milestoneProgressPct: params.milestoneSummary.overallProgressPct,
      openIssues,
      budgetUtilizationPct: params.controlsSnapshot.budgetUtilizationPct,
      scheduleVariance: params.controlsSnapshot.scheduleVariance,
      costVariance: params.controlsSnapshot.costVariance,
    }
  }

  let health: ProjectHealthSummary['health'] = 'unknown'
  if (params.readiness.overallState === 'rejected' || params.readiness.overallState === 'blocked') health = 'critical'
  else if (params.readiness.overallState === 'deferred') health = 'at-risk'
  else if (params.readiness.overallState === 'cleared') health = 'on-track'

  return {
    health,
    readinessState: params.readiness.overallState,
    milestoneProgressPct: params.milestoneSummary.overallProgressPct,
    openIssues,
    budgetUtilizationPct: 0,
    scheduleVariance: 0,
    costVariance: 0,
  }
}
