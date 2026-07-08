import { CadDocument } from '../domain/cad';
import { BimModel } from '../domain/bim';

export function generateBimModel(cad: CadDocument): BimModel {
  const elements: any[] = [];

  for (const w of cad.walls) {
    const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
    const area = len * w.height;
    const vol = area * w.thickness;
    elements.push({
      id: `bim-${w.id}`,
      cadId: w.id,
      type: 'wall',
      name: w.name,
      floorId: w.floorId,
      area,
      volume: vol,
      metadata: w.metadata
    });
  }

  for (const o of cad.openings) {
    const area = o.width * (o.headHeight || 2.1);
    elements.push({
      id: `bim-${o.id}`,
      cadId: o.id,
      type: 'opening',
      name: o.name,
      floorId: o.floorId,
      wallId: o.wallId,
      area,
      metadata: o.metadata
    });
  }

  for (const b of cad.blocks) {
    elements.push({
      id: `bim-${b.id}`,
      cadId: b.id,
      type: 'block',
      name: b.name,
      floorId: b.floorId,
      area: b.width * b.depth,
      metadata: b.metadata
    });
  }

  for (const f of cad.floors) {
    const fWalls = cad.walls.filter(w => w.floorId === f.id);
    if (fWalls.length === 0) continue; // Skip empty floors

    const xs = fWalls.flatMap(w => [w.start.x, w.end.x]);
    const ys = fWalls.flatMap(w => [w.start.y, w.end.y]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const envArea = Math.max(1, (maxX - minX) * (maxY - minY));

    elements.push({
      id: `bim-slab-${f.id}`,
      cadId: `slab-${f.id}`,
      type: 'slab',
      name: `Foundation Slab (${f.name})`,
      floorId: f.id,
      area: envArea,
      metadata: { ifcClass: 'IfcSlab', category: 'Concrete', properties: { thickness: 0.25 } }
    });
    elements.push({
      id: `bim-roof-${f.id}`,
      cadId: `roof-${f.id}`,
      type: 'roof',
      name: `Insulated Roof (${f.name})`,
      floorId: f.id,
      area: envArea,
      metadata: { ifcClass: 'IfcRoof', category: 'Insulated', properties: { pitch: 'Flat' } }
    });
    elements.push({
      id: `bim-zone-${f.id}`,
      cadId: `zone-${f.id}`,
      type: 'roomZone',
      name: `Spatial Zone (${f.name})`,
      floorId: f.id,
      area: envArea,
      program: f.id === 'floor-1' ? 'Lounge & Kitchen Studio' : 'Master Bedroom Suite',
      metadata: { ifcClass: 'IfcSpace', category: 'Zone', properties: { occupancy: 'Standard', mepEnabled: cad.mepEnabled === true } }
    });
  }

  return {
    id: `bim-${cad.projectId}`,
    projectId: cad.projectId,
    name: `${cad.name} (BIM)`,
    floors: cad.floors,
    elements
  };
}
