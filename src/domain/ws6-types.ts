// Bridge types for WS6 modules — adapted from workspace-chart 6 domain/types.ts
// These types are used by WS6 lib/drawing/panel modules that reference a
// different CadDocument/BimModel/BOQ shape than the canonical types.
// Keep this file self-contained; do not merge into canonical domain types.

export type MaterialSystem = 'concrete' | 'steel' | 'timber';

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
  material?: MaterialSystem;
  properties: Record<string, string | number | boolean>;
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

export type OpeningKind = 'door' | 'window';

export interface CadOpening {
  id: string;
  wallId: string;
  floorId: string;
  kind: OpeningKind;
  offset: number;
  width: number;
  sillHeight?: number;
  headHeight?: number;
  name: string;
  metadata: BimMetadata;
}

export type BlockKind =
  | 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core'
  | 'column' | 'beam' | 'footing';

export interface CadBlock {
  id: string;
  floorId: string;
  kind: BlockKind;
  position: Vec2;
  width: number;
  depth: number;
  rotation?: number;
  name: string;
  end?: Vec2;
  metadata: BimMetadata;
}

export interface CadDocument {
  id: string;
  projectId: string;
  name: string;
  materialSystem: MaterialSystem;
  floors: CadFloor[];
  walls: CadWall[];
  openings: CadOpening[];
  blocks: CadBlock[];
}

export type BimElementType =
  | 'wall' | 'slab' | 'opening' | 'block' | 'roomZone' | 'roof' | 'beam';

export interface BimElement {
  id: string;
  cadId: string;
  type: BimElementType;
  floorId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  area?: number;
  length?: number;
  metadata: BimMetadata;
}

export interface BimModel {
  id: string;
  projectId: string;
  name: string;
  floors: CadFloor[];
  elements: BimElement[];
}

export type BoqCategory =
  | 'Walls' | 'Slabs' | 'Roof' | 'Openings' | 'Objects'
  | 'Beams' | 'Columns' | 'Footings' | 'Reinforcement' | 'MEP'
  | 'Excavation' | 'Formwork';

export interface BoqLineItem {
  id: string;
  category: BoqCategory;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface BoqSummary {
  subtotal: number;
  contingency: number;
  fees: number;
  vat: number;
  grandTotal: number;
}

export interface BOQ {
  id: string;
  projectId: string;
  currency: string;
  items: BoqLineItem[];
  summary: BoqSummary;
}

export type EntityType = 'CAD' | 'BIM' | 'BOQ' | 'EXPORT' | 'PROJECT';

export interface TransactionEvent {
  id: string;
  projectId: string;
  timestamp: number;
  actor: string;
  action: string;
  entityType: EntityType;
  summary: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  archived?: boolean;
  createdAt: number;
}

export interface DesignMetricsRef {
  walls: number; openings: number; blocks: number; floors: number;
  slabAreaM2: number; beamLenM: number; grandTotal: number; currency: string;
}

export interface RevisionRecord {
  projectId: string;
  current: string;
  log: {
    rev: string; date: string; note: string; by: string;
    fingerprint?: string;
    metrics?: DesignMetricsRef;
  }[];
}
