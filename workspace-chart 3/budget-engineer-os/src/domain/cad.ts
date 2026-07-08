export type Vec2 = { x: number; y: number };

export type CadFloor = { id: string; name: string; elevation: number; height: number };
export type BimMetadata = { ifcClass: string; category: string; properties: Record<string, string | number | boolean> };
export type CadWall = { id: string; floorId: string; start: Vec2; end: Vec2; thickness: number; height: number; name: string; metadata: BimMetadata };
export type CadOpening = { id: string; wallId: string; floorId: string; kind: 'door' | 'window'; offset: number; width: number; sillHeight?: number; headHeight?: number; name: string; metadata: BimMetadata };
export type CadBlock = { id: string; floorId: string; kind: 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core'; position: Vec2; width: number; depth: number; rotation?: number; name: string; metadata: BimMetadata };
export type CadDocument = { id: string; projectId: string; name: string; floors: CadFloor[]; walls: CadWall[]; openings: CadOpening[]; blocks: CadBlock[] };
