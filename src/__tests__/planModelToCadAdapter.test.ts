import { describe, it, expect } from 'vitest'
import { convertPlanModelToCadDocument } from '@/adapters/planModelToCadAdapter'
import { createSamplePlanModel, createAlternatePlanModel } from './fixtures/cadFixtures'

describe('planModelToCadAdapter', () => {
  it('null plan returns null + warning', () => {
    const result = convertPlanModelToCadDocument({ plan: null })
    expect(result.cad).toBeNull()
    expect(result.source).toBe('invalid-plan')
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('sample PlanModel converts to CadDocument', () => {
    const plan = createSamplePlanModel()
    const result = convertPlanModelToCadDocument({ plan, projectId: 'proj-1', designId: 'design-1' })
    expect(result.cad).not.toBeNull()
    expect(result.source).toBe('persisted-cad')
    expect(result.warnings).toEqual([])
  })

  it('converted CadDocument has floors', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.floors).toHaveLength(1)
    expect(cad!.floors[0].id).toBe('f1')
    expect(cad!.floors[0].name).toBe('Ground Floor')
  })

  it('converted CadDocument has walls matching PlanModel walls', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.walls).toHaveLength(plan.walls.length)
    expect(cad!.walls[0].id).toBe(plan.walls[0].id)
    expect(cad!.walls[0].structuralRole).toBe('external')
    expect(cad!.walls[1].structuralRole).toBe('internal')
    expect(cad!.walls[0].start.x).toBe(plan.walls[0].start.x)
    expect(cad!.walls[0].end.y).toBe(plan.walls[0].end.y)
  })

  it('converted CadDocument has openings when fixture includes them', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.openings).toHaveLength(plan.openings.length)
    expect(cad!.openings[0].id).toBe(plan.openings[0].id)
    expect(cad!.openings[0].kind).toBe(plan.openings[0].kind)
    expect(cad!.openings[0].wallId).toBe(plan.openings[0].wallId)
    expect(cad!.openings[0].offsetRatio).toBeGreaterThan(0)
    expect(cad!.openings[0].offsetRatio).toBeLessThanOrEqual(1)
  })

  it('converted CadDocument has empty openings when fixture has none', () => {
    const plan = createAlternatePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.openings).toHaveLength(0)
  })

  it('converted CadDocument has default layers', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.layers.length).toBeGreaterThan(0)
    const layerIds = cad!.layers.map((l) => l.id)
    expect(layerIds).toContain('walls')
    expect(layerIds).toContain('openings')
    expect(layerIds).toContain('annotations')
  })

  it('no NaN in converted geometry', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    const allNums: number[] = []
    for (const w of cad!.walls) {
      allNums.push(w.start.x, w.start.y, w.end.x, w.end.y, w.thickness)
    }
    for (const o of cad!.openings) {
      allNums.push(o.offsetRatio, o.width)
    }
    for (const n of allNums) {
      expect(Number.isNaN(n)).toBe(false)
    }
  })

  it('invalid geometry is clamped or warned', () => {
    const plan = createSamplePlanModel({
      walls: [
        { id: 'nan-wall', start: { x: NaN, y: 0 }, end: { x: 10, y: 0 }, thickness: -5, type: 'external' as const },
      ],
      openings: [],
      rooms: [],
    })
    const { cad, source } = convertPlanModelToCadDocument({ plan })
    expect(cad).not.toBeNull()
    expect(source).toBe('persisted-cad')
    expect(Number.isNaN(cad!.walls[0].start.x)).toBe(false)
    expect(Number.isNaN(cad!.walls[0].thickness)).toBe(false)
    expect(cad!.walls[0].thickness).toBeGreaterThan(0)
  })

  it('ids/projectId/designId preserved where possible', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan, projectId: 'my-proj', designId: 'my-design' })
    expect(cad!.projectId).toBe('my-proj')
    expect(cad!.designId).toBe('my-design')
    expect(cad!.walls[0].id).toBe(plan.walls[0].id)
    expect(cad!.openings[0].id).toBe(plan.openings[0].id)
  })

  it('PlanModel with no walls returns null', () => {
    const plan = createSamplePlanModel({ walls: [], rooms: [], openings: [] })
    const result = convertPlanModelToCadDocument({ plan })
    expect(result.cad).toBeNull()
    expect(result.source).toBe('invalid-plan')
    expect(result.warnings.some((w) => w.includes('no walls'))).toBe(true)
  })

  it('CadDocument has activeTool and activeFloorId', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.activeTool).toBe('select')
    expect(cad!.activeFloorId).toBe('f1')
  })

  it('CadDocument has empty annotations and blocks', () => {
    const plan = createSamplePlanModel()
    const { cad } = convertPlanModelToCadDocument({ plan })
    expect(cad!.annotations).toEqual([])
    expect(cad!.blocks).toEqual([])
  })
})
