import { db } from './db';

export async function loadProjectPortfolioWithLive(projectId: string, currentBim?: any, currentBoq?: any) {
  const snaps = await db.snapshots.where('projectId').equals(projectId).sortBy('timestamp');
  const items = snaps.map(s => ({
    id: s.id,
    name: s.name,
    timestamp: s.timestamp,
    grandTotal: s.boq.summary.grandTotal,
    subtotal: s.boq.summary.subtotal,
    zoneCount: s.bimModel.elements.filter((e: any) => e.type === 'roomZone').length,
    wallCount: s.cadDoc.walls.length
  }));

  if (currentBoq && currentBim && currentBoq.projectId === projectId) {
    items.push({
      id: 'live-' + projectId,
      name: 'Live working state',
      timestamp: Date.now(),
      grandTotal: currentBoq.summary.grandTotal,
      subtotal: currentBoq.summary.subtotal,
      zoneCount: currentBim.elements.filter((e: any) => e.type === 'roomZone').length,
      wallCount: currentBim.elements.filter((e: any) => e.type === 'wall').length
    });
  }

  return items;
}
