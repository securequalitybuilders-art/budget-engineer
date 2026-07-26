import type { CadDocument } from '../../domain/cad'

export interface FloorProjectionSummary {
  floorId: string
  floorName: string
  elevation: number
  wallCount: number
  openingCount: number
}

export function getFloorProjectionSummaries(doc: CadDocument): FloorProjectionSummary[] {
  return doc.floors.map((floor) => ({
    floorId: floor.id,
    floorName: floor.name,
    elevation: floor.elevation,
    wallCount: doc.walls.filter((wall) => wall.floorId === floor.id).length,
    openingCount: doc.openings.filter((opening) => opening.floorId === floor.id).length,
  }))
}
