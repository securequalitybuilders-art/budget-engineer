import type {
  BuildingGraph, BuildingMeta, Level, Wall, Slab, Opening,
  Space, Column, Beam, Stair, Roof,
  Polygon2D,
  DerivationResult, DerivationMeta,
} from '../../domain/building'
import type { BimModel, BimWall, BimSlab, BimOpening, BimBlock, BimRoomZone, BimRoof } from '../../domain/bim'

function floorToLevels(bim: BimModel): Level[] {
  return bim.floors.map((f, i) => ({
    id: f.id,
    name: f.name,
    number: i,
    elevation: f.elevation,
    floorHeight: f.height,
  }))
}

function rectToPolygon(cx: number, cy: number, w: number, d: number): Polygon2D {
  const hw = w / 2
  const hd = d / 2
  return {
    vertices: [
      { x: cx - hw, y: cy - hd },
      { x: cx + hw, y: cy - hd },
      { x: cx + hw, y: cy + hd },
      { x: cx - hw, y: cy + hd },
    ],
  }
}

function isExternalWall(wall: BimWall): boolean {
  const role = String(wall.properties?.['role'] ?? '').toLowerCase()
  return role === 'external'
}

export function bimModelToBuildingGraph(
  bim: BimModel,
  meta?: Partial<BuildingMeta>,
): DerivationResult<BuildingGraph> {
  const levels = floorToLevels(bim)

  const walls: Wall[] = []
  const slabs: Slab[] = []
  const openings: Opening[] = []
  const columns: Column[] = []
  const beams: Beam[] = []
  const spaces: Space[] = []
  const stairs: Stair[] = []
  const roofs: Roof[] = []

  for (const el of bim.elements) {
    switch (el.type) {
      case 'wall': {
        const w = el as BimWall
        walls.push({
          id: w.id,
          levelId: w.floorId,
          role: isExternalWall(w) ? 'external' : 'internal',
          start: w.start,
          end: w.end,
          thickness: w.thickness,
          height: w.height,
          material: w.material,
          ifcClass: w.ifcClass,
          properties: { ...w.properties },
        })
        break
      }
      case 'slab': {
        const s = el as BimSlab
        slabs.push({
          id: s.id,
          levelId: s.floorId,
          boundary: rectToPolygon(s.origin.x + s.width / 2, s.origin.y + s.depth / 2, s.width, s.depth),
          thickness: s.thickness,
          material: s.material,
          ifcClass: s.ifcClass,
          properties: { ...s.properties },
        })
        break
      }
      case 'opening': {
        const o = el as BimOpening
        openings.push({
          id: o.id,
          levelId: o.floorId,
          wallId: o.wallId,
          kind: 'window',
          offsetRatio: 0.5,
          width: o.width,
          height: o.height,
          sillHeight: o.sillHeight,
          material: o.material,
          ifcClass: o.ifcClass,
          properties: { ...o.properties },
        })
        break
      }
      case 'roomZone': {
        const rz = el as BimRoomZone
        const w2 = rz.width / 2
        const d2 = rz.depth / 2
        spaces.push({
          id: rz.id,
          levelId: rz.floorId,
          name: rz.name,
          programme: 'other',
          boundary: {
            vertices: [
              { x: rz.origin.x - w2, y: rz.origin.y - d2 },
              { x: rz.origin.x + w2, y: rz.origin.y - d2 },
              { x: rz.origin.x + w2, y: rz.origin.y + d2 },
              { x: rz.origin.x - w2, y: rz.origin.y + d2 },
            ],
          },
          bbox: {
            minX: rz.origin.x - w2, minY: rz.origin.y - d2,
            maxX: rz.origin.x + w2, maxY: rz.origin.y + d2,
          },
          areaM2: rz.width * rz.depth,
          finishSpec: {
            wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null,
            wallFinish: '', floorFinish: '', ceilingFinish: '',
          },
          fixtures: [],
          notes: '',
        })
        break
      }
      case 'roof': {
        const r = el as BimRoof
        roofs.push({
          id: r.id,
          levelId: r.floorId,
          roofType: 'flat',
          boundary: rectToPolygon(r.origin.x + r.width / 2, r.origin.y + r.depth / 2, r.width, r.depth),
          thickness: r.thickness,
          pitch: 0,
          material: r.material,
          properties: { ...r.properties },
        })
        break
      }
      case 'block': {
        const b = el as BimBlock
        if (b.kind === 'stair') {
          stairs.push({
            id: b.id,
            levelId: b.floorId,
            fromLevelId: b.floorId,
            toLevelId: b.floorId,
            stairType: 'straight',
            width: b.width,
            treadCount: 14,
            rise: 150,
            going: 280,
            material: b.material,
            properties: { ...b.properties },
          })
        } else if (b.kind === 'column') {
          columns.push({
            id: b.id,
            levelId: b.floorId,
            position: { x: b.position.x, y: b.position.y },
            width: b.width,
            depth: b.depth,
            height: b.height,
            material: b.material,
            ifcClass: b.ifcClass,
            properties: { ...b.properties },
          })
        } else if (b.kind === 'beam') {
          beams.push({
            id: b.id,
            levelId: b.floorId,
            start: { x: b.position.x, y: b.position.y, z: 0 },
            end: { x: b.position.x + b.width, y: b.position.y, z: 0 },
            width: b.width,
            depth: b.depth,
            material: b.material,
            ifcClass: b.ifcClass,
            properties: { ...b.properties },
          })
        }
        break
      }
    }
  }

  const roof = roofs.length > 0 ? roofs[0] : null

  const graph: BuildingGraph = {
    meta: {
      id: `canonical-${bim.id}`,
      projectId: bim.projectId,
      name: meta?.name ?? bim.name,
      category: meta?.category ?? 'residential',
      description: meta?.description ?? '',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    },
    site: null,
    levels,
    spaces,
    walls,
    slabs,
    openings,
    columns,
    beams,
    stairs,
    roof,
    structural: null,
    serviceZones: [],
  }

  const derivation: DerivationMeta = {
    source: 'ifc-import',
    confidence: 0.85,
    warnings: [
      'BimModel has no finish specs, fixture assignments, or structural system data',
      'Opening offset ratio is estimated at 0.5',
    ],
    derivedAt: new Date().toISOString(),
  }

  return { graph, derivation }
}
