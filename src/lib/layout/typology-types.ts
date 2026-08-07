import type { PlanningZoneMarker } from '../../domain/plan'

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
}

export interface TypologyStrategy {
  id: BuildingTypology
  name: string
  generate: (
    program: { name: string; ratio: number }[],
    width: number,
    height: number,
    seed?: number,
    floorContext?: FloorContext,
  ) => FloorLayoutResult
}
