import type { CadDocument, CadWall } from '../domain/cad';
import type { BimModel, BimElement, BimWall, BimOpening, BimSlab, BimRoof, BimBlock } from '../domain/bim';
import { reconstructRoomZones } from '../lib/zoneReconstruction';

function wallToBim(cad: CadDocument, wall: CadWall, elevation: number): BimWall {
  return { id: `bim-${wall.id}`, projectId: cad.projectId, sourceCadId: wall.id, floorId: wall.floorId, name: wall.name, ifcClass: wall.metadata.ifcClass, material: wall.metadata.properties.structural ? 'reinforced masonry' : 'partition board', properties: wall.metadata.properties, type: 'wall', start: { x: wall.start.x, y: elevation, z: wall.start.y }, end: { x: wall.end.x, y: elevation, z: wall.end.y }, thickness: wall.thickness, height: wall.height, quantityRefs: [`QTO-WALL-${wall.id}`] };
}

export function generateBimModel(cad: CadDocument): BimModel {
  const elements: BimElement[] = [];
  for (const floor of cad.floors) {
    const floorWalls = cad.walls.filter((w) => w.floorId === floor.id);
    floorWalls.forEach((wall) => elements.push(wallToBim(cad, wall, floor.elevation)));
    const xs = floorWalls.flatMap((w) => [w.start.x, w.end.x]);
    const ys = floorWalls.flatMap((w) => [w.start.y, w.end.y]);
    const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 0), minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
    const width = Math.max(1, maxX - minX), depth = Math.max(1, maxY - minY);
    const slab: BimSlab = { id: `slab-${floor.id}`, projectId: cad.projectId, floorId: floor.id, name: `${floor.name} Slab`, ifcClass: 'IfcSlab', material: 'concrete', properties: { structural: true }, type: 'slab', origin: { x: minX, y: floor.elevation, z: minY }, width, depth, thickness: 0.2, quantityRefs: [`QTO-SLAB-${floor.id}`] };
    const roof: BimRoof = { id: `roof-${floor.id}`, projectId: cad.projectId, floorId: floor.id, name: `${floor.name} Roof Plane`, ifcClass: 'IfcRoof', material: 'sheeting', properties: { slope: 'low' }, type: 'roof', origin: { x: minX, y: floor.elevation + floor.height, z: minY }, width, depth, thickness: 0.12, quantityRefs: [`QTO-ROOF-${floor.id}`] };
    elements.push(slab, roof);
  }
  elements.push(...reconstructRoomZones(cad).map((z) => ({ ...z, projectId: cad.projectId })));
  cad.openings.forEach((opening) => {
    const wall = cad.walls.find((w) => w.id === opening.wallId); const floor = cad.floors.find((f) => f.id === opening.floorId); if (!wall || !floor) return;
    const cx = (wall.start.x + wall.end.x) / 2, cz = (wall.start.y + wall.end.y) / 2;
    const elem: BimOpening = { id: `bim-${opening.id}`, projectId: cad.projectId, sourceCadId: opening.id, floorId: opening.floorId, name: opening.name, ifcClass: opening.metadata.ifcClass, material: opening.kind === 'door' ? 'timber' : 'glass', properties: opening.metadata.properties, type: 'opening', wallId: `bim-${opening.wallId}`, center: { x: cx, y: floor.elevation + (opening.sillHeight ?? 0) + 1, z: cz }, width: opening.width, height: (opening.headHeight ?? 2.1) - (opening.sillHeight ?? 0), sillHeight: opening.sillHeight ?? 0, quantityRefs: [`QTO-OPEN-${opening.id}`] };
    elements.push(elem);
  });
  cad.blocks.forEach((block) => {
    const floor = cad.floors.find((f) => f.id === block.floorId); if (!floor) return;
    const elem: BimBlock = { id: `bim-${block.id}`, projectId: cad.projectId, sourceCadId: block.id, floorId: block.floorId, name: block.name, ifcClass: block.metadata.ifcClass, material: 'generic', properties: block.metadata.properties, type: 'block', kind: block.kind, position: { x: block.position.x, y: floor.elevation, z: block.position.y }, width: block.width, depth: block.depth, height: block.kind === 'stair' || block.kind === 'core' ? 3 : 1, rotation: block.rotation, quantityRefs: [`QTO-BLOCK-${block.id}`] };
    elements.push(elem);
  });
  return { id: `bim-${cad.projectId}`, projectId: cad.projectId, name: `${cad.name} BIM Model`, floors: cad.floors.map((f) => ({ id: f.id, name: f.name, elevation: f.elevation, height: f.height })), elements };
}
