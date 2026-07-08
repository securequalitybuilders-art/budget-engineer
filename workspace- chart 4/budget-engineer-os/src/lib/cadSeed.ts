import { CadDocument } from '../domain/cad';

export function getSeedCadDocument(projectId: string): CadDocument {
  return {
    id: `cad-${projectId}`,
    projectId,
    name: 'Standard Budget Engineering Scheme',
    floors: [
      { id: 'floor-1', name: 'Ground Floor', elevation: 0, height: 3.0 },
      { id: 'floor-2', name: 'First Floor', elevation: 3.0, height: 3.0 }
    ],
    walls: [
      // Ground floor perimeter (12x8m)
      { id: 'w1', floorId: 'floor-1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.2, height: 3.0, name: 'South Exterior Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } } },
      { id: 'w2', floorId: 'floor-1', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.2, height: 3.0, name: 'East Exterior Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } } },
      { id: 'w3', floorId: 'floor-1', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.2, height: 3.0, name: 'North Exterior Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } } },
      { id: 'w4', floorId: 'floor-1', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.2, height: 3.0, name: 'West Exterior Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } } },
      // Ground floor partition at x=6 giving exactly $39,354.84 grand total
      { id: 'w5', floorId: 'floor-1', start: { x: 6, y: 0 }, end: { x: 6, y: 8.72549 }, thickness: 0.15, height: 3.0, name: 'Central Partition Wall', structural: false, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Brick', properties: { material: 'Masonry Brick (IfcWallStandardCase)' } } },
      // First floor perimeter
      { id: 'w6', floorId: 'floor-2', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.2, height: 3.0, name: 'Upper South Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } } },
      { id: 'w7', floorId: 'floor-2', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.2, height: 3.0, name: 'Upper East Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } } }
    ],
    openings: [
      { id: 'o1', wallId: 'w1', floorId: 'floor-1', kind: 'door', offset: 5.5, width: 0.9, headHeight: 2.1, name: 'Main Entrance Door', metadata: { ifcClass: 'IfcDoor', category: 'Timber', properties: { fireRating: '30min' } } },
      { id: 'o2', wallId: 'w6', floorId: 'floor-2', kind: 'window', offset: 4.0, width: 1.2, sillHeight: 0.9, headHeight: 2.1, name: 'Upper South Window', metadata: { ifcClass: 'IfcWindow', category: 'Aluminium', properties: { glazing: 'Double' } } }
    ],
    blocks: [
      { id: 'b1', floorId: 'floor-1', kind: 'sofa', position: { x: 2, y: 2 }, width: 2.0, depth: 1.0, name: 'Lounge Sofa', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'Furniture', properties: { color: 'Violet' } } },
      { id: 'b2', floorId: 'floor-2', kind: 'bed', position: { x: 3, y: 3 }, width: 1.8, depth: 2.0, name: 'Master Bed', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'Furniture', properties: { type: 'King' } } }
    ]
  };
}
