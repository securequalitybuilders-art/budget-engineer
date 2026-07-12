import type {
  BuildingGraph, BuildingMeta, Level, Space, Wall, Opening,
  DerivationResult, DerivationMeta, FinishSpec,
  Polygon2D, BBox2D,
} from '../../domain/building'
import type { PlanModel, RoomRect, WallSegment, Opening as PlanOpening } from '../../domain/plan'

const PROGRAMME_MAP: Record<string, import('../../domain/building').RoomProgramme> = {
  bedroom: 'bedroom', living: 'living', dining: 'dining',
  kitchen: 'kitchen', bathroom: 'bathroom', ensuite: 'ensuite',
  hallway: 'hallway', study: 'study', lounge: 'lounge',
  laundry: 'laundry', pantry: 'pantry', office: 'office',
  storage: 'storage', entry: 'entry', landing: 'landing',
  balcony: 'balcony', gym: 'gym', playroom: 'playroom',
  cinema: 'cinema',
}

function roomToProgramme(name: string): import('../../domain/building').RoomProgramme {
  const lower = name.toLowerCase()
  for (const [kw, prog] of Object.entries(PROGRAMME_MAP)) {
    if (lower.includes(kw)) return prog
  }
  return 'other'
}

function rectToPolygon(x: number, y: number, w: number, h: number): Polygon2D {
  return {
    vertices: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: h },
      { x, y: h },
    ],
  }
}

function rectToBBox(x: number, y: number, w: number, h: number): BBox2D {
  return { minX: x, minY: y, maxX: x + w, maxY: y + h }
}

export function planModelToBuildingGraph(
  plan: PlanModel,
  meta?: Partial<BuildingMeta>,
): DerivationResult<BuildingGraph> {
  const levelId = 'level-1'
  const level: Level = {
    id: levelId,
    name: 'Ground Floor',
    number: 0,
    elevation: 0,
    floorHeight: 3.0,
  }

  const defaultFinish: FinishSpec = {
    wallMaterialId: null,
    floorMaterialId: null,
    ceilingMaterialId: null,
    wallFinish: 'painted plaster',
    floorFinish: 'concrete screed',
    ceilingFinish: 'painted plaster',
  }

  const spaces: Space[] = plan.rooms.map((r: RoomRect) => ({
    id: `space-${r.id}`,
    levelId,
    name: r.name,
    programme: roomToProgramme(r.name),
    boundary: rectToPolygon(r.x, r.y, r.width, r.height),
    bbox: rectToBBox(r.x, r.y, r.width, r.height),
    areaM2: r.width * r.height,
    finishSpec: { ...defaultFinish },
    fixtures: [],
    notes: '',
  }))

  const walls: Wall[] = plan.walls.map((w: WallSegment) => ({
    id: `wall-${w.id}`,
    levelId,
    role: w.type,
    start: { x: w.start.x, y: w.start.y, z: 0 },
    end: { x: w.end.x, y: w.end.y, z: 0 },
    thickness: w.thickness,
    height: 3.0,
    material: w.type === 'external' ? 'concrete-block' : 'plasterboard',
    ifcClass: w.type === 'external' ? 'IfcCurtainWall' : 'IfcWall',
    properties: {},
  }))

  const wallLut = new Map(plan.walls.map((w) => [w.id, `wall-${w.id}`]))

  const openings: Opening[] = plan.openings.map((o: PlanOpening) => ({
    id: `opening-${o.id}`,
    levelId,
    wallId: wallLut.get(o.wallId) ?? '',
    kind: o.kind,
    offsetRatio: o.offset,
    width: o.width,
    height: o.height ?? (o.kind === 'door' ? 2.1 : 1.2),
    sillHeight: o.sillHeight ?? (o.kind === 'door' ? 0 : 0.9),
    material: o.kind === 'door' ? 'timber' : 'aluminium',
    ifcClass: o.kind === 'door' ? 'IfcDoor' : 'IfcWindow',
    properties: {},
  }))

  const projectLevel = plan.designOptionId
  const graphId = `canonical-${plan.id}`

  const graph: BuildingGraph = {
    meta: {
      id: graphId,
      projectId: projectLevel,
      name: meta?.name ?? plan.id,
      category: meta?.category ?? 'residential',
      description: meta?.description ?? '',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    },
    site: null,
    levels: [level],
    spaces,
    walls,
    slabs: [],
    openings,
    columns: [],
    beams: [],
    stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
  }

  const derivation: DerivationMeta = {
    source: 'plan-import',
    confidence: 0.9,
    warnings: ['PlanModel has no slab/roof/structural data — these fields are empty'],
    derivedAt: new Date().toISOString(),
  }

  return { graph, derivation }
}
