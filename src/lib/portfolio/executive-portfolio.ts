import { db } from '../../db/db';
import type { Project } from '../../types';
import type { BOQ as Ws3Boq } from '../boq/boq-types';
import type { BimModel } from '../../domain/bim';

export interface SchemePortfolioItem {
  id: string;
  name: string;
  isArchived?: boolean;
  grandTotal: number;
  subtotal: number;
  wallsTotal: number;
  slabsTotal: number;
  roofTotal: number;
  openingsTotal: number;
  objectsTotal: number;
  zoneCount: number;
  wallCount: number;
  costPerZone: number;
}

export interface ExecutivePortfolioSummary {
  schemes: SchemePortfolioItem[];
  totalPortfolioValue: number;
  avgSchemeCost: number;
  activeCount: number;
  archivedCount: number;
  categoryDistribution: Record<string, number>;
}

export async function loadExecutivePortfolioMetrics(projects: Project[]): Promise<ExecutivePortfolioSummary> {
  const schemes: SchemePortfolioItem[] = [];
  let activeCount = 0;
  let archivedCount = 0;

  for (const p of projects) {
    const isArchived = p.isArchived ?? (p.status === 'draft');
    if (isArchived) archivedCount++;
    else activeCount++;

    let boq: Ws3Boq | null = null;
    let bim: BimModel | null = null;
    try {
      boq = (await db.boqs.get(`boq-${p.id}`)) as unknown as Ws3Boq | null;
      bim = (await db.bimModels.get(`bim-${p.id}`)) as BimModel | null;
    } catch { /* ignore */ }

    if (!bim || !boq) {
      continue;
    }

    let wallsTotal = 0, slabsTotal = 0, roofTotal = 0, openingsTotal = 0, objectsTotal = 0;
    for (const item of boq.items) {
      if (item.category === 'Walls') wallsTotal += item.total;
      else if (item.category === 'Slabs') slabsTotal += item.total;
      else if (item.category === 'Roof') roofTotal += item.total;
      else if (item.category === 'Openings') openingsTotal += item.total;
      else if (item.category === 'Objects') objectsTotal += item.total;
    }

    const zoneCount = Math.max(1, bim.elements.filter(e => e.type === 'roomZone').length);
    const wallCount = bim.elements.filter(e => e.type === 'wall').length;

    schemes.push({
      id: p.id,
      name: p.name,
      isArchived: p.isArchived ?? (p.status === 'draft'),
      grandTotal: boq.summary.grandTotal,
      subtotal: boq.summary.subtotal,
      wallsTotal,
      slabsTotal,
      roofTotal,
      openingsTotal,
      objectsTotal,
      zoneCount,
      wallCount,
      costPerZone: boq.summary.grandTotal / zoneCount
    });
  }

  const activeSchemes = schemes.filter(s => !s.isArchived);
  const totalPortfolioValue = activeSchemes.reduce((acc, s) => acc + s.grandTotal, 0);
  const avgSchemeCost = activeSchemes.length > 0 ? totalPortfolioValue / activeSchemes.length : 0;

  const catDist: Record<string, number> = { Walls: 0, Slabs: 0, Roof: 0, Openings: 0, Objects: 0 };
  for (const s of activeSchemes) {
    catDist.Walls += s.wallsTotal;
    catDist.Slabs += s.slabsTotal;
    catDist.Roof += s.roofTotal;
    catDist.Openings += s.openingsTotal;
    catDist.Objects += s.objectsTotal;
  }

  return {
    schemes,
    totalPortfolioValue,
    avgSchemeCost,
    activeCount,
    archivedCount,
    categoryDistribution: catDist
  };
}
