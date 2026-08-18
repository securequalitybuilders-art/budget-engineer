import { describe, it, expect } from 'vitest'
import {
  buildSequence,
  phaseStageAt,
  progressAtDay,
  activePhaseIndex,
  materialsArrived,
  mergeMilestoneProgress,
  phaseColor,
  planFootprint,
  buildIsoTransform,
  isoPoint,
  roomIsoPoints,
  computePlanMetrics,
  scalePhasesToPlan,
  PHASE_LIST,
  PHASE_IDS,
} from '@/lib/construction/sequence'
import type { ConstructionPhase } from '@/domain/construction'
import type { Milestone } from '@/domain/milestone'
import type { PlanModel } from '@/domain/plan'
import { PHASES } from '@/engine/construction/constructionPhases'

const phases: ConstructionPhase[] = [
  { id: 'rough-in', title: 'Rough-in & Infrastructure', description: '', workItems: [], materials: [], bom: [], estimatedDays: 14, trade: 'MEP' },
  { id: 'substrates', title: 'Substrates & Enclosures', description: '', workItems: [], materials: [], bom: [], estimatedDays: 10, trade: 'Plastering' },
  { id: 'millwork', title: 'Primary Millwork & Fixtures', description: '', workItems: [], materials: [], bom: [], estimatedDays: 8, trade: 'Joinery' },
  { id: 'finishes', title: 'Finishes', description: '', workItems: [], materials: [], bom: [], estimatedDays: 12, trade: 'Tiling' },
  { id: 'appliances', title: 'Appliances & Staging', description: '', workItems: [], materials: [], bom: [], estimatedDays: 5, trade: 'Electrical' },
]

const bom = [
  { item: 'PVC-U 110mm', spec: '', unit: 'm', qty: 12, notes: '' },
  { item: 'Copper 15mm', spec: '', unit: 'm', qty: 20, notes: '' },
  { item: 'Cement', spec: '', unit: 'bag', qty: 40, notes: '' },
  { item: 'Emulsion paint', spec: '', unit: 'L', qty: 60, notes: '' },
  { item: 'Porcelain tile', spec: '', unit: 'm²', qty: 45, notes: '' },
]

const phasesWithBom: ConstructionPhase[] = phases.map((p, i) => ({ ...p, bom: i === 0 ? bom : [] }))

const plan: PlanModel = {
  id: 'p1',
  designOptionId: 'd1',
  width: 10,
  height: 8,
  wallThickness: 0.22,
  scaleLabel: '1:100',
  rooms: [
    { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 4 },
    { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
    { id: 'r3', name: 'Bed 1', x: 0, y: 4, width: 6, height: 4 },
  ],
  walls: [],
  openings: [],
}

describe('construction sequence helpers', () => {
  it('buildSequence lays phases back-to-back and totals days', () => {
    const { items, totalDays } = buildSequence(phases)
    expect(items).toHaveLength(5)
    expect(totalDays).toBe(49)
    expect(items[0]).toMatchObject({ startDay: 0, endDay: 14, duration: 14 })
    expect(items[1]).toMatchObject({ startDay: 14, endDay: 24, duration: 10 })
    expect(items[4]).toMatchObject({ startDay: 44, endDay: 49, duration: 5 })
  })

  it('PHASE_LIST and PHASE_IDS agree with the phase registry', () => {
    expect(PHASE_LIST.map((p) => p.id)).toEqual([...PHASE_IDS])
  })

  it('phaseStageAt returns pending/in-progress/completed', () => {
    const { items } = buildSequence(phases)
    expect(phaseStageAt(items[0], 0)).toBe('pending')
    expect(phaseStageAt(items[0], 5)).toBe('in-progress')
    expect(phaseStageAt(items[0], 14)).toBe('completed')
    expect(phaseStageAt(items[1], 0)).toBe('pending')
    expect(phaseStageAt(items[1], 15)).toBe('in-progress')
  })

  it('progressAtDay clamps to phase bounds', () => {
    const { items } = buildSequence(phases)
    expect(progressAtDay(items[0], 0)).toBe(0)
    expect(progressAtDay(items[0], 7)).toBe(50)
    expect(progressAtDay(items[0], 14)).toBe(100)
    expect(progressAtDay(items[1], 14)).toBe(0)
    expect(progressAtDay(items[1], 19)).toBe(50)
    expect(progressAtDay(items[1], 30)).toBe(100)
  })

  it('activePhaseIndex resolves the running phase and clamps past the end', () => {
    const { items } = buildSequence(phases)
    expect(activePhaseIndex(items, 0)).toBe(0)
    expect(activePhaseIndex(items, 18)).toBe(1)
    expect(activePhaseIndex(items, 45)).toBe(4)
    expect(activePhaseIndex(items, 100)).toBe(4)
  })

  it('materialsArrived returns a BOM slice proportional to progress', () => {
    expect(materialsArrived(phasesWithBom[0], 0)).toHaveLength(0)
    expect(materialsArrived(phasesWithBom[0], 50)).toHaveLength(3)
    expect(materialsArrived(phasesWithBom[0], 100)).toHaveLength(5)
    expect(materialsArrived(phasesWithBom[0], 200)).toHaveLength(5)
    expect(materialsArrived(phasesWithBom[0], -10)).toHaveLength(0)
  })

  it('mergeMilestoneProgress maps milestone order to sequence progress', () => {
    const { items } = buildSequence(phases)
    const milestone: Milestone = {
      id: 'm1',
      projectId: 'p1',
      name: 'Rough-in done',
      description: '',
      plannedDate: '2026-01-01',
      plannedCostCents: 100000,
      linkedBOQSectionIds: [],
      linkedScheduleLineIds: [],
      requiredArtifacts: [],
      requiredReviewChecks: [],
      proofArtifacts: [],
      reviewChecks: [],
      releaseConditions: [],
      releaseState: 'released',
      releaseDecisions: [],
      weight: 1,
      order: 0,
      category: 'construction',
      isCritical: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      notes: '',
    }
    const merged = mergeMilestoneProgress(items, [milestone])
    expect(merged[0].milestoneProgress).toBe(100)
    expect(merged[0].milestoneState).toBe('released')
    expect(merged[1].milestoneProgress).toBeUndefined()
  })

  it('phaseColor returns known hex and a fallback for unknown ids', () => {
    expect(phaseColor('rough-in')).toBe('#f59e0b')
    expect(phaseColor('appliances')).toBe('#22c55e')
    expect(phaseColor('nope')).toBe('#64748b')
  })

  it('planFootprint computes the union of room extents', () => {
    expect(planFootprint(plan)).toEqual({ left: 0, top: 0, width: 10, height: 8 })
    expect(planFootprint({ ...plan, rooms: [] })).toBeNull()
  })

  it('buildIsoTransform returns a pan-proof transform and null for empty plans', () => {
    const t = buildIsoTransform(plan, 520, 380)
    expect(t).not.toBeNull()
    expect(t!.scale).toBeGreaterThan(0)
    expect(t!.plateHeight).toBe(26)
    expect(buildIsoTransform({ ...plan, rooms: [] }, 520, 380)).toBeNull()
  })

  it('isoPoint and roomIsoPoints project to iso coordinates', () => {
    const t = buildIsoTransform(plan, 520, 380)!
    const p = isoPoint({ x: 0, y: 0 }, t)
    expect(p.x).toBe(t.ox)
    expect(p.y).toBe(t.oy)
    const pts = roomIsoPoints(plan.rooms[0], t)
    const parts = pts.split(' ')
    expect(parts).toHaveLength(4)
    for (const part of parts) {
      const [x, y] = part.split(',').map(Number)
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
    }
  })
})

const scaledPlan: PlanModel = {
  id: 'p2',
  designOptionId: 'd2',
  width: 14,
  height: 12,
  wallThickness: 0.22,
  scaleLabel: '1:100',
  rooms: [
    { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
    { id: 'r2', name: 'Kitchen', x: 5, y: 0, width: 4, height: 3 },
    { id: 'r3', name: 'Bedroom 1', x: 9, y: 0, width: 4, height: 3 },
    { id: 'r4', name: 'Bathroom', x: 5, y: 3, width: 3, height: 2.5 },
    { id: 'r5', name: 'Bedroom 2', x: 0, y: 4, width: 4, height: 3 },
    { id: 'r6', name: 'Dining', x: 4, y: 4, width: 3.5, height: 3 },
    { id: 'r7', name: 'Store', x: 7.5, y: 4, width: 2.5, height: 2 },
    { id: 'r8', name: 'Toilet', x: 10, y: 3, width: 3, height: 2 },
  ],
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 14, y: 0 }, thickness: 0.22, type: 'external' },
    { id: 'w2', start: { x: 0, y: 0 }, end: { x: 0, y: 7 }, thickness: 0.22, type: 'external' },
    { id: 'w3', start: { x: 14, y: 0 }, end: { x: 14, y: 7 }, thickness: 0.22, type: 'external' },
    { id: 'w4', start: { x: 0, y: 7 }, end: { x: 14, y: 7 }, thickness: 0.22, type: 'external' },
  ],
  openings: [
    { id: 'o1', wallId: 'w1', kind: 'door', offset: 3, width: 0.9 },
    { id: 'o2', wallId: 'w2', kind: 'window', offset: 1, width: 1.2 },
    { id: 'o3', wallId: 'w3', kind: 'door', offset: 2, width: 0.9 },
    { id: 'o4', wallId: 'w4', kind: 'window', offset: 4, width: 1.5 },
    { id: 'o5', wallId: 'w1', kind: 'window', offset: 7, width: 1.2 },
    { id: 'o6', wallId: 'w2', kind: 'door', offset: 3, width: 0.9 },
  ],
}

const noKitchensPlan: PlanModel = {
  ...scaledPlan,
  id: 'p3',
  rooms: scaledPlan.rooms.filter((r) => r.name !== 'Kitchen'),
}

const emptyPlan: PlanModel = {
  id: 'p4',
  designOptionId: 'd4',
  width: 10,
  height: 8,
  wallThickness: 0.22,
  scaleLabel: '1:100',
  rooms: [],
  walls: [],
  openings: [],
}

describe('computePlanMetrics', () => {
  it('computes total floor area from room dimensions', () => {
    const m = computePlanMetrics(scaledPlan)
    const expected = 5 * 4 + 4 * 3 + 4 * 3 + 3 * 2.5 + 4 * 3 + 3.5 * 3 + 2.5 * 2 + 3 * 2
    expect(m.totalFloorArea).toBeCloseTo(expected, 1)
  })

  it('counts rooms, doors, and windows', () => {
    const m = computePlanMetrics(scaledPlan)
    expect(m.roomCount).toBe(8)
    expect(m.doorCount).toBe(3)
    expect(m.windowCount).toBe(3)
  })

  it('identifies wet rooms by keyword', () => {
    const m = computePlanMetrics(scaledPlan)
    expect(m.wetRoomCount).toBe(3)
    expect(m.wetFloorArea).toBeCloseTo(4 * 3 + 3 * 2.5 + 3 * 2, 1)
  })

  it('computes wall length from wall segments', () => {
    const m = computePlanMetrics(scaledPlan)
    const expectedLen = 14 + 7 + 14 + 7
    expect(m.wallLength).toBeCloseTo(expectedLen, 1)
  })

  it('returns zero metrics for empty plan', () => {
    const m = computePlanMetrics(emptyPlan)
    expect(m.roomCount).toBe(0)
    expect(m.totalFloorArea).toBe(0)
    expect(m.wallLength).toBe(0)
    expect(m.wetRoomCount).toBe(0)
    expect(m.wetFloorArea).toBe(0)
  })
})

describe('scalePhasesToPlan', () => {
  const allPhases: ConstructionPhase[] = Object.values(PHASES)

  it('returns raw phases when plan has no rooms', () => {
    const result = scalePhasesToPlan(emptyPlan, allPhases)
    expect(result).toEqual(allPhases)
  })

  it('scales copper pipe BOM by room count', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const roughIn = result.find((p) => p.id === 'rough-in')!
    const copper = roughIn.bom.find((b) => b.item === 'Copper pipe 15mm')
    expect(copper).toBeDefined()
    expect(copper!.qty).toBe(Math.max(6, 8 * 6))
  })

  it('scales PVC conduit BOM by wall length', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const roughIn = result.find((p) => p.id === 'rough-in')!
    const conduit = roughIn.bom.find((b) => b.item === 'PVC conduit 20mm')
    expect(conduit).toBeDefined()
    expect(conduit!.qty).toBe(Math.max(10, Math.round(42 * 2)))
  })

  it('scales porcelain tile BOM by wet floor area', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const finishes = result.find((p) => p.id === 'finishes')!
    const tile = finishes.bom.find((b) => b.item === 'Porcelain tile 600x600')
    expect(tile).toBeDefined()
    const wetArea = 4 * 3 + 3 * 2.5 + 3 * 2
    expect(tile!.qty).toBe(Math.max(6, Math.round(wetArea * 1.1)))
  })

  it('scales engineered oak by dry floor area', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const finishes = result.find((p) => p.id === 'finishes')!
    const oak = finishes.bom.find((b) => b.item === 'Engineered oak 14mm')
    expect(oak).toBeDefined()
    const totalArea = 5 * 4 + 4 * 3 + 4 * 3 + 3 * 2.5 + 4 * 3 + 3.5 * 3 + 2.5 * 2 + 3 * 2
    const wetArea = 4 * 3 + 3 * 2.5 + 3 * 2
    const dryArea = totalArea - wetArea
    expect(oak!.qty).toBe(Math.max(6, Math.round(dryArea * 1.05)))
  })

  it('returns 0 granite countertop when no kitchen', () => {
    const result = scalePhasesToPlan(noKitchensPlan, allPhases)
    const millwork = result.find((p) => p.id === 'millwork')!
    const granite = millwork.bom.find((b) => b.item === 'Granite countertop')
    expect(granite).toBeDefined()
    expect(granite!.qty).toBe(0)
  })

  it('returns 3 granite countertop when kitchen present', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const millwork = result.find((p) => p.id === 'millwork')!
    const granite = millwork.bom.find((b) => b.item === 'Granite countertop')
    expect(granite).toBeDefined()
    expect(granite!.qty).toBe(3)
  })

  it('scales rough-in days proportionally to room count', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const roughIn = result.find((p) => p.id === 'rough-in')!
    const expected = Math.max(7, Math.round(14 * (8 / 6)))
    expect(roughIn.estimatedDays).toBe(expected)
  })

  it('scales finishes days proportionally to floor area', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    const finishes = result.find((p) => p.id === 'finishes')!
    const m = computePlanMetrics(scaledPlan)
    const expected = Math.max(7, Math.round(12 * (m.totalFloorArea / 120)))
    expect(finishes.estimatedDays).toBe(expected)
  })

  it('does not mutate the original phases array', () => {
    const originals = allPhases.map((p) => p.estimatedDays)
    scalePhasesToPlan(scaledPlan, allPhases)
    allPhases.forEach((p, i) => {
      expect(p.estimatedDays).toBe(originals[i])
    })
  })

  it('preserves phase metadata (id, title, trade)', () => {
    const result = scalePhasesToPlan(scaledPlan, allPhases)
    expect(result).toHaveLength(allPhases.length)
    result.forEach((p, i) => {
      expect(p.id).toBe(allPhases[i].id)
      expect(p.title).toBe(allPhases[i].title)
      expect(p.trade).toBe(allPhases[i].trade)
    })
  })
})
