import type {
  ProjectControlsBaseline,
  ProjectControlsSnapshot,
  MilestoneStatusSummary,
  IssueCountSummary,
  DelayFlag,
  AlertCondition,
  BurnDownData,
  BurnUpData,
  PlannedProgressPoint,
} from '@/domain/projectControls'
import type { Milestone } from '@/domain/milestone'
import type { NCR, RFI, SnagItem, ChangeOrder, SiteInspection } from '@/domain/change'
import {
  computeScheduleVariance,
  computeCostVariance,
  computeSPI,
  computeCPI,
  computeBudgetUtilization,
} from '@/domain/projectControls'

export function createProjectControlsBaseline(input: {
  projectId: string
  plannedStartDate: string
  plannedEndDate: string
  totalPlannedCostCents: number
  milestones: Milestone[]
}): ProjectControlsBaseline {
  const start = new Date(input.plannedStartDate)
  const end = new Date(input.plannedEndDate)
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

  const id = crypto.randomUUID()
  const plannedProgress: PlannedProgressPoint[] = input.milestones
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const daysFromStart = Math.max(0, Math.round((new Date(m.plannedDate).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      const progressPct = totalDays > 0 ? Math.min(100, Math.round((daysFromStart / totalDays) * 100)) : 0
      return {
        date: m.plannedDate,
        plannedProgressPct: progressPct,
        plannedCostCents: m.plannedCostCents,
      }
    })

  return {
    id,
    projectId: input.projectId,
    plannedStartDate: input.plannedStartDate,
    plannedEndDate: input.plannedEndDate,
    totalPlannedCostCents: input.totalPlannedCostCents,
    totalPlannedDurationDays: totalDays,
    milestoneCount: input.milestones.length,
    plannedProgress,
    updatedAt: new Date().toISOString(),
  }
}

export function createProjectControlsSnapshot(input: {
  projectId: string
  baseline: ProjectControlsBaseline
  milestones: Milestone[]
  ncrs: NCR[]
  rfis: RFI[]
  snags: SnagItem[]
  changeOrders: ChangeOrder[]
  inspections: SiteInspection[]
  actualCostCents: number
  elapsedDays: number
}): ProjectControlsSnapshot {
  const plannedCostCents = input.baseline.totalPlannedCostCents
  const totalDuration = input.baseline.totalPlannedDurationDays
  const plannedProgressPct = totalDuration > 0
    ? Math.min(100, Math.round((input.elapsedDays / totalDuration) * 100))
    : 0

  const completedMilestones = input.milestones.filter((m) => m.completedAt).length
  const actualProgressPct = input.milestones.length > 0
    ? Math.round((completedMilestones / input.milestones.length) * 100)
    : 0

  const milestoneStatuses: MilestoneStatusSummary[] = input.milestones.map((m) => {
    const delay = m.completedAt
      ? null
      : new Date() > new Date(m.plannedDate)
        ? Math.round((new Date().getTime() - new Date(m.plannedDate).getTime()) / (1000 * 60 * 60 * 24))
        : null

    let status: MilestoneStatusSummary['status'] = 'pending'
    if (m.completedAt) status = 'completed'
    else if (delay !== null && delay > 14) status = 'overdue'
    else if (delay !== null && delay > 0) status = 'at-risk'
    else if (m.releaseState === 'released') status = 'completed'
    else if (m.releaseState !== 'locked') status = 'in-progress'

    return {
      milestoneId: m.id,
      name: m.name,
      plannedDate: m.plannedDate,
      actualDate: m.completedAt,
      status,
      progressPct: m.completedAt ? 100 : 0,
      delayDays: delay ?? undefined,
    }
  })

  const issueCounts: IssueCountSummary = {
    openNCRs: input.ncrs.filter((n) => n.status === 'open' || n.status === 'in-progress').length,
    openSnags: input.snags.filter((s) => s.status === 'open' || s.status === 'in-progress').length,
    openRFIs: input.rfis.filter((r) => r.status === 'open').length,
    openChangeOrders: input.changeOrders.filter((c) => c.status === 'draft' || c.status === 'pending-review').length,
    overdueInspections: input.inspections.filter((i) => i.status === 'overdue').length,
  }

  const delayFlags: DelayFlag[] = milestoneStatuses
    .filter((m) => m.delayDays !== undefined && m.delayDays > 0)
    .map((m) => ({
      id: crypto.randomUUID(),
      description: `Milestone "${m.name}" is delayed by ${m.delayDays} days`,
      severity: (m.delayDays || 0) > 30 ? 'critical' : (m.delayDays || 0) > 14 ? 'high' : 'medium',
      impactedMilestoneId: m.milestoneId,
      impactDays: m.delayDays || 0,
      identifiedAt: new Date().toISOString(),
      status: 'active',
    }))

  const budgetUtilizationPct = computeBudgetUtilization(
    input.actualCostCents,
    plannedCostCents > 0 ? plannedCostCents : 1
  )

  const scheduleVariance = computeScheduleVariance(actualProgressPct, plannedProgressPct)
  const costVariance = computeCostVariance(input.actualCostCents, plannedCostCents)
  const spi = computeSPI(actualProgressPct, plannedProgressPct)
  const cpi = computeCPI(input.actualCostCents, plannedCostCents)

  const alertConditions: AlertCondition[] = []
  if (scheduleVariance < -10) {
    alertConditions.push({
      id: crypto.randomUUID(),
      type: 'schedule',
      severity: 'warning',
      message: `Schedule variance is ${scheduleVariance.toFixed(1)}% — behind plan`,
      triggeredAt: new Date().toISOString(),
      acknowledged: false,
    })
  }
  if (costVariance < 0) {
    alertConditions.push({
      id: crypto.randomUUID(),
      type: 'cost',
      severity: Math.abs(costVariance) > 0.2 * plannedCostCents ? 'critical' : 'warning',
      message: `Cost overrun of ${Math.abs(Math.round(costVariance / 100))} in local currency`,
      triggeredAt: new Date().toISOString(),
      acknowledged: false,
    })
  }
  if (issueCounts.openNCRs > 5) {
    alertConditions.push({
      id: crypto.randomUUID(),
      type: 'quality',
      severity: 'warning',
      message: `${issueCounts.openNCRs} open NCRs — quality attention required`,
      triggeredAt: new Date().toISOString(),
      acknowledged: false,
    })
  }

  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    snapshotDate: new Date().toISOString(),
    plannedProgressPct,
    actualProgressPct,
    plannedCostCents,
    actualCostCents: input.actualCostCents,
    plannedDurationDays: totalDuration,
    elapsedDays: input.elapsedDays,
    scheduleVariance,
    costVariance,
    schedulePerformanceIndex: spi,
    costPerformanceIndex: cpi,
    milestoneStatuses,
    issueCounts,
    delayFlags,
    budgetUtilizationPct,
    alertConditions,
    createdAt: new Date().toISOString(),
  }
}

export function generateBurnDownData(
  baseline: ProjectControlsBaseline,
  snapshots: ProjectControlsSnapshot[]
): BurnDownData[] {
  const plannedByDate = new Map<string, { work: number; cost: number }>()
  for (const pp of baseline.plannedProgress) {
    plannedByDate.set(pp.date.slice(0, 10), { work: pp.plannedProgressPct, cost: pp.plannedCostCents })
  }

  return snapshots.map((s) => {
    const dateKey = s.snapshotDate.slice(0, 10)
    const planned = plannedByDate.get(dateKey) || { work: 0, cost: 0 }
    return {
      date: dateKey,
      plannedWork: planned.work,
      actualWork: s.actualProgressPct,
      plannedCost: planned.cost,
      actualCost: s.actualCostCents,
    }
  })
}

export function generateBurnUpData(
  baseline: ProjectControlsBaseline,
  snapshots: ProjectControlsSnapshot[]
): BurnUpData[] {
  return snapshots.map((s) => ({
    date: s.snapshotDate.slice(0, 10),
    completedWork: s.actualProgressPct,
    totalWork: 100,
    completedCost: s.actualCostCents,
    totalCost: baseline.totalPlannedCostCents,
  }))
}

export function getProjectHealth(snapshot: ProjectControlsSnapshot): 'on-track' | 'at-risk' | 'critical' {
  const criticalAlerts = snapshot.alertConditions.filter((a) => a.severity === 'critical').length
  const warningAlerts = snapshot.alertConditions.filter((a) => a.severity === 'warning').length
  const overdueMilestones = snapshot.milestoneStatuses.filter((m) => m.status === 'overdue').length

  if (criticalAlerts > 0 || overdueMilestones > 2) return 'critical'
  if (warningAlerts > 0 || snapshot.scheduleVariance < -5) return 'at-risk'
  return 'on-track'
}
