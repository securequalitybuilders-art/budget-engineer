import { db } from '@/db/db'
import type { Milestone, ProofArtifact, ReviewCheck, ReviewDecision, ReleaseState } from '@/domain/milestone'
import {
  createMilestone,
  addProofArtifact,
  addReviewCheck,
  addReleaseCondition,
  performReviewCheck,
  satisfyReleaseCondition,
  makeReleaseDecision,
  calculateMilestoneProgress,
  detectMilestoneDelay,
} from '@/engine/milestone/milestoneEngine'

export async function saveMilestone(milestone: Milestone): Promise<void> {
  await db.milestones.put(milestone)
}

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  return db.milestones.where({ projectId }).toArray()
}

export async function getMilestone(id: string): Promise<Milestone | undefined> {
  return db.milestones.get(id)
}

export async function createAndSaveMilestone(input: Parameters<typeof createMilestone>[0]): Promise<Milestone> {
  const milestone = createMilestone(input)
  await db.milestones.add(milestone)
  return milestone
}

export async function addArtifactToMilestone(
  milestoneId: string,
  artifact: Omit<ProofArtifact, 'id' | 'milestoneId' | 'createdAt'>
): Promise<Milestone | null> {
  const milestone = await db.milestones.get(milestoneId)
  if (!milestone) return null
  const updated = addProofArtifact(milestone, artifact)
  await db.milestones.put(updated)
  return updated
}

export async function addCheckToMilestone(
  milestoneId: string,
  check: Omit<ReviewCheck, 'id' | 'milestoneId'>
): Promise<Milestone | null> {
  const milestone = await db.milestones.get(milestoneId)
  if (!milestone) return null
  const updated = addReviewCheck(milestone, check)
  await db.milestones.put(updated)
  return updated
}

export async function addConditionToMilestone(
  milestoneId: string,
  condition: { condition: string; met?: boolean }
): Promise<Milestone | null> {
  const milestone = await db.milestones.get(milestoneId)
  if (!milestone) return null
  const updated = addReleaseCondition(milestone, {
    condition: condition.condition,
    met: condition.met ?? false,
  })
  await db.milestones.put(updated)
  return updated
}

export async function reviewCheckOnMilestone(
  milestoneId: string,
  checkId: string,
  decision: ReviewDecision,
  reason: string,
  decidedBy: string,
  linkedIssueId?: string
): Promise<Milestone | null> {
  const milestone = await db.milestones.get(milestoneId)
  if (!milestone) return null
  const updated = performReviewCheck(milestone, checkId, decision, reason, decidedBy, linkedIssueId)
  await db.milestones.put(updated)
  return updated
}

export async function satisfyConditionOnMilestone(
  milestoneId: string,
  conditionId: string,
  evidenceRef: string,
  verifiedBy: string
): Promise<Milestone | null> {
  const milestone = await db.milestones.get(milestoneId)
  if (!milestone) return null
  const updated = satisfyReleaseCondition(milestone, conditionId, evidenceRef, verifiedBy)
  await db.milestones.put(updated)
  return updated
}

export async function releaseMilestone(
  milestoneId: string,
  decision: ReviewDecision,
  decidedBy: string,
  reason: string
): Promise<{ milestone: Milestone | null; releaseState: ReleaseState }> {
  const milestone = await db.milestones.get(milestoneId)
  if (!milestone) return { milestone: null, releaseState: 'locked' }
  const result = makeReleaseDecision(milestone, decision, decidedBy, reason)
  await db.milestones.put(result.milestone)
  return result
}

export async function getMilestoneProgress(projectId: string): Promise<number> {
  const milestones = await getMilestones(projectId)
  if (milestones.length === 0) return 0
  const progress = milestones.reduce((sum, m) => sum + calculateMilestoneProgress(m), 0)
  return Math.round(progress / milestones.length)
}

export async function getDelayedMilestones(projectId: string, asOfDate: string): Promise<{ milestone: Milestone; delayDays: number }[]> {
  const milestones = await getMilestones(projectId)
  const delayed: { milestone: Milestone; delayDays: number }[] = []
  for (const m of milestones) {
    const delay = detectMilestoneDelay(m, asOfDate)
    if (delay !== null) delayed.push({ milestone: m, delayDays: delay })
  }
  return delayed
}

export async function deleteMilestone(id: string): Promise<void> {
  await db.milestones.delete(id)
}
