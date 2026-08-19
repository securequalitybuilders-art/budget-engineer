/**
 * P4 Escrow Release Trigger engine.
 * Escrow milestone state machine: pending → verified → released → disputed
 * (→ appeal). Release requires a verified P3 report + optional HITL approval.
 */
import type { EscrowMilestoneRecord, EscrowReleaseRecord, EscrowMilestoneState } from '@/domain/sitehawk';
import type { VerificationReport } from '@/domain/sitehawk';

export const ESCROW_STATE_FLOW: EscrowMilestoneState[] = ['pending', 'verified', 'released', 'disputed', 'appeal'];

export interface EscrowTriggerInput {
  projectId: string;
  escrowId?: string | null;
  milestoneName: string;
  amountCents: number;
  now?: Date;
}

export function createEscrowMilestone(input: EscrowTriggerInput): EscrowMilestoneRecord {
  const now = input.now ?? new Date();
  return {
    id: `em-${input.projectId}-${now.getTime()}`,
    projectId: input.projectId,
    escrowId: input.escrowId ?? null,
    milestoneName: input.milestoneName,
    amountCents: input.amountCents,
    status: 'pending',
    releaseDate: null,
    createdAt: now.toISOString(),
  };
}

export interface TransitionInput {
  milestone: EscrowMilestoneRecord;
  verification?: VerificationReport | null;
  approval?: 'approved' | 'rejected';
  now?: Date;
}

/**
 * Apply a legal transition:
 * pending → verified requires a pass verification report;
 * verified → released requires HITL approval (QS sign-off);
 * released → disputed on dispute flag; disputed → appeal on appeal.
 */
export function transitionEscrowMilestone(input: TransitionInput): {
  milestone: EscrowMilestoneRecord;
  ok: boolean;
  reason: string;
} {
  const now = input.now ?? new Date();
  const { milestone, verification, approval } = input;
  let next: EscrowMilestoneState = milestone.status;
  let reason = '';

  if (milestone.status === 'pending') {
    if (verification && verification.verdict === 'pass' && verification.confidence >= 60) {
      next = 'verified';
      reason = `Verified via ${verification.method} (${verification.confidence}%)`;
    } else {
      reason = 'Release blocked — no passing verification report';
    }
  } else if (milestone.status === 'verified') {
    if (approval === 'approved') {
      next = 'released';
      reason = 'HITL QS approval granted';
    } else {
      reason = 'Awaiting QS approval';
    }
  } else if (milestone.status === 'released') {
    next = 'disputed';
    reason = 'Dispute raised';
  } else if (milestone.status === 'disputed') {
    next = 'appeal';
    reason = 'Appeal lodged';
  } else {
    reason = 'Terminal state';
  }

  const updated: EscrowMilestoneRecord = {
    ...milestone,
    status: next,
    releaseDate: next === 'released' ? now.toISOString() : milestone.releaseDate,
  };
  return { milestone: updated, ok: next === 'released' || next === 'verified', reason };
}

/** Release record written when a milestone actually releases. */
export function createReleaseRecord(input: TransitionInput): EscrowReleaseRecord | null {
  const result = transitionEscrowMilestone(input);
  if (result.milestone.status !== 'released') return null;
  return {
    id: `er-${result.milestone.id}`,
    projectId: result.milestone.projectId,
    milestoneId: result.milestone.id,
    amountCents: result.milestone.amountCents,
    releasedAt: (input.now ?? new Date()).toISOString(),
    releasedBy: input.approval === 'approved' ? 'qs' : 'system',
    proofRef: input.verification?.id ?? '',
  };
}

export function escrowSummary(milestones: EscrowMilestoneRecord[]): {
  heldCents: number;
  releasedCents: number;
  disputed: number;
  pending: number;
  verified: number;
} {
  let heldCents = 0;
  let releasedCents = 0;
  let disputed = 0;
  let pending = 0;
  let verified = 0;
  for (const m of milestones) {
    if (m.status === 'released') releasedCents += m.amountCents;
    else if (m.status === 'disputed' || m.status === 'appeal') { disputed++; heldCents += m.amountCents; }
    else if (m.status === 'verified') verified++;
    else pending++;
    if (m.status !== 'released') heldCents += m.amountCents;
  }
  return { heldCents, releasedCents, disputed, pending, verified };
}