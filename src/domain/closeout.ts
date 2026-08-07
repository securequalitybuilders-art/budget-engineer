export type SoVCategory = 'design' | 'procurement' | 'construction' | 'commissioning' | 'handover'

export interface SoVLine {
  id: string
  code: string
  description: string
  amountCents: number
  weightPct: number
  category: SoVCategory
  linkedMilestoneIds: string[]
  linkedBOQSectionIds: string[]
}

export interface ScheduleOfValues {
  id: string
  projectId: string
  contractValueCents: number
  lines: SoVLine[]
  createdAt: string
}

export type LienWaiverScope = 'partial' | 'final'
export type LienWaiverStatus = 'issued' | 'acknowledged' | 'recorded'

export interface LienWaiver {
  id: string
  projectId: string
  contractorName: string
  scope: LienWaiverScope
  amountCents: number
  issuedAt: string
  status: LienWaiverStatus
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export interface FinalAccountInput {
  projectId: string
  contractValueCents: number
  approvedVariationsCents: number
  paymentsToDateCents: number
  retentionHeldCents: number
  retentionReleasePct: number
  defectsLiabilityExpired: boolean
}

export type FinalAccountStatus = 'balance-due' | 'settled' | 'overpaid'

export interface FinalAccountResult {
  projectId: string
  grossValueCents: number
  retentionReleasableCents: number
  retentionWithheldCents: number
  balanceDueCents: number
  status: FinalAccountStatus
  computedAt: string
}

export type GainFadeVerdict = 'gain' | 'fade' | 'neutral'

export interface GainFadeBidLine {
  code: string
  description: string
  bidCents: number
}

export interface GainFadeActualLine {
  code: string
  actualCents: number
}

export interface GainFadeLine {
  code: string
  description: string
  bidCents: number
  actualCents: number
  varianceCents: number
  variancePct: number
  verdict: GainFadeVerdict
}

export interface GainFadeResult {
  id: string
  projectId: string
  lines: GainFadeLine[]
  bidTotalCents: number
  actualTotalCents: number
  varianceCents: number
  variancePct: number
  gains: number
  fades: number
  verdict: GainFadeVerdict
  computedAt: string
}

export interface HistoricalCostRecord {
  id: string
  projectId: string
  description: string
  category: string
  region: string
  areaM2: number
  totalCostCents: number
  costPerM2Cents: number
  completedAt: string
}

export interface RomEstimateResult {
  bestCents: number
  rangeLowCents: number
  rangeHighCents: number
  bestPerM2Cents: number
  matchedRecords: number
  confidence: 'low' | 'medium' | 'high'
}

export type LessonCategory = 'cost' | 'schedule' | 'quality' | 'safety' | 'procurement' | 'design' | 'process'
export type LessonSeverity = 'low' | 'medium' | 'high'

export interface LessonLearned {
  id: string
  projectId: string
  category: LessonCategory
  title: string
  description: string
  recommendation: string
  severity: LessonSeverity
  createdAt: string
}
