import { CadDocument, BimMetadata, CadWall, CadOpening, CadBlock } from '../domain/types';

const meta = (ifcClass: string, category: string, extra: Record<string, string | number | boolean> = {}): BimMetadata => ({
  ifcClass, category, properties: extra,
});

// build a rectangular envelope + central partition for a given floor
function envelope(floorId: string, prefix: string): { walls: CadWall[] } {
  return {
    walls: [
      { id: `${prefix}1`, floorId, start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.2, height: 3, name: 'South wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${prefix}2`, floorId, start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.2, height: 3, name: 'East wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${prefix}3`, floorId, start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.2, height: 3, name: 'North wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${prefix}4`, floorId, start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.2, height: 3, name: 'West wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${prefix}5`, floorId, start: { x: 6, y: 0 }, end: { x: 6, y: 8 }, thickness: 0.15, height: 3, name: 'Partition', structural: false, metadata: meta('IfcWallStandardCase', 'Walls') },
    ],
  };
}

export function seedCadDocument(projectId: string, name = 'Standard Budget Engineering Scheme'): CadDocument {
  const g = 'floor-1'; // ground
  const u = 'floor-2'; // upper

  const walls: CadWall[] = [
    ...envelope(g, 'w').walls,
    ...envelope(u, 'u').walls,
  ];

  const openings: CadOpening[] = [
    { id: 'o1', wallId: 'w1', floorId: g, kind: 'door', offset: 2, width: 0.9, headHeight: 2.1, name: 'Main entrance', metadata: meta('IfcDoor', 'Openings') },
    { id: 'o2', wallId: 'u1', floorId: u, kind: 'window', offset: 3, width: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Bedroom window', metadata: meta('IfcWindow', 'Openings') },
  ];

  const blocks: CadBlock[] = [
    { id: 'b1', floorId: g, kind: 'sofa', position: { x: 2, y: 5 }, width: 2, depth: 0.9, name: 'Sofa', metadata: meta('IfcBuildingElementProxy', 'Objects') },
    { id: 'b2', floorId: u, kind: 'bed', position: { x: 8, y: 5 }, width: 2, depth: 1.6, name: 'Bed', metadata: meta('IfcBuildingElementProxy', 'Objects') },
    { id: 'st1', floorId: g, kind: 'stair', position: { x: 5.4, y: 2 }, width: 1, depth: 3, name: 'Stair', metadata: meta('IfcStair', 'Objects') },
  ];

  return {
    id: `cad-${projectId}`,
    projectId,
    name,
    materialSystem: 'concrete',
    floors: [
      { id: g, name: 'Ground Floor', elevation: 0, height: 3 },
      { id: u, name: 'First Floor', elevation: 3, height: 3 },
    ],
    walls,
    openings,
    blocks,
  };
}
