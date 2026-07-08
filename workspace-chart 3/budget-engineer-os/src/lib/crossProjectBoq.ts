import { db } from './db';
import { boqCategoryTotals } from './boqCategoryTotals';

export async function loadProjectBoqCategoryTotals(projectId?: string): Promise<Record<string, number>> {
  if (!projectId) return {};
  const boq = await db.boqs.get(`boq-${projectId}`);
  return boq ? boqCategoryTotals(boq) : {};
}
