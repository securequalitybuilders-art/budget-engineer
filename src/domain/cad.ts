export type CadLayerKey = 'grid' | 'walls' | 'openings' | 'annotations' | 'rooms' | 'dimensions' | 'boundaries'
export type OpeningKind = 'door' | 'window'
export type CadTool = 'select' | 'wall' | 'opening' | 'annotation' | 'boundary'

import type { DrawingProvenance, SiteBoundaryMode } from './drawing-provenance'

export interface CadPoint {
  x: number
  y: number
}

export interface BimMetadata {
  classification: string
  family?: string
  typeName?: string
  fireRating?: string
  material?: string
  loadBearing?: boolean
  levelName?: string
  comments?: string
  tag?: string
}

export interface CadLayer {
  id: CadLayerKey
  name: string
  visible: boolean
  color: string
  dxfLayerName?: string
}

export interface CadWall {
  id: string
  floorId: string
  start: CadPoint
  end: CadPoint
  thickness: number
  height?: number
  structuralRole: 'external' | 'internal'
  layerId: CadLayerKey
  bim: BimMetadata
  provenance?: DrawingProvenance
}

export interface CadOpening {
  id: string
  floorId: string
  wallId: string
  kind: OpeningKind
  offsetRatio: number
  width: number
  height?: number
  sillHeight?: number
  headHeight?: number
  layerId: CadLayerKey
  bim: BimMetadata
  provenance?: DrawingProvenance
}

export type AnnotationKind = 'label' | 'note' | 'dimension' | 'spot_elevation' | 'material_tag' | 'room_tag' | 'schedule_ref' | 'section_mark' | 'detail_ref' | 'level_marker'

export interface CadAnnotation {
  id: string
  floorId: string
  position: CadPoint
  text: string
  kind: AnnotationKind
  layerId: CadLayerKey
  bim?: BimMetadata
  provenance?: DrawingProvenance
}

export interface CadFloor {
  id: string
  name: string
  elevation: number
  height?: number
  bim: BimMetadata
}

export interface CadBoundary {
  id: string
  points: CadPoint[]
  layerId: CadLayerKey
  boundaryMode?: SiteBoundaryMode
  provenance?: DrawingProvenance
  bim?: BimMetadata
}

export type BlockKind =
  | 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core'
  | 'column' | 'beam' | 'footing'
  | 'light' | 'switch' | 'socket' | 'db_board' | 'sink' | 'shower' | 'hvac_unit' | 'manhole'
  | 'ac_unit' | 'duct' | 'diffuser' | 'grille' | 'fc_u'

export interface CadBlockInstance {
  id: string
  floorId: string
  blockType: BlockKind
  position: CadPoint
  width: number
  height: number
  depth?: number
  rotation: number
  bim: BimMetadata
  provenance?: DrawingProvenance
}

export interface CadStructuralGrid {
  id: string
  label: string
  direction: 'horizontal' | 'vertical'
  position: number
}

export interface ScheduleRef {
  scheduleType: 'door' | 'window' | 'structural' | 'finish' | 'sanitary'
  sourceModelId: string
  generatedAt: string
}

export interface CadDocument {
  id: string
  projectId: string
  designId: string
  activeFloorId: string
  activeTool: CadTool
  floors: CadFloor[]
  layers: CadLayer[]
  walls: CadWall[]
  boundaries: CadBoundary[]
  openings: CadOpening[]
  annotations: CadAnnotation[]
  blocks: CadBlockInstance[]
  structuralGrid?: CadStructuralGrid[]
  scheduleRefs?: ScheduleRef[]
}
