import type { CadDocument } from '../domain/cad'
import type { PlanModel } from '../domain/plan'
import { cadDocumentToPlanModel } from './cadProjection'
import { reconstructRoomsFromWalls } from './cadTopology'

export function cadDocumentToRichPlanModel(doc: CadDocument, base?: PlanModel | null): PlanModel {
  const projected = cadDocumentToPlanModel(doc, base)
  const rooms = reconstructRoomsFromWalls(doc)
  return {
    ...projected,
    rooms: rooms.length > 0 ? rooms : projected.rooms,
  }
}
