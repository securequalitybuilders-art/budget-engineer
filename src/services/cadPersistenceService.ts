import { db } from '@/db/db'
import type { PlanModel } from '@/domain/plan'

function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return fn() } catch { return Promise.resolve(fallback) }
}

export async function savePlanModel(projectId: string, designId: string, plan: PlanModel): Promise<void> {
  if (!projectId || !designId || !plan) return
  await safeAsync(async () => {
    await db.planModels.put({
      ...plan,
      id: `plan-${projectId}-${designId}`,
      projectId,
      designId,
      savedAt: new Date().toISOString(),
    })
  }, undefined)
}

export async function loadPlanModel(projectId: string, designId: string): Promise<PlanModel | null> {
  if (!projectId || !designId) return null
  try {
    const stored = await db.planModels.get(`plan-${projectId}-${designId}`)
    if (!stored) return null
    const { projectId: _p, designId: _d, savedAt: _s, ...plan } = stored
    return plan as PlanModel
  } catch {
    return null
  }
}

export async function hasSavedPlan(projectId: string, designId: string): Promise<boolean> {
  if (!projectId || !designId) return false
  try {
    const count = await db.planModels.where({ projectId, designId }).count()
    return count > 0
  } catch {
    return false
  }
}

export async function deletePlanModel(projectId: string, designId: string): Promise<void> {
  if (!projectId || !designId) return
  await safeAsync(async () => {
    await db.planModels.delete(`plan-${projectId}-${designId}`)
  }, undefined)
}
