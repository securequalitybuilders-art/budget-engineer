import type { ConstructionPhase } from '@/domain/construction'
import type { Milestone, ProofArtifact } from '@/domain/milestone'
import type { EscrowAgreement, EscrowMilestone, VerificationProof } from '@/domain/marketplace'
import {
  createMilestone,
  calculateMilestoneProgress,
} from '@/engine/milestone/milestoneEngine'
import type { Task } from '@/components/execution/GanttChart'
import type { BudgetCategory } from '@/components/execution/BudgetVsActual'

export interface SeedMilestonesOptions {
  projectId: string
  phases: ConstructionPhase[]
  totalBudgetCents: number
  startDate?: string
}

export function totalDaysForPhases(phases: ConstructionPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.estimatedDays, 0)
}

export function seedMilestonesFromPhases({
  projectId,
  phases,
  totalBudgetCents,
  startDate,
}: SeedMilestonesOptions): Milestone[] {
  const totalDays = totalDaysForPhases(phases)
  if (totalDays === 0 || phases.length === 0) return []

  const start = startDate ?? new Date().toISOString().split('T')[0]
  const startMs = new Date(start).getTime()
  let dayCursor = 0

  return phases.map((phase, order) => {
    const plannedDate = new Date(startMs + dayCursor * 86400000).toISOString().split('T')[0]
    const plannedCostCents = Math.round(totalBudgetCents * (phase.estimatedDays / totalDays))
    const milestone = createMilestone({
      projectId,
      name: phase.title,
      description: phase.description,
      plannedDate,
      plannedCostCents,
      weight: phase.estimatedDays,
      order,
      category: 'construction',
      isCritical: order === 0,
    })
    dayCursor += phase.estimatedDays
    return milestone
  })
}

function milestoneToTaskStatus(milestone: Milestone): Task['status'] {
  switch (milestone.releaseState) {
    case 'released':
      return 'completed'
    case 'pending-review':
      return 'in-progress'
    case 'held':
    case 'rejected':
      return milestone.delayDays ? 'delayed' : 'in-progress'
    default:
      return milestone.delayDays ? 'delayed' : 'pending'
  }
}

export function milestonesToGanttTasks(
  milestones: Milestone[],
  phases: ConstructionPhase[]
): Task[] {
  const phaseByOrder = new Map<number, ConstructionPhase>(phases.map((phase, order) => [order, phase]))
  let dayCursor = 0

  return milestones.map((milestone) => {
    const phase = phaseByOrder.get(milestone.order)
    const duration = phase?.estimatedDays ?? 5
    const task: Task = {
      id: milestone.id,
      name: milestone.name,
      startOffset: dayCursor,
      duration,
      progress: calculateMilestoneProgress(milestone),
      status: milestoneToTaskStatus(milestone),
    }
    dayCursor += duration
    return task
  })
}

export function milestonesToBudgetCategories(milestones: Milestone[]): BudgetCategory[] {
  return milestones.map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
    budgeted: Math.round(milestone.plannedCostCents / 100),
    actual: milestone.actualCostCents !== undefined ? Math.round(milestone.actualCostCents / 100) : 0,
  }))
}

function proofArtifactToVerificationProof(artifact: ProofArtifact): VerificationProof {
  const typeMap: Record<string, VerificationProof['type']> = {
    photo: 'photo',
    document: 'document',
    'inspection-report': 'inspection_report',
    certificate: 'document',
    video: 'video',
    note: 'document',
    other: 'document',
  }
  return {
    id: artifact.id,
    milestoneId: artifact.milestoneId,
    type: typeMap[artifact.type] ?? 'document',
    url: artifact.fileRef ?? '#proof',
    uploadedBy: artifact.capturedBy,
    uploadedAt: artifact.createdAt,
    notes: artifact.description,
    geotagged: artifact.geotag,
  }
}

export interface EscrowDerivationOptions {
  clientId?: string
  providerId?: string
  contractReference?: string
}

export function deriveEscrowFromMilestones(
  projectId: string,
  milestones: Milestone[],
  options: EscrowDerivationOptions = {}
): EscrowAgreement {
  const rawTotal = milestones.reduce((sum, m) => sum + m.plannedCostCents / 100, 0)
  const totalAmount = Math.round(rawTotal)

  const escrowMilestones: EscrowMilestone[] = milestones.map((milestone) => ({
    id: milestone.id,
    escrowId: `escrow-${projectId}`,
    title: milestone.name,
    description: milestone.description,
    amount: Math.round(milestone.plannedCostCents / 100),
    dueDate: milestone.plannedDate,
    status: milestone.releaseState === 'released' ? 'released' : 'pending',
    verificationProof: milestone.proofArtifacts.map(proofArtifactToVerificationProof),
    completedAt: milestone.completedAt,
    releasedAt: milestone.releaseState === 'released' ? milestone.updatedAt : undefined,
  }))

  const amountSum = escrowMilestones.reduce((sum, m) => sum + m.amount, 0)
  if (escrowMilestones.length > 0 && amountSum !== totalAmount) {
    const last = escrowMilestones[escrowMilestones.length - 1]
    last.amount += totalAmount - amountSum
  }

  const allReleased = escrowMilestones.length > 0 && escrowMilestones.every((m) => m.status === 'released')

  return {
    id: `escrow-${projectId}`,
    projectId,
    providerId: options.providerId ?? 'provider-1',
    clientId: options.clientId ?? projectId,
    contractReference: options.contractReference ?? `CT-${projectId.slice(0, 8).toUpperCase()}`,
    totalAmount,
    currency: 'USD',
    terms: 'Milestone-based release verified from execution milestones',
    status: allReleased ? 'released' : 'locked',
    createdAt: milestones[0]?.createdAt ?? new Date().toISOString(),
    updatedAt: milestones.reduce(
      (latest, m) => (m.updatedAt > latest ? m.updatedAt : latest),
      milestones[0]?.updatedAt ?? new Date().toISOString()
    ),
    completedAt: allReleased ? milestones[milestones.length - 1]?.completedAt : undefined,
    milestones: escrowMilestones,
  }
}
