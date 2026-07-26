import type { BuildingGraph, Space, Wall, FinishSpec, FixtureInstance, DerivationResult, DerivationMeta, BBox2D, Polygon2D } from '../../domain/building'
import type { DetectedSegment } from '../../lib/import/wallDetection'
import { uuid } from '../../lib/utils'

export interface DetectionRoom {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageDetectionConfig {
  pxPerMetre: number
  defaultFloorHeight?: number
  defaultWallHeight?: number
  defaultWallThickness?: number
}

const PROG_BY_AREA_RATIO: [number, string][] = [
  [30, 'living'],
  [20, 'kitchen'],
  [15, 'bedroom'],
  [12, 'bedroom'],
  [8, 'study'],
  [6, 'bathroom'],
  [5, 'hallway'],
  [4, 'storage'],
]

function inferProgramme(areaM2: number, w: number, h: number): import('../../domain/building').RoomProgramme {
  const ratio = Math.max(w, h) / (Math.min(w, h) || 1)
  if (ratio > 3) return 'hallway'
  for (const [maxArea, prog] of PROG_BY_AREA_RATIO) {
    if (areaM2 >= maxArea) return prog as import('../../domain/building').RoomProgramme
  }
  return 'other'
}

function finishesForProgramme(programme: string): FinishSpec {
  const map: Record<string, FinishSpec> = {
    living: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'timber laminate', ceilingFinish: 'paint matt' },
    kitchen: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'tile splashback', floorFinish: 'tile porcelain', ceilingFinish: 'paint matt' },
    bedroom: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'carpet', ceilingFinish: 'paint matt' },
    bathroom: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'tile ceramic', floorFinish: 'tile ceramic', ceilingFinish: 'paint matt' },
    ensuite: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'tile ceramic', floorFinish: 'tile ceramic', ceilingFinish: 'paint matt' },
    hallway: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'tile porcelain', ceilingFinish: 'paint matt' },
    study: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'carpet', ceilingFinish: 'paint matt' },
    storage: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'concrete', ceilingFinish: 'paint matt' },
  }
  return map[programme] ?? { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'tile', ceilingFinish: 'paint matt' }
}

function fixturesForProgramme(programme: string): FixtureInstance[] {
  const map: Record<string, FixtureInstance[]> = {
    living: [{ instanceId: uuid(), fixtureTypeId: 'ft-sofa', position: { x: 0, y: 0 }, rotation: 0, flipped: false }],
    kitchen: [{ instanceId: uuid(), fixtureTypeId: 'ft-stove', position: { x: 0, y: 0 }, rotation: 0, flipped: false }],
    bedroom: [{ instanceId: uuid(), fixtureTypeId: 'ft-bed', position: { x: 0, y: 0 }, rotation: 0, flipped: false }],
    bathroom: [{ instanceId: uuid(), fixtureTypeId: 'ft-toilet', position: { x: 0, y: 0 }, rotation: 0, flipped: false }, { instanceId: uuid(), fixtureTypeId: 'ft-sink', position: { x: 0, y: 0 }, rotation: 0, flipped: false }],
  }
  return map[programme] ?? []
}

export function buildingFromImageDetection(
  walls: DetectedSegment[],
  rooms: DetectionRoom[],
  config: ImageDetectionConfig,
  meta?: Partial<import('../../domain/building').BuildingMeta>,
): DerivationResult<BuildingGraph> | null {
  if (walls.length === 0) return null

  const floorHeight = config.defaultFloorHeight ?? 3
  const wallHeight = config.defaultWallHeight ?? floorHeight
  const wallThickness = config.defaultWallThickness ?? 0.23
  const levelId = 'level-1'

  const buildingWalls: Wall[] = walls.map((w, i) => ({
    id: `wall-${i}`,
    levelId,
    role: 'internal',
    start: { x: w.x1, y: 0, z: w.y1 },
    end: { x: w.x2, y: 0, z: w.y2 },
    thickness: wallThickness,
    height: wallHeight,
    material: 'brick',
    ifcClass: 'IfcWall',
    properties: {},
  }))

  const buildingSpaces: Space[] = rooms.map((r, i) => {
    const areaM2 = r.width * r.height
    const programme = inferProgramme(areaM2, r.width, r.height)
    return {
      id: `room-${i}`,
      levelId,
      name: programme.charAt(0).toUpperCase() + programme.slice(1),
      programme,
      boundary: {
        vertices: [
          { x: r.x, y: r.y },
          { x: r.x + r.width, y: r.y },
          { x: r.x + r.width, y: r.y + r.height },
          { x: r.x, y: r.y + r.height },
        ],
      },
      bbox: { minX: r.x, minY: r.y, maxX: r.x + r.width, maxY: r.y + r.height },
      areaM2,
      finishSpec: finishesForProgramme(programme),
      fixtures: fixturesForProgramme(programme),
      notes: '',
    }
  })

  if (buildingSpaces.length === 0) {
    const wholeBbox = computeBbox(walls)
    const w = wholeBbox.maxX - wholeBbox.minX
    const h = wholeBbox.maxY - wholeBbox.minY
    const areaM2 = w * h
    buildingSpaces.push({
      id: 'room-0',
      levelId,
      name: 'Detected Room',
      programme: 'other',
      boundary: { vertices: [{ x: wholeBbox.minX, y: wholeBbox.minY }, { x: wholeBbox.maxX, y: wholeBbox.minY }, { x: wholeBbox.maxX, y: wholeBbox.maxY }, { x: wholeBbox.minX, y: wholeBbox.maxY }] },
      bbox: wholeBbox,
      areaM2,
      finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint matt', floorFinish: 'tile', ceilingFinish: 'paint matt' },
      fixtures: [],
      notes: '',
    })
  }

  const bbox = computeBbox(walls)
  const slabPoly: Polygon2D = {
    vertices: [
      { x: bbox.minX, y: bbox.minY },
      { x: bbox.maxX, y: bbox.minY },
      { x: bbox.maxX, y: bbox.maxY },
      { x: bbox.minX, y: bbox.maxY },
    ],
  }

  const graph: BuildingGraph = {
    meta: {
      id: meta?.id ?? uuid(),
      projectId: meta?.projectId ?? '',
      name: meta?.name ?? 'Imported Plan',
      category: meta?.category ?? 'residential',
      description: meta?.description ?? 'From image detection',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    },
    site: null,
    levels: [{ id: levelId, name: 'Ground Floor', number: 0, elevation: 0, floorHeight }],
    spaces: buildingSpaces,
    walls: buildingWalls,
    slabs: [{
      id: 'slab-1', levelId,
      boundary: slabPoly,
      thickness: 0.15, material: 'concrete', ifcClass: 'IfcSlab', properties: {},
    }],
    openings: [],
    columns: [], beams: [], stairs: [], roof: null, structural: null, serviceZones: [],
  }

  const warnings: string[] = []
  if (rooms.length === 0) warnings.push('No rooms detected from wall layout')

  const derivation: DerivationMeta = {
    source: 'image-import',
    confidence: walls.length > 10 ? (rooms.length > 1 ? 0.8 : 0.5) : 0.3,
    warnings,
    derivedAt: new Date().toISOString(),
  }

  return { graph, derivation }
}

function computeBbox(walls: DetectedSegment[]): BBox2D {
  if (walls.length === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 8 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const w of walls) {
    if (w.x1 < minX) minX = w.x1
    if (w.y1 < minY) minY = w.y1
    if (w.x2 < minX) minX = w.x2
    if (w.y2 < minY) minY = w.y2
    if (w.x1 > maxX) maxX = w.x1
    if (w.y1 > maxY) maxY = w.y1
    if (w.x2 > maxX) maxX = w.x2
    if (w.y2 > maxY) maxY = w.y2
  }
  return { minX, minY, maxX, maxY }
}
