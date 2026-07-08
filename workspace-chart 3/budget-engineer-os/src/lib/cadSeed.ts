import type { CadDocument } from '../domain/cad';

export function createSeedCadDocument(projectId = 'project-demo-1'): CadDocument {
  return {
    id: `cad-${projectId}`,
    projectId,
    name: 'Demo House',
    floors: [
      { id: 'floor-1', name: 'Ground Floor', elevation: 0, height: 3 },
      { id: 'floor-2', name: 'First Floor', elevation: 3.2, height: 3 },
    ],
    walls: [
      { id: 'w1', floorId: 'floor-1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.2, height: 3, name: 'South Wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: true } } },
      { id: 'w2', floorId: 'floor-1', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.2, height: 3, name: 'East Wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: true } } },
      { id: 'w3', floorId: 'floor-1', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.2, height: 3, name: 'North Wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: true } } },
      { id: 'w4', floorId: 'floor-1', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.2, height: 3, name: 'West Wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: true } } },
      { id: 'w5', floorId: 'floor-1', start: { x: 6, y: 0 }, end: { x: 6, y: 8 }, thickness: 0.15, height: 3, name: 'Partition', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: false } } }
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'floor-1', kind: 'door', offset: 2, width: 1, headHeight: 2.1, name: 'Front Door', metadata: { ifcClass: 'IfcDoor', category: 'opening', properties: { fireRated: false } } }
    ],
    blocks: [
      { id: 'b1', floorId: 'floor-1', kind: 'sofa', position: { x: 3, y: 2 }, width: 2, depth: 0.9, name: 'Sofa', metadata: { ifcClass: 'IfcFurniture', category: 'furniture', properties: { room: 'Living' } } }
    ]
  };
}
