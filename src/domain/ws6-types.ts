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
  fireRating?: string;
  typeName?: string;
  height?: number;
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
  height?: number;
  sillHeight?: number;
  headHeight?: number;
  name: string;
  metadata: BimMetadata;
}

export type BlockKind =
  | 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core'
  | 'column' | 'beam' | 'footing'
  | 'light' | 'switch' | 'socket' | 'db_board' | 'sink' | 'shower' | 'hvac_unit' | 'manhole'
  | 'ac_unit' | 'duct' | 'diffuser' | 'grille' | 'fc_u';

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

import type { DrawingProvenance, SiteBoundaryMode } from './drawing-provenance';

export interface CadBoundary {
  id: string;
  points: Vec2[];
  layerId: string;
  boundaryMode?: SiteBoundaryMode;
  provenance?: DrawingProvenance;
  bim?: BimMetadata;
}

export type RoomProgramme =
  | 'Living Room' | 'Kitchen' | 'Dining Room' | 'Bedroom 1' | 'Bedroom 2'
  | 'Bedroom 3' | 'Bathroom' | 'Ensuite' | 'W/C' | 'Hallway' | 'Corridor'
  | 'Stairwell' | 'Study' | 'Office' | 'Utility Room' | 'Laundry'
  | 'Pantry' | 'Store Room' | 'Plant Room' | 'Garage' | 'Lobby'
  | 'Reception' | 'Waiting Area' | 'Consultation Room' | 'Treatment Room'
  | 'Kitchenette' | 'Meeting Room' | 'Open Plan' | 'Balcony' | 'Terrace'
  | 'Void' | 'Circulation' | 'Lounge' | 'Family Room' | 'Games Room'
  | 'Home Office' | 'Dressing Room' | 'Walk-in Wardrobe' | 'Mud Room'
  | 'Porch' | 'Conservatory' | 'Sun Room' | 'Cellar' | 'Basement'
  | 'Warehouse' | 'Workshop' | 'Apartment' | 'Office';

export const CANONICAL_ROOM_NAMES: RoomProgramme[] = [
  'Living Room', 'Kitchen', 'Dining Room', 'Bedroom 1', 'Bedroom 2',
  'Bedroom 3', 'Bathroom', 'Ensuite', 'W/C', 'Hallway', 'Corridor',
  'Stairwell', 'Study', 'Office', 'Utility Room', 'Laundry',
  'Pantry', 'Store Room', 'Plant Room', 'Garage', 'Lobby',
  'Reception', 'Waiting Area', 'Consultation Room', 'Treatment Room',
  'Kitchenette', 'Meeting Room', 'Open Plan', 'Balcony', 'Terrace',
  'Void', 'Circulation', 'Lounge', 'Family Room', 'Games Room',
  'Home Office', 'Dressing Room', 'Walk-in Wardrobe', 'Mud Room',
  'Porch', 'Conservatory', 'Sun Room', 'Cellar', 'Basement',
  'Warehouse', 'Workshop', 'Apartment', 'Office',
];

export function isCanonicalRoomName(name: string): boolean {
  return (CANONICAL_ROOM_NAMES as readonly string[]).includes(name);
}

// ── P13.7 Façade / Elevation / Section types ──

export type FaçadeOrientation = 'front' | 'rear' | 'left' | 'right';

export interface FaçadeSegment {
  wallId: string;
  floorId: string;
  start: Vec2;
  end: Vec2;
  length: number;
  rooms: string[];
  openingCount: number;
  entranceWeight: number;
}

export interface FaçadeComposition {
  orientation: FaçadeOrientation;
  buildingEdgeTop: number;
  buildingEdgeBottom: number;
  buildingEdgeLeft: number;
  buildingEdgeRight: number;
  width: number;
  totalHeight: number;
  segments: FaçadeSegment[];
  entranceX: number | null;
  entranceFloor: string | null;
}

export interface FrontageMapping {
  roomId: string;
  roomName: string;
  programme: RoomProgramme;
  façadeOrientation: FaçadeOrientation;
  wallSegment: { start: Vec2; end: Vec2 };
  openingIds: string[];
}

export interface DoorSubtype {
  kind: 'sliding' | 'hinged' | 'folding' | 'pocket' | 'bi-fold';
}

export interface OpeningElevationProfile {
  openingId: string;
  kind: OpeningKind;
  width: number;
  height: number;
  sillHeight: number;
  headHeight: number;
  frameDepthMm: number;
  hasMullion: boolean;
  mullionCount: number;
  doorSubtype?: DoorSubtype;
  roomBehind: string | null;
  isEntrance: boolean;
}

export interface SectionCutPlane {
  axis: 'AA' | 'BB';
  position: number;
  roomsCut: string[];
  wallsCut: string[];
  wallsBeyond: string[];
  stairsCut: string[];
  serviceCoresCut: string[];
  score?: number;
  wallTypeSummary?: string;
  cutDescription?: string;
}

export interface FloorBuildUp {
  slabThickness: number;
  screedThickness: number;
  finishThickness: number;
  hasHardcore: boolean;
  hasInsulation: boolean;
  hasDpm: boolean;
  slabType?: 'ground-bearing' | 'suspended';
  footingWidth?: number;
  footingDepth?: number;
  blindingThickness?: number;
}

export type RoofType = 'pitched-truss' | 'flat-parapet' | 'slab-edge';

export interface RoofBuildUp {
  roofType: RoofType;
  hasInsulation: boolean;
  hasMembrane: boolean;
  fasciaDepthMm: number;
  eavesDepthMm: number;
  parapetHeightMm: number;
  trussSpacingMm: number;
  ceilingLiningMm: number;
}

export interface TypologyFaçadeRules {
  typology: string;
  hasPlinth: boolean;
  plinthHeight: number;
  parapetType: 'flat' | 'stepped' | 'none';
  eavesDepthMm: number;
  fasciaDepthMm: number;
  balconyLikelihood: number;
  entranceEmphasis: 'strong' | 'moderate' | 'subtle' | 'none';
  symmetryWeight: number;
  materialZones: { from: number; to: number; material: string }[];
  columnRhythmSpacing: number | null;
}

export type SectionAxis = 'AA' | 'BB';

export interface SectionConfig {
  axis: SectionAxis;
  position?: number;
  autoSelectBest?: boolean;
  roofType?: RoofType;
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
  boundaries?: CadBoundary[];
  roomProgramme?: Record<string, RoomProgramme>;
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
