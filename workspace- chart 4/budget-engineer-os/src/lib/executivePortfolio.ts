import { db } from './db';
import { ProjectRecord } from '../domain/project';
import { getSeedCadDocument } from './cadSeed';
import { generateBimModel } from '../engine/bimGenerator';
import { generateBoqFromBim } from '../engine/boqGenerator';

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

export async function loadExecutivePortfolioMetrics(projects: ProjectRecord[]): Promise<ExecutivePortfolioSummary> {
  const schemes: SchemePortfolioItem[] = [];
  let activeCount = 0;
  let archivedCount = 0;

  for (const p of projects) {
    if (p.isArchived) archivedCount++;
    else activeCount++;

    let boq: any = null;
    let bim: any = null;
    try {
      boq = await db.boqs.get(`boq-${p.id}`);
      bim = await db.bimModels.get(`bim-${p.id}`);
    } catch {}

    if (!boq) boq = generateBoqFromBim(generateBimModel(getSeedCadDocument(p.id)), p.name);
    if (!bim) bim = generateBimModel(getSeedCadDocument(p.id));

    let wallsTotal = 0, slabsTotal = 0, roofTotal = 0, openingsTotal = 0, objectsTotal = 0;
    for (const item of boq.items) {
      if (item.category === 'Walls') wallsTotal += item.total;
      else if (item.category === 'Slabs') slabsTotal += item.total;
      else if (item.category === 'Roof') roofTotal += item.total;
      else if (item.category === 'Openings') openingsTotal += item.total;
      else if (item.category === 'Objects') objectsTotal += item.total;
    }

    const zoneCount = Math.max(1, bim.elements.filter((e: any) => e.type === 'roomZone').length);
    const wallCount = bim.elements.filter((e: any) => e.type === 'wall').length;

    schemes.push({
      id: p.id,
      name: p.name,
      isArchived: p.isArchived,
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
