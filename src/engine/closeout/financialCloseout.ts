import type {
  FinalAccountInput,
  FinalAccountResult,
  FinalAccountStatus,
  LienWaiver,
  LienWaiverScope,
  LienWaiverStatus,
} from '@/domain/closeout'

function uid(): string {
  return crypto.randomUUID()
}

export function prepareFinalAccount(input: FinalAccountInput): FinalAccountResult {
  const grossValueCents = input.contractValueCents + input.approvedVariationsCents
  const releasableRatio = Math.min(100, Math.max(0, input.retentionReleasePct)) / 100
  const retentionReleasableCents = input.defectsLiabilityExpired
    ? input.retentionHeldCents
    : Math.round(input.retentionHeldCents * releasableRatio)
  const retentionWithheldCents = Math.max(0, input.retentionHeldCents - retentionReleasableCents)
  const balanceDueCents = grossValueCents - input.paymentsToDateCents - retentionWithheldCents
  const status: FinalAccountStatus =
    balanceDueCents > 1 ? 'balance-due' : balanceDueCents < -1 ? 'overpaid' : 'settled'
  return {
    projectId: input.projectId,
    grossValueCents,
    retentionReleasableCents,
    retentionWithheldCents,
    balanceDueCents,
    status,
    computedAt: new Date().toISOString(),
  }
}

export function settleRetainage(
  account: FinalAccountResult,
  paymentCents: number,
): { retainedReleaseCents: number; withheldCents: number; outstandingCents: number } {
  const release = Math.min(account.retentionReleasableCents, Math.max(0, paymentCents))
  const withheldCents = account.retentionWithheldCents
  const outstandingCents = Math.max(0, account.balanceDueCents - paymentCents)
  return { retainedReleaseCents: release, withheldCents, outstandingCents }
}

export function createLienWaiver(
  projectId: string,
  contractorName: string,
  scope: LienWaiverScope,
  amountCents: number,
): LienWaiver {
  return {
    id: uid(),
    projectId,
    contractorName,
    scope,
    amountCents,
    issuedAt: new Date().toISOString(),
    status: 'issued',
  }
}

export function acknowledgeLienWaiver(
  waiver: LienWaiver,
  acknowledgedBy: string,
): LienWaiver {
  return {
    ...waiver,
    status: 'acknowledged',
    acknowledgedBy,
    acknowledgedAt: new Date().toISOString(),
  }
}

export function advanceLienWaiverStatus(waiver: LienWaiver, status: LienWaiverStatus): LienWaiver {
  return { ...waiver, status }
}
