import type { Milestone } from '@/domain/milestone'
import type { BOQ } from '@/types'
import type { ScheduleOfValues, SoVLine, SoVCategory } from '@/domain/closeout'

function uid(): string {
  return crypto.randomUUID()
}

function scaleLines(lines: SoVLine[], targetCents: number): SoVLine[] {
  const total = lines.reduce((s, l) => s + l.amountCents, 0)
  if (total <= 0 || targetCents <= 0 || Math.abs(total - targetCents) < 1) return lines
  const factor = targetCents / total
  return lines.map((l) => ({
    ...l,
    amountCents: Math.round(l.amountCents * factor),
    weightPct: Math.round(((l.amountCents * factor) / targetCents) * 10000) / 100,
  }))
}

export function scheduleOfValuesFromMilestones(
  projectId: string,
  milestones: Milestone[],
  contractValueCents?: number,
): ScheduleOfValues {
  const plannedTotal = milestones.reduce((s, m) => s + m.plannedCostCents, 0)
  const target = contractValueCents && contractValueCents > 0 ? contractValueCents : plannedTotal
  const ordered = [...milestones].sort((a, b) => a.order - b.order)
  const lines = scaleLines(
    ordered.map((m) => ({
      id: uid(),
      code: `SOV-${String(m.order + 1).padStart(2, '0')}`,
      description: m.name,
      amountCents: m.plannedCostCents,
      weightPct: target > 0 ? Math.round((m.plannedCostCents / target) * 10000) / 100 : 0,
      category: m.category as SoVCategory,
      linkedMilestoneIds: [m.id],
      linkedBOQSectionIds: m.linkedBOQSectionIds ?? [],
    })),
    target,
  )
  return {
    id: uid(),
    projectId,
    contractValueCents: target,
    lines,
    createdAt: new Date().toISOString(),
  }
}

export function scheduleOfValuesFromBoq(projectId: string, boq: BOQ, contractValueCents?: number): ScheduleOfValues {
  const target = contractValueCents && contractValueCents > 0 ? contractValueCents : boq.totalCents
  const lines = scaleLines(
    boq.sections.map((s, i) => ({
      id: uid(),
      code: s.code || `SOV-${String(i + 1).padStart(2, '0')}`,
      description: s.title,
      amountCents: s.subtotalCents,
      weightPct: target > 0 ? Math.round((s.subtotalCents / target) * 10000) / 100 : 0,
      category: 'construction' as SoVCategory,
      linkedMilestoneIds: [],
      linkedBOQSectionIds: [s.id],
    })),
    target,
  )
  return {
    id: uid(),
    projectId,
    contractValueCents: target,
    lines,
    createdAt: new Date().toISOString(),
  }
}

export function sovTotals(sov: ScheduleOfValues): {
  contractValueCents: number
  allocatedCents: number
  unallocatedCents: number
  fullyAllocated: boolean
} {
  const allocatedCents = sov.lines.reduce((s, l) => s + l.amountCents, 0)
  const unallocatedCents = Math.max(0, sov.contractValueCents - allocatedCents)
  return {
    contractValueCents: sov.contractValueCents,
    allocatedCents,
    unallocatedCents,
    fullyAllocated: unallocatedCents < 1,
  }
}

export function sovReleasedCents(sov: ScheduleOfValues, releasedMilestoneIds: string[]): number {
  const released = new Set(releasedMilestoneIds)
  return sov.lines
    .filter((l) => l.linkedMilestoneIds.some((id) => released.has(id)))
    .reduce((s, l) => s + l.amountCents, 0)
}
