import type { BuildingGraph } from '../../domain/building'
import { computeGraphQuantities } from '../../domain/building'
import type { GeometryQuantities } from '../geometryQuantitiesAdapter'

export function extractGraphQuantities(graph: BuildingGraph): GeometryQuantities {
  if (!graph || graph.levels.length === 0) {
    return {
      designId: graph?.meta?.id ?? '',
      designName: graph?.meta?.name ?? '',
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
      warnings: ['BuildingGraph has no levels'],
    }
  }

  const q = computeGraphQuantities(graph)
  const warnings: string[] = []

  const floorCount = graph.levels.length

  const wetRoomTypesSet = new Set(['bathroom', 'ensuite', 'kitchen', 'laundry', 'pantry'])
  let wetRoomCount = 0
  let kitchenCount = 0
  let bedroomCount = 0
  let clinicRoomCount = 0

  for (const space of graph.spaces) {
    const prog = space.programme
    if (prog === 'bathroom' || prog === 'ensuite') wetRoomCount++
    if (prog === 'kitchen') { wetRoomCount++; kitchenCount++ }
    if (prog === 'laundry' || prog === 'pantry') wetRoomCount++
    if (prog === 'bedroom') bedroomCount++
    if (prog === 'consultation') clinicRoomCount++
  }

  if (graph.walls.length === 0) {
    warnings.push('BuildingGraph has no walls; quantities may be zero')
  }

  const extWalls = graph.walls.filter((w) => w.role === 'external')
  const intWalls = graph.walls.filter((w) => w.role === 'internal')
  const doors = graph.openings.filter((o) => o.kind === 'door')
  const windows = graph.openings.filter((o) => o.kind === 'window')

  const doorArea = doors.reduce((s, d) => s + d.width * d.height, 0)
  const windowArea = windows.reduce((s, w) => s + w.width * w.height, 0)

  const footPrint = graph.spaces.length > 0
    ? graph.spaces[0].areaM2
    : q.grossFloorArea / Math.max(floorCount, 1)

  const finishArea = graph.spaces.reduce((s, sp) => s + sp.areaM2, 0)

  return {
    designId: graph.meta.id,
    designName: graph.meta.name,
    floors: floorCount,
    grossFloorArea: q.grossFloorArea,
    footprintArea: footPrint,
    slabArea: q.grossFloorArea,
    roofArea: q.roofArea,
    externalWallLength: extWalls.length > 0
      ? extWalls.reduce((s, w) => s + Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), 0)
      : 0,
    internalWallLength: intWalls.length > 0
      ? intWalls.reduce((s, w) => s + Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), 0)
      : 0,
    externalWallArea: q.externalWallArea,
    internalWallArea: q.partitionArea,
    partitionArea: q.partitionArea,
    doorCount: doors.length,
    windowCount: windows.length,
    doorArea,
    windowArea,
    openingArea: doorArea + windowArea,
    roomCount: q.roomCount,
    wetRoomCount,
    kitchenCount,
    bedroomCount,
    clinicRoomCount,
    finishFloorArea: finishArea,
    serviceZoneArea: graph.serviceZones.reduce((s, z) => s + z.areaM2, 0),
    warnings,
  }
}
