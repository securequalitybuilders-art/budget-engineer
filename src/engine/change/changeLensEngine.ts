import type { BOQ } from '@/types'
import type { Rate } from '@/types'
import type { WipaaResult } from '@/engine/payment/paymentCalculators'
import type { LedgerEntry } from '@/domain/ledger'
import { findWbsCode, committedForCode, restockableCover } from '@/engine/ledger/trueLedger'

export type LensName = 'red-pen' | 'wipaa' | 'true-ledger' | 'budget-engineer'

export interface ChangeLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPriceCents: number
}

export interface ChangeContext {
  changeOrderNumber: string
  declaredImpactCents: number
  lineItems?: ChangeLineItem[]
}

export interface LensResult {
  name: LensName
  label: string
  impactCents: number
  notes: string[]
  flag?: string
}

export interface ChangeImpactInput {
  change: ChangeContext
  rates?: Rate[]
  boq?: BOQ | null
  ledgerEntries?: LedgerEntry[]
  wipaa?: WipaaResult | null
}

export interface ChangeImpactResult {
  id: string
  changeOrderNumber: string
  declaredImpactCents: number
  lenses: LensResult[]
  recommendedImpactCents: number
  riskFlags: string[]
  spreadCents: number
  analysisDate: string
}

export interface PenaltyInput {
  contractValueCents: number
  daysLate: number
  dailyPenaltyBps?: number
  maxPenaltyPct?: number
  rejectedFraction?: number
  defectValueCents?: number
  reworkMultiplier?: number
}

export interface PenaltyResult {
  delayPenaltyCents: number
  defectPenaltyCents: number
  totalPenaltyCents: number
  maxPenaltyCents: number
  capped: boolean
}

const REWORK_MULTIPLIER = 2

const round = (n: number) => Math.round(n)

// ---------------------------------------------------------------------------
// Lens 1 — Red Pen: compare the change's quoted rates against the local market
// rate catalogue. Line items priced > 15% above market are re-valued at market.
// ---------------------------------------------------------------------------

function rateFor(description: string, rates: Rate[]): Rate | undefined {
  const tokens = description.toLowerCase().split(/\s+/).slice(0, 3)
  return rates.find((r) =>
    tokens.some((t) => r.description.toLowerCase().includes(t) || r.code.toLowerCase().includes(t))
  )
}

export function redPenLens(change: ChangeContext, rates: Rate[] = []): LensResult {
  const notes: string[] = []
  const flagLines: string[] = []

  if (!change.lineItems || change.lineItems.length === 0) {
    return {
      name: 'red-pen',
      label: 'Red Pen',
      impactCents: change.declaredImpactCents,
      notes: ['No line-level breakdown — audit applied to the declared impact only.'],
    }
  }

  let impact = 0
  for (const line of change.lineItems) {
    const market = rateFor(line.description, rates)
    const marketUnit = market ? market.baseRateCents : null
    if (marketUnit != null && line.unitPriceCents > marketUnit * 1.15) {
      const overPct = Math.round(((line.unitPriceCents - marketUnit) / marketUnit) * 100)
      flagLines.push(`${line.description} quoted ${overPct}% above market`)
      impact += Math.round(line.quantity * marketUnit)
    } else {
      impact += Math.round(line.quantity * line.unitPriceCents)
    }
  }

  if (flagLines.length > 0) {
    notes.push(`Re-valued ${flagLines.length} line item(s) to market rates: ${flagLines.join('; ')}.`)
  } else if (rates.length > 0) {
    notes.push('No line items priced above the market threshold (15%).')
  } else {
    notes.push('No market rate catalogue provided — quoted rates used as-is.')
  }

  return {
    name: 'red-pen',
    label: 'Red Pen',
    impactCents: impact,
    notes,
    ...(flagLines.length > 0 ? { flag: 'Rates above market' } : {}),
  }
}

// ---------------------------------------------------------------------------
// Lens 2 — WIPAA: cost-to-cost revenue recognition. Adding value to the
// contract earns revenue immediately (the portion already costed), so the new
// cash exposure is only the unearned remainder. Also surfaces over-billing.
// ---------------------------------------------------------------------------

export function wipaaLens(change: ChangeContext, wipaa?: WipaaResult | null): LensResult {
  const delta = change.declaredImpactCents
  if (!wipaa || wipaa.totalEstimatedCosts <= 0) {
    return {
      name: 'wipaa',
      label: 'WIPAA',
      impactCents: delta,
      notes: ['No WIPAA baseline — change treated as full new exposure.'],
    }
  }

  const costPct = wipaa.costPctComplete / 100
  const revenueDelta = round(delta * costPct)
  const netNew = delta - revenueDelta

  const notes = [
    `Cost-to-cost complete ${wipaa.costPctComplete}% — ${round(revenueDelta)} already earned as revenue, ${netNew} net new exposure.`,
  ]
  const flag = wipaa.billingStatus === 'over-billed'
    ? 'WIPAA shows over-billing; an addition raises over-billing risk'
    : undefined
  if (flag) notes.push(flag)

  return {
    name: 'wipaa',
    label: 'WIPAA',
    impactCents: netNew,
    notes,
    ...(flag ? { flag } : {}),
  }
}

// ---------------------------------------------------------------------------
// Lens 3 — True Ledger: match the change's lines to already-committed WBS cost
// codes. Restockable cover reduces the net new cash the change needs.
// ---------------------------------------------------------------------------

export function trueLedgerLens(change: ChangeContext, ledgerEntries: LedgerEntry[] = []): LensResult {
  const notes: string[] = []
  if (ledgerEntries.length === 0) {
    return {
      name: 'true-ledger',
      label: 'True Ledger',
      impactCents: change.declaredImpactCents,
      notes: ['No ledger entries committed yet — change treated as full new exposure.'],
      flag: 'No ledger cover for this change',
    }
  }

  if (!change.lineItems || change.lineItems.length === 0) {
    return {
      name: 'true-ledger',
      label: 'True Ledger',
      impactCents: change.declaredImpactCents,
      notes: ['No line-level breakdown — ledger cover cannot be matched; declared impact used.'],
    }
  }

  let impact = 0
  let covered = 0
  let restockable = 0
  for (const line of change.lineItems) {
    const { wbs } = findWbsCode(line.description)
    const committed = committedForCode(ledgerEntries, wbs.code)
    const lineAmount = Math.round(line.quantity * line.unitPriceCents)
    if (committed > 0) {
      const cover = Math.min(committed, lineAmount)
      covered += cover
      restockable += restockableCover(ledgerEntries, wbs.code)
      impact += lineAmount - cover
      notes.push(`WBS ${wbs.code} (${wbs.name}) has ${committed} committed — covers ${cover} of ${lineAmount}.`)
    } else {
      impact += lineAmount
      notes.push(`WBS ${wbs.code} (${wbs.name}) has no committed cost — full ${lineAmount} is new.`)
    }
  }

  const flag = covered > 0
    ? `Ledger cover reduces net impact by ${covered}`
    : 'No ledger cover for this change'
  if (restockable > 0) notes.push(`Restockable cover available: ${restockable}.`)

  return {
    name: 'true-ledger',
    label: 'True Ledger',
    impactCents: impact,
    notes,
    flag,
  }
}

// ---------------------------------------------------------------------------
// Lens 4 — Budget Engineer: recompute the change against the project BOQ using
// the BOQ's own rates, and apply the BOQ contingency ratio to the delta.
// ---------------------------------------------------------------------------

function boqRateFor(description: string, boq: BOQ): number | undefined {
  const tokens = description.toLowerCase().split(/\s+/).slice(0, 3)
  for (const section of boq.sections) {
    for (const item of section.items) {
      if (
        tokens.some(
          (t) =>
            item.description.toLowerCase().includes(t) ||
            item.id.toLowerCase().includes(t)
        )
      ) {
        return item.rateCents
      }
    }
  }
  return undefined
}

export function budgetEngineerLens(change: ChangeContext, boq?: BOQ | null): LensResult {
  const notes: string[] = []
  if (!boq) {
    return {
      name: 'budget-engineer',
      label: 'Budget Engineer',
      impactCents: change.declaredImpactCents,
      notes: ['No project BOQ available — declared impact used.'],
    }
  }

  const contingencyPct = boq.totalCents > 0 ? (boq.contingencyCents / boq.totalCents) * 100 : 5

  if (!change.lineItems || change.lineItems.length === 0) {
    const contingency = round(change.declaredImpactCents * (contingencyPct / 100))
    return {
      name: 'budget-engineer',
      label: 'Budget Engineer',
      impactCents: change.declaredImpactCents + contingency,
      notes: [
        `No line-level breakdown — declared impact plus ${contingencyPct.toFixed(1)}% BOQ contingency (${contingency}).`,
      ],
    }
  }

  let impact = 0
  let matched = 0
  for (const line of change.lineItems) {
    const boqRate = boqRateFor(line.description, boq)
    if (boqRate != null) {
      impact += Math.round(line.quantity * boqRate)
      matched += 1
    } else {
      impact += Math.round(line.quantity * line.unitPriceCents)
    }
  }
  const contingency = round(impact * (contingencyPct / 100))
  const total = impact + contingency

  notes.push(
    matched > 0
      ? `${matched} line item(s) re-valued at project BOQ rates; ${contingencyPct.toFixed(1)}% contingency applied (+${contingency}).`
      : `No BOQ rate matched — quoted rates used; ${contingencyPct.toFixed(1)}% contingency applied (+${contingency}).`
  )

  return {
    name: 'budget-engineer',
    label: 'Budget Engineer',
    impactCents: total,
    notes,
  }
}

// ---------------------------------------------------------------------------
// Orchestrator — run all four lenses and reconcile a recommended impact.
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

export function analyzeChangeImpact(input: ChangeImpactInput): ChangeImpactResult {
  const lenses: LensResult[] = [
    redPenLens(input.change, input.rates ?? []),
    wipaaLens(input.change, input.wipaa),
    trueLedgerLens(input.change, input.ledgerEntries ?? []),
    budgetEngineerLens(input.change, input.boq ?? null),
  ]

  const impacts = lenses.map((l) => l.impactCents)
  const recommendedImpactCents = median(impacts)

  const riskFlags: string[] = []
  for (const lens of lenses) {
    if (lens.flag) riskFlags.push(lens.flag)
  }
  if (Math.max(...impacts) - Math.min(...impacts) > input.change.declaredImpactCents * 0.5) {
    riskFlags.push('Lenses diverge by more than 50% of the declared impact — review before approving.')
  }

  return {
    id: input.change.changeOrderNumber,
    changeOrderNumber: input.change.changeOrderNumber,
    declaredImpactCents: input.change.declaredImpactCents,
    lenses,
    recommendedImpactCents,
    riskFlags,
    spreadCents: Math.max(...impacts) - Math.min(...impacts),
    analysisDate: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// calculatePenalty — delay liquidated damages + defect/rework penalty.
// Mirrors the TCO engine's rework multiplier convention (REWORK_MULTIPLIER).
// ---------------------------------------------------------------------------

export function calculatePenalty(input: PenaltyInput): PenaltyResult {
  const dailyPenaltyBps = input.dailyPenaltyBps ?? 25
  const maxPenaltyPct = input.maxPenaltyPct ?? 10
  const rejectedFraction = Math.min(Math.max(input.rejectedFraction ?? 0, 0), 1)
  const reworkMultiplier = input.reworkMultiplier ?? REWORK_MULTIPLIER
  const maxPenaltyCents = round((maxPenaltyPct / 100) * input.contractValueCents)

  const daysLate = Math.max(input.daysLate, 0)
  const delayPenaltyCents = round(
    (input.contractValueCents * (dailyPenaltyBps / 10000)) * daysLate
  )
  const cappedDelay = Math.min(delayPenaltyCents, maxPenaltyCents)

  const defectValueCents = Math.max(input.defectValueCents ?? 0, 0)
  const defectPenaltyCents = round(defectValueCents * rejectedFraction * reworkMultiplier)

  return {
    delayPenaltyCents: cappedDelay,
    defectPenaltyCents,
    totalPenaltyCents: cappedDelay + defectPenaltyCents,
    maxPenaltyCents,
    capped: delayPenaltyCents > maxPenaltyCents,
  }
}
