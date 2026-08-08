import type { EscrowAgreement } from '@/domain/marketplace'
import type { Milestone } from '@/domain/milestone'
import { calculateWipaa, type BillingStatus } from '@/engine/payment/paymentCalculators'
import { getTotalReleased } from '@/engine/marketplace/escrowEngine'

export type WipaaSnapshotSource = 'auto' | 'manual'

export interface WipaaSnapshot {
  id: string
  projectId: string
  monthKey: string
  asOf: string
  computedAt: string
  source: WipaaSnapshotSource
  contractValueCents: number
  billedToDateCents: number
  costsIncurredToDateCents: number
  totalEstimatedCostsCents: number
  costPctComplete: number
  revenueEarnedCents: number
  grossProfitEarnedCents: number
  overUnderBilledCents: number
  projectedProfitCents: number
  projectedProfitPct: number
  billingStatus: BillingStatus
}

export function monthKeyFor(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function sumActualCostsCents(milestones: Milestone[]): number {
  return milestones.reduce((sum, m) => sum + (m.actualCostCents ?? 0), 0)
}

export function monthRolloverDue(snapshots: { monthKey: string }[], now: Date = new Date()): boolean {
  const key = monthKeyFor(now)
  return !snapshots.some((s) => s.monthKey === key)
}

export interface WipaaSnapshotOptions {
  asOf?: string
  source?: WipaaSnapshotSource
  costsIncurredToDateCents?: number
  totalEstimatedCostsCents?: number
}

export function computeWipaaSnapshot(
  escrow: EscrowAgreement,
  milestones: Milestone[],
  options: WipaaSnapshotOptions = {}
): WipaaSnapshot {
  const asOf = options.asOf ?? new Date().toISOString()
  const contractValue = escrow.totalAmount
  const billedToDate = getTotalReleased(escrow)
  const costsIncurredToDateCents = options.costsIncurredToDateCents ?? sumActualCostsCents(milestones)
  const totalEstimatedCostsCents = options.totalEstimatedCostsCents ?? Math.round(contractValue * 100)

  const result = calculateWipaa({
    contractValue,
    costsIncurredToDate: costsIncurredToDateCents / 100,
    totalEstimatedCosts: totalEstimatedCostsCents / 100,
    billedToDate,
  })

  return {
    id: `${escrow.projectId}-${monthKeyFor(asOf)}`,
    projectId: escrow.projectId,
    monthKey: monthKeyFor(asOf),
    asOf,
    computedAt: new Date().toISOString(),
    source: options.source ?? 'auto',
    contractValueCents: Math.round(result.contractValue * 100),
    billedToDateCents: Math.round(result.billedToDate * 100),
    costsIncurredToDateCents: Math.round(result.costsIncurredToDate * 100),
    totalEstimatedCostsCents: Math.round(result.totalEstimatedCosts * 100),
    costPctComplete: result.costPctComplete,
    revenueEarnedCents: Math.round(result.revenueEarned * 100),
    grossProfitEarnedCents: Math.round(result.grossProfitEarned * 100),
    overUnderBilledCents: Math.round(result.overUnderBilled * 100),
    projectedProfitCents: Math.round(result.projectedProfit * 100),
    projectedProfitPct: result.projectedProfitPct,
    billingStatus: result.billingStatus,
  }
}

export function sortSnapshotsDesc(snapshots: WipaaSnapshot[]): WipaaSnapshot[] {
  return [...snapshots].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}
