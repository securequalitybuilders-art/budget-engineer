import type { BuildingGraph } from '../../domain/building'
import type { StructuralMaterial, SimpleWall, ColumnPlacement, BeamConnection, FootingPlacement } from '../../lib/structural/structural-types'
import { computeColumnPositions, computeBeamConnections, computeFootingPlacements } from '../../lib/structural/structural-generator'

export interface StructuralDesignInput {
  walls: SimpleWall[]
  slabAreaM2: number
  floorCount: number
  material: StructuralMaterial
}

export interface StructuralGenerationResult {
  columns: ColumnPlacement[]
  beams: BeamConnection[]
  footings: FootingPlacement[]
}

export function buildingToStructuralInput(graph: BuildingGraph): StructuralDesignInput {
  const walls: SimpleWall[] = graph.walls.map((w) => ({
    id: w.id,
    start: { x: w.start.x, y: w.start.y },
    end: { x: w.end.x, y: w.end.y },
    structural: w.role === 'structural' || w.role === 'exterior',
  }))

  const slabAreaM2 = graph.spaces.reduce((sum, s) => sum + s.areaM2, 0)
  const floorCount = graph.levels.length

  const material: StructuralMaterial = 'concrete'

  return { walls, slabAreaM2, floorCount, material }
}

export function generateStructuralElements(input: StructuralDesignInput): StructuralGenerationResult {
  const columns = computeColumnPositions(input.walls, [], input.material)
  const beams = computeBeamConnections(columns, input.walls, input.material)
  const footings = computeFootingPlacements(columns, [], input.material)

  return { columns, beams, footings }
}

export function buildingToStructuralGeneration(graph: BuildingGraph): StructuralGenerationResult {
  const input = buildingToStructuralInput(graph)
  return generateStructuralElements(input)
}
