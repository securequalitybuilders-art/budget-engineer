import { db } from '@/db/db'
import type { ProjectControlsBaseline, ProjectControlsSnapshot } from '@/domain/projectControls'
import { createProjectControlsBaseline, createProjectControlsSnapshot, getProjectHealth } from '@/engine/projectControls/projectControlsEngine'
import type { Milestone } from '@/domain/milestone'
import type { NCR, RFI, SnagItem, ChangeOrder, SiteInspection } from '@/domain/change'

export async function saveBaseline(baseline: ProjectControlsBaseline): Promise<void> {
  await db.projectControlsBaselines.put(baseline)
}

export async function getBaseline(projectId: string): Promise<ProjectControlsBaseline | undefined> {
  return db.projectControlsBaselines.where({ projectId }).first()
}

export async function createAndSaveBaseline(input: Parameters<typeof createProjectControlsBaseline>[0]): Promise<ProjectControlsBaseline> {
  const baseline = createProjectControlsBaseline(input)
  const persisted: ProjectControlsBaseline = { ...baseline, id: crypto.randomUUID() }
  await db.projectControlsBaselines.put(persisted)
  return persisted
}

export async function saveSnapshot(snapshot: ProjectControlsSnapshot): Promise<void> {
  await db.projectControlsSnapshots.put(snapshot)
}

export async function getSnapshots(projectId: string): Promise<ProjectControlsSnapshot[]> {
  return db.projectControlsSnapshots.where({ projectId }).toArray()
}

export async function getLatestSnapshot(projectId: string): Promise<ProjectControlsSnapshot | undefined> {
  const snapshots = await getSnapshots(projectId)
  snapshots.sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())
  return snapshots[0]
}

export async function createAndSaveSnapshot(input: {
  projectId: string
  milestones: Milestone[]
  ncrs: NCR[]
  rfis: RFI[]
  snags: SnagItem[]
  changeOrders: ChangeOrder[]
  inspections: SiteInspection[]
  actualCostCents: number
  elapsedDays: number
}): Promise<ProjectControlsSnapshot> {
  const baseline = await getBaseline(input.projectId)
  if (!baseline) throw new Error('No project controls baseline found. Create a baseline first.')

  const snapshot = createProjectControlsSnapshot({
    ...input,
    baseline,
  })
  await db.projectControlsSnapshots.add(snapshot)
  return snapshot
}

export async function getProjectHealthStatus(projectId: string): Promise<'on-track' | 'at-risk' | 'critical' | 'unknown'> {
  const snapshot = await getLatestSnapshot(projectId)
  if (!snapshot) return 'unknown'
  return getProjectHealth(snapshot)
}
