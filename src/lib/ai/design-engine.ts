import { CadDocument, CadWall, CadOpening, CadBlock, CadFloor, BimMetadata, MaterialSystem } from '@/domain/ws6-types';
import { ParsedBrief } from './ai-types';

const meta = (ifcClass: string, category: string): BimMetadata => ({ ifcClass, category, properties: {} });

const FLOOR_HEIGHT = 3;
const ordinal = (n: number) =>
  n === 0 ? 'Ground' : n === 1 ? 'First' : n === 2 ? 'Second' : n === 3 ? 'Third' : `Floor ${n}`;

export function generateDesignFromBrief(
  brief: ParsedBrief,
  projectId: string,
  materialSystem: MaterialSystem = 'concrete',
): CadDocument {
  const floorCount = Math.max(1, Math.min(brief.floors, 6));
  const totalArea = Math.max(brief.approxAreaM2, 30);
  const perFloorArea = totalArea / floorCount;

  const depth = Math.sqrt(perFloorArea / 1.5);
  const width = perFloorArea / depth;
  const w = Math.round(width * 10) / 10;
  const d = Math.round(depth * 10) / 10;

  const partitionsPerFloor = Math.max(Math.ceil(brief.bedrooms / floorCount) - 1, 0);

  const floors: CadFloor[] = [];
  const walls: CadWall[] = [];
  const openings: CadOpening[] = [];
  const blocks: CadBlock[] = [];

  for (let f = 0; f < floorCount; f++) {
    const floorId = `floor-${f + 1}`;
    const p = `f${f + 1}`;
    floors.push({ id: floorId, name: `${ordinal(f)} Floor`, elevation: f * FLOOR_HEIGHT, height: FLOOR_HEIGHT });

    walls.push(
      { id: `${p}w1`, floorId, start: { x: 0, y: 0 }, end: { x: w, y: 0 }, thickness: 0.2, height: FLOOR_HEIGHT, name: 'South wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${p}w2`, floorId, start: { x: w, y: 0 }, end: { x: w, y: d }, thickness: 0.2, height: FLOOR_HEIGHT, name: 'East wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${p}w3`, floorId, start: { x: w, y: d }, end: { x: 0, y: d }, thickness: 0.2, height: FLOOR_HEIGHT, name: 'North wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
      { id: `${p}w4`, floorId, start: { x: 0, y: d }, end: { x: 0, y: 0 }, thickness: 0.2, height: FLOOR_HEIGHT, name: 'West wall', structural: true, metadata: meta('IfcWallStandardCase', 'Walls') },
    );

    for (let i = 1; i <= partitionsPerFloor; i++) {
      const px = Math.round(((w * i) / (partitionsPerFloor + 1)) * 10) / 10;
      walls.push({
        id: `${p}p${i}`, floorId, start: { x: px, y: 0 }, end: { x: px, y: Math.round(d * 0.6 * 10) / 10 },
        thickness: 0.12, height: FLOOR_HEIGHT, name: `Partition ${i}`, structural: false,
        metadata: meta('IfcWallStandardCase', 'Walls'),
      });
    }

    if (f === 0) {
      openings.push({ id: `${p}o1`, wallId: `${p}w1`, floorId, kind: 'door', offset: Math.round((w / 2) * 10) / 10, width: 0.9, headHeight: 2.1, name: 'Main entrance', metadata: meta('IfcDoor', 'Openings') });
    } else {
      openings.push({ id: `${p}o1`, wallId: `${p}w1`, floorId, kind: 'window', offset: Math.round((w / 2) * 10) / 10, width: 1.2, sillHeight: 0.9, headHeight: 2.1, name: `${ordinal(f)} floor window`, metadata: meta('IfcWindow', 'Openings') });
    }
  }

  if (floorCount > 1) {
    blocks.push({
      id: 'stair-1', floorId: 'floor-1', kind: 'stair',
      position: { x: Math.max(w / 2 - 0.5, 0.5), y: 1 }, width: 1, depth: 3,
      name: 'Stair', metadata: meta('IfcStair', 'Objects'),
    });
  }

  return {
    id: `cad-${projectId}`,
    projectId,
    name: `${brief.buildingType} — ${brief.bedrooms} bed / ${floorCount} floor${floorCount > 1 ? 's' : ''}`,
    materialSystem,
    floors,
    walls,
    openings,
    blocks,
  };
}
