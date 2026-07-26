import type { InteriorRoom, MaterialAssignment, MaterialDef, SurfaceType } from '@/domain/interior';

interface RoomSurfaceArea {
  wallAreaM2: number;
  floorAreaM2: number;
  ceilingAreaM2: number;
}

const ROOM_HEIGHT_DEFAULT = 2700;

function computeRoomSurfaceAreas(room: InteriorRoom): RoomSurfaceArea {
  const w = room.dimensions.width / 1000;
  const h = room.dimensions.height / 1000;
  const rh = ROOM_HEIGHT_DEFAULT / 1000;

  const floorAreaM2 = w * h;
  const perimeter = 2 * (w + h);
  const wallAreaM2 = perimeter * rh;
  const ceilingAreaM2 = floorAreaM2;

  return { wallAreaM2, floorAreaM2, ceilingAreaM2 };
}

export interface FinishLineItem {
  roomId: string;
  roomName: string;
  surface: SurfaceType;
  materialId: string;
  materialName: string;
  quantityM2: number;
  rateCents: number;
  totalCents: number;
}

export function generateFinishSchedule(
  rooms: InteriorRoom[],
  materials: MaterialDef[]
): FinishLineItem[] {
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const items: FinishLineItem[] = [];

  for (const room of rooms) {
    const areas = computeRoomSurfaceAreas(room);
    const spec = room.finishSpec;

    const surfaces: { surface: SurfaceType; materialId: string | null; area: number }[] = [
      { surface: 'wall', materialId: spec.wallMaterialId, area: areas.wallAreaM2 },
      { surface: 'floor', materialId: spec.floorMaterialId, area: areas.floorAreaM2 },
      { surface: 'ceiling', materialId: spec.ceilingMaterialId, area: areas.ceilingAreaM2 },
    ];

    for (const { surface, materialId, area } of surfaces) {
      if (!materialId) continue;
      const mat = materialMap.get(materialId);
      if (!mat) continue;

      items.push({
        roomId: room.roomId,
        roomName: room.name,
        surface,
        materialId: mat.id,
        materialName: mat.name,
        quantityM2: Math.round(area * 100) / 100,
        rateCents: mat.rateCents,
        totalCents: Math.round(area * mat.rateCents),
      });
    }
  }

  return items;
}

export function generateMaterialAssignments(
  rooms: InteriorRoom[],
  materials: MaterialDef[]
): MaterialAssignment[] {
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const assignments: MaterialAssignment[] = [];

  for (const room of rooms) {
    const areas = computeRoomSurfaceAreas(room);
    const spec = room.finishSpec;

    const surfaces: { surface: SurfaceType; materialId: string | null; area: number }[] = [
      { surface: 'wall', materialId: spec.wallMaterialId, area: areas.wallAreaM2 },
      { surface: 'floor', materialId: spec.floorMaterialId, area: areas.floorAreaM2 },
      { surface: 'ceiling', materialId: spec.ceilingMaterialId, area: areas.ceilingAreaM2 },
    ];

    for (const { surface, materialId, area } of surfaces) {
      if (!materialId || !materialMap.has(materialId)) continue;
      assignments.push({
        assignmentId: `${room.roomId}-${surface}`,
        roomId: room.roomId,
        surface,
        materialId,
        coverageM2: Math.round(area * 100) / 100,
      });
    }
  }

  return assignments;
}

export const DEFAULT_MATERIALS: MaterialDef[] = [
  { id: 'TILE-CERAMIC',     name: 'Ceramic Tile',         category: 'tile',         color: '#e8e4df', unit: 'm2', rateCents: 8500 },
  { id: 'TILE-PORCELAIN',   name: 'Porcelain Tile',       category: 'tile',         color: '#d4cfc8', unit: 'm2', rateCents: 12500 },
  { id: 'TILE-MOSAIC',      name: 'Mosaic Tile',          category: 'tile',         color: '#5b7a9e', unit: 'm2', rateCents: 22000 },
  { id: 'TILE-SUBWAY',      name: 'Subway Tile',          category: 'tile',         color: '#f0ece6', unit: 'm2', rateCents: 10500 },
  { id: 'STONE-MARBLE',     name: 'Marble',               category: 'natural-stone', color: '#e8e0d0', unit: 'm2', rateCents: 45000 },
  { id: 'STONE-GRANITE',    name: 'Granite',              category: 'natural-stone', color: '#8c8279', unit: 'm2', rateCents: 38000 },
  { id: 'STONE-QUARTZ',     name: 'Quartz Composite',     category: 'natural-stone', color: '#c8c2b8', unit: 'm2', rateCents: 32000 },
  { id: 'TIMBER-OAK',       name: 'Oak Hardwood',         category: 'timber',       color: '#c4a56c', unit: 'm2', rateCents: 28000 },
  { id: 'TIMBER-ENGINEERED',name: 'Engineered Wood',      category: 'timber',       color: '#b8956a', unit: 'm2', rateCents: 18500 },
  { id: 'TIMBER-WALNUT',    name: 'Walnut',               category: 'timber',       color: '#5c4033', unit: 'm2', rateCents: 35000 },
  { id: 'LAMINATE-STANDARD',name: 'Laminate Flooring',    category: 'laminate',     color: '#a08868', unit: 'm2', rateCents: 9500 },
  { id: 'VINYL-SHEET',      name: 'Vinyl Sheet',          category: 'vinyl',        color: '#d4cfc8', unit: 'm2', rateCents: 6500 },
  { id: 'VINYL-PLANK',      name: 'Luxury Vinyl Plank',   category: 'vinyl',        color: '#b8956a', unit: 'm2', rateCents: 11000 },
  { id: 'CARPET-PLUSH',     name: 'Plush Carpet',         category: 'carpet',       color: '#8b7d6b', unit: 'm2', rateCents: 12000 },
  { id: 'CARPET-BERBER',    name: 'Berber Carpet',        category: 'carpet',       color: '#9e9488', unit: 'm2', rateCents: 14000 },
  { id: 'PAINT-MATT',       name: 'Matt Paint',           category: 'paint',        color: '#f0ebe3', unit: 'm2', rateCents: 3500 },
  { id: 'PAINT-SEMIGLOSS',  name: 'Semi-Gloss Paint',     category: 'paint',        color: '#f0ebe3', unit: 'm2', rateCents: 4200 },
  { id: 'PAINT-WHITE',      name: 'White Ceiling Paint',  category: 'paint',        color: '#f8f5f0', unit: 'm2', rateCents: 3000 },
  { id: 'WALLPAPER-BASIC',  name: 'Wallpaper',            category: 'wallpaper',    color: '#d8d2c5', unit: 'm2', rateCents: 7500 },
  { id: 'WALLPAPER-FEATURE',name: 'Feature Wallpaper',    category: 'wallpaper',    color: '#4a6741', unit: 'm2', rateCents: 15000 },
  { id: 'PLASTER-SMOOTH',   name: 'Smooth Plaster',       category: 'plaster',      color: '#e8e4df', unit: 'm2', rateCents: 5000 },
  { id: 'CONCRETE-POLISHED',name: 'Polished Concrete',    category: 'concrete',     color: '#a09890', unit: 'm2', rateCents: 18000 },
  { id: 'GLASS-CLEAR',      name: 'Clear Glass',          category: 'glass',        color: '#c8d8e0', unit: 'm2', rateCents: 25000 },
  { id: 'GLASS-FROSTED',    name: 'Frosted Glass',        category: 'glass',        color: '#d8dce0', unit: 'm2', rateCents: 30000 },
  { id: 'METAL-BRUSHED',    name: 'Brushed Metal',        category: 'metal',        color: '#a09890', unit: 'm2', rateCents: 22000 },
  { id: 'MIRROR-SHEET',     name: 'Mirror Glass',         category: 'mirror',       color: '#c8d0d8', unit: 'm2', rateCents: 28000 },
  { id: 'FABRIC-WALL',      name: 'Fabric Wall Panel',    category: 'fabric',       color: '#7a8a7a', unit: 'm2', rateCents: 20000 },
];
