import type { BuildingGraph } from '../../domain/building'
import type { SunPosition, ShadowPolygon } from '../../domain/site'
import { computeSunPosition, computeSunPath, computeAnnualExposure } from '../../engine/analysis/heliodon'
import { computeShadowPolygon as engineComputeShadow } from '../../engine/analysis/shadowCast'

export interface ShadowStudyConfig {
  date: Date
  hourly: boolean
  daily: boolean
}

export function buildingGraphShadowStudy(
  graph: BuildingGraph,
  config: ShadowStudyConfig
): ShadowPolygon[] {
  if (!graph.site || graph.walls.length === 0) return []

  const { lat, lng } = graph.site
  const building = buildingFootprint(graph)

  if (config.hourly) {
    const positions = computeSunPath(lat, lng, config.date)
    return positions.map((pos) => engineComputeShadow(building, pos, pos.time))
  }

  if (config.daily) {
    const noon = computeSunPosition(lat, lng, config.date, 12)
    return [engineComputeShadow(building, noon, config.date)]
  }

  return []
}

export function buildingGraphNoonShadow(
  graph: BuildingGraph,
  date?: Date
): ShadowPolygon | null {
  if (!graph.site || graph.walls.length === 0) return null

  const d = date ?? new Date()
  const { lat, lng } = graph.site
  const building = buildingFootprint(graph)
  const noon = computeSunPosition(lat, lng, d, 12)
  return engineComputeShadow(building, noon, d)
}

export function buildingGraphSunPositions(
  graph: BuildingGraph,
  date?: Date
): SunPosition[] {
  if (!graph.site) return []
  const d = date ?? new Date()
  return computeSunPath(graph.site.lat, graph.site.lng, d)
}

export function buildingGraphOptimalOrientation(graph: BuildingGraph): number | null {
  if (!graph.site) return null

  const { lat } = graph.site
  const angles = [0, 45, 90, 135, 180, 225, 270, 315]
  let bestAngle = 0
  let bestKwh = -1

  for (const angle of angles) {
    const { annualKwhM2 } = computeAnnualExposure(lat, angle)
    if (annualKwhM2 > bestKwh) {
      bestKwh = annualKwhM2
      bestAngle = angle
    }
  }

  return bestAngle
}

function buildingFootprint(graph: BuildingGraph): { vertices: { x: number; y: number }[]; height: number } {
  const sorted = [...graph.levels].sort((a, b) => a.number - b.number)
  const topLevel = sorted[sorted.length - 1]
  const floorHeight = topLevel?.floorHeight ?? 3
  const totalHeight = sorted.length * floorHeight

  const externalWalls = graph.walls.filter((w) => w.role === 'external')
  if (externalWalls.length >= 3) {
    const vertices = externalWalls.map((w) => ({ x: w.start.x, y: w.start.z }))
    return { vertices, height: totalHeight }
  }

  if (graph.slabs.length > 0) {
    const slab = graph.slabs[0]
    const vertices = slab.boundary.vertices.map((v) => ({ x: v.x, y: v.y }))
    return { vertices, height: totalHeight }
  }

  const w = graph.walls
  if (w.length > 0) {
    const vertices = w.map((wall) => ({ x: wall.start.x, y: wall.start.z }))
    return { vertices, height: totalHeight }
  }

  return { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }], height: totalHeight }
}

