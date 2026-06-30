import type { BimElement, BimModel } from '../../domain/bim';
import type { BOQ, BOQLineItem } from '../boq/boq-types';

export type ZoneTrace = {
  zoneId: string;
  zoneName: string;
  items: BOQLineItem[];
};

export function traceZoneToBoq(zone: Extract<BimElement, { type: 'roomZone' }>, bim: BimModel, boq: BOQ): ZoneTrace {
  const zoneMinX = zone.origin.x;
  const zoneMaxX = zone.origin.x + zone.width;
  const zoneMinZ = zone.origin.z;
  const zoneMaxZ = zone.origin.z + zone.depth;

  const relatedRefs = new Set<string>();

  for (const element of bim.elements) {
    if (element.floorId !== zone.floorId || !element.quantityRefs) continue;

    if (element.type === 'wall') {
      const cx = (element.start.x + element.end.x) / 2;
      const cz = (element.start.z + element.end.z) / 2;
      if (inside(cx, cz, zoneMinX, zoneMaxX, zoneMinZ, zoneMaxZ, 0.35)) {
        element.quantityRefs.forEach((ref) => relatedRefs.add(ref));
      }
    }

    if (element.type === 'opening') {
      if (inside(element.center.x, element.center.z, zoneMinX, zoneMaxX, zoneMinZ, zoneMaxZ, 0.5)) {
        element.quantityRefs.forEach((ref) => relatedRefs.add(ref));
      }
    }

    if (element.type === 'block') {
      if (inside(element.position.x, element.position.z, zoneMinX, zoneMaxX, zoneMinZ, zoneMaxZ, 0.25)) {
        element.quantityRefs.forEach((ref) => relatedRefs.add(ref));
      }
    }
  }

  const slabRefs = bim.elements.filter((e) => e.floorId === zone.floorId && (e.type === 'slab' || e.type === 'roof')).flatMap((e) => e.quantityRefs ?? []);
  slabRefs.forEach((ref) => relatedRefs.add(ref));

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    items: boq.items.filter((item) => relatedRefs.has(item.quantityRef)),
  };
}

function inside(x: number, z: number, minX: number, maxX: number, minZ: number, maxZ: number, tolerance: number) {
  return x >= minX - tolerance && x <= maxX + tolerance && z >= minZ - tolerance && z <= maxZ + tolerance;
}
