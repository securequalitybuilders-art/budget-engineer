import { describe, it, expect } from 'vitest'
import { buildingGraphToBimModel } from '@/adapters/canonical/building-to-bim'
import { buildingGraphToInteriorProject } from '@/adapters/canonical/building-to-interior'
import type { BuildingGraph } from '@/domain/building'

function makeSampleGraph(overrides?: Partial<BuildingGraph>): BuildingGraph {
  return {
    meta: { id: 'g1', projectId: 'p1', name: 'Test Building', category: 'residential', description: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    site: null,
    levels: [
      { id: 'l1', name: 'Ground Floor', number: 0, elevation: 0, floorHeight: 3 },
      { id: 'l2', name: 'First Floor', number: 1, elevation: 3, floorHeight: 3 },
    ],
    spaces: [
      {
        id: 's1', levelId: 'l1', name: 'Living Room', programme: 'living',
        boundary: { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 5 }, { x: 0, y: 5 }] },
        bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, areaM2: 30,
        finishSpec: { wallMaterialId: 'mat-paint', floorMaterialId: 'mat-tile', ceilingMaterialId: 'mat-paint', wallFinish: 'paint white', floorFinish: 'tile porcelain', ceilingFinish: 'paint white' },
        fixtures: [
          { instanceId: 'fi1', fixtureTypeId: 'ft-sofa', position: { x: 2, y: 2 }, rotation: 0, flipped: false },
        ],
        notes: '',
      },
      {
        id: 's2', levelId: 'l1', name: 'Kitchen', programme: 'kitchen',
        boundary: { vertices: [{ x: 6, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 6, y: 5 }] },
        bbox: { minX: 6, minY: 0, maxX: 10, maxY: 5 }, areaM2: 20,
        finishSpec: { wallMaterialId: 'mat-tile', floorMaterialId: 'mat-tile', ceilingMaterialId: 'mat-paint', wallFinish: 'tile splashback', floorFinish: 'tile porcelain', ceilingFinish: 'paint white' },
        fixtures: [],
        notes: '',
      },
    ],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: { role: 'external' } },
      { id: 'w2', levelId: 'l1', role: 'internal', start: { x: 6, y: 0, z: 0 }, end: { x: 6, y: 5, z: 0 }, thickness: 0.1, height: 3, material: 'plasterboard', ifcClass: 'IfcWall', properties: { role: 'internal' } },
    ],
    slabs: [
      { id: 'sl1', levelId: 'l1', boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }] }, thickness: 0.15, material: 'concrete', ifcClass: 'IfcSlab', properties: {} },
    ],
    openings: [
      { id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'door', offsetRatio: 0.3, width: 0.9, height: 2.1, sillHeight: 0, material: 'timber', ifcClass: 'IfcDoor', properties: { kind: 'door', wallId: 'w1', offsetRatio: 0.3 } },
      { id: 'o2', levelId: 'l1', wallId: 'w1', kind: 'window', offsetRatio: 0.7, width: 1.5, height: 1.2, sillHeight: 0.9, material: 'aluminium', ifcClass: 'IfcWindow', properties: { kind: 'window', wallId: 'w1', offsetRatio: 0.7 } },
    ],
    columns: [
      { id: 'c1', levelId: 'l1', position: { x: 5, y: 2.5 }, width: 0.3, depth: 0.3, height: 3, material: 'concrete', ifcClass: 'IfcColumn', properties: {} },
    ],
    beams: [
      { id: 'b1', levelId: 'l1', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, width: 0.23, depth: 0.3, material: 'concrete', ifcClass: 'IfcBeam', properties: {} },
    ],
    stairs: [
      { id: 'st1', levelId: 'l1', fromLevelId: 'l1', toLevelId: 'l2', stairType: 'straight', width: 1.2, treadCount: 14, rise: 0.15, going: 0.28, material: 'concrete', properties: {} },
    ],
    roof: {
      id: 'rf1', levelId: 'l2', roofType: 'flat', boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }] }, thickness: 0.12, pitch: 0, material: 'concrete', properties: {},
    },
    structural: null,
    serviceZones: [],
    materials: [
      { id: 'mat-paint', name: 'White Paint', category: 'paint', color: '#ffffff', unit: 'm2', rateCents: 500 },
      { id: 'mat-tile', name: 'Porcelain Tile', category: 'tile', color: '#e8e8e8', unit: 'm2', rateCents: 2500 },
    ],
    ...overrides,
  } as unknown as BuildingGraph
}

describe('buildingGraphToBimModel', () => {
  it('returns null for empty graph', () => {
    expect(buildingGraphToBimModel({ levels: [], spaces: [], walls: [], slabs: [], openings: [], columns: [], beams: [], stairs: [], roof: null, structural: null, serviceZones: [], meta: { id: '', projectId: '', name: '', category: 'residential', description: '', createdAt: '', updatedAt: '' }, site: null } as BuildingGraph)).toBeNull()
  })

  it('creates BimModel with correct floor count', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    expect(bim.floors).toHaveLength(2)
    expect(bim.floors[0].name).toBe('Ground Floor')
    expect(bim.floors[1].name).toBe('First Floor')
  })

  it('maps walls to BimWall elements', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const walls = bim.elements.filter((e): e is import('@/domain/bim').BimWall => e.type === 'wall')
    expect(walls).toHaveLength(2)
    expect(walls.find((w) => w.id === 'w1')?.ifcClass).toBe('IfcWall')
    expect(walls.find((w) => w.id === 'w2')?.material).toBe('plasterboard')
  })

  it('maps slabs to BimSlab elements', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const slabs = bim.elements.filter((e): e is import('@/domain/bim').BimSlab => e.type === 'slab')
    expect(slabs).toHaveLength(1)
    expect(slabs[0].thickness).toBe(0.15)
    expect(slabs[0].width).toBe(10)
  })

  it('maps openings to BimOpening elements', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const openings = bim.elements.filter((e): e is import('@/domain/bim').BimOpening => e.type === 'opening')
    expect(openings).toHaveLength(2)
    expect(openings.find((o) => o.id === 'o1')?.ifcClass).toBe('IfcDoor')
    expect(openings.find((o) => o.id === 'o2')?.ifcClass).toBe('IfcWindow')
  })

  it('maps spaces to BimRoomZone elements', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const zones = bim.elements.filter((e): e is import('@/domain/bim').BimRoomZone => e.type === 'roomZone')
    expect(zones).toHaveLength(2)
    expect(zones.find((z) => z.id === 'zone-s1')?.name).toBe('Living Room')
    expect(zones.find((z) => z.id === 'zone-s2')?.properties.programme).toBe('kitchen')
  })

  it('maps columns to BimBlock elements', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const blocks = bim.elements.filter((e): e is import('@/domain/bim').BimBlock => e.type === 'block')
    const cols = blocks.filter((b) => b.kind === 'column')
    expect(cols).toHaveLength(1)
    expect(cols[0].ifcClass).toBe('IfcColumn')
  })

  it('maps beams to BimBlock elements', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const blocks = bim.elements.filter((e): e is import('@/domain/bim').BimBlock => e.type === 'block')
    const beams = blocks.filter((b) => b.kind === 'beam')
    expect(beams).toHaveLength(1)
    expect(beams[0].ifcClass).toBe('IfcBeam')
  })

  it('maps stair to BimBlock element', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const blocks = bim.elements.filter((e): e is import('@/domain/bim').BimBlock => e.type === 'block')
    const stairs = blocks.filter((b) => b.kind === 'stair')
    expect(stairs).toHaveLength(1)
    expect(stairs[0].ifcClass).toBe('IfcStair')
  })

  it('maps roof to BimRoof element', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const roofs = bim.elements.filter((e): e is import('@/domain/bim').BimRoof => e.type === 'roof')
    expect(roofs).toHaveLength(1)
    expect(roofs[0].ifcClass).toBe('IfcRoof')
  })

  it('includes all element types in output', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    const types = new Set(bim.elements.map((e) => e.type))
    expect(types.has('wall')).toBe(true)
    expect(types.has('slab')).toBe(true)
    expect(types.has('opening')).toBe(true)
    expect(types.has('roomZone')).toBe(true)
    expect(types.has('block')).toBe(true)
    expect(types.has('roof')).toBe(true)
  })

  it('uses projectId from graph meta', () => {
    const graph = makeSampleGraph()
    const bim = buildingGraphToBimModel(graph)!
    expect(bim.projectId).toBe('p1')
  })

  it('handles graph with roofs but no spaces gracefully', () => {
    const graph = makeSampleGraph({ spaces: [] })
    const bim = buildingGraphToBimModel(graph)
    expect(bim).not.toBeNull()
    expect(bim!.elements.filter((e) => e.type === 'roomZone')).toHaveLength(0)
  })
})

describe('buildingGraphToInteriorProject', () => {
  it('returns null for graph with no spaces', () => {
    const graph = makeSampleGraph({ spaces: [] })
    expect(buildingGraphToInteriorProject(graph)).toBeNull()
  })

  it('creates an InteriorProject with correct room count', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    expect(proj.rooms).toHaveLength(2)
    expect(proj.projectId).toBe('p1')
  })

  it('maps programme to interior room type', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    const living = proj.rooms.find((r) => r.roomId === 's1')!
    expect(living.roomType).toBe('living')
    expect(living.name).toBe('Living Room')
  })

  it('includes fixture instances from spaces', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    expect(proj.fixtures).toHaveLength(1)
    expect(proj.fixtures[0].instanceId).toBe('fi1')
    expect(proj.fixtures[0].roomId).toBe('s1')
  })

  it('generates material assignments from finish specs', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    expect(proj.materialAssignments.length).toBeGreaterThan(0)
    const floorAssign = proj.materialAssignments.find((a) => a.surface === 'floor')
    expect(floorAssign).toBeDefined()
    expect(floorAssign!.materialId).toBe('mat-tile')
    expect(floorAssign!.coverageM2).toBe(30)
  })

  it('assigns wall coverage estimates', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    const wallAssign = proj.materialAssignments.find((a) => a.surface === 'wall')
    expect(wallAssign).toBeDefined()
    expect(wallAssign!.coverageM2).toBeGreaterThan(50)
  })

  it('preserves finish specs on rooms', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    const kitchen = proj.rooms.find((r) => r.roomId === 's2')!
    expect(kitchen.finishSpec.wallFinish).toBe('tile splashback')
    expect(kitchen.finishSpec.floorFinish).toBe('tile porcelain')
  })

  it('assigns unique IDs to material assignments', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    const ids = proj.materialAssignments.map((a) => a.assignmentId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes room dimensions and position', () => {
    const graph = makeSampleGraph()
    const proj = buildingGraphToInteriorProject(graph)!
    const living = proj.rooms.find((r) => r.roomId === 's1')!
    expect(living.dimensions.width).toBeCloseTo(6)
    expect(living.dimensions.height).toBeCloseTo(5)
    expect(living.position.x).toBeCloseTo(3)
    expect(living.position.y).toBeCloseTo(2.5)
  })
})
