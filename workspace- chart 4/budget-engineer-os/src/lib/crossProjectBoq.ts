import { db } from './db';

export async function loadProjectBoqCategoryTotals(projectId?: string): Promise<Record<string, number>> {
  if (!projectId) return {};
  const boq = await db.boqs.get(`boq-${projectId}`);
  if (!boq) return {};
  const res: Record<string, number> = { Walls: 0, Slabs: 0, Roof: 0, Openings: 0, Objects: 0 };
  for (const item of boq.items) {
    if (res[item.category] !== undefined) {
      res[item.category] += item.total;
    }
  }
  return res;
}
