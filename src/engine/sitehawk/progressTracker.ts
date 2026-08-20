/**
 * P3 Progress Tracking engine.
 * WBS Budget vs Actual, gross margin, WIPAA integration,
 * milestone-to-escrow progress mapping.
 */
import type { ProgressStatus } from '@/domain/sitehawk';

export interface WbsCostLine {
  wbsCode: string;
  name: string;
  budgetCents: number;
  spentCents: number;
}

export interface ProgressInput {
  wbsLines: WbsCostLine[];
  contractValueCents: number;
  billedToDateCents: number;
  incurredCents: number;
  revenueEarnedCents: number;
  overUnderBilledCents: number;
  wipaaStatus: 'on-track' | 'under-billed' | 'over-billed' | null;
  milestoneName: string;
  milestoneStatus: 'verified' | 'pending' | 'rejected';
}

/** Budget vs Actual per WBS line. */
export function wbsBva(lines: WbsCostLine[]): Array<WbsCostLine & { varianceCents: number; variancePct: number }> {
  return lines.map((l) => ({
    ...l,
    varianceCents: l.budgetCents - l.spentCents,
    variancePct: l.budgetCents > 0
      ? Math.round(((l.budgetCents - l.spentCents) / l.budgetCents) * 1000) / 10
      : 0,
  }));
}

/** Total budget, total spent, overall variance. */
export function totalBudgetVariance(lines: WbsCostLine[]): {
  budgetCents: number;
  spentCents: number;
  varianceCents: number;
  completionPct: number;
} {
  const budgetCents = lines.reduce((s, l) => s + l.budgetCents, 0);
  const spentCents = lines.reduce((s, l) => s + l.spentCents, 0);
  const varianceCents = budgetCents - spentCents;
  const completionPct = budgetCents > 0
    ? Math.round((spentCents / budgetCents) * 1000) / 10
    : 0;
  return { budgetCents, spentCents, varianceCents, completionPct };
}

/** Gross margin = (contract - incurred) / contract × 100. */
export function grossMargin(contractValueCents: number, incurredCents: number): number {
  if (contractValueCents <= 0) return 0;
  return Math.round(((contractValueCents - incurredCents) / contractValueCents) * 1000) / 10;
}

/** Build a full progress status snapshot. */
export function buildProgressStatus(input: ProgressInput): ProgressStatus {
  const { spentCents, budgetCents } = totalBudgetVariance(input.wbsLines);
  return {
    completionPct: budgetCents > 0 ? Math.round((spentCents / budgetCents) * 1000) / 10 : 0,
    spentToDateCents: spentCents,
    budgetCents,
    varianceCents: budgetCents - spentCents,
    grossMarginPct: grossMargin(input.contractValueCents, input.incurredCents),
    wipaaStatus: input.wipaaStatus,
    milestoneName: input.milestoneName,
    milestoneStatus: input.milestoneStatus,
  };
}

/** Milestone hold/release mapping. */
export interface MilestoneHold {
  name: string;
  holdAmountCents: number;
  status: 'ready-for-approval' | 'held' | 'released' | 'rejected';
  latestPhotoDate: string | null;
  nextDelivery: string | null;
  nextDeliveryDate: string | null;
}

export function buildMilestoneHolds(
  milestones: Array<{ name: string; amountCents: number; verified: boolean; released: boolean }>,
  latestPhotoDate: string | null,
  nextDelivery: { material: string; etaDate: string } | null,
): MilestoneHold[] {
  return milestones.map((m, i) => ({
    name: m.name,
    holdAmountCents: m.amountCents,
    status: m.released ? 'released' as const
      : m.verified ? 'ready-for-approval' as const
      : 'held' as const,
    latestPhotoDate: i === 0 ? latestPhotoDate : null,
    nextDelivery: i === 0 ? nextDelivery?.material ?? null : null,
    nextDeliveryDate: i === 0 ? nextDelivery?.etaDate ?? null : null,
  }));
}
