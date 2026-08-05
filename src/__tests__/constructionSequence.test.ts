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
  PHASE_LIST,
  PHASE_IDS,
} from '@/lib/construction/sequence'
import type { ConstructionPhase } from '@/domain/construction'
import type { Milestone } from '@/domain/milestone'
import type { PlanModel } from '@/domain/plan'

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
