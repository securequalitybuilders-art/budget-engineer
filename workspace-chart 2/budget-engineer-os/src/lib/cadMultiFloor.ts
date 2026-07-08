import type { CadDocument } from '../domain/cad'
import type { PlanModel } from '../domain/plan'
import { cadDocumentToRichPlanModel } from './cadPlanSync'

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

export function projectDocumentAtActiveFloor(doc: CadDocument, base?: PlanModel | null): PlanModel {
  return cadDocumentToRichPlanModel(doc, base)
}
