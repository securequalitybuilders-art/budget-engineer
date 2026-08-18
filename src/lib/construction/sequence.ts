import type { ConstructionPhase, PhaseBomEntry } from '@/domain/construction'
import type { Milestone } from '@/domain/milestone'
import type { PlanModel, RoomRect } from '@/domain/plan'
import { PHASES } from '@/engine/construction/constructionPhases'

const WET_ROOM_KEYWORDS = ['bathroom', 'kitchen', 'toilet', 'laundry', 'ensuite', 'wc']

function totalWallLength(plan: PlanModel): number {
  return plan.walls.reduce((sum, w) => {
    const dx = w.end.x - w.start.x
    const dy = w.end.y - w.start.y
    return sum + Math.sqrt(dx * dx + dy * dy)
  }, 0)
}

function wetRooms(plan: PlanModel): RoomRect[] {
  return plan.rooms.filter((r) =>
    WET_ROOM_KEYWORDS.some((kw) => r.name.toLowerCase().includes(kw)),
  )
}

function wetFloorArea(plan: PlanModel): number {
  return wetRooms(plan).reduce((sum, r) => sum + r.width * r.height, 0)
}

export interface PlanMetrics {
  totalFloorArea: number
  wallLength: number
  roomCount: number
  doorCount: number
  windowCount: number
  wetRoomCount: number
  wetFloorArea: number
}

export function computePlanMetrics(plan: PlanModel): PlanMetrics {
  const totalFloorArea = plan.rooms.reduce((sum, r) => sum + r.width * r.height, 0)
  const wallLength = totalWallLength(plan)
  const doorCount = plan.openings.filter((o) => o.kind === 'door').length
  const windowCount = plan.openings.filter((o) => o.kind === 'window').length
  const wetArea = wetFloorArea(plan)
  return {
    totalFloorArea,
    wallLength,
    roomCount: plan.rooms.length,
    doorCount,
    windowCount,
    wetRoomCount: wetRooms(plan).length,
    wetFloorArea: wetArea,
  }
}

function scaleBom(bom: PhaseBomEntry[], overrides: Partial<Record<string, number>>): PhaseBomEntry[] {
  return bom.map((entry) => {
    const override = overrides[entry.item]
    if (override === undefined) return entry
    return { ...entry, qty: Math.max(0, Math.round(override)) }
  })
}

function buildMaterialOverrides(plan: PlanModel, metrics: PlanMetrics): Partial<Record<string, number>> {
  const overrides: Partial<Record<string, number>> = {}
  const perimeter = planPerimeter(plan)

  // rough-in: pipes scale with room/wet-room count and wall length
  overrides['Copper pipe 15mm'] = Math.max(6, metrics.roomCount * 6)
  overrides['PVC conduit 20mm'] = Math.max(10, Math.round(metrics.wallLength * 2))
  overrides['PE pipe 25mm'] = Math.max(4, metrics.wetRoomCount * 4)

  // substrates: plaster/ceiling scale with perimeter and floor area
  overrides['Cement plaster 1:4'] = Math.max(20, Math.round(perimeter * 2.4 * 0.02))
  overrides['Cement board 6mm'] = Math.max(6, Math.round(metrics.totalFloorArea * 0.9))
  overrides['Acrylic membrane'] = Math.max(4, Math.round(metrics.wetFloorArea * 0.5))
  overrides['Floor screed 1:4'] = Math.max(6, Math.round(metrics.totalFloorArea * 0.9))

  // finishes: tiles/wood/paint/skirting scale with floor areas and perimeter
  overrides['Porcelain tile 600x600'] = Math.max(6, Math.round(metrics.wetFloorArea * 1.1))
  overrides['Engineered oak 14mm'] = Math.max(6, Math.round((metrics.totalFloorArea - metrics.wetFloorArea) * 1.05))
  overrides['Matt emulsion paint'] = Math.max(6, Math.round(perimeter * 2.4 * 2 * 0.08))
  overrides['MDF skirting 100x12'] = Math.max(6, Math.round(perimeter * 0.85))
  overrides['Epoxy grout'] = Math.max(1, Math.round(metrics.wetFloorArea * 0.2))
  overrides['MDF architrave 70x12'] = Math.max(1, metrics.doorCount * 3)

  // millwork: kitchen-specific items
  const hasKitchen = plan.rooms.some((r) => r.name.toLowerCase().includes('kitchen'))
  overrides['Marine ply 18mm'] = hasKitchen ? 6 : 1
  overrides['Granite countertop'] = hasKitchen ? 3 : 0

  // appliances: downlights scale with room count
  overrides['LED downlight'] = Math.max(4, metrics.roomCount * 2)

  return overrides
}

function planPerimeter(plan: PlanModel): number {
  return plan.rooms.reduce((sum, r) => sum + 2 * (r.width + r.height), 0)
}

const REFERENCE_AREA = 120
const REFERENCE_ROOMS = 6
const REFERENCE_PERIMETER = 85

export function scalePhasesToPlan(plan: PlanModel, phases: ConstructionPhase[]): ConstructionPhase[] {
  if (plan.rooms.length === 0) return phases

  const metrics = computePlanMetrics(plan)
  const overrides = buildMaterialOverrides(plan, metrics)
  const perimeter = planPerimeter(plan)

  return phases.map((phase) => {
    const scaledBom = scaleBom(phase.bom, overrides)

    let estimatedDays = phase.estimatedDays
    if (phase.id === 'rough-in') {
      estimatedDays = Math.max(7, Math.round(phase.estimatedDays * (metrics.roomCount / REFERENCE_ROOMS)))
    } else if (phase.id === 'substrates') {
      estimatedDays = Math.max(5, Math.round(phase.estimatedDays * (perimeter / REFERENCE_PERIMETER)))
    } else if (phase.id === 'finishes') {
      estimatedDays = Math.max(7, Math.round(phase.estimatedDays * (metrics.totalFloorArea / REFERENCE_AREA)))
    }

    return { ...phase, bom: scaledBom, estimatedDays }
  })
}

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
