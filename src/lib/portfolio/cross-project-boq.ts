import type { BOQ as Ws3Boq } from '../boq/boq-types';
import { db } from '../../db/db';
import { boqCategoryTotals } from '../boq/boq-category-totals';

export async function loadProjectBoqCategoryTotals(projectId?: string): Promise<Record<string, number>> {
  if (!projectId) return {};
  const boq = await db.boqs?.get(`boq-${projectId}`) as Ws3Boq | undefined;
  return boq ? boqCategoryTotals(boq) : {};
}
