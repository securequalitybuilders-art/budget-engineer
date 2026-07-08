// ============================================================================
// Budget Engineer OS — Consolidated domain types
// Reflects stages 1–41: CAD ↔ BIM ↔ BOQ with material systems & structure.
// ============================================================================

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
  offset: number; // distance along wall from start
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
  // for linear elements (beams) we also carry an end point
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

// ---------------------------------------------------------------------------
// BIM
// ---------------------------------------------------------------------------

export type BimElementType =
  | 'wall' | 'slab' | 'opening' | 'block' | 'roomZone' | 'roof' | 'beam';

export interface BimElement {
  id: string; // bim-{cadId}
  cadId: string;
  type: BimElementType;
  floorId: string;
  name: string;
  // axis-aligned footprint extents (metres) for quantity + viz
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  // quantity hints
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

// ---------------------------------------------------------------------------
// BOQ
// ---------------------------------------------------------------------------

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
  rate: number; // dollars
  total: number; // dollars
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

// ---------------------------------------------------------------------------
// Transactions / audit
// ---------------------------------------------------------------------------

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

export interface RevisionRecord {
  projectId: string;        // key
  current: string;          // current revision letter, e.g. "B"
  log: {
    rev: string; date: string; note: string; by: string;
    fingerprint?: string;
    // headline metrics captured at issue time (Stage 62)
    metrics?: import('../lib/designMetrics').DesignMetrics;
  }[];
}
