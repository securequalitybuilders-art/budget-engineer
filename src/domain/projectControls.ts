export interface ProjectControlsBaseline {
  id: string
  projectId: string
  plannedStartDate: string
  plannedEndDate: string
  totalPlannedCostCents: number
  totalPlannedDurationDays: number
  milestoneCount: number
  plannedProgress: PlannedProgressPoint[]
  updatedAt: string
}

export interface PlannedProgressPoint {
  date: string
  plannedProgressPct: number
  plannedCostCents: number
}

export interface ProjectControlsSnapshot {
  id: string
  projectId: string
  snapshotDate: string
  plannedProgressPct: number
  actualProgressPct: number
  plannedCostCents: number
  actualCostCents: number
  plannedDurationDays: number
  elapsedDays: number
  scheduleVariance: number
  costVariance: number
  schedulePerformanceIndex: number
  costPerformanceIndex: number
  milestoneStatuses: MilestoneStatusSummary[]
  issueCounts: IssueCountSummary
  delayFlags: DelayFlag[]
  budgetUtilizationPct: number
  alertConditions: AlertCondition[]
  createdAt: string
}

export interface MilestoneStatusSummary {
  milestoneId: string
  name: string
  plannedDate: string
  actualDate?: string
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'at-risk'
  progressPct: number
  delayDays?: number
}

export interface IssueCountSummary {
  openNCRs: number
  openSnags: number
  openRFIs: number
  openChangeOrders: number
  overdueInspections: number
}

export interface DelayFlag {
  id: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impactedMilestoneId?: string
  impactDays: number
  identifiedAt: string
  status: 'active' | 'resolved'
  resolution?: string
}

export interface AlertCondition {
  id: string
  type: 'schedule' | 'cost' | 'quality' | 'safety' | 'resource'
  severity: 'info' | 'warning' | 'critical'
  message: string
  triggeredAt: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export interface BurnDownData {
  date: string
  plannedWork: number
  actualWork: number
  plannedCost: number
  actualCost: number
}

export interface BurnUpData {
  date: string
  completedWork: number
  totalWork: number
  completedCost: number
  totalCost: number
}

export function computeScheduleVariance(actualProgressPct: number, plannedProgressPct: number): number {
  return actualProgressPct - plannedProgressPct
}

export function computeCostVariance(actualCostCents: number, plannedCostCents: number): number {
  return plannedCostCents - actualCostCents
}

export function computeSPI(actualProgressPct: number, plannedProgressPct: number): number {
  if (plannedProgressPct === 0) return 1
  return actualProgressPct / plannedProgressPct
}

export function computeCPI(actualCostCents: number, plannedCostCents: number): number {
  if (actualCostCents === 0) return 1
  return plannedCostCents / actualCostCents
}

export function computeBudgetUtilization(actualCostCents: number, totalBudgetCents: number): number {
  if (totalBudgetCents === 0) return 0
  return (actualCostCents / totalBudgetCents) * 100
}
