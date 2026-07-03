import type { DesignOption } from '../domain/boq'
import type { Opening, PlanModel, RoomRect, WallSegment } from '../domain/plan'
import { getRoomProgram } from './roomPrograms'
import { isResidential } from './buildingTypes'

const uid = () => Math.random().toString(36).slice(2, 10)

const roomPalette = ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d']

function normalizeFootprint(area: number) {
  const width = Math.sqrt(area * 1.18)
  const height = area / width
  return {
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
  }
}

/**
 * Area-tiers only for residential types. Other types use the fixed program from roomPrograms.
 */
function programFromArea(area: number, buildingType: string): Array<{ name: string; ratio: number }> {
  // Non-residential types use their fixed room program
  if (!isResidential(buildingType)) {
    return getRoomProgram(buildingType)
  }

  // Residential area-based tiers
  if (area <= 100) {
    return [
      { name: 'Lounge / Dining', ratio: 0.22 },
      { name: 'Kitchen', ratio: 0.1 },
      { name: 'Bedroom 1', ratio: 0.14 },
      { name: 'Bedroom 2', ratio: 0.12 },
      { name: 'Bedroom 3', ratio: 0.11 },
      { name: 'Bathroom 1', ratio: 0.07 },
      { name: 'Bathroom 2', ratio: 0.06 },
      { name: 'Circulation', ratio: 0.1 },
      { name: 'Veranda', ratio: 0.08 },
    ]
  }

  if (area <= 125) {
    return [
      { name: 'Lounge / Dining', ratio: 0.24 },
      { name: 'Kitchen', ratio: 0.11 },
      { name: 'Bedroom 1', ratio: 0.15 },
      { name: 'Bedroom 2', ratio: 0.12 },
      { name: 'Bedroom 3', ratio: 0.11 },
      { name: 'Bathroom 1', ratio: 0.07 },
      { name: 'Bathroom 2', ratio: 0.06 },
      { name: 'Study / Flex', ratio: 0.06 },
      { name: 'Circulation', ratio: 0.08 },
    ]
  }

  return [
    { name: 'Lounge / Dining', ratio: 0.23 },
    { name: 'Kitchen', ratio: 0.1 },
    { name: 'Bedroom 1', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Guest Room', ratio: 0.09 },
    { name: 'Bathroom 1', ratio: 0.06 },
    { name: 'Bathroom 2', ratio: 0.05 },
    { name: 'Study / Flex', ratio: 0.05 },
    { name: 'Circulation', ratio: 0.05 },
    { name: 'Veranda', ratio: 0.05 },
    { name: 'Store', ratio: 0.03 },
    { name: 'Laundry', ratio: 0.02 },
  ]
}

function layoutRooms(width: number, height: number, area: number, buildingType: string): RoomRect[] {
  const program = programFromArea(area, buildingType)
  const bands = [0.36, 0.34, 0.3]
  const bandHeights = bands.map((ratio) => height * ratio)
  const grouped = [program.slice(0, 3), program.slice(3, 7), program.slice(7)]

  const rooms: RoomRect[] = []
  let y = 0

  grouped.forEach((group, rowIndex) => {
    const rowHeight = bandHeights[rowIndex] ?? height * 0.3
    const ratioSum = group.reduce((sum, room) => sum + room.ratio, 0) || 1
    let x = 0

    group.forEach((item, index) => {
      const remaining = width - x
      const roomWidth = index === group.length - 1 ? remaining : width * (item.ratio / ratioSum)
      rooms.push({
        id: uid(),
        name: item.name,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        width: Number(roomWidth.toFixed(2)),
        height: Number(rowHeight.toFixed(2)),
        color: roomPalette[(rooms.length + index) % roomPalette.length],
      })
      x += roomWidth
    })

    y += rowHeight
  })

  return rooms
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
  const extWalls = walls.filter((wall) => wall.type === 'external')
  const intWalls = walls.filter((wall) => wall.type === 'internal')

  if (extWalls[2]) openings.push({ id: uid(), wallId: extWalls[2].id, kind: 'door', offset: 0.42, width: 1.2 })
  extWalls.slice(0, 3).forEach((wall, index) => {
    openings.push({ id: uid(), wallId: wall.id, kind: 'window', offset: 0.2 + index * 0.18, width: 1.5 })
  })
  intWalls.slice(0, 5).forEach((wall) => {
    openings.push({ id: uid(), wallId: wall.id, kind: 'door', offset: 0.45, width: 0.9 })
  })

  return openings
}

export function generatePlanModel(design: DesignOption): PlanModel {
  const area = design.grossFloorArea
  const buildingType = design.buildingType || 'house'
  const footprint = normalizeFootprint(area)
  const wallThickness = 0.2
  const rooms = layoutRooms(footprint.width, footprint.height, area, buildingType)
  const walls = [...outerWalls(footprint.width, footprint.height, wallThickness), ...internalWalls(rooms, 0.12)]
  const openings = defaultOpenings(walls)

  return {
    id: uid(),
    designOptionId: design.id,
    width: footprint.width,
    height: footprint.height,
    wallThickness,
    rooms,
    walls,
    openings,
    scaleLabel: '1:100 @ A3',
  }
}
