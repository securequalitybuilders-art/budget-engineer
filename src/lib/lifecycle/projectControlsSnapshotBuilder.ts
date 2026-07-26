import { db } from '@/db/db'
import type { Milestone } from '@/domain/milestone'
import type { NCR, RFI, SnagItem, ChangeOrder, SiteInspection } from '@/domain/change'
import { createProjectControlsSnapshot } from '@/engine/projectControls/projectControlsEngine'
import { calculateMilestoneProgress } from '@/engine/milestone/milestoneEngine'

export type SnapshotBuildInput = {
  projectId: string
  actualCostCents?: number
  elapsedDays?: number
}

export async function buildAndSaveCanonicalSnapshot(input: SnapshotBuildInput): Promise<{ snapshotId: string; error?: string }> {
  const baseline = await db.projectControlsBaselines.where({ projectId: input.projectId }).first()
  if (!baseline) return { snapshotId: '', error: 'No baseline found. Create a baseline first.' }

  const [milestones, ncrs, rfis, snags, changeOrders, inspections] = await Promise.all([
    db.milestones.where({ projectId: input.projectId }).toArray(),
    db.ncrs.where({ projectId: input.projectId }).toArray() as Promise<NCR[]>,
    db.rfis.where({ projectId: input.projectId }).toArray() as Promise<RFI[]>,
    db.snagItems.where({ projectId: input.projectId }).toArray() as Promise<SnagItem[]>,
    db.changeOrders.where({ projectId: input.projectId }).toArray() as Promise<ChangeOrder[]>,
    db.siteInspections.where({ projectId: input.projectId }).toArray() as Promise<SiteInspection[]>,
  ])

  const milestoneProgress = computeAggregateProgress(milestones)
  const actualCostCents = input.actualCostCents ?? computeActualCost(milestones, changeOrders)
  const totalPlannedDuration = baseline.totalPlannedDurationDays
  const startDate = new Date(baseline.plannedStartDate).getTime()
  const elapsedDays = input.elapsedDays ?? Math.max(0, Math.round((Date.now() - startDate) / (1000 * 60 * 60 * 24)))

  try {
    const snapshot = createProjectControlsSnapshot({
      projectId: input.projectId,
      baseline,
      milestones,
      ncrs,
      rfis,
      snags,
      changeOrders,
      inspections,
      actualCostCents,
      elapsedDays: Math.min(elapsedDays, totalPlannedDuration),
    })

    // Recompute progress from real milestone state instead of elapsed time
    snapshot.actualProgressPct = milestoneProgress.overallPct
    snapshot.milestoneStatuses = milestoneProgress.milestoneStatuses

    await db.projectControlsSnapshots.add(snapshot)
    return { snapshotId: snapshot.id }
  } catch (e) {
    return { snapshotId: '', error: (e as Error).message }
  }
}

function computeAggregateProgress(milestones: Milestone[]) {
  if (milestones.length === 0) return { overallPct: 0, milestoneStatuses: [] as { milestoneId: string; name: string; plannedDate: string; actualDate?: string; status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'at-risk'; progressPct: number; delayDays?: number }[] }

  const sorted = [...milestones].sort((a, b) => a.order - b.order)
  const now = new Date()

  const milestoneStatuses = sorted.map((m) => {
    const delay = m.completedAt ? null : now > new Date(m.plannedDate) ? Math.round((now.getTime() - new Date(m.plannedDate).getTime()) / (1000 * 60 * 60 * 24)) : null
    const progressPct = calculateMilestoneProgress(m)

    let status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'at-risk' = 'pending'
    if (m.completedAt || m.releaseState === 'released') status = 'completed'
    else if (m.releaseState === 'pending-review') status = 'in-progress'
    else if (delay !== null && delay > 14) status = 'overdue'
    else if (delay !== null && delay > 0) status = 'at-risk'

    return {
      milestoneId: m.id,
      name: m.name,
      plannedDate: m.plannedDate,
      actualDate: m.completedAt ?? undefined,
      status,
      progressPct,
      delayDays: delay ?? undefined,
    }
  })

  const completedCount = milestoneStatuses.filter((s) => s.status === 'completed').length
  const overallPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

  return { overallPct, milestoneStatuses }
}

function computeActualCost(milestones: Milestone[], changeOrders: ChangeOrder[]): number {
  const milestoneCosts = milestones.reduce((sum, m) => sum + (m.actualCostCents ?? 0), 0)
  const changeOrderCosts = changeOrders.filter((c) => c.status === 'approved' || c.status === 'implemented')
    .reduce((sum, c) => sum + c.costImpactCents, 0)
  return milestoneCosts + changeOrderCosts
}
