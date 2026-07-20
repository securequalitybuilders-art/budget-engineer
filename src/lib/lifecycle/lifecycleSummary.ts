import type { ProjectIntake, FeasibilityAssessment, RiskGate, RiskRegisterEntry, GoNoGoDecision, SolvencyCheck } from '@/domain/assurance'
import type { Milestone } from '@/domain/milestone'
import type { NCR, RFI, SnagItem } from '@/domain/change'
import type { CompletionStage, SnagList } from '@/domain/handover'
import type { ProcurementRequest } from '@/domain/procurement'
import type { ProjectControlsSnapshot } from '@/domain/projectControls'

export type ModuleDependency = {
  fromModule: string
  toModule: string
  status: 'clear' | 'blocked' | 'warning' | 'unknown'
  reason: string
  actionLabel?: string
  actionTo?: string
}

export type ProjectLifecycleSummary = {
  health: ProjectHealthSummary
  readiness: ProjectReadiness
  milestones: MilestoneLifecycleSummary
  procurement: ProcurementLifecycleSummary
  handover: HandoverLifecycleSummary
  dependencies: ModuleDependency[]
  nextActions: { module: string; action: string; priority: 'high' | 'medium' | 'low'; actionTo?: string }[]
}

export function computeBlockingDependencies(params: {
  readiness: ProjectReadiness
  milestoneSummary: MilestoneLifecycleSummary
  procurementSummary: ProcurementLifecycleSummary
  handoverSummary: HandoverLifecycleSummary
  solvencyChecks: SolvencyCheck[]
  projectId?: string
}): ModuleDependency[] {
  const deps: ModuleDependency[] = []
  const pid = params.projectId ?? ''

  // Assurance → Delivery
  if (params.readiness.overallState === 'blocked' || params.readiness.overallState === 'rejected') {
    deps.push({ fromModule: 'assurance', toModule: 'delivery', status: 'blocked', reason: 'Assurance gates not cleared — delivery cannot proceed', actionLabel: 'Review gates', actionTo: pid ? `/project/${pid}/studio/assurance` : undefined })
  } else if (params.readiness.overallState === 'not-started') {
    deps.push({ fromModule: 'assurance', toModule: 'delivery', status: 'blocked', reason: 'Assurance not yet started — complete intake first', actionLabel: 'Start assurance', actionTo: pid ? `/project/${pid}/studio/assurance` : undefined })
  } else if (params.readiness.overallState === 'in-feasibility') {
    deps.push({ fromModule: 'assurance', toModule: 'delivery', status: 'warning', reason: 'Assurance in feasibility review — awaiting decision' })
  } else {
    deps.push({ fromModule: 'assurance', toModule: 'delivery', status: 'clear', reason: 'Assurance cleared — delivery may proceed' })
  }

  // Delivery → Procurement
  if (params.milestoneSummary.total === 0) {
    deps.push({ fromModule: 'delivery', toModule: 'procurement', status: 'warning', reason: 'No milestones defined — procurement may lack delivery context', actionLabel: 'View milestones', actionTo: pid ? `/project/${pid}/studio/delivery` : undefined })
  } else {
    deps.push({ fromModule: 'delivery', toModule: 'procurement', status: 'clear', reason: 'Milestones defined — procurement has delivery context' })
  }

  // Assurance → Procurement (solvency)
  const hasSolvencyIssues = params.solvencyChecks.length > 0 && params.solvencyChecks.some(c => !c.isSolvent)
  if (hasSolvencyIssues) {
    deps.push({ fromModule: 'assurance', toModule: 'procurement', status: 'blocked', reason: 'Solvency checks pending or failing — procurement cannot award', actionLabel: 'Check solvency', actionTo: pid ? `/project/${pid}/studio/assurance` : undefined })
  } else if (params.solvencyChecks.length === 0) {
    deps.push({ fromModule: 'assurance', toModule: 'procurement', status: 'warning', reason: 'No solvency checks run — verify before awarding', actionLabel: 'Run checks', actionTo: pid ? `/project/${pid}/studio/assurance` : undefined })
  } else {
    deps.push({ fromModule: 'assurance', toModule: 'procurement', status: 'clear', reason: 'Solvency checks passed' })
  }

  // Delivery → Handover
  if (params.milestoneSummary.released === 0) {
    deps.push({ fromModule: 'delivery', toModule: 'handover', status: 'blocked', reason: 'No milestones released — handover cannot begin', actionLabel: 'View milestones', actionTo: pid ? `/project/${pid}/studio/delivery` : undefined })
  } else {
    deps.push({ fromModule: 'delivery', toModule: 'handover', status: 'clear', reason: `${params.milestoneSummary.released} milestone(s) released — handover context available` })
  }

  // Handover → Closeout (project controls)
  if (params.handoverSummary.completionStagesTotal > 0 && params.handoverSummary.isHandoverReady) {
    deps.push({ fromModule: 'handover', toModule: 'project-controls', status: 'clear', reason: 'Handover ready — finalize project controls for closeout' })
  } else if (params.handoverSummary.completionStagesTotal > 0) {
    deps.push({ fromModule: 'handover', toModule: 'project-controls', status: 'warning', reason: 'Handover in progress — continue resolving open items', actionLabel: 'View handover', actionTo: pid ? `/project/${pid}/studio/handover` : undefined })
  } else {
    deps.push({ fromModule: 'handover', toModule: 'project-controls', status: 'unknown', reason: 'Handover not yet started' })
  }

  // Procurement → Delivery
  if (params.procurementSummary.totalPurchaseOrders > 0 && params.procurementSummary.deliveredPOs < params.procurementSummary.totalPurchaseOrders) {
    deps.push({ fromModule: 'procurement', toModule: 'delivery', status: 'warning', reason: `${params.procurementSummary.totalPurchaseOrders - params.procurementSummary.deliveredPOs} PO(s) not yet delivered — may affect delivery schedule`, actionLabel: 'View procurement', actionTo: pid ? `/project/${pid}/studio/procurement` : undefined })
  } else if (params.procurementSummary.totalPurchaseOrders > 0) {
    deps.push({ fromModule: 'procurement', toModule: 'delivery', status: 'clear', reason: 'All POs delivered — procurement supports delivery' })
  }

  return deps
}

export function computeNextActions(params: {
  readiness: ProjectReadiness
  milestoneSummary: MilestoneLifecycleSummary
  procurementSummary: ProcurementLifecycleSummary
  handoverSummary: HandoverLifecycleSummary
  dependencies: ModuleDependency[]
  projectId?: string
}): { module: string; action: string; priority: 'high' | 'medium' | 'low'; actionTo?: string }[] {
  const actions: { module: string; action: string; priority: 'high' | 'medium' | 'low'; actionTo?: string }[] = []
  const pid = params.projectId ?? ''

  // Blocked dependencies → high priority
  for (const dep of params.dependencies) {
    if (dep.status === 'blocked') {
      actions.push({ module: dep.fromModule, action: dep.reason, priority: 'high', actionTo: dep.actionTo })
    }
  }

  // Warning dependencies → medium priority
  for (const dep of params.dependencies) {
    if (dep.status === 'warning' && !actions.some(a => a.action === dep.reason)) {
      actions.push({ module: dep.fromModule, action: dep.reason, priority: 'medium', actionTo: dep.actionTo })
    }
  }

  // Assurance not started
  if (params.readiness.overallState === 'not-started') {
    actions.push({ module: 'assurance', action: 'Start project intake and feasibility assessment', priority: 'high', actionTo: pid ? `/project/${pid}/studio/assurance` : undefined })
  }

  // No milestones
  if (params.milestoneSummary.total === 0) {
    actions.push({ module: 'delivery', action: 'Define project milestones to track delivery progress', priority: 'high', actionTo: pid ? `/project/${pid}/studio/delivery` : undefined })
  }

  // Procurement has open requests
  if (params.procurementSummary.openRequests > 0) {
    actions.push({ module: 'procurement', action: `${params.procurementSummary.openRequests} open procurement request(s) — review and award`, priority: 'medium', actionTo: pid ? `/project/${pid}/studio/procurement` : undefined })
  }

  // Handover readiness
  if (params.handoverSummary.completionStagesTotal > 0 && !params.handoverSummary.isHandoverReady) {
    actions.push({ module: 'handover', action: `Handover not ready (${params.handoverSummary.openSnagItems} open snag(s), ${params.handoverSummary.completionStagesTotal - params.handoverSummary.completionStagesAchieved} incomplete stage(s))`, priority: 'medium', actionTo: pid ? `/project/${pid}/studio/handover` : undefined })
  }

  // Project controls snapshot
  if (params.milestoneSummary.total > 0) {
    actions.push({ module: 'project-controls', action: 'Take a project controls snapshot to track EVM and health', priority: 'low', actionTo: pid ? `/project/${pid}/studio/project-controls` : undefined })
  }

  // Handover ready → closeout
  if (params.handoverSummary.isHandoverReady) {
    actions.push({ module: 'handover', action: 'Handover ready — issue packages and complete closeout', priority: 'high', actionTo: pid ? `/project/${pid}/studio/handover` : undefined })
  }

  return actions
}

export function computeProjectLifecycleSummary(params: {
  readiness: ProjectReadiness
  milestoneSummary: MilestoneLifecycleSummary
  procurementSummary: ProcurementLifecycleSummary
  handoverSummary: HandoverLifecycleSummary
  health: ProjectHealthSummary
  solvencyChecks?: SolvencyCheck[]
  projectId?: string
}): ProjectLifecycleSummary {
  const solvency = params.solvencyChecks ?? []
  const dependencies = computeBlockingDependencies({
    readiness: params.readiness,
    milestoneSummary: params.milestoneSummary,
    procurementSummary: params.procurementSummary,
    handoverSummary: params.handoverSummary,
    solvencyChecks: solvency,
    projectId: params.projectId,
  })
  const nextActions = computeNextActions({
    readiness: params.readiness,
    milestoneSummary: params.milestoneSummary,
    procurementSummary: params.procurementSummary,
    handoverSummary: params.handoverSummary,
    dependencies,
    projectId: params.projectId,
  })
  return {
    health: params.health,
    readiness: params.readiness,
    milestones: params.milestoneSummary,
    procurement: params.procurementSummary,
    handover: params.handoverSummary,
    dependencies,
    nextActions,
  }
}

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
