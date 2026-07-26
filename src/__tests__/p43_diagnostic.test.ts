import { describe, it, expect } from 'vitest'
import { orientWall } from '@/lib/drawings/frontage-mapper'
import { computeFaçadeComposition } from '@/lib/drawings/frontage-mapper'
import { convertPlanModelToWs6Cad } from '@/adapters/planModelToWs6Cad'
import type { PlanModel } from '@/domain/plan'

function makeSamplePlan(): PlanModel {
  return {
    id: 'test-plan-diagnostic',
    designOptionId: 'design-1',
    width: 12,
    height: 8,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.3, width: 0.9, height: 2.1, sillHeight: 0 },
      { id: 'o2', wallId: 'w1', kind: 'window', offset: 0.7, width: 1.2, height: 1.2, sillHeight: 0.9 },
      { id: 'o3', wallId: 'w2', kind: 'window', offset: 0.5, width: 1.5, height: 1.5, sillHeight: 0.6 },
    ],
  }
}

describe('P43.1 — Orientation Diagnostic', () => {
  it('orientWall misclassifies right-side vertical walls in PlanModel Y-down convention', () => {
    const plan = makeSamplePlan()
    const w2 = plan.walls.find(w => w.id === 'w2')!
    // w2 is on the right face (x=12), should be oriented 'right'
    const orientation = orientWall(w2 as any)
    // But orientWall assumes Y-up, while PlanModel uses Y-down
    // w2 goes (12,0)→(12,8), dy=8>0 → dir.y>0 → 'left'
    expect(orientation).toBe('left')  // this is WRONG — should be 'right'
  })

  it('orientWall misclassifies left-side vertical walls', () => {
    const plan = makeSamplePlan()
    const w4 = plan.walls.find(w => w.id === 'w4')!
    // w4 is on the left face (x=0), should be oriented 'left'
    const orientation = orientWall(w4 as any)
    // w4 goes (0,8)→(0,0), dy=-8<0 → dir.y<0 → 'right'
    expect(orientation).toBe('right')  // this is WRONG — should be 'left'
  })

  it('facade composition for right orientation correctly finds the right wall', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)!
    
    const comp = computeFaçadeComposition(cad, 'right')
    
    // Right facade should find w2 (right wall at x=12) with 1 opening
    expect(comp.segments.length).toBe(1)
    expect(comp.segments[0].openingCount).toBe(1)
  })

  it('facade composition for left orientation finds segments', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)!
    
    const comp = computeFaçadeComposition(cad, 'left')
    
    console.log('Left facade segments count:', comp.segments.length)
    console.log('Left segments:', comp.segments.map(s => ({ wallId: s.wallId, openingCount: s.openingCount })))

    expect(comp.segments.length).toBeGreaterThan(0)
  })

  it('all four facade orientations find segments after converter normalization', () => {
    const plan = makeSamplePlan()
    const cad = convertPlanModelToWs6Cad(plan, 1, 3)!
    
    const rightComp = computeFaçadeComposition(cad, 'right')
    const leftComp = computeFaçadeComposition(cad, 'left')
    const frontComp = computeFaçadeComposition(cad, 'front')
    const rearComp = computeFaçadeComposition(cad, 'rear')
    
    expect(rightComp.segments.length).toBeGreaterThan(0)
    expect(leftComp.segments.length).toBeGreaterThan(0)
    expect(frontComp.segments.length).toBeGreaterThan(0)
    expect(rearComp.segments.length).toBeGreaterThan(0)
  })
})
