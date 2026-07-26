import type { BuildingGraph, Space, Wall, Opening } from '../../domain/building'
import type { PlanModel, RoomRect, WallSegment, Opening as PlanOpening, Point } from '../../domain/plan'

function spaceToRoomRect(space: Space): RoomRect {
  return {
    id: space.id.replace('space-', 'room-'),
    name: space.name,
    x: space.bbox.minX,
    y: space.bbox.minY,
    width: space.bbox.maxX - space.bbox.minX,
    height: space.bbox.maxY - space.bbox.minY,
  }
}

function wallToSegment(wall: Wall): WallSegment {
  return {
    id: wall.id.replace('wall-', ''),
    start: { x: wall.start.x, y: wall.start.y } as Point,
    end: { x: wall.end.x, y: wall.end.y } as Point,
    thickness: wall.thickness,
    type: wall.role === 'external' ? 'external' : 'internal',
  }
}

function openingToPlanOpening(o: Opening): PlanOpening {
  return {
    id: o.id.replace('opening-', ''),
    wallId: o.wallId.replace('wall-', ''),
    kind: o.kind === 'door' ? 'door' : 'window',
    offset: o.offsetRatio,
    width: o.width,
    height: o.height,
    sillHeight: o.sillHeight,
  }
}

export function buildingGraphToPlanModel(graph: BuildingGraph): PlanModel {
  const level = graph.levels[0]
  if (!level) throw new Error('BuildingGraph has no levels — cannot project PlanModel')

  const spacesOnLevel = graph.spaces.filter((s) => s.levelId === level.id)
  const wallsOnLevel = graph.walls.filter((w) => w.levelId === level.id)
  const openingsOnLevel = graph.openings.filter((o) => o.levelId === level.id)

  const rooms = spacesOnLevel.map(spaceToRoomRect)
  const walls = wallsOnLevel.map(wallToSegment)
  const openings = openingsOnLevel.map(openingToPlanOpening)

  const allCoords = [
    ...rooms.flatMap((r) => [r.x, r.y, r.x + r.width, r.y + r.height]),
    ...walls.flatMap((w) => [w.start.x, w.start.y, w.end.x, w.end.y]),
  ]
  const width = allCoords.length > 0 ? Math.max(...allCoords.filter((_, i) => i % 2 === 0).map(Math.abs)) : 30
  const height = allCoords.length > 0 ? Math.max(...allCoords.filter((_, i) => i % 2 === 1).map(Math.abs)) : 30

  return {
    id: `plan-${graph.meta.id}`,
    designOptionId: graph.meta.projectId,
    width: Math.max(width, 1),
    height: Math.max(height, 1),
    wallThickness: wallsOnLevel[0]?.thickness ?? 0.2,
    rooms,
    walls,
    openings,
    scaleLabel: '1:100',
  }
}
