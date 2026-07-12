import type { BuildingGraph } from '../../domain/building'
import type { InteriorProject, InteriorRoom, InteriorRoomType, FinishSpec, FixtureInstance, MaterialAssignment } from '../../domain/interior'
import { uuid } from '../../lib/utils'

const PROGRAMME_TO_INTERIOR_TYPE: Record<string, InteriorRoomType> = {
  bedroom: 'bedroom',
  living: 'living',
  dining: 'dining',
  kitchen: 'kitchen',
  bathroom: 'bathroom',
  ensuite: 'ensuite',
  hallway: 'hallway',
  study: 'study',
  lounge: 'lounge',
  laundry: 'laundry',
  pantry: 'pantry',
  office: 'office',
  playroom: 'playroom',
  gym: 'gym',
  cinema: 'cinema',
  storage: 'storage',
  entry: 'entry',
  landing: 'landing',
  balcony: 'balcony',
}

function toInteriorRoomType(programme: string): InteriorRoomType {
  return PROGRAMME_TO_INTERIOR_TYPE[programme] ?? 'other'
}

function spaceCenter(space: { bbox: { minX: number; minY: number; maxX: number; maxY: number } }) {
  return {
    x: (space.bbox.minX + space.bbox.maxX) / 2,
    y: (space.bbox.minY + space.bbox.maxY) / 2,
  }
}

function spaceDimensions(space: { bbox: { minX: number; minY: number; maxX: number; maxY: number } }) {
  return {
    width: space.bbox.maxX - space.bbox.minX,
    height: space.bbox.maxY - space.bbox.minY,
  }
}

export function buildingGraphToInteriorProject(graph: BuildingGraph): InteriorProject | null {
  if (!graph || graph.spaces.length === 0) return null

  const rooms: InteriorRoom[] = []
  const fixtureInstances: FixtureInstance[] = []
  const materialAssignments: MaterialAssignment[] = []

  for (const space of graph.spaces) {
    const center = spaceCenter(space)
    const dims = spaceDimensions(space)

    const finishSpec: FinishSpec = {
      wallMaterialId: space.finishSpec.wallMaterialId ?? null,
      floorMaterialId: space.finishSpec.floorMaterialId ?? null,
      ceilingMaterialId: space.finishSpec.ceilingMaterialId ?? null,
      wallFinish: space.finishSpec.wallFinish,
      floorFinish: space.finishSpec.floorFinish,
      ceilingFinish: space.finishSpec.ceilingFinish,
    }

    const room: InteriorRoom = {
      roomId: space.id,
      roomType: toInteriorRoomType(space.programme),
      name: space.name,
      position: center,
      dimensions: dims,
      rotation: 0,
      finishSpec,
      notes: space.notes ?? '',
    }
    rooms.push(room)

    for (const fi of space.fixtures) {
      fixtureInstances.push({
        instanceId: fi.instanceId,
        fixtureTypeId: fi.fixtureTypeId,
        position: fi.position,
        rotation: fi.rotation,
        flipped: fi.flipped,
        roomId: space.id,
      })
    }

    if (space.finishSpec.wallMaterialId) {
      materialAssignments.push({
        assignmentId: uuid(),
        roomId: space.id,
        surface: 'wall',
        materialId: space.finishSpec.wallMaterialId,
        coverageM2: estimateWallCoverage(space, graph),
      })
    }

    if (space.finishSpec.floorMaterialId) {
      materialAssignments.push({
        assignmentId: uuid(),
        roomId: space.id,
        surface: 'floor',
        materialId: space.finishSpec.floorMaterialId,
        coverageM2: space.areaM2,
      })
    }

    if (space.finishSpec.ceilingMaterialId) {
      materialAssignments.push({
        assignmentId: uuid(),
        roomId: space.id,
        surface: 'ceiling',
        materialId: space.finishSpec.ceilingMaterialId,
        coverageM2: space.areaM2,
      })
    }
  }

  return {
    id: uuid(),
    projectId: graph.meta.projectId,
    rooms,
    fixtures: fixtureInstances,
    materialAssignments,
    createdAt: graph.meta.createdAt,
    updatedAt: graph.meta.updatedAt,
  }
}

function estimateWallCoverage(space: { bbox: { minX: number; minY: number; maxX: number; maxY: number }; areaM2: number }, graph: BuildingGraph): number {
  const lev = graph.levels[0]
  const floorHeight = lev?.floorHeight ?? 3
  const width = space.bbox.maxX - space.bbox.minX
  const height = space.bbox.maxY - space.bbox.minY
  const perimeter = 2 * (width + height)
  const openingsEstimate = 0.15
  return perimeter * floorHeight * (1 - openingsEstimate)
}
