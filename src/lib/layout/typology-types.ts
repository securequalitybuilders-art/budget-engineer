import type { PlanningZoneMarker } from '../../domain/plan'
import type {
  AdjacencyGraphModel,
  CoreLayout,
  FloorPlateMetrics,
  StructuralGrid,
} from '../../engine/tier1-types'
import type { BubbleDiagram } from '../../engine/spatial/topological-graph'

export type BuildingTypology =
  | 'house'
  | 'apartment'
  | 'townhouse'
  | 'clinic'
  | 'school'
  | 'commercial'
  | 'office'
  | 'mixed-use'
  | 'duplex'
  | 'warehouse'
  | 'worship'
  | 'other'

export interface FloorContext {
  levelIndex: number
  totalFloors: number
  floorRole: string
  isGround: boolean
  isRoof: boolean
  programmeTags: string[]
}

export interface FloorLayoutResult {
  rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[]
  entranceMarkers?: PlanningZoneMarker[]
  warnings?: string[]
  valid?: boolean
  structuralGrid?: StructuralGrid
  coreLayout?: CoreLayout
  floorPlateMetrics?: FloorPlateMetrics
  adjacencyGraph?: AdjacencyGraphModel
  bubbleDiagram?: BubbleDiagram
}

export interface TypologyStrategy {
  id: string
  name: string
  generate: (
    program: { name: string; ratio: number }[],
    width: number,
    height: number,
    seed?: number,
    floorContext?: FloorContext,
  ) => FloorLayoutResult
}
