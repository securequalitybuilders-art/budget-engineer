import type { Milestone } from '@/domain/milestone'
import type { CompletionStage, SnagList, HandoverPackage } from '@/domain/handover'
import type { NCR } from '@/domain/change'

export type HandoverReadinessAssessment = {
  isReady: boolean
  overallScore: number
  readinessState: 'not-ready' | 'nearly-ready' | 'ready'
  blockers: HandoverBlocker[]
  stageCompletionPct: number
  snagClosurePct: number
  ncrClosurePct: number
  milestoneDeliveryPct: number
  packagesPrepared: number
}

export type HandoverBlocker = {
  category: 'stage' | 'snag' | 'ncr' | 'milestone' | 'package'
  description: string
  severity: 'blocking' | 'warning'
}

export function assessHandoverReadiness(params: {
  completionStages?: CompletionStage[]
  snagLists?: SnagList[]
  handoverPackages?: HandoverPackage[]
  milestones?: Milestone[]
  ncrs?: NCR[]
}): HandoverReadinessAssessment {
  const stages = params.completionStages ?? []
  const snags = params.snagLists ?? []
  const pkgs = params.handoverPackages ?? []
  const mstones = params.milestones ?? []
  const ncrList = params.ncrs ?? []
  const blockers: HandoverBlocker[] = []

  const stageTotal = stages.length
  const stageAchieved = stages.filter((s) => s.status === 'achieved').length
  const stageCompletionPct = stageTotal > 0 ? Math.round((stageAchieved / stageTotal) * 100) : 0
  if (stageTotal > 0 && stageCompletionPct < 100) {
    const incompleteStages = stages.filter((s) => s.status !== 'achieved').map((s) => s.stage)
    blockers.push({
      category: 'stage',
      description: `Incomplete completion stages: ${incompleteStages.join(', ')}`,
      severity: 'blocking',
    })
  }

  const allSnagItems = snags.flatMap((l) => l.snagItems)
  const openSnags = allSnagItems.filter((s) => s.status === 'open' || s.status === 'in-progress').length
  const resolvedSnags = allSnagItems.filter((s) => s.status === 'resolved' || s.status === 'verified').length
  const snagClosurePct = allSnagItems.length > 0 ? Math.round((resolvedSnags / allSnagItems.length) * 100) : 100
  if (openSnags > 0) {
    blockers.push({
      category: 'snag',
      description: `${openSnags} open snag item(s) not resolved`,
      severity: openSnags > 5 ? 'blocking' : 'warning',
    })
  }

  const openNCRs = ncrList.filter((n) => n.status !== 'verified' && n.status !== 'closed').length
  const totalNCRs = ncrList.length
  const closedNCRs = ncrList.filter((n) => n.status === 'verified' || n.status === 'closed').length
  const ncrClosurePct = totalNCRs > 0 ? Math.round((closedNCRs / totalNCRs) * 100) : 100
  if (openNCRs > 0) {
    blockers.push({
      category: 'ncr',
      description: `${openNCRs} open NCR(s) not closed`,
      severity: openNCRs > 3 ? 'blocking' : 'warning',
    })
  }

  const designMilestones = mstones.filter((m) => m.category === 'design' || m.category === 'procurement' || m.category === 'construction')
  const releasedMilestones = designMilestones.filter((m) => m.releaseState === 'released').length
  const milestoneDeliveryPct = designMilestones.length > 0 ? Math.round((releasedMilestones / designMilestones.length) * 100) : 0
  if (releasedMilestones < designMilestones.length) {
    blockers.push({
      category: 'milestone',
      description: `${designMilestones.length - releasedMilestones} upstream milestone(s) not released`,
      severity: 'warning',
    })
  }

  const packagesPrepared = pkgs.length
  if (packagesPrepared === 0) {
    blockers.push({
      category: 'package',
      description: 'No handover packages prepared',
      severity: 'blocking',
    })
  }

  const blockerCount = blockers.filter((b) => b.severity === 'blocking').length

  const overallScore = Math.round(
    (stageCompletionPct * 0.3 + snagClosurePct * 0.25 + ncrClosurePct * 0.2 + milestoneDeliveryPct * 0.15 + (packagesPrepared > 0 ? 100 : 0) * 0.1)
  )

  let readinessState: HandoverReadinessAssessment['readinessState'] = 'not-ready'
  if (blockerCount === 0 && overallScore >= 80) readinessState = 'ready'
  else if (blockerCount === 0 && overallScore >= 50) readinessState = 'nearly-ready'

  return {
    isReady: blockerCount === 0 && overallScore >= 80,
    overallScore,
    readinessState,
    blockers,
    stageCompletionPct,
    snagClosurePct,
    ncrClosurePct,
    milestoneDeliveryPct,
    packagesPrepared,
  }
}
