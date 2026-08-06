import type { DisputeType, EscrowHold, HoldInput } from '@/domain/dispatch';
import type { DispatchDispute } from '@/domain/dispatch';

export const DISPUTE_RELEASE_PCT = 90;

export function holdFunds(input: HoldInput, at = new Date().toISOString()): EscrowHold {
  return {
    id: crypto.randomUUID(),
    orderId: input.orderId,
    projectId: input.projectId,
    supplierId: input.supplierId,
    amountCents: input.amountCents,
    currency: input.currency,
    status: 'held',
    heldAt: at,
    gpsVerified: false,
    engineerSignoff: false,
  };
}

export function gpsVerify(hold: EscrowHold, inside: boolean): EscrowHold {
  return { ...hold, gpsVerified: inside };
}

export function engineerSignoff(hold: EscrowHold, engineerId: string, at = new Date().toISOString()): EscrowHold {
  return {
    ...hold,
    engineerSignoff: true,
    signoffBy: engineerId,
    signoffAt: at,
  };
}

export function releaseEligible(hold: EscrowHold): boolean {
  return hold.status === 'held' && hold.gpsVerified && hold.engineerSignoff;
}

export function releaseFunds(hold: EscrowHold, at = new Date().toISOString()): EscrowHold {
  if (!releaseEligible(hold)) {
    throw new Error('Escrow release requires GPS verification and engineer sign-off');
  }
  return { ...hold, status: 'released', releasedAt: at };
}

export function disputeReleaseSplit(amountCents: number, releasePct = DISPUTE_RELEASE_PCT): {
  immediateCents: number;
  heldCents: number;
} {
  const clamped = Math.max(0, Math.min(100, releasePct));
  const immediateCents = Math.round((amountCents * clamped) / 100);
  return { immediateCents, heldCents: amountCents - immediateCents };
}

export function raiseDispute(
  hold: EscrowHold,
  dispute: Omit<DispatchDispute, 'id' | 'orderId' | 'raisedAt' | 'resolved'>,
  at = new Date().toISOString(),
): EscrowHold {
  if (hold.status !== 'held') {
    throw new Error('Only a held escrow can be disputed');
  }
  const split = disputeReleaseSplit(hold.amountCents);
  return {
    ...hold,
    status: 'disputed',
    dispute: {
      id: crypto.randomUUID(),
      orderId: hold.orderId,
      raisedAt: at,
      resolved: false,
      ...dispute,
    },
    disputeRelease: { ...split, releasedAt: at },
  };
}

export function resolveDispute(hold: EscrowHold, at = new Date().toISOString()): EscrowHold {
  if (hold.status !== 'disputed' || !hold.dispute) {
    throw new Error('No active dispute to resolve');
  }
  const next: EscrowHold = {
    ...hold,
    dispute: { ...hold.dispute, resolved: true, resolvedAt: at },
  };
  if (releaseEligible(next)) {
    return { ...next, status: 'released', releasedAt: at };
  }
  return next;
}

export function refundHold(hold: EscrowHold, at = new Date().toISOString()): EscrowHold {
  if (hold.status === 'released') {
    throw new Error('Released escrow cannot be refunded');
  }
  return { ...hold, status: 'refunded', releasedAt: at };
}

export interface EscrowSummary {
  totalHeldCents: number;
  totalReleasedCents: number;
  totalDisputedCents: number;
  activeHolds: number;
  disputedCount: number;
  releasedCount: number;
  heldCount: number;
  refundedCount: number;
  avgReleaseHours: number;
}

export function escrowSummary(holds: EscrowHold[], _now = Date.now()): EscrowSummary {
  let totalHeldCents = 0;
  let totalReleasedCents = 0;
  let totalDisputedCents = 0;
  let activeHolds = 0;
  let disputedCount = 0;
  let releasedCount = 0;
  let heldCount = 0;
  let refundedCount = 0;
  let releaseHoursSum = 0;
  let releaseHoursN = 0;

  for (const hold of holds) {
    if (hold.status === 'held') {
      heldCount += 1;
      activeHolds += 1;
      totalHeldCents += hold.amountCents;
    } else if (hold.status === 'released') {
      releasedCount += 1;
      totalReleasedCents += hold.amountCents;
      if (hold.releasedAt) {
        releaseHoursSum += (new Date(hold.releasedAt).getTime() - new Date(hold.heldAt).getTime()) / 3_600_000;
        releaseHoursN += 1;
      }
    } else if (hold.status === 'disputed') {
      disputedCount += 1;
      activeHolds += 1;
      const heldCents = hold.disputeRelease?.heldCents ?? hold.amountCents;
      totalDisputedCents += heldCents;
      totalReleasedCents += hold.disputeRelease?.immediateCents ?? 0;
    } else if (hold.status === 'refunded') {
      refundedCount += 1;
      totalReleasedCents += hold.disputeRelease?.immediateCents ?? 0;
    }
  }

  return {
    totalHeldCents,
    totalReleasedCents,
    totalDisputedCents,
    activeHolds,
    disputedCount,
    releasedCount,
    heldCount,
    refundedCount,
    avgReleaseHours: releaseHoursN > 0 ? Math.round((releaseHoursSum / releaseHoursN) * 100) / 100 : 0,
  };
}

export function releaseHours(hold: EscrowHold): number {
  if (!hold.releasedAt || !hold.heldAt) return 0;
  return Math.max(0, Math.round(((new Date(hold.releasedAt).getTime() - new Date(hold.heldAt).getTime()) / 3_600_000) * 100) / 100);
}

export const DISPUTE_LABELS: Record<DisputeType, string> = {
  damaged: 'Damaged goods',
  'wrong-material': 'Wrong material delivered',
  shortage: 'Quantity shortage',
  late: 'Late delivery',
  quality: 'Substandard quality',
};
