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

export interface InteriorProject {
  id: string;
  projectId: string;
  rooms: InteriorRoom[];
  fixtures: FixtureInstance[];
  materialAssignments: MaterialAssignment[];
  createdAt: string;
  updatedAt: string;
}
