import type { Milestone } from '@/domain/milestone'
import type { EscrowAgreement } from '@/domain/marketplace'
import { calculateMilestoneProgress } from '@/engine/milestone/milestoneEngine'
import { getTotalReleased } from '@/engine/marketplace/escrowEngine'

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// ---------------------------------------------------------------------------
// P4P — Payment for Progress (interim payment certificate)
//
// Contractor is paid against verified physical progress (percentage complete)
// on each work package, less retention (typically 5%) that is released at
// practical completion and on expiry of the defects liability period.
// ---------------------------------------------------------------------------

export interface P4pLineItem {
  id: string
  name: string
  contractValue: number
  progressPct: number
}

export interface P4pLineResult {
  id: string
  name: string
  contractValue: number
  progressPct: number
  earnedValue: number
  retention: number
}

export interface P4pCertificateOptions {
  retentionPct?: number
  retentionReleasePct?: number
  practicalCompletionReached?: boolean
  defectsLiabilityComplete?: boolean
  previousPayments?: number
  certificateNumber?: number
  asOfDate?: string
}

export interface P4pCertificate {
  certificateNumber: number
  asOfDate: string
  lineItems: P4pLineResult[]
  grossEarned: number
  retentionRate: number
  retentionAccumulated: number
  retentionReleased: number
  retentionWithheld: number
  netCertificateValue: number
  previousPayments: number
  amountDue: number
  practicalCompletionReached: boolean
  defectsLiabilityComplete: boolean
}

export function calculateP4pCertificate(
  lineItems: P4pLineItem[],
  options: P4pCertificateOptions = {}
): P4pCertificate {
  const retentionRate = clamp(options.retentionPct ?? 5, 0, 100)
  const retentionReleasePct = clamp(options.retentionReleasePct ?? 50, 0, 100)
  const practicalCompletionReached = options.practicalCompletionReached ?? false
  const defectsLiabilityComplete = options.defectsLiabilityComplete ?? false
  const previousPayments = options.previousPayments ?? 0

  const lineResults: P4pLineResult[] = lineItems.map((item) => {
    const progressPct = clamp(item.progressPct, 0, 100)
    const earnedValue = round2((item.contractValue * progressPct) / 100)
    return {
      id: item.id,
      name: item.name,
      contractValue: item.contractValue,
      progressPct,
      earnedValue,
      retention: round2((earnedValue * retentionRate) / 100),
    }
  })

  const grossEarned = round2(lineResults.reduce((sum, l) => sum + l.earnedValue, 0))
  const retentionAccumulated = round2(lineResults.reduce((sum, l) => sum + l.retention, 0))

  let retentionReleased: number
  if (defectsLiabilityComplete) {
    retentionReleased = retentionAccumulated
  } else if (practicalCompletionReached) {
    retentionReleased = round2((retentionAccumulated * retentionReleasePct) / 100)
  } else {
    retentionReleased = 0
  }

  const retentionWithheld = round2(retentionAccumulated - retentionReleased)
  const netCertificateValue = round2(grossEarned - retentionAccumulated + retentionReleased)
  const amountDue = Math.max(0, round2(netCertificateValue - previousPayments))

  return {
    certificateNumber: options.certificateNumber ?? 1,
    asOfDate: options.asOfDate ?? new Date().toISOString().split('T')[0],
    lineItems: lineResults,
    grossEarned,
    retentionRate,
    retentionAccumulated,
    retentionReleased,
    retentionWithheld,
    netCertificateValue,
    previousPayments,
    amountDue,
    practicalCompletionReached,
    defectsLiabilityComplete,
  }
}

// ---------------------------------------------------------------------------
// WIPAA — Work-in-Progress Accounting Adjustment
//
// Cost-to-cost revenue recognition: earned revenue = % complete x contract
// value, where % complete = costs incurred / total estimated costs. The WIPAA
// figure (earned revenue minus billed revenue) shows whether the contractor is
// under-billed (unbilled receivable) or over-billed (deferred revenue).
// ---------------------------------------------------------------------------

export interface WipaaInput {
  contractValue: number
  costsIncurredToDate: number
  totalEstimatedCosts: number
  billedToDate: number
}

export type BillingStatus = 'under-billed' | 'over-billed' | 'on-track'

export interface WipaaResult {
  contractValue: number
  costsIncurredToDate: number
  totalEstimatedCosts: number
  billedToDate: number
  costPctComplete: number
  revenueEarned: number
  grossProfitEarned: number
  overUnderBilled: number
  billingStatus: BillingStatus
  remainingCosts: number
  remainingRevenue: number
  projectedProfit: number
  projectedProfitPct: number
}

export function calculateWipaa(input: WipaaInput): WipaaResult {
  const contractValue = input.contractValue
  const costsIncurredToDate = input.costsIncurredToDate
  const totalEstimatedCosts = input.totalEstimatedCosts
  const billedToDate = input.billedToDate

  const costPctComplete =
    totalEstimatedCosts > 0 ? clamp((costsIncurredToDate / totalEstimatedCosts) * 100, 0, 100) : 0
  const revenueEarned = round2((contractValue * costPctComplete) / 100)
  const grossProfitEarned = round2(revenueEarned - costsIncurredToDate)
  const overUnderBilled = round2(revenueEarned - billedToDate)

  const tolerance = 1
  const billingStatus: BillingStatus =
    overUnderBilled > tolerance ? 'under-billed' : overUnderBilled < -tolerance ? 'over-billed' : 'on-track'

  const projectedProfit = round2(contractValue - totalEstimatedCosts)
  const projectedProfitPct = round2(contractValue > 0 ? (projectedProfit / contractValue) * 100 : 0)

  return {
    contractValue,
    costsIncurredToDate,
    totalEstimatedCosts,
    billedToDate,
    costPctComplete: round2(costPctComplete),
    revenueEarned,
    grossProfitEarned,
    overUnderBilled,
    billingStatus,
    remainingCosts: round2(Math.max(0, totalEstimatedCosts - costsIncurredToDate)),
    remainingRevenue: round2(Math.max(0, contractValue - revenueEarned)),
    projectedProfit,
    projectedProfitPct,
  }
}

export interface WipRowInput {
  id: string
  name: string
  contractValue: number
  costsIncurredToDate: number
  totalEstimatedCosts: number
  billedToDate: number
}

export interface WipScheduleRow extends WipRowInput, WipaaResult {}

export function calculateWipSchedule(rows: WipRowInput[]): {
  rows: WipScheduleRow[]
  totals: {
    contractValue: number
    costsIncurredToDate: number
    totalEstimatedCosts: number
    billedToDate: number
    revenueEarned: number
    overUnderBilled: number
    projectedProfit: number
  }
} {
  const resultRows: WipScheduleRow[] = rows.map((row) => {
    const wipaa = calculateWipaa({
      contractValue: row.contractValue,
      costsIncurredToDate: row.costsIncurredToDate,
      totalEstimatedCosts: row.totalEstimatedCosts,
      billedToDate: row.billedToDate,
    })
    return { ...row, ...wipaa }
  })

  const totals = {
    contractValue: round2(resultRows.reduce((s, r) => s + r.contractValue, 0)),
    costsIncurredToDate: round2(resultRows.reduce((s, r) => s + r.costsIncurredToDate, 0)),
    totalEstimatedCosts: round2(resultRows.reduce((s, r) => s + r.totalEstimatedCosts, 0)),
    billedToDate: round2(resultRows.reduce((s, r) => s + r.billedToDate, 0)),
    revenueEarned: round2(resultRows.reduce((s, r) => s + r.revenueEarned, 0)),
    overUnderBilled: round2(resultRows.reduce((s, r) => s + r.overUnderBilled, 0)),
    projectedProfit: round2(resultRows.reduce((s, r) => s + r.projectedProfit, 0)),
  }

  return { rows: resultRows, totals }
}

// ---------------------------------------------------------------------------
// Adapters — derive P4P / WIPAA inputs from execution-domain data
// ---------------------------------------------------------------------------

export function milestonesToP4pLineItems(milestones: Milestone[]): P4pLineItem[] {
  return milestones.map((m) => ({
    id: m.id,
    name: m.name,
    contractValue: round2(m.plannedCostCents / 100),
    progressPct: calculateMilestoneProgress(m),
  }))
}

export function buildP4pCertificate(
  milestones: Milestone[],
  options: P4pCertificateOptions = {}
): P4pCertificate {
  return calculateP4pCertificate(milestonesToP4pLineItems(milestones), options)
}

export interface WipaaCostEstimate {
  costsIncurredToDate?: number
  totalEstimatedCosts?: number
}

export function escrowToWipaaInput(
  escrow: EscrowAgreement,
  costs: WipaaCostEstimate = {}
): WipaaInput {
  return {
    contractValue: escrow.totalAmount,
    billedToDate: getTotalReleased(escrow),
    totalEstimatedCosts: costs.totalEstimatedCosts ?? escrow.totalAmount,
    costsIncurredToDate: costs.costsIncurredToDate ?? 0,
  }
}
