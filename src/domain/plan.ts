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
}
