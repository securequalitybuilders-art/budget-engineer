import type {
  BuildingGraph, BuildingMeta, Level, Space, FinishSpec,
  DerivationResult, DerivationMeta,
} from '../../domain/building'
import type { DesignOption } from '../../domain/boq'

export function designOptionToBuildingGraph(
  option: DesignOption,
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

  /* DesignOption has no geometry — create a proportional rectangular
     space estimate based on gross floor area. */
  const areaPerFloor = option.grossFloorArea / Math.max(option.floors, 1)
  const w = Math.sqrt(areaPerFloor)
  const h = areaPerFloor / w

  const defaultFinish: FinishSpec = {
    wallMaterialId: null,
    floorMaterialId: null,
    ceilingMaterialId: null,
    wallFinish: '',
    floorFinish: '',
    ceilingFinish: '',
  }

  const spaces: Space[] = option.elements
    .filter((e) => e.category === 'room' || e.category === 'space')
    .map((e, i) => ({
      id: `space-${e.id}`,
      levelId,
      name: e.name,
      programme: 'other' as const,
      boundary: { vertices: [] },
      bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      areaM2: e.unit === 'm2' ? e.quantity : 0,
      finishSpec: defaultFinish,
      fixtures: [],
      notes: '',
    }))

  if (spaces.length === 0) {
    spaces.push({
      id: 'space-est-1',
      levelId,
      name: option.name || 'Building',
      programme: 'other' as const,
      boundary: {
        vertices: [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
          { x: 0, y: h },
        ],
      },
      bbox: { minX: 0, minY: 0, maxX: w, maxY: h },
      areaM2: areaPerFloor,
      finishSpec: defaultFinish,
      fixtures: [],
      notes: '',
    })
  }

  const graph: BuildingGraph = {
    meta: {
      id: `canonical-${option.id}`,
      projectId: option.id,
      name: meta?.name ?? option.name,
      category: meta?.category ?? 'residential',
      description: meta?.description ?? '',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    },
    site: null,
    levels: [level],
    spaces,
    walls: [],
    slabs: [],
    openings: [],
    columns: [],
    beams: [],
    stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
  }

  const derivation: DerivationMeta = {
    source: 'prompt',
    confidence: 0.4,
    warnings: [
      'DesignOption has no geometry — floorplate is estimated from GFA',
      'No wall/slab/opening/structural data — quantities limited',
    ],
    derivedAt: new Date().toISOString(),
  }

  return { graph, derivation }
}
