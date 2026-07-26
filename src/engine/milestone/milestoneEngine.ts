import type {
  Milestone,
  ProofArtifact,
  ReviewCheck,
  ReleaseCondition,
  ReleaseDecision,
  ReleaseState,
  ReviewDecision,
} from '@/domain/milestone'

export function createMilestone(input: {
  projectId: string
  name: string
  description: string
  plannedDate: string
  plannedCostCents: number
  weight: number
  order: number
  category: Milestone['category']
  isCritical: boolean
}): Milestone {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    plannedDate: input.plannedDate,
    plannedCostCents: input.plannedCostCents,
    linkedBOQSectionIds: [],
    linkedScheduleLineIds: [],
    requiredArtifacts: [],
    requiredReviewChecks: [],
    proofArtifacts: [],
    reviewChecks: [],
    releaseConditions: [],
    releaseState: 'locked',
    releaseDecisions: [],
    weight: input.weight,
    order: input.order,
    category: input.category,
    isCritical: input.isCritical,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: '',
  }
}

export function addProofArtifact(
  milestone: Milestone,
  artifact: Omit<ProofArtifact, 'id' | 'milestoneId' | 'createdAt'>
): Milestone {
  const newArtifact: ProofArtifact = {
    ...artifact,
    id: crypto.randomUUID(),
    milestoneId: milestone.id,
    createdAt: new Date().toISOString(),
  }
  return {
    ...milestone,
    proofArtifacts: [...milestone.proofArtifacts, newArtifact],
    updatedAt: new Date().toISOString(),
  }
}

export function addReviewCheck(
  milestone: Milestone,
  check: Omit<ReviewCheck, 'id' | 'milestoneId'>
): Milestone {
  const newCheck: ReviewCheck = {
    ...check,
    id: crypto.randomUUID(),
    milestoneId: milestone.id,
  }
  return {
    ...milestone,
    reviewChecks: [...milestone.reviewChecks, newCheck],
    updatedAt: new Date().toISOString(),
  }
}

export function addReleaseCondition(
  milestone: Milestone,
  condition: Omit<ReleaseCondition, 'id' | 'milestoneId'>
): Milestone {
  const newCondition: ReleaseCondition = {
    ...condition,
    id: crypto.randomUUID(),
    milestoneId: milestone.id,
  }
  return {
    ...milestone,
    releaseConditions: [...milestone.releaseConditions, newCondition],
    updatedAt: new Date().toISOString(),
  }
}

export function performReviewCheck(
  milestone: Milestone,
  checkId: string,
  decision: ReviewDecision,
  reason: string,
  _decidedBy: string,
  linkedIssueId?: string
): Milestone {
  return {
    ...milestone,
    reviewChecks: milestone.reviewChecks.map((c) =>
      c.id === checkId
        ? { ...c, decision, decisionReason: reason, decidedAt: new Date().toISOString(), linkedIssueId }
        : c
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function satisfyReleaseCondition(
  milestone: Milestone,
  conditionId: string,
  evidenceRef: string,
  verifiedBy: string
): Milestone {
  return {
    ...milestone,
    releaseConditions: milestone.releaseConditions.map((c) =>
      c.id === conditionId
        ? { ...c, met: true, evidenceRef, verifiedBy, verifiedAt: new Date().toISOString() }
        : c
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function computeReleaseState(milestone: Milestone): ReleaseState {
  const allReviewsPassed = milestone.reviewChecks.length === 0 ||
    milestone.reviewChecks.every((c) => c.decision === 'pass' || c.decision === 'conditional-pass')
  const allConditionsMet = milestone.releaseConditions.length === 0 ||
    milestone.releaseConditions.every((c) => c.met)
  const hasRequiredArtifacts = milestone.requiredArtifacts.length === 0 ||
    milestone.requiredArtifacts.every((t) =>
      milestone.proofArtifacts.some((a) => a.type === t)
    )

  if (!hasRequiredArtifacts) return 'held'
  if (!allReviewsPassed) return 'rejected'
  if (!allConditionsMet) return 'held'
  return 'released'
}

export function makeReleaseDecision(
  milestone: Milestone,
  decision: ReviewDecision,
  decidedBy: string,
  reason: string
): { milestone: Milestone; releaseState: ReleaseState } {
  const releaseDecision: ReleaseDecision = {
    id: crypto.randomUUID(),
    milestoneId: milestone.id,
    decision,
    decidedBy,
    decidedAt: new Date().toISOString(),
    reason,
    conditions: [],
    linkedDefectIds: [],
    linkedChangeOrderIds: [],
  }

  let newState: ReleaseState
  switch (decision) {
    case 'pass':
      newState = 'released'
      break
    case 'conditional-pass':
      newState = 'pending-review'
      break
    case 'fail':
      newState = 'rejected'
      break
    case 're-submit':
      newState = 'held'
      break
  }

  const updated: Milestone = {
    ...milestone,
    releaseState: newState,
    releaseDecisions: [...milestone.releaseDecisions, releaseDecision],
    completedAt: decision === 'pass' ? new Date().toISOString() : milestone.completedAt,
    updatedAt: new Date().toISOString(),
  }

  return { milestone: updated, releaseState: newState }
}

export function calculateMilestoneProgress(milestone: Milestone): number {
  const weights = {
    artifacts: 0.3,
    reviews: 0.4,
    conditions: 0.3,
  }

  const artifactScore = milestone.requiredArtifacts.length > 0
    ? milestone.requiredArtifacts.filter((t) =>
        milestone.proofArtifacts.some((a) => a.type === t)
      ).length / milestone.requiredArtifacts.length
    : 1

  const reviewScore = milestone.reviewChecks.length > 0
    ? milestone.reviewChecks.filter((c) => c.decision !== undefined).length / milestone.reviewChecks.length
    : 1

  const conditionScore = milestone.releaseConditions.length > 0
    ? milestone.releaseConditions.filter((c) => c.met).length / milestone.releaseConditions.length
    : 1

  return Math.round(
    (artifactScore * weights.artifacts + reviewScore * weights.reviews + conditionScore * weights.conditions) * 100
  )
}

export function detectMilestoneDelay(milestone: Milestone, asOfDate: string): number | null {
  if (milestone.completedAt) return null
  const planned = new Date(milestone.plannedDate).getTime()
  const asOf = new Date(asOfDate).getTime()
  if (asOf > planned) {
    return Math.round((asOf - planned) / (1000 * 60 * 60 * 24))
  }
  return null
}

export function getMilestoneStatus(milestone: Milestone, asOfDate: string): Milestone['releaseState'] {
  if (milestone.completedAt) return 'released'
  const delay = detectMilestoneDelay(milestone, asOfDate)
  if (delay !== null && delay > 0) return 'held'
  return milestone.releaseState
}
