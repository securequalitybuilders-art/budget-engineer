import { roomArea } from '@/lib/geometry/plan-geometry'
import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

const HABITABLE_KEYWORDS = ['bedroom', 'living', 'dining', 'lounge', 'kitchen', 'classroom', 'office', 'consultation', 'ward', 'patient']

export function isHabitable(name: string): boolean {
  const lower = name.toLowerCase()
  return HABITABLE_KEYWORDS.some((kw) => lower.includes(kw))
}

export function getHabitableRooms(input: ComplianceInput): { name: string; width: number; height: number; area: number }[] {
  if (!input.plan?.rooms) return []
  return input.plan.rooms
    .filter((r) => isHabitable(r.name))
    .map((r) => ({ name: r.name, width: r.width, height: r.height, area: roomArea(r) }))
}

export function r(ruleId: string, category: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category, title, status, actual, required, note }
}

export function getIsNonResidential(bt: string): boolean {
  return !['house', 'apartment', 'townhouse', 'dwelling'].includes(bt)
}

export function countStoreys(_input: ComplianceInput): number {
  return 1
}
