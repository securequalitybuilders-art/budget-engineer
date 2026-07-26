import type {
  BuildingGraph, BuildingMeta, Level, Wall, Opening,
  Space, FinishSpec,
  DerivationResult, DerivationMeta,
} from '../../domain/building'
import type { CadDocument, CadWall, CadOpening } from '../../domain/cad'

export function cadDocumentToBuildingGraph(
  cad: CadDocument,
  meta?: Partial<BuildingMeta>,
): DerivationResult<BuildingGraph> {
  const levelIds = cad.floors.map((f) => f.id)

  const levels: Level[] = cad.floors.map((f, i) => ({
    id: f.id,
    name: f.name,
    number: i,
    elevation: f.elevation,
    floorHeight: 3.0,
  }))

  const walls: Wall[] = cad.walls.map((w: CadWall) => ({
    id: w.id,
    levelId: w.floorId,
    role: w.structuralRole,
    start: { x: w.start.x, y: w.start.y, z: 0 },
    end: { x: w.end.x, y: w.end.y, z: 0 },
    thickness: w.thickness,
    height: 3.0,
    material: w.bim?.material ?? 'concrete-block',
    ifcClass: w.structuralRole === 'external' ? 'IfcCurtainWall' : 'IfcWall',
    properties: { ...w.bim },
  }))

  const openings: Opening[] = cad.openings.map((o: CadOpening) => ({
    id: o.id,
    levelId: o.floorId,
    wallId: o.wallId,
    kind: o.kind,
    offsetRatio: o.offsetRatio,
    width: o.width,
    height: o.headHeight ?? (o.kind === 'door' ? 2.1 : 1.2),
    sillHeight: o.sillHeight ?? (o.kind === 'door' ? 0 : 0.9),
    material: o.kind === 'door' ? 'timber' : 'aluminium',
    ifcClass: o.kind === 'door' ? 'IfcDoor' : 'IfcWindow',
    properties: { ...o.bim },
  }))

  const defaultFinish: FinishSpec = {
    wallMaterialId: null,
    floorMaterialId: null,
    ceilingMaterialId: null,
    wallFinish: '',
    floorFinish: '',
    ceilingFinish: '',
  }

  const spaces: Space[] = cad.annotations
    .filter((a) => a.kind === 'label' && levelIds.includes(a.floorId))
    .map((a) => ({
      id: `space-${a.id}`,
      levelId: a.floorId,
      name: a.text,
      programme: 'other' as const,
      boundary: { vertices: [] },
      bbox: { minX: a.position.x - 2, minY: a.position.y - 2, maxX: a.position.x + 2, maxY: a.position.y + 2 },
      areaM2: 16,
      finishSpec: defaultFinish,
      fixtures: [],
      notes: '',
    }))

  const graph: BuildingGraph = {
    meta: {
      id: `canonical-${cad.id}`,
      projectId: cad.projectId,
      name: meta?.name ?? `CAD Import ${cad.id}`,
      category: meta?.category ?? 'residential',
      description: meta?.description ?? '',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    },
    site: null,
    levels,
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
    source: 'dxf-import',
    confidence: 0.85,
    warnings: [
      'CadDocument has no slab/roof/structural data — these fields are empty',
      'Spaces are inferred from annotations — area estimated',
    ],
    derivedAt: new Date().toISOString(),
  }

  return { graph, derivation }
}
