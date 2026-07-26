import type { CadDocument, CadWall } from '../../domain/cad'
import type { Opening, PlanModel, RoomRect, WallSegment } from '../../domain/plan'

const uid = () => Math.random().toString(36).slice(2, 10)

export function cadDocumentToPlanModel(doc: CadDocument, base?: PlanModel | null): PlanModel {
  const activeWalls = doc.walls.filter((wall) => wall.floorId === doc.activeFloorId)
  const activeOpenings = doc.openings.filter((opening) => opening.floorId === doc.activeFloorId)

  const walls: WallSegment[] = activeWalls.map((wall) => ({
    id: wall.id,
    start: wall.start,
    end: wall.end,
    thickness: wall.thickness,
    type: wall.structuralRole,
  }))

  const openings: Opening[] = activeOpenings.map((opening) => ({
    id: opening.id,
    wallId: opening.wallId,
    kind: opening.kind,
    offset: opening.offsetRatio,
    width: opening.width,
  }))

  const width = base?.width ?? estimateWidth(activeWalls)
  const height = base?.height ?? estimateHeight(activeWalls)
  const rooms: RoomRect[] = base?.rooms ?? []

  return {
    id: uid(),
    designOptionId: doc.designId,
    width,
    height,
    wallThickness: 0.2,
    rooms,
    walls,
    openings,
    scaleLabel: base?.scaleLabel ?? '1:100 @ A3',
  }
}

function estimateWidth(walls: CadWall[]) {
  const xs = walls.flatMap((wall) => [wall.start.x, wall.end.x])
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 10
}

function estimateHeight(walls: CadWall[]) {
  const ys = walls.flatMap((wall) => [wall.start.y, wall.end.y])
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 10
}
