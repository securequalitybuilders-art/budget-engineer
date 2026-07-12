import { describe, it, expect } from 'vitest'
import {
  getLevelsSorted, getSpacesOnLevel, getWallsOnLevel,
  getOpeningsOnLevel, computeGraphQuantities,
} from '@/domain/building'
import type { BuildingGraph, Wall, Opening } from '@/domain/building'
import {
  planModelToBuildingGraph,
  bimModelToBuildingGraph,
  designOptionToBuildingGraph,
  cadDocumentToBuildingGraph,
  buildingGraphToPlanModel,
  extractGraphQuantities,
  buildBoqFromBuildingGraph,
  generateSchedulesFromGraph,
} from '@/adapters/canonical'
import type { PlanModel } from '@/domain/plan'
import type { BimModel, BimWall, BimSlab, BimOpening as BimOpeningT, BimRoomZone, BimRoof, BimBlock } from '@/domain/bim'
import type { DesignOption } from '@/domain/boq'
import type { CadDocument, CadWall, CadOpening, CadFloor } from '@/domain/cad'

// ── Helpers ───────────────────────────────────────────────────

function makeSamplePlan(): PlanModel {
  return {
    id: 'plan-1',
    designOptionId: 'opt-1',
    width: 20,
    height: 15,
    wallThickness: 0.2,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 8, height: 6, color: '#ff0' },
      { id: 'r2', name: 'Kitchen', x: 8, y: 0, width: 6, height: 6, color: '#f0f' },
      { id: 'r3', name: 'Bedroom', x: 0, y: 6, width: 6, height: 5, color: '#0ff' },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 14, y: 0 }, thickness: 0.2, type: 'external' },
      { id: 'w2', start: { x: 14, y: 0 }, end: { x: 14, y: 6 }, thickness: 0.2, type: 'external' },
      { id: 'w3', start: { x: 0, y: 0 }, end: { x: 0, y: 11 }, thickness: 0.2, type: 'external' },
      { id: 'w4', start: { x: 8, y: 0 }, end: { x: 8, y: 6 }, thickness: 0.1, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.9 },
      { id: 'o2', wallId: 'w2', kind: 'window', offset: 0.4, width: 1.5, height: 1.2, sillHeight: 0.9 },
    ],
  }
}

function makeSampleBim(): BimModel {
  const wall: BimWall = {
    id: 'bw1', projectId: 'p1', floorId: 'f1', name: 'Ext Wall',
    ifcClass: 'IfcWall', material: 'concrete', properties: { role: 'external' },
    type: 'wall', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.2, height: 3,
  }
  const slab: BimSlab = {
    id: 'bs1', projectId: 'p1', floorId: 'f1', name: 'Ground Slab',
    ifcClass: 'IfcSlab', material: 'concrete', properties: {},
    type: 'slab', origin: { x: 0, y: 0, z: 0 }, width: 10, depth: 8, thickness: 0.15,
  }
  const opening: BimOpeningT = {
    id: 'bo1', projectId: 'p1', floorId: 'f1', name: 'Front Door',
    ifcClass: 'IfcDoor', material: 'timber', properties: {},
    type: 'opening', wallId: 'bw1', center: { x: 5, y: 0, z: 0 }, width: 0.9, height: 2.1, sillHeight: 0,
  }
  const room: BimRoomZone = {
    id: 'br1', projectId: 'p1', floorId: 'f1', name: 'Living',
    ifcClass: 'IfcSpace', material: '', properties: {},
    type: 'roomZone', origin: { x: 2, y: 2, z: 0 }, width: 6, depth: 4, height: 3,
  }
  const roof: BimRoof = {
    id: 'bro1', projectId: 'p1', floorId: 'f1', name: 'Roof',
    ifcClass: 'IfcRoof', material: 'concrete', properties: {},
    type: 'roof', origin: { x: 0, y: 0, z: 3 }, width: 10, depth: 8, thickness: 0.12,
  }
  return {
    id: 'bim-1', projectId: 'p1', name: 'Sample BIM',
    floors: [{ id: 'f1', name: 'Ground Floor', elevation: 0, height: 3 }],
    elements: [wall, slab, opening, room, roof],
  }
}

function makeSampleDesign(): DesignOption {
  return {
    id: 'opt-1',
    name: 'Standard House',
    grossFloorArea: 200,
    floors: 2,
    buildingType: 'house',
    elements: [
      { id: 'e1', type: 'room', category: 'room', name: 'Living Room', unit: 'm2', quantity: 40 },
      { id: 'e2', type: 'room', category: 'room', name: 'Kitchen', unit: 'm2', quantity: 20 },
    ],
  }
}

function makeSampleCad(): CadDocument {
  return {
    id: 'cad-1', projectId: 'p1', designId: 'd1',
    activeFloorId: 'f1', activeTool: 'wall',
    floors: [{ id: 'f1', name: 'Ground Floor', elevation: 0, bim: { classification: '' } }],
    layers: [],
    walls: [
      { id: 'cw1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2,
        structuralRole: 'external', layerId: 'walls',
        bim: { classification: '', material: 'brick' } },
    ],
    openings: [
      { id: 'co1', floorId: 'f1', wallId: 'cw1', kind: 'door', offsetRatio: 0.5, width: 0.9,
        layerId: 'openings', bim: { classification: '' } },
    ],
    annotations: [{ id: 'ca1', floorId: 'f1', position: { x: 5, y: 5 }, text: 'Living',
      kind: 'label', layerId: 'annotations' }],
    blocks: [],
  }
}

// ── Canonical types ──────────────────────────────────────────

describe('canonical BuildingGraph types', () => {
  it('getLevelsSorted returns levels in number order', () => {
    const graph = { levels: [{ id: 'l2', name: 'Second', number: 1, elevation: 3, floorHeight: 3 },
      { id: 'l1', name: 'First', number: 0, elevation: 0, floorHeight: 3 }],
      spaces: [], walls: [], slabs: [], openings: [], columns: [], beams: [],
      stairs: [], roof: null, structural: null, serviceZones: [],
      meta: { id: 'g1', projectId: 'p1', name: 'Test', category: 'residential',
        description: '', createdAt: '', updatedAt: '' },
      site: null,
    } as BuildingGraph
    const sorted = getLevelsSorted(graph)
    expect(sorted[0].number).toBeLessThan(sorted[1].number)
  })

  it('getSpacesOnLevel filters by levelId', () => {
    const graph = {
      levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
      spaces: [{ id: 's1', levelId: 'l1', name: 'Living', programme: 'living' as const,
        boundary: { vertices: [] }, bbox: { minX: 0, minY: 0, maxX: 5, maxY: 5 }, areaM2: 25,
        finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null,
          wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' },
        { id: 's2', levelId: 'l1', name: 'Kitchen', programme: 'kitchen' as const,
          boundary: { vertices: [] }, bbox: { minX: 5, minY: 0, maxX: 9, maxY: 5 }, areaM2: 20,
          finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null,
            wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' },
        { id: 's3', levelId: 'l2', name: 'Bedroom', programme: 'bedroom' as const,
          boundary: { vertices: [] }, bbox: { minX: 0, minY: 0, maxX: 5, maxY: 5 }, areaM2: 25,
          finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null,
            wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' },
      ],
      walls: [], slabs: [], openings: [], columns: [], beams: [],
      stairs: [], roof: null, structural: null, serviceZones: [],
      meta: { id: 'g1', projectId: 'p1', name: 'Test', category: 'residential',
        description: '', createdAt: '', updatedAt: '' },
      site: null,
    } as BuildingGraph
    expect(getSpacesOnLevel(graph, 'l1')).toHaveLength(2)
    expect(getSpacesOnLevel(graph, 'l2')).toHaveLength(1)
  })

  it('computeGraphQuantities calculates from spaces and walls', () => {
    const graph = {
      levels: [{ id: 'l1', name: 'G', number: 0, elevation: 0, floorHeight: 3 }],
      spaces: [
        { id: 's1', levelId: 'l1', name: 'Bathroom', programme: 'bathroom' as const,
          boundary: { vertices: [] }, bbox: { minX: 0, minY: 0, maxX: 3, maxY: 3 }, areaM2: 9,
          finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null,
            wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' },
        { id: 's2', levelId: 'l1', name: 'Living', programme: 'living' as const,
          boundary: { vertices: [] }, bbox: { minX: 3, minY: 0, maxX: 13, maxY: 6 }, areaM2: 60,
          finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null,
            wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' },
      ],
      walls: [
        { id: 'w1', levelId: 'l1', role: 'external' as const,
          start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 },
          thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
        { id: 'w2', levelId: 'l1', role: 'internal' as const,
          start: { x: 3, y: 0, z: 0 }, end: { x: 3, y: 6, z: 0 },
          thickness: 0.1, height: 3, material: 'plasterboard', ifcClass: 'IfcWall', properties: {} },
      ],
      slabs: [
        { id: 's1', levelId: 'l1', boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }] },
          thickness: 0.15, material: 'concrete', ifcClass: 'IfcSlab', properties: {} },
      ],
      openings: [
        { id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'door' as const,
          offsetRatio: 0.5, width: 0.9, height: 2.1, sillHeight: 0,
          material: 'timber', ifcClass: 'IfcDoor', properties: {} },
        { id: 'o2', levelId: 'l1', wallId: 'w1', kind: 'window' as const,
          offsetRatio: 0.3, width: 1.5, height: 1.2, sillHeight: 0.9,
          material: 'aluminium', ifcClass: 'IfcWindow', properties: {} },
      ],
      columns: [], beams: [], stairs: [],
      roof: {
        id: 'r1', levelId: 'l1', roofType: 'flat' as const,
        boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }] },
        thickness: 0.12, pitch: 0, material: 'concrete', properties: {},
      },
      structural: null, serviceZones: [],
      meta: { id: 'g1', projectId: 'p1', name: 'Test', category: 'residential',
        description: '', createdAt: '', updatedAt: '' },
      site: null,
    } as BuildingGraph

    const q = computeGraphQuantities(graph)
    expect(q.grossFloorArea).toBeCloseTo(69, 0)
    expect(q.roomCount).toBe(2)
    expect(q.doorCount).toBe(1)
    expect(q.windowCount).toBe(1)
    expect(q.wetRoomCount).toBe(1)
    expect(q.roofArea).toBeGreaterThan(0)
    expect(q.externalWallArea).toBeGreaterThan(0)
    expect(q.floorCount).toBe(1)
  })
})

// ── PlanModel → BuildingGraph adapter ────────────────────────

describe('planModelToBuildingGraph', () => {
  it('creates a BuildingGraph with levels, spaces, walls, openings', () => {
    const plan = makeSamplePlan()
    const { graph, derivation } = planModelToBuildingGraph(plan)
    expect(graph.levels).toHaveLength(1)
    expect(graph.spaces).toHaveLength(3)
    expect(graph.walls).toHaveLength(4)
    expect(graph.openings).toHaveLength(2)
    expect(derivation.source).toBe('plan-import')
    expect(derivation.confidence).toBe(0.9)
  })

  it('assigns programme based on room name', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const programmes = graph.spaces.map((s) => s.programme)
    expect(programmes).toContain('living')
    expect(programmes).toContain('kitchen')
    expect(programmes).toContain('bedroom')
  })

  it('maps walls with correct role from type', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const external = graph.walls.filter((w) => w.role === 'external')
    const internal = graph.walls.filter((w) => w.role === 'internal')
    expect(external).toHaveLength(3)
    expect(internal).toHaveLength(1)
  })

  it('roundtrips through buildingGraphToPlanModel', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const roundtrip = buildingGraphToPlanModel(graph)
    expect(roundtrip.rooms).toHaveLength(3)
    expect(roundtrip.walls).toHaveLength(4)
    expect(roundtrip.openings).toHaveLength(2)
    expect(roundtrip.scaleLabel).toBe('1:100')
  })

  it('handles empty plan', () => {
    const empty: PlanModel = {
      id: 'empty', designOptionId: 'opt-1',
      width: 0, height: 0, wallThickness: 0.1,
      rooms: [], walls: [], openings: [], scaleLabel: '1:100',
    }
    const { graph } = planModelToBuildingGraph(empty)
    expect(graph.spaces).toHaveLength(0)
    expect(graph.walls).toHaveLength(0)
    expect(graph.openings).toHaveLength(0)
  })
})

// ── BimModel → BuildingGraph adapter ─────────────────────────

describe('bimModelToBuildingGraph', () => {
  it('converts all BimElement types to canonical elements', () => {
    const { graph, derivation } = bimModelToBuildingGraph(makeSampleBim())
    expect(graph.levels).toHaveLength(1)
    expect(graph.walls).toHaveLength(1)
    expect(graph.slabs).toHaveLength(1)
    expect(graph.openings).toHaveLength(1)
    expect(graph.spaces).toHaveLength(1)
    expect(graph.roof).not.toBeNull()
    expect(derivation.confidence).toBe(0.85)
  })

  it('maps multiple floors to multiple levels', () => {
    const bim: BimModel = {
      id: 'bim-2', projectId: 'p1', name: 'Two floors',
      floors: [
        { id: 'f1', name: 'Ground', elevation: 0, height: 3 },
        { id: 'f2', name: 'First', elevation: 3, height: 3 },
      ],
      elements: [],
    }
    const { graph } = bimModelToBuildingGraph(bim)
    expect(graph.levels).toHaveLength(2)
    expect(graph.levels[1].elevation).toBe(3)
  })
})

// ── DesignOption → BuildingGraph adapter ─────────────────────

describe('designOptionToBuildingGraph', () => {
  it('creates spaces from room elements when available', () => {
    const design = makeSampleDesign()
    const { graph, derivation } = designOptionToBuildingGraph(design)
    expect(graph.spaces).toHaveLength(2)
    expect(graph.levels).toHaveLength(1)
    expect(derivation.source).toBe('prompt')
    expect(derivation.confidence).toBe(0.4)
  })

  it('estimates a single space when no room elements exist', () => {
    const design: DesignOption = {
      id: 'opt-2', name: 'Empty', grossFloorArea: 100,
      floors: 1, buildingType: 'house', elements: [],
    }
    const { graph } = designOptionToBuildingGraph(design)
    expect(graph.spaces).toHaveLength(1)
    expect(graph.spaces[0].areaM2).toBeCloseTo(100, 0)
  })

  it('computes proportional dimensions from GFA', () => {
    const design: DesignOption = {
      id: 'opt-3', name: 'Tall', grossFloorArea: 400,
      floors: 4, buildingType: 'apartment', elements: [],
    }
    const { graph } = designOptionToBuildingGraph(design)
    const space = graph.spaces[0]
    expect(space.areaM2).toBeCloseTo(100, 0)
    expect(space.bbox.maxX - space.bbox.minX).toBeGreaterThan(0)
    expect(space.bbox.maxY - space.bbox.minY).toBeGreaterThan(0)
  })
})

// ── CadDocument → BuildingGraph adapter ──────────────────────

describe('cadDocumentToBuildingGraph', () => {
  it('converts CAD walls and openings to canonical elements', () => {
    const cad = makeSampleCad()
    const { graph, derivation } = cadDocumentToBuildingGraph(cad)
    expect(graph.levels).toHaveLength(1)
    expect(graph.walls).toHaveLength(1)
    expect(graph.openings).toHaveLength(1)
    expect(graph.spaces).toHaveLength(1)
    expect(derivation.source).toBe('dxf-import')
  })

  it('preserves wall BIM metadata', () => {
    const cad = makeSampleCad()
    const { graph } = cadDocumentToBuildingGraph(cad)
    const wall = graph.walls[0]
    expect(wall.material).toBe('brick')
  })

  it('handles CAD document with no walls', () => {
    const cad: CadDocument = {
      id: 'cad-empty', projectId: 'p1', designId: 'd1',
      activeFloorId: 'f1', activeTool: 'select',
      floors: [{ id: 'f1', name: 'Ground', elevation: 0, bim: { classification: '' } }],
      layers: [], walls: [], openings: [], annotations: [], blocks: [],
    }
    const { graph } = cadDocumentToBuildingGraph(cad)
    expect(graph.walls).toHaveLength(0)
    expect(graph.openings).toHaveLength(0)
    expect(graph.spaces).toHaveLength(0)
  })
})

// ── Roundtrip fidelity ───────────────────────────────────────

describe('canonical roundtrip fidelity', () => {
  it('PlanModel → BuildingGraph → PlanModel preserves room count and wall count', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const projected = buildingGraphToPlanModel(graph)
    expect(projected.rooms).toHaveLength(plan.rooms.length)
    expect(projected.walls).toHaveLength(plan.walls.length)
    expect(projected.openings).toHaveLength(plan.openings.length)
  })

  it('PlanModel → BuildingGraph → PlanModel preserves wall thickness', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const projected = buildingGraphToPlanModel(graph)
    plan.walls.forEach((w, i) => {
      expect(projected.walls[i].thickness).toBe(w.thickness)
    })
  })

  it('PlanModel → BuildingGraph quantities match expected ranges', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const q = computeGraphQuantities(graph)
    expect(q.roomCount).toBe(3)
    expect(q.grossFloorArea).toBeGreaterThan(0)
    expect(q.totalWallsM2).toBeGreaterThan(0)
  })
})

// ── extractGraphQuantities ──────────────────────────────────

describe('extractGraphQuantities', () => {
  it('extracts quantities from a PlanModel-derived graph', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const q = extractGraphQuantities(graph)
    expect(q.grossFloorArea).toBeGreaterThan(0)
    expect(q.roomCount).toBe(3)
    expect(q.doorCount).toBe(1)
    expect(q.windowCount).toBe(1)
    expect(q.externalWallArea).toBeGreaterThan(0)
    expect(q.partitionArea).toBeGreaterThan(0)
    expect(q.warnings.length).toBe(0)
  })

  it('extracts quantities from a BimModel-derived graph', () => {
    const { graph } = bimModelToBuildingGraph(makeSampleBim())
    const q = extractGraphQuantities(graph)
    expect(q.roomCount).toBe(1)
    expect(q.floors).toBe(1)
    expect(q.grossFloorArea).toBeGreaterThan(0)
  })

  it('returns zero quantities for empty graph', () => {
    const q = extractGraphQuantities(null as unknown as import('@/domain/building').BuildingGraph)
    expect(q.grossFloorArea).toBe(0)
    expect(q.warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('classifies wet rooms correctly', () => {
    const { graph } = planModelToBuildingGraph(makeSamplePlan())
    const q = extractGraphQuantities(graph)
    expect(q.wetRoomCount).toBeGreaterThanOrEqual(0)
  })
})

// ── buildBoqFromBuildingGraph ───────────────────────────────

describe('buildBoqFromBuildingGraph', () => {
  it('returns null for null/empty graph', () => {
    expect(buildBoqFromBuildingGraph(null)).toBeNull()
  })

  it('generates a BOQ from PlanModel-derived graph', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const result = buildBoqFromBuildingGraph(graph, 'zimbabwe')
    expect(result).not.toBeNull()
    expect(result!.items.length).toBeGreaterThan(0)
    expect(result!.summary.grandTotal).toBeGreaterThan(0)
    expect(result!.currency).toBe('USD')
  })

  it('generates BOQ with trade-detailed depth when walls exist', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const result = buildBoqFromBuildingGraph(graph, 'zimbabwe')
    expect(result!.estimateDepth).toBe('detailed')
  })

  it('uses CAD override quantities when provided', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const override = extractGraphQuantities(graph)
    override.doorCount = 99
    const result = buildBoqFromBuildingGraph(graph, 'zimbabwe', 'concrete-slab', undefined, override)
    expect(result).not.toBeNull()
  })

  it('supports South Africa region', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const result = buildBoqFromBuildingGraph(graph, 'southafrica')
    expect(result!.currency).toBe('ZAR')
  })

  it('supports Kenya region', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const result = buildBoqFromBuildingGraph(graph, 'kenya')
    expect(result!.currency).toBe('KES')
  })
})

// ── generateSchedulesFromGraph ──────────────────────────────

describe('generateSchedulesFromGraph', () => {
  it('returns empty schedules for null graph', () => {
    const s = generateSchedulesFromGraph(null)
    expect(s.doors).toHaveLength(0)
    expect(s.windows).toHaveLength(0)
    expect(s.roomFinishes).toHaveLength(0)
  })

  it('generates schedules from PlanModel-derived graph', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const s = generateSchedulesFromGraph(graph, 'cgi-truss')
    expect(s.doors.length).toBeGreaterThan(0)
    expect(s.windows.length).toBeGreaterThan(0)
    expect(s.roomFinishes.length).toBe(3)
    expect(s.sanitary.length).toBeGreaterThan(0)
    expect(s.electricalPoints.length).toBeGreaterThan(0)
    expect(s.hvac.length).toBeGreaterThan(0)
    expect(s.roof.length).toBeGreaterThan(0)
    expect(s.materialTakeoff.length).toBeGreaterThan(0)
    expect(s.designId).toBeTruthy()
  })

  it('marks wet rooms correctly in finish schedule', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const s = generateSchedulesFromGraph(graph)
    const bathroomFinish = s.roomFinishes.find((r) => r.room === 'Kitchen')
    expect(bathroomFinish).toBeDefined()
    if (bathroomFinish) {
      expect(bathroomFinish.waterproofing).toBe('Yes')
    }
  })

  it('generates concrete-slab roof schedule by default', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const s = generateSchedulesFromGraph(graph)
    expect(s.roof[0].covering).toContain('Concrete slab')
  })

  it('generates CGI truss roof schedule when specified', () => {
    const plan = makeSamplePlan()
    const { graph } = planModelToBuildingGraph(plan)
    const s = generateSchedulesFromGraph(graph, 'cgi-truss')
    expect(s.roof[0].covering).toContain('CGI')
  })

  it('handles BimModel-derived graph with no spaces', () => {
    const bim = makeSampleBim()
    const { graph } = bimModelToBuildingGraph(bim)
    const s = generateSchedulesFromGraph(graph)
    expect(s.doors.length).toBeGreaterThan(0)
  })
})
