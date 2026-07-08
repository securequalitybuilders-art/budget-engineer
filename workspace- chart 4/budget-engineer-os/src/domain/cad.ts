export interface Vec2 {
  x: number;
  y: number;
}

export interface CadFloor {
  id: string;
  name: string;
  elevation: number;
  height: number;
}

export interface BimMetadata {
  ifcClass: string;
  category: string;
  properties: Record<string, any>;
}

export interface CadWall {
  id: string;
  floorId: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  name: string;
  structural?: boolean;
  metadata: BimMetadata;
}

export interface CadOpening {
  id: string;
  wallId: string;
  floorId: string;
  kind: 'door' | 'window';
  offset: number; // distance along wall from start
  width: number;
  sillHeight?: number;
  headHeight?: number;
  name: string;
  metadata: BimMetadata;
}

export interface CadBlock {
  id: string;
  floorId: string;
  kind: 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core' | 'column';
  position: Vec2;
  width: number;
  depth: number;
  rotation?: number;
  name: string;
  metadata: BimMetadata;
}

export interface CadDocument {
  id: string;
  projectId: string;
  name: string;
  floors: CadFloor[];
  walls: CadWall[];
  openings: CadOpening[];
  blocks: CadBlock[];
  mepEnabled?: boolean;
}
