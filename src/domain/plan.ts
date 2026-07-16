export interface Point {
  x: number
  y: number
}

export interface RoomRect {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export interface WallSegment {
  id: string
  start: Point
  end: Point
  thickness: number
  type: 'external' | 'internal'
}

export interface Opening {
  id: string
  wallId: string
  kind: 'door' | 'window'
  /** Ratio (0–1) from wall start to opening centre */
  offset: number
  /** Opening width in metres */
  width: number
  /** Opening height in metres (defaults by kind in planTo3d) */
  height?: number
  /** Sill height above floor in metres (defaults by kind) */
  sillHeight?: number
}

export type PlanSource = 'persisted-plan' | 'advanced-generated-plan' | 'tier3-floorplan' | 'legacy-fallback-plan' | 'unknown' | 'canonical-generated-plan' | 'canonical-generated-plan-rejected'

export type EntranceMarkerClass = 'retail-public' | 'residential-private' | 'service-boh'

export interface PlanningZoneMarker {
  id: string
  type: EntranceMarkerClass
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface PlanModel {
  id: string
  designOptionId: string
  width: number
  height: number
  wallThickness: number
  rooms: RoomRect[]
  walls: WallSegment[]
  openings: Opening[]
  scaleLabel: string
  planSource?: PlanSource
  entranceMarkers?: PlanningZoneMarker[]
}

export function getPlanSource(plan: PlanModel): PlanSource {
  return plan.planSource ?? 'unknown'
}
