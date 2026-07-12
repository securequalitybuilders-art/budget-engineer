import type { BuildingGraph, Roof, Slab } from '../../domain/building'
import type { BimModel, BimElement, BimWall, BimSlab, BimOpening, BimRoomZone, BimRoof, BimBlock } from '../../domain/bim'
import { getLevelsSorted, getSpacesOnLevel, getWallsOnLevel, getOpeningsOnLevel } from '../../domain/building'
import { uuid } from '../../lib/utils'

const DEFAULT_FLOOR_HEIGHT = 3

function ifcClassForSpaceProgramme(programme: string): string {
  const map: Record<string, string> = {
    bedroom: 'IfcSpace',
    living: 'IfcSpace',
    kitchen: 'IfcSpace',
    bathroom: 'IfcSpace',
    ensuite: 'IfcSpace',
    hallway: 'IfcSpace',
    office: 'IfcSpace',
    storage: 'IfcSpace',
    stairwell: 'IfcSpace',
    parking: 'IfcSpace',
    plant: 'IfcSpace',
  }
  return map[programme] ?? 'IfcSpace'
}

function bimFloorHeight(levelElevation: number, levelNumber: number, graph: BuildingGraph): number {
  const sorted = getLevelsSorted(graph)
  const idx = sorted.findIndex((l) => l.number === levelNumber)
  const next = sorted[idx + 1]
  if (next) return next.elevation - levelElevation
  return DEFAULT_FLOOR_HEIGHT
}

function computeWallElevation(wallStartZ: number, wallEndZ: number): number {
  return Math.min(wallStartZ, wallEndZ)
}

export function buildingGraphToBimModel(graph: BuildingGraph): BimModel | null {
  if (!graph || graph.levels.length === 0) return null

  const sortedLevels = getLevelsSorted(graph)
  const elements: BimElement[] = []

  const bimFloors = sortedLevels.map((l) => ({
    id: `level-${l.id}`,
    name: l.name,
    elevation: l.elevation,
    height: l.floorHeight ?? bimFloorHeight(l.elevation, l.number, graph),
  }))

  for (const level of sortedLevels) {
    const floorId = `level-${level.id}`
    const spaces = getSpacesOnLevel(graph, level.id)
    const walls = getWallsOnLevel(graph, level.id)
    const openings = getOpeningsOnLevel(graph, level.id)

    for (const wall of walls) {
      const element: BimWall = {
        id: wall.id,
        projectId: graph.meta.projectId,
        floorId,
        name: `${wall.role === 'external' ? 'External' : 'Internal'} Wall ${wall.id}`,
        ifcClass: wall.ifcClass || 'IfcWall',
        material: wall.material || 'concrete',
        properties: { ...wall.properties, role: wall.role },
        type: 'wall',
        start: { x: wall.start.x, y: wall.start.y, z: wall.start.z },
        end: { x: wall.end.x, y: wall.end.y, z: wall.end.z },
        thickness: wall.thickness,
        height: wall.height,
      }
      elements.push(element)
    }

    for (const slab of graph.slabs.filter((s) => s.levelId === level.id)) {
      const bbox = slabBoundaryBBox(slab)
      const element: BimSlab = {
        id: slab.id,
        projectId: graph.meta.projectId,
        floorId,
        name: `${level.name} slab`,
        ifcClass: slab.ifcClass || 'IfcSlab',
        material: slab.material || 'concrete',
        properties: { ...slab.properties },
        type: 'slab',
        origin: { x: bbox.minX, y: level.elevation, z: bbox.minY },
        width: bbox.maxX - bbox.minX,
        depth: bbox.maxY - bbox.minY,
        thickness: slab.thickness,
      }
      elements.push(element)
    }

    for (const opening of openings) {
      const wall = walls.find((w) => w.id === opening.wallId)
      const wallElevation = wall
        ? computeWallElevation(wall.start.y, wall.end.y)
        : level.elevation
      const offset = opening.offsetRatio
      let cx = 0
      let cz = 0
      if (wall) {
        cx = wall.start.x + (wall.end.x - wall.start.x) * offset
        cz = wall.start.z + (wall.end.z - wall.start.z) * offset
      }

      const element: BimOpening = {
        id: opening.id,
        projectId: graph.meta.projectId,
        floorId,
        name: opening.kind === 'door' ? 'Door' : opening.kind === 'window' ? 'Window' : opening.kind,
        ifcClass: opening.ifcClass || (opening.kind === 'door' ? 'IfcDoor' : opening.kind === 'window' ? 'IfcWindow' : 'IfcOpeningElement'),
        material: opening.material || (opening.kind === 'door' ? 'timber' : 'glass'),
        properties: { ...opening.properties, kind: opening.kind, wallId: opening.wallId, offsetRatio: opening.offsetRatio },
        type: 'opening',
        wallId: opening.wallId,
        center: { x: cx, y: wallElevation + opening.sillHeight + opening.height / 2, z: cz },
        width: opening.width,
        height: opening.height,
        sillHeight: opening.sillHeight,
      }
      elements.push(element)
    }

    for (const space of spaces) {
      const element: BimRoomZone = {
        id: `zone-${space.id}`,
        projectId: graph.meta.projectId,
        floorId,
        name: space.name,
        ifcClass: ifcClassForSpaceProgramme(space.programme),
        material: '',
        properties: { programme: space.programme, areaM2: space.areaM2 },
        type: 'roomZone',
        origin: { x: space.bbox.minX, y: level.elevation, z: space.bbox.minY },
        width: space.bbox.maxX - space.bbox.minX,
        depth: space.bbox.maxY - space.bbox.minY,
        height: level.floorHeight || DEFAULT_FLOOR_HEIGHT,
      }
      elements.push(element)
    }

    for (const column of graph.columns.filter((c) => c.levelId === level.id)) {
      const element: BimBlock = {
        id: column.id,
        projectId: graph.meta.projectId,
        floorId,
        name: `Column ${column.id}`,
        ifcClass: column.ifcClass || 'IfcColumn',
        material: column.material || 'concrete',
        properties: { ...column.properties },
        type: 'block',
        kind: 'column',
        position: { x: column.position.x, y: level.elevation, z: column.position.y },
        width: column.width,
        depth: column.depth,
        height: column.height,
      }
      elements.push(element)
    }

    for (const beam of graph.beams.filter((b) => b.levelId === level.id)) {
      const element: BimBlock = {
        id: beam.id,
        projectId: graph.meta.projectId,
        floorId,
        name: `Beam ${beam.id}`,
        ifcClass: beam.ifcClass || 'IfcBeam',
        material: beam.material || 'concrete',
        properties: { ...beam.properties },
        type: 'block',
        kind: 'beam',
        position: { x: (beam.start.x + beam.end.x) / 2, y: level.elevation, z: (beam.start.z + beam.end.z) / 2 },
        width: beam.width,
        depth: beam.end.z - beam.start.z,
        height: beam.depth,
      }
      elements.push(element)
    }
  }

  for (const stair of graph.stairs) {
    const level = sortedLevels.find((l) => l.id === stair.levelId)
    if (!level) continue
    const fromLevel = sortedLevels.find((l) => l.id === stair.fromLevelId)
    const element: BimBlock = {
      id: stair.id,
      projectId: graph.meta.projectId,
      floorId: `level-${stair.levelId}`,
      name: `Stair ${stair.id}`,
      ifcClass: 'IfcStair',
      material: stair.material || 'concrete',
      properties: { ...stair.properties, stairType: stair.stairType, treadCount: stair.treadCount, rise: stair.rise, going: stair.going },
      type: 'block',
      kind: 'stair',
      position: { x: 0, y: (fromLevel?.elevation ?? level.elevation) + stair.rise * stair.treadCount / 2, z: 0 },
      width: stair.width,
      depth: stair.going * stair.treadCount,
      height: stair.rise * stair.treadCount,
    }
    elements.push(element)
  }

  if (graph.roof) {
    const topLevel = sortedLevels[sortedLevels.length - 1]
    const bbox = roofBoundaryBBox(graph.roof)
    const element: BimRoof = {
      id: graph.roof.id,
      projectId: graph.meta.projectId,
      floorId: `level-${topLevel.id}`,
      name: 'Roof',
      ifcClass: 'IfcRoof',
      material: 'concrete',
      properties: { roofType: graph.roof.roofType, pitch: graph.roof.pitch },
      type: 'roof',
      origin: { x: bbox.minX, y: topLevel.elevation + (topLevel.floorHeight || DEFAULT_FLOOR_HEIGHT), z: bbox.minY },
      width: bbox.maxX - bbox.minX,
      depth: bbox.maxY - bbox.minY,
      thickness: graph.roof.thickness,
    }
    elements.push(element)
  }

  return {
    id: uuid(),
    projectId: graph.meta.projectId,
    name: graph.meta.name,
    floors: bimFloors,
    elements,
  }
}

function slabBoundaryBBox(slab: Slab): { minX: number; minY: number; maxX: number; maxY: number } {
  const v = slab.boundary.vertices
  if (v.length === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 8 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of v) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

function roofBoundaryBBox(roof: Roof): { minX: number; minY: number; maxX: number; maxY: number } {
  return slabBoundaryBBox({ ...roof } as unknown as Slab)
}
