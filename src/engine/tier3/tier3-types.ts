import type { DesignConstraints } from '../../adapters/designConstraints'
import type { BuildingChassis } from '../../lib/layout/vertical-chassis'

export type { ProgramItem } from '../tier1-types'

export type Topology = 'rectangle' | 'l-shape' | 'split-wing' | 'courtyard'

export type CoreType = 'stair' | 'lift' | 'service' | 'combined'

export interface CoreZone {
  id: string
  type: CoreType
  x: number
  y: number
  width: number
  depth: number
  hasStair: boolean
  hasLift: boolean
  hasServiceShaft: boolean
}

export interface WetWall {
  id: string
  x: number
  width: number
  floorFrom: number
  floorTo: number
}

export interface ServiceShaft {
  id: string
  x: number
  y: number
  width: number
  depth: number
  serviceTypes: string[]
  floorFrom: number
  floorTo: number
}

export interface PartyWallInfo {
  x: number
  fireRating: number
  acousticRating: number
  continuous: boolean
}

export interface CirculationZone {
  type: 'public' | 'private' | 'service'
  label: string
}

export interface StructuralAxis {
  id: string
  position: number
  direction: 'x' | 'y'
  label: string
}

export interface VerticalChassis {
  structuralAxes: StructuralAxis[]
  cores: CoreZone[]
  wetWalls: WetWall[]
  serviceShafts: ServiceShaft[]
  partyWalls: PartyWallInfo[]
  circulationZones: CirculationZone[]
  storeyCount: number
  isDuplex: boolean
  isMixedUse: boolean
  // Bridge to canonical chassis
  canonicalChassis?: BuildingChassis
}

export interface EgressPoint {
  label: string
  x: number
  y: number
  type: 'main-entry' | 'secondary-exit' | 'emergency-exit'
}

export interface AdjacencyWarning {
  roomA: string
  roomB: string
  distance: number
  message: string
}

export interface MasterChassis {
  topology: Topology
  buildingW: number
  buildingD: number
  stairwell?: { x: number; y: number; w: number; h: number }
  wetZone?: { x: number; w: number }
  rectangle?: { frontD: number; corridorH: number; backD: number; corridorY: number }
  lShape?: { vertW: number; vertH: number; horizD: number; corridorW: number }
  splitWing?: { pavW: number; leftH: number; rightH: number; galleryW: number }
  courtyard?: { wingDepth: number; outerW: number; outerD: number }
  verticalChassis?: VerticalChassis
}

export interface LayoutParameters {
  topologies: Topology[]
  siteWidth: number
  siteDepth: number
  wallThickness: number
  corridorWidth: number
  minRoomDimensions: Record<string, { minWidth: number; minDepth: number }>
  floorCount: number
  floorHeight: number
  maxStructuralSpan?: number
  constraints?: DesignConstraints
}

export interface PlacedRoom {
  name: string
  x: number
  y: number
  width: number
  height: number
  zone?: 'public' | 'private' | 'service' | 'circulation'
  isWetCore?: boolean
}

export interface FloorPlan {
  id: string
  name: string
  topology: Topology
  width: number
  height: number
  rooms: PlacedRoom[]
  floorIndex?: number
  totalFloors?: number
  stairCalculations?: { risers: number; treads: number; run: number }
  verticalChassis?: VerticalChassis
  egressPoints?: EgressPoint[]
  adjacencyWarnings?: AdjacencyWarning[]
  maxTravelDistance?: number
  egressCompliant?: boolean
}

export interface ExpandedProgramItem {
  name: string
  area: number
  zone?: 'public' | 'private' | 'service' | 'circulation'
  isWetCore?: boolean
}

export interface Tier3Result {
  layoutParams: LayoutParameters
  floorPlans: FloorPlan[]
  success: boolean
  error?: string
}
