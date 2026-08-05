import type { ConstructionPhase, PhaseBomEntry } from '@/domain/construction'
import type { Milestone } from '@/domain/milestone'
import type { PlanModel, RoomRect } from '@/domain/plan'
import { PHASES } from '@/engine/construction/constructionPhases'

export interface SequenceItem {
  phase: ConstructionPhase
  startDay: number
  endDay: number
  duration: number
  milestoneProgress?: number
  milestoneState?: Milestone['releaseState']
}

export type PhaseStage = 'pending' | 'in-progress' | 'completed'

export const PHASE_LIST: ConstructionPhase[] = Object.values(PHASES)

export const PHASE_IDS = ['rough-in', 'substrates', 'millwork', 'finishes', 'appliances'] as const

export const PHASE_COLORS: Record<string, string> = {
  'rough-in': '#f59e0b',
  'substrates': '#94a3b8',
  'millwork': '#f97316',
  'finishes': '#8b5cf6',
  'appliances': '#22c55e',
}

export const PHASE_COLOR_FALLBACK = '#64748b'

export function phaseColor(id: string): string {
  return PHASE_COLORS[id] ?? PHASE_COLOR_FALLBACK
}

export function buildSequence(phases: ConstructionPhase[]): { items: SequenceItem[]; totalDays: number } {
  let cursor = 0
  const items = phases.map((phase) => {
    const item: SequenceItem = {
      phase,
      startDay: cursor,
      endDay: cursor + phase.estimatedDays,
      duration: phase.estimatedDays,
    }
    cursor += phase.estimatedDays
    return item
  })
  return { items, totalDays: cursor }
}

export function phaseStageAt(item: SequenceItem, day: number): PhaseStage {
  if (day >= item.endDay) return 'completed'
  if (day > item.startDay) return 'in-progress'
  return 'pending'
}

export function progressAtDay(item: SequenceItem, day: number): number {
  if (day <= item.startDay) return 0
  if (day >= item.endDay) return 100
  return Math.round(((day - item.startDay) / item.duration) * 100)
}

export function activePhaseIndex(items: SequenceItem[], day: number): number {
  const within = items.findIndex((it) => day >= it.startDay && day < it.endDay)
  if (within >= 0) return within
  const last = items[items.length - 1]
  if (last && day >= last.endDay) return items.length - 1
  return -1
}

export function materialsArrived(phase: ConstructionPhase, progressPct: number): PhaseBomEntry[] {
  const clamped = Math.max(0, Math.min(100, progressPct))
  const count = Math.round((phase.bom.length * clamped) / 100)
  return phase.bom.slice(0, count)
}

export function mergeMilestoneProgress(items: SequenceItem[], milestones: Milestone[]): SequenceItem[] {
  const byOrder = new Map<number, Milestone>()
  for (const milestone of milestones) {
    const existing = byOrder.get(milestone.order)
    if (!existing) byOrder.set(milestone.order, milestone)
  }
  return items.map((item, order) => {
    const milestone = byOrder.get(order)
    if (!milestone) return item
    return {
      ...item,
      milestoneProgress: milestoneProgressOf(milestone),
      milestoneState: milestone.releaseState,
    }
  })
}

function milestoneProgressOf(milestone: Milestone): number {
  if (milestone.releaseState === 'released') return 100
  if (milestone.proofArtifacts.length > 0 || milestone.releaseState === 'pending-review') return 60
  if (milestone.actualDate || milestone.completedAt) return 100
  return 20
}

export interface IsoTransform {
  scale: number
  ox: number
  oy: number
  plateHeight: number
}

export function planFootprint(plan: PlanModel): { left: number; top: number; width: number; height: number } | null {
  if (plan.rooms.length === 0) return null
  const left = Math.min(...plan.rooms.map((r) => r.x))
  const top = Math.min(...plan.rooms.map((r) => r.y))
  const right = Math.max(...plan.rooms.map((r) => r.x + r.width))
  const bottom = Math.max(...plan.rooms.map((r) => r.y + r.height))
  return { left, top, width: right - left, height: bottom - top }
}

export function buildIsoTransform(plan: PlanModel, viewWidth: number, viewHeight: number): IsoTransform | null {
  const fp = planFootprint(plan)
  if (!fp) return null
  const span = fp.width + fp.height
  const cornerProjection = (c: { x: number; y: number }) => ({ x: (c.x - c.y), y: (c.x + c.y) * 0.5 })
  const corners = [
    { x: fp.left, y: fp.top },
    { x: fp.left + fp.width, y: fp.top },
    { x: fp.left + fp.width, y: fp.top + fp.height },
    { x: fp.left, y: fp.top + fp.height },
  ]
  const proj = corners.map(cornerProjection)
  const minX = Math.min(...proj.map((p) => p.x))
  const maxX = Math.max(...proj.map((p) => p.x))
  const maxY = Math.max(...proj.map((p) => p.y))

  const headroom = 150
  const scale = Math.min((viewWidth * 0.8) / span, (viewHeight - headroom) / (span * 0.5))
  if (!isFinite(scale) || scale <= 0) return null

  const ox = viewWidth / 2 - ((minX + maxX) * scale) / 2
  const oy = viewHeight - 30 - maxY * scale
  return { scale, ox, oy, plateHeight: 26 }
}

export function isoPoint(p: { x: number; y: number }, t: IsoTransform, z = 0): { x: number; y: number } {
  return {
    x: t.ox + (p.x - p.y) * t.scale,
    y: t.oy + (p.x + p.y) * t.scale * 0.5 - z,
  }
}

export function roomIsoPoints(rect: RoomRect, t: IsoTransform, z = 0): string {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ]
  return corners.map((c) => {
    const q = isoPoint(c, t, z)
    return `${q.x.toFixed(1)},${q.y.toFixed(1)}`
  }).join(' ')
}
