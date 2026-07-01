import type { DesignOption } from '@/domain/boq'
import { buildDesignGeometry } from './designGeometryAdapter'

export interface GeometryQuantities {
  designId: string
  designName: string
  floors: number
  grossFloorArea: number
  footprintArea: number
  slabArea: number
  roofArea: number
  externalWallLength: number
  internalWallLength: number
  externalWallArea: number
  internalWallArea: number
  partitionArea: number
  doorCount: number
  windowCount: number
  doorArea: number
  windowArea: number
  openingArea: number
  roomCount: number
  wetRoomCount: number
  kitchenCount: number
  bedroomCount: number
  clinicRoomCount: number
  finishFloorArea: number
  serviceZoneArea: number
  warnings: string[]
}

function clampFinite(n: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function wallLen(start: { x: number; y: number }, end: { x: number; y: number }): number {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

const WALL_HEIGHT = 3

export function extractGeometryQuantities(design: DesignOption | null): GeometryQuantities {
  if (!design || design.grossFloorArea <= 0 || design.floors <= 0) {
    return {
      designId: design?.id ?? '',
      designName: design?.name ?? '',
      floors: 0,
      grossFloorArea: 0,
      footprintArea: 0,
      slabArea: 0,
      roofArea: 0,
      externalWallLength: 0,
      internalWallLength: 0,
      externalWallArea: 0,
      internalWallArea: 0,
      partitionArea: 0,
      doorCount: 0,
      windowCount: 0,
      doorArea: 0,
      windowArea: 0,
      openingArea: 0,
      roomCount: 0,
      wetRoomCount: 0,
      kitchenCount: 0,
      bedroomCount: 0,
      clinicRoomCount: 0,
      finishFloorArea: 0,
      serviceZoneArea: 0,
      warnings: ['No design provided'],
    }
  }

  const geo = buildDesignGeometry(design)
  const warnings: string[] = [...geo.warnings]
  const floorCount = design.floors

  let externalLength = 0
  let internalLength = 0
  for (const wall of geo.walls) {
    const len = wallLen(wall.start, wall.end)
    if (wall.kind === 'external') externalLength += len
    else internalLength += len
  }
  externalLength = clampFinite(externalLength)
  internalLength = clampFinite(internalLength)

  const externalArea = clampFinite(externalLength * WALL_HEIGHT)
  const internalArea = clampFinite(internalLength * WALL_HEIGHT)

  let doorCount = 0
  let windowCount = 0
  let doorArea = 0
  let windowArea = 0
  for (const opening of geo.openings) {
    if (opening.type === 'door') {
      doorCount++
      doorArea += clampFinite(opening.width * opening.height)
    } else {
      windowCount++
      windowArea += clampFinite(opening.width * opening.height)
    }
  }

  let roomCount = 0
  let wetRoomCount = 0
  let kitchenCount = 0
  let bedroomCount = 0
  let clinicRoomCount = 0
  let finishFloorArea = 0
  for (const room of geo.rooms) {
    roomCount++
    finishFloorArea += clampFinite(room.area)
    const t = room.type
    if (t === 'bathroom' || t === 'toilets') wetRoomCount++
    if (t === 'kitchen' || t === 'kitchenette') kitchenCount++
    if (t === 'bedroom') bedroomCount++
    if (t === 'consultation') clinicRoomCount++
  }
  finishFloorArea = clampFinite(finishFloorArea)

  const footprintArea = clampFinite(geo.width * geo.depth)
  const slabArea = clampFinite(footprintArea * floorCount)
  const roofArea = clampFinite(footprintArea)
  const openingArea = clampFinite(doorArea + windowArea)

  let serviceZoneArea = 0
  for (const zone of geo.zones) {
    serviceZoneArea += clampFinite(zone.area)
  }
  serviceZoneArea = clampFinite(serviceZoneArea)

  if (geo.walls.length === 0) {
    warnings.push('Generated geometry has no walls; quantities may be zero')
  }

  return {
    designId: design.id,
    designName: design.name,
    floors: floorCount,
    grossFloorArea: design.grossFloorArea,
    footprintArea,
    slabArea,
    roofArea,
    externalWallLength: externalLength,
    internalWallLength: internalLength,
    externalWallArea: externalArea,
    internalWallArea: internalArea,
    partitionArea: internalArea,
    doorCount,
    windowCount,
    doorArea,
    windowArea,
    openingArea,
    roomCount,
    wetRoomCount,
    kitchenCount,
    bedroomCount,
    clinicRoomCount,
    finishFloorArea,
    serviceZoneArea,
    warnings,
  }
}
