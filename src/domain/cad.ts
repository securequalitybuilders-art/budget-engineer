export type CadLayerKey = 'grid' | 'walls' | 'openings' | 'annotations' | 'rooms' | 'dimensions'
export type OpeningKind = 'door' | 'window'
export type CadTool = 'select' | 'wall' | 'opening' | 'annotation'

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
  structuralRole: 'external' | 'internal'
  layerId: CadLayerKey
  bim: BimMetadata
}

export interface CadOpening {
  id: string
  floorId: string
  wallId: string
  kind: OpeningKind
  offsetRatio: number
  width: number
  sillHeight?: number
  headHeight?: number
  layerId: CadLayerKey
  bim: BimMetadata
}

export interface CadAnnotation {
  id: string
  floorId: string
  position: CadPoint
  text: string
  kind: 'label' | 'note' | 'dimension'
  layerId: CadLayerKey
  bim?: BimMetadata
}

export interface CadFloor {
  id: string
  name: string
  elevation: number
  bim: BimMetadata
}

export interface CadBlockInstance {
  id: string
  floorId: string
  blockType: 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core'
  position: CadPoint
  width: number
  height: number
  rotation: number
  bim: BimMetadata
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
  openings: CadOpening[]
  annotations: CadAnnotation[]
  blocks: CadBlockInstance[]
}
