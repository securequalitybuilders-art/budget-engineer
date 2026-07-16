export type InteriorRoomType =
  | 'bathroom' | 'ensuite' | 'kitchen' | 'bedroom' | 'living'
  | 'dining' | 'office' | 'hallway' | 'laundry' | 'pantry'
  | 'lounge' | 'study' | 'playroom' | 'gym' | 'cinema'
  | 'storage' | 'entry' | 'landing' | 'balcony' | 'other';

export type SurfaceType = 'wall' | 'floor' | 'ceiling';

export type MaterialCategory =
  | 'tile' | 'natural-stone' | 'timber' | 'laminate' | 'vinyl'
  | 'carpet' | 'paint' | 'wallpaper' | 'plaster' | 'concrete'
  | 'glass' | 'metal' | 'mirror' | 'fabric' | 'other';

export interface MaterialDef {
  id: string;
  name: string;
  category: MaterialCategory;
  color: string;
  pattern?: string;
  unit: 'm2' | 'm' | 'each';
  rateCents: number;
}

export interface FinishSpec {
  wallMaterialId: string | null;
  floorMaterialId: string | null;
  ceilingMaterialId: string | null;
  wallFinish: string;
  floorFinish: string;
  ceilingFinish: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface InteriorRoomDimension {
  width: number;
  height: number;
}

export interface InteriorRoom {
  roomId: string;
  roomType: InteriorRoomType;
  name: string;
  position: Point;
  dimensions: InteriorRoomDimension;
  rotation: number;
  finishSpec: FinishSpec;
  notes: string;
}

export type FixtureCategory =
  | 'sanitary' | 'kitchen' | 'lighting' | 'furniture'
  | 'door-window' | 'accessory' | 'mechanical';

export interface FixtureDef {
  id: string;
  name: string;
  category: FixtureCategory;
  width: number;
  depth: number;
  height: number;
  symbol: string;
  mounting: 'floor' | 'wall' | 'ceiling' | 'counter';
}

export interface FixtureInstance {
  instanceId: string;
  fixtureTypeId: string;
  position: Point;
  rotation: number;
  roomId: string;
  flipped: boolean;
}

export interface MaterialAssignment {
  assignmentId: string;
  roomId: string;
  surface: SurfaceType;
  materialId: string;
  coverageM2: number;
}

export type JoineryType = 'wardrobe' | 'kitchen-unit' | 'vanity' | 'shelving' | 'bench' | 'cabinet';

export interface JoineryDef {
  id: string;
  name: string;
  joineryType: JoineryType;
  width: number;
  depth: number;
  height: number;
  materialId: string;
  finishColor: string;
  notes: string;
}

export interface JoineryInstance {
  instanceId: string;
  joineryDefId: string;
  roomId: string;
  wallIndex: number;
  position: Point;
  width: number;
  height: number;
  notes: string;
}

export interface FFEEntry {
  id: string;
  roomId: string;
  itemName: string;
  supplier: string;
  modelRef: string;
  quantity: number;
  unit: string;
  rateCents: number;
  category: 'furniture' | 'fixture' | 'equipment' | 'artwork' | 'accessory';
}

export interface FinishScheduleEntry {
  roomId: string;
  roomName: string;
  roomType: InteriorRoomType;
  wallFinish: string;
  wallMaterialId: string | null;
  floorFinish: string;
  floorMaterialId: string | null;
  ceilingFinish: string;
  ceilingMaterialId: string | null;
  wallAreaM2: number;
  floorAreaM2: number;
  ceilingAreaM2: number;
}

export interface WetAreaElevationData {
  roomId: string;
  roomName: string;
  walls: {
    wallIndex: number;
    wallLabel: string;
    fixtures: { fixtureId: string; x: number; y: number; name: string }[];
    finish: string;
    waterproofing: boolean;
  }[];
}

export interface KitchenElevationData {
  roomId: string;
  roomName: string;
  walls: {
    wallIndex: number;
    wallLabel: string;
    units: { x: number; y: number; width: number; height: number; type: string; name: string }[];
    appliances: { x: number; y: number; width: number; height: number; name: string }[];
    backsplash: string;
    countertop: string;
  }[];
}

export interface WardrobeElevationData {
  roomId: string;
  roomName: string;
  wardrobes: {
    width: number;
    height: number;
    depth: number;
    doorStyle: string;
    interiorConfig: string;
    material: string;
    finish: string;
  }[];
}

export interface InteriorProject {
  id: string;
  projectId: string;
  rooms: InteriorRoom[];
  fixtures: FixtureInstance[];
  materialAssignments: MaterialAssignment[];
  joinery: JoineryInstance[];
  joineryDefs: JoineryDef[];
  ffeEntries: FFEEntry[];
  createdAt: string;
  updatedAt: string;
}
