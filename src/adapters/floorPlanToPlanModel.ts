import type { PlanModel, RoomRect, WallSegment, Opening } from '@/domain/plan'
import type { FloorPlan } from '@/engine/tier3/layoutEngine'
import type { DesignOption } from '@/domain/boq'

const uid = () => Math.random().toString(36).slice(2, 10)
const roomPalette = ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309', '#6d28d9', '#0e7490']

function assertFiniteSize(value: number, label: string, roomName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`floorPlanToPlanModel: non-finite ${label} for room "${roomName}" (got ${value})`)
  }
}

function buildRooms(floorPlan: FloorPlan): RoomRect[] {
  return floorPlan.rooms.map((r, i) => {
    assertFiniteSize(r.width, 'width', r.name)
    assertFiniteSize(r.height, 'height', r.name)
    return {
      id: uid(),
      name: r.name,
      x: Number(r.x.toFixed(2)),
      y: Number(r.y.toFixed(2)),
      width: Number(r.width.toFixed(2)),
      height: Number(r.height.toFixed(2)),
      color: roomPalette[i % roomPalette.length],
    }
  })
}

function outerWalls(width: number, height: number, thickness: number): WallSegment[] {
  return [
    { id: uid(), start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness, type: 'external' },
    { id: uid(), start: { x: width, y: 0 }, end: { x: width, y: height }, thickness, type: 'external' },
    { id: uid(), start: { x: width, y: height }, end: { x: 0, y: height }, thickness, type: 'external' },
    { id: uid(), start: { x: 0, y: height }, end: { x: 0, y: 0 }, thickness, type: 'external' },
  ]
}

function internalWalls(rooms: RoomRect[], thickness: number): WallSegment[] {
  const walls: WallSegment[] = []
  const seen = new Set<string>()

  for (const room of rooms) {
    const edges = [
      { start: { x: room.x + room.width, y: room.y }, end: { x: room.x + room.width, y: room.y + room.height } },
      { start: { x: room.x, y: room.y + room.height }, end: { x: room.x + room.width, y: room.y + room.height } },
    ]

    for (const edge of edges) {
      const key = `${edge.start.x},${edge.start.y}:${edge.end.x},${edge.end.y}`
      if (seen.has(key)) continue
      seen.add(key)
      walls.push({ id: uid(), start: edge.start, end: edge.end, thickness, type: 'internal' })
    }
  }

  return walls
}

function defaultOpenings(walls: WallSegment[]): Opening[] {
  const openings: Opening[] = []
  const extWalls = walls.filter((w) => w.type === 'external')
  const intWalls = walls.filter((w) => w.type === 'internal')

  if (extWalls[2]) openings.push({ id: uid(), wallId: extWalls[2].id, kind: 'door', offset: 0.42, width: 1.2 })
  extWalls.slice(0, 3).forEach((wall, index) => {
    openings.push({ id: uid(), wallId: wall.id, kind: 'window', offset: 0.2 + index * 0.18, width: 1.5 })
  })
  intWalls.slice(0, 5).forEach((wall) => {
    openings.push({ id: uid(), wallId: wall.id, kind: 'door', offset: 0.45, width: 0.9 })
  })

  return openings
}

export function floorPlanToPlanModel(
  floorPlan: FloorPlan,
  designOption: DesignOption,
): PlanModel {
  const wallThickness = 0.2
  const rooms = buildRooms(floorPlan)
  const walls = [
    ...outerWalls(floorPlan.width, floorPlan.height, wallThickness),
    ...internalWalls(rooms, 0.12),
  ]
  const openings = defaultOpenings(walls)

  return {
    id: uid(),
    designOptionId: designOption.id,
    width: floorPlan.width,
    height: floorPlan.height,
    wallThickness,
    rooms,
    walls,
    openings,
    scaleLabel: '1:100 @ A3',
  }
}
