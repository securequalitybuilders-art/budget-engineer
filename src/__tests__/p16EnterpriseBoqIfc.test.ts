import { describe, it, expect } from 'vitest'
import { buildingGraphToIfcStep } from '@/adapters/canonical/building-to-ifc'
import { buildEnterpriseBoq, buildEnterpriseBoqHtml } from '@/lib/boq/enterprise-boq'
import type { BuildingGraph } from '@/domain/building'

function makeGraph(): BuildingGraph {
  return {
    meta: { id: 'g1', projectId: 'p1', name: 'Test Building', category: 'residential', description: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    site: null,
    levels: [
      { id: 'l1', name: 'Ground Floor', number: 0, elevation: 0, floorHeight: 3 },
    ],
    spaces: [
      { id: 's1', levelId: 'l1', name: 'Living Room', programme: 'living', boundary: { vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 5 }, { x: 0, y: 5 }] }, bbox: { minX: 0, minY: 0, maxX: 6, maxY: 5 }, areaM2: 30, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'paint', floorFinish: 'tile', ceilingFinish: 'paint' }, fixtures: [], notes: '' },
      { id: 's2', levelId: 'l1', name: 'Kitchen', programme: 'kitchen', boundary: { vertices: [{ x: 6, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 6, y: 5 }] }, bbox: { minX: 6, minY: 0, maxX: 10, maxY: 5 }, areaM2: 20, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: 'tile', floorFinish: 'tile', ceilingFinish: 'paint' }, fixtures: [], notes: '' },
    ],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w2', levelId: 'l1', role: 'external', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 0, z: 5 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w3', levelId: 'l1', role: 'external', start: { x: 10, y: 0, z: 5 }, end: { x: 0, y: 0, z: 5 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w4', levelId: 'l1', role: 'external', start: { x: 0, y: 0, z: 5 }, end: { x: 0, y: 0, z: 0 }, thickness: 0.23, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w5', levelId: 'l1', role: 'internal', start: { x: 6, y: 0, z: 0 }, end: { x: 6, y: 0, z: 5 }, thickness: 0.1, height: 3, material: 'plasterboard', ifcClass: 'IfcWall', properties: {} },
    ],
    slabs: [
      { id: 'sl1', levelId: 'l1', boundary: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }] }, thickness: 0.15, material: 'concrete', ifcClass: 'IfcSlab', properties: {} },
    ],
    openings: [
      { id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'door', offsetRatio: 0.3, width: 0.9, height: 2.1, sillHeight: 0, material: 'timber', ifcClass: 'IfcDoor', properties: {} },
      { id: 'o2', levelId: 'l1', wallId: 'w1', kind: 'window', offsetRatio: 0.7, width: 1.5, height: 1.2, sillHeight: 0.9, material: 'aluminium', ifcClass: 'IfcWindow', properties: {} },
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
  } as unknown as BuildingGraph
}

// ── Track A: IFC Export ──────────────────────────────────────

describe('buildingGraphToIfcStep', () => {
  it('returns null for graph with no levels', () => {
    const graph = { ...makeGraph(), levels: [] } as unknown as BuildingGraph
    expect(buildingGraphToIfcStep(graph)).toBeNull()
  })

  it('returns IFC-STEP content starting with ISO header', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain('ISO-10303-21')
    expect(step).toContain('HEADER')
    expect(step).toContain('ENDSEC')
  })

  it('includes IFC4 schema declaration', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFC4")
  })

  it('contains IFCPROJECT with project name', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCPROJECT")
    expect(step).toContain("Test Building")
  })

  it('contains IFCBUILDINGSTOREY for each level', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCBUILDINGSTOREY")
    expect(step).toContain("Ground Floor")
  })

  it('contains IFCWALLSTANDARDCASE for each wall', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    const matches = step.match(/IFCWALLSTANDARDCASE/g)
    expect(matches).toHaveLength(5)
  })

  it('contains IFCSPACE for each room', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    const matches = step.match(/IFCSPACE/g)
    expect(matches).toHaveLength(2)
  })

  it('contains IFCDOOR and IFCWINDOW for openings', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCDOOR")
    expect(step).toContain("IFCWINDOW")
  })

  it('contains IFCCOLUMN and IFCBEAM for structural elements', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCCOLUMN")
    expect(step).toContain("IFCBEAM")
  })

  it('contains IFCSTAIR', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCSTAIR")
  })

  it('contains IFCROOF', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCROOF")
  })

  it('contains property sets with element metadata', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCPROPERTYSET")
    expect(step).toContain("WallProperties")
    expect(step).toContain("SpaceProperties")
  })

  it('contains IFCSLAB', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("IFCSLAB")
  })

  it('ends with END-ISO-10303-21', () => {
    const step = buildingGraphToIfcStep(makeGraph())!
    expect(step).toContain("END-ISO-10303-21")
  })
})

// ── Track B: Enterprise BOQ v2 ───────────────────────────────

describe('buildEnterpriseBoq', () => {
  it('returns null for graph with no spaces', () => {
    const graph = { ...makeGraph(), spaces: [] } as unknown as BuildingGraph
    expect(buildEnterpriseBoq(graph)).toBeNull()
  })

  it('returns base BOQ with items', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    expect(result.baseBoq.items.length).toBeGreaterThan(0)
    expect(result.baseBoq).toBeDefined()
  })

  it('applies escalation factor when configured', () => {
    const normal = buildEnterpriseBoq(makeGraph())!
    const escalated = buildEnterpriseBoq(makeGraph(), 'zimbabwe', 'concrete-slab', { rate: 10, label: 'Market adjustment' })!

    const normalTotal = normal.itemsWithEscalation.reduce((s, i) => s + i.total, 0)
    const escTotal = escalated.itemsWithEscalation.reduce((s, i) => s + i.total, 0)
    expect(escTotal).toBeGreaterThan(normalTotal)
  })

  it('produces trade breakdown', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    expect(result.tradeBreakdown.length).toBeGreaterThan(0)
    const totalPct = result.tradeBreakdown.reduce((s, t) => s + t.pct, 0)
    expect(totalPct).toBeCloseTo(100, 0)
  })

  it('trade breakdown sorted by total descending', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    for (let i = 1; i < result.tradeBreakdown.length; i++) {
      expect(result.tradeBreakdown[i - 1].total).toBeGreaterThanOrEqual(result.tradeBreakdown[i].total)
    }
  })

  it('includes enterprise metadata', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    expect(result.metadata.projectName).toBe('Test Building')
    expect(result.metadata.canonicalGraphId).toBe('g1')
    expect(result.metadata.generatedAt).toBeTruthy()
  })

  it('escalation metadata reflects configuration', () => {
    const result = buildEnterpriseBoq(makeGraph(), 'zimbabwe', 'concrete-slab', { rate: 8, label: 'Market adj' })!
    expect(result.metadata.escalationApplied).toBe(true)
    expect(result.metadata.escalationRate).toBe(8)
  })

  it('no escalation metadata when not configured', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    expect(result.metadata.escalationApplied).toBe(false)
    expect(result.metadata.escalationRate).toBe(0)
  })

  it('generates CSV output', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    expect(result.csv).toContain('Ref,Category,Description')
    expect(result.csv).toContain('Trade,Total,%')
  })

  it('summary includes all financial fields', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    expect(result.summary.subtotal).toBeGreaterThan(0)
    expect(result.summary.contingency).toBeGreaterThan(0)
    expect(result.summary.professionalFees).toBeGreaterThan(0)
    expect(result.summary.vat).toBeGreaterThan(0)
    expect(result.summary.grandTotal).toBeGreaterThan(result.summary.subtotal)
  })
})

describe('buildEnterpriseBoqHtml', () => {
  it('generates valid HTML with project name', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    const html = buildEnterpriseBoqHtml(result)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Enterprise Bill of Quantities')
    expect(html).toContain('Test Building')
    expect(html).toContain('</html>')
  })

  it('includes trade breakdown table', () => {
    const result = buildEnterpriseBoq(makeGraph())!
    const html = buildEnterpriseBoqHtml(result)
    expect(html).toContain('Trade Breakdown')
    expect(html).toContain('Grand Total')
  })
})
