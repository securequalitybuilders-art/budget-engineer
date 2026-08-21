/**
 * P4 Escrow Release Trigger engine.
 * Escrow milestone state machine: pending → verified → released → disputed
 * (→ appeal). Release requires a verified P3 report + optional HITL approval.
 * v2: Dexie thread-scoped checkpoints, WhatsApp/Vault alerts, supplier
 *     payments, Build Guide chat, concern/concierge flow.
 */
import type {
  EscrowMilestoneRecord,
  EscrowReleaseRecord,
  EscrowMilestoneState,
  VerificationReport,
  EscrowCheckpoint,
  EscrowAlert,
  EscrowAlertType,
  SupplierPayment,
  BuildGuideMessage,
  BuildGuideMessageType,
  EscrowConcern,
} from '@/domain/sitehawk';

export const ESCROW_STATE_FLOW: EscrowMilestoneState[] = ['pending', 'verified', 'released', 'disputed', 'appeal', 'suspended'];

// ── Hitl gates ──────────────────────────────────────────────────────────────

export type HtlGate = 'none' | 'qs' | 'architect' | 'concierge';

/** Which HITL gate blocks each forward transition. */
export const HITL_GATES: Record<string, HtlGate> = {
  'pending→verified': 'qs',
  'verified→released': 'qs',
  'disputed→appeal': 'architect',
  'suspended→pending': 'concierge',
};

// ── Create milestone ────────────────────────────────────────────────────────

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
    concernStatus: null,
    createdAt: now.toISOString(),
  };
}

// ── Transition + checkpoint ─────────────────────────────────────────────────

export interface TransitionInput {
  milestone: EscrowMilestoneRecord;
  verification?: VerificationReport | null;
  approval?: 'approved' | 'rejected';
  triggeredBy?: EscrowCheckpoint['triggeredBy'];
  reason?: string;
  now?: Date;
}

export interface TransitionResult {
  milestone: EscrowMilestoneRecord;
  checkpoint: EscrowCheckpoint;
  alert: EscrowAlert | null;
  ok: boolean;
  reason: string;
}

/**
 * Apply a legal transition with a thread-scoped checkpoint and alert:
 * - pending → verified requires pass verification ≥60%
 * - verified → released requires HITL QS approval
 * - released → disputed on dispute flag
 * - disputed → appeal on appeal
 * - * → suspended on concern flag
 * - suspended → pending on concierge resolve
 */
export function transitionEscrowMilestone(input: TransitionInput): TransitionResult {
  const now = input.now ?? new Date();
  const { milestone, verification, approval } = input;
  const from = milestone.status;
  let next: EscrowMilestoneState = milestone.status;
  let reason = input.reason ?? '';

  if (from === 'pending') {
    if (verification && verification.verdict === 'pass' && verification.confidence >= 60) {
      next = 'verified';
      reason = reason || `Verified via ${verification.method} (${verification.confidence}%)`;
    } else {
      reason = reason || 'Release blocked — no passing verification report';
    }
  } else if (from === 'verified') {
    if (approval === 'approved') {
      next = 'released';
      reason = reason || 'HITL QS approval granted';
    } else {
      reason = reason || 'Awaiting QS approval';
    }
  } else if (from === 'released') {
    next = 'disputed';
    reason = reason || 'Dispute raised';
  } else if (from === 'disputed') {
    next = 'appeal';
    reason = reason || 'Appeal lodged';
  } else if (from === 'suspended') {
    next = 'pending';
    reason = reason || 'Concierge resolved — work may proceed';
  } else {
    reason = reason || 'Terminal state';
  }

  const updated: EscrowMilestoneRecord = {
    ...milestone,
    status: next,
    releaseDate: next === 'released' ? now.toISOString() : milestone.releaseDate,
  };

  const checkpoint = createCheckpoint({
    projectId: milestone.projectId,
    milestoneId: milestone.id,
    fromState: from,
    toState: next,
    triggeredBy: input.triggeredBy ?? 'system',
    reason,
    now,
  });

  const alert = buildTransitionAlert(milestone, from, next, reason, now);

  return {
    milestone: updated,
    checkpoint,
    alert,
    ok: next !== from,
    reason,
  };
}

// ── Checkpoint factory ──────────────────────────────────────────────────────

export interface CheckpointInput {
  projectId: string;
  milestoneId: string;
  fromState: EscrowMilestoneState;
  toState: EscrowMilestoneState;
  triggeredBy: EscrowCheckpoint['triggeredBy'];
  reason: string;
  now?: Date;
}

export function createCheckpoint(input: CheckpointInput): EscrowCheckpoint {
  const now = input.now ?? new Date();
  return {
    id: `ec-${input.milestoneId}-${now.getTime()}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    fromState: input.fromState,
    toState: input.toState,
    triggeredBy: input.triggeredBy,
    reason: input.reason,
    checkpointAt: now.toISOString(),
  };
}

// ── Alert factories ─────────────────────────────────────────────────────────

export interface AlertInput {
  projectId: string;
  milestoneId: string | null;
  type: EscrowAlertType;
  title: string;
  message: string;
  channel?: EscrowAlert['channel'];
  now?: Date;
}

export function createAlert(input: AlertInput): EscrowAlert {
  const now = input.now ?? new Date();
  return {
    id: `ea-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    type: input.type,
    title: input.title,
    message: input.message,
    channel: input.channel ?? 'vault',
    sentAt: now.toISOString(),
    read: false,
  };
}

/** Build an alert for work-started (WhatsApp + vault). */
export function buildWorkStartedAlert(
  projectId: string,
  milestoneId: string,
  milestoneName: string,
  now?: Date,
): EscrowAlert {
  return createAlert({
    projectId,
    milestoneId,
    type: 'work-started',
    title: '🔨 Work Started',
    message: `Escrow milestone "${milestoneName}" — work has commenced on site.`,
    channel: 'both',
    now,
  });
}

/** Build a weekly digest alert (vault only — images are a future WhatsApp integration). */
export function buildWeeklyDigestAlert(
  projectId: string,
  milestoneId: string,
  milestoneName: string,
  photoCount: number,
  now?: Date,
): EscrowAlert {
  return createAlert({
    projectId,
    milestoneId,
    type: 'weekly-digest',
    title: '📸 Weekly Digest',
    message: `${photoCount} site photo${photoCount === 1 ? '' : 's'} uploaded this week for "${milestoneName}".`,
    channel: 'vault',
    now,
  });
}

/** Build a milestone-complete alert. */
export function buildMilestoneCompleteAlert(
  projectId: string,
  milestoneId: string,
  milestoneName: string,
  now?: Date,
): EscrowAlert {
  return createAlert({
    projectId,
    milestoneId,
    type: 'milestone-complete',
    title: '✅ Milestone Complete',
    message: `"${milestoneName}" work is complete and awaiting QS verification.`,
    channel: 'both',
    now,
  });
}

/** Build a funds-released alert. */
export function buildFundsReleasedAlert(
  projectId: string,
  milestoneId: string,
  milestoneName: string,
  amountCents: number,
  now?: Date,
): EscrowAlert {
  const formatted = `$${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  return createAlert({
    projectId,
    milestoneId,
    type: 'funds-released',
    title: '💰 Funds Released',
    message: `${formatted} released for "${milestoneName}" escrow milestone.`,
    channel: 'both',
    now,
  });
}

/** Build a supplier-paid alert. */
export function buildSupplierPaidAlert(
  projectId: string,
  milestoneId: string,
  supplierName: string,
  amountCents: number,
  now?: Date,
): EscrowAlert {
  const formatted = `$${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  return createAlert({
    projectId,
    milestoneId,
    type: 'supplier-paid',
    title: '🏦 Supplier Paid',
    message: `${formatted} paid directly to ${supplierName}.`,
    channel: 'both',
    now,
  });
}

/** Build a concern-flagged alert. */
export function buildConcernAlert(
  projectId: string,
  milestoneId: string,
  description: string,
  now?: Date,
): EscrowAlert {
  return createAlert({
    projectId,
    milestoneId,
    type: 'concern-flagged',
    title: '⚠️ Concern Flagged',
    message: description,
    channel: 'both',
    now,
  });
}

function buildTransitionAlert(
  milestone: EscrowMilestoneRecord,
  from: EscrowMilestoneState,
  to: EscrowMilestoneState,
  reason: string,
  now: Date,
): EscrowAlert | null {
  if (from === 'pending' && to === 'verified') {
    return buildWorkStartedAlert(milestone.projectId, milestone.id, milestone.milestoneName, now);
  }
  if (from === 'verified' && to === 'released') {
    return buildFundsReleasedAlert(milestone.projectId, milestone.id, milestone.milestoneName, milestone.amountCents, now);
  }
  if (to === 'disputed') {
    return buildConcernAlert(milestone.projectId, milestone.id, reason, now);
  }
  return null;
}

// ── Release record ──────────────────────────────────────────────────────────

/** Release record written when a milestone actually releases. */
export function createReleaseRecord(
  input: TransitionInput,
  result?: TransitionResult,
): EscrowReleaseRecord | null {
  const tr = result ?? transitionEscrowMilestone(input);
  if (tr.milestone.status !== 'released') return null;
  return {
    id: `er-${tr.milestone.id}`,
    projectId: tr.milestone.projectId,
    milestoneId: tr.milestone.id,
    amountCents: tr.milestone.amountCents,
    releasedAt: (input.now ?? new Date()).toISOString(),
    releasedBy: input.approval === 'approved' ? 'qs' : 'system',
    proofRef: input.verification?.id ?? '',
  };
}

// ── Supplier payments (direct to supplier bank) ─────────────────────────────

export interface SupplierPaymentInput {
  projectId: string;
  milestoneId: string;
  supplierName: string;
  supplierBankRef: string;
  amountCents: number;
  proofOfFunds?: boolean;
  now?: Date;
}

export function createSupplierPayment(input: SupplierPaymentInput): SupplierPayment {
  const now = input.now ?? new Date();
  return {
    id: `sp-${input.milestoneId}-${now.getTime()}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    supplierName: input.supplierName,
    supplierBankRef: input.supplierBankRef,
    amountCents: input.amountCents,
    status: 'pending',
    initiatedAt: now.toISOString(),
    completedAt: null,
    proofOfFunds: input.proofOfFunds ?? false,
  };
}

export function transitionSupplierPayment(
  payment: SupplierPayment,
  status: SupplierPayment['status'],
  now?: Date,
): SupplierPayment {
  return {
    ...payment,
    status,
    completedAt: status === 'completed' ? (now ?? new Date()).toISOString() : payment.completedAt,
  };
}

// ── Concern / concierge flow ────────────────────────────────────────────────

export interface ConcernInput {
  projectId: string;
  milestoneId: string;
  raisedBy: string;
  description: string;
  reworkEstimateCents?: number | null;
  now?: Date;
}

export function flagConcern(input: ConcernInput): {
  concern: EscrowConcern;
  milestoneUpdate: Partial<EscrowMilestoneRecord>;
} {
  const now = input.now ?? new Date();
  return {
    concern: {
      id: `concern-${input.milestoneId}-${now.getTime()}`,
      projectId: input.projectId,
      milestoneId: input.milestoneId,
      raisedBy: input.raisedBy,
      description: input.description,
      status: 'open',
      reworkEstimateCents: input.reworkEstimateCents ?? null,
      conciergeNote: null,
      createdAt: now.toISOString(),
      resolvedAt: null,
    },
    milestoneUpdate: { concernStatus: 'open', status: 'suspended' },
  };
}

export function resolveConcern(
  concern: EscrowConcern,
  conciergeNote: string,
  now?: Date,
): EscrowConcern {
  const nowDate = now ?? new Date();
  return {
    ...concern,
    status: 'resolved',
    conciergeNote,
    resolvedAt: nowDate.toISOString(),
  };
}

export function scopeRework(
  concern: EscrowConcern,
  reworkEstimateCents: number,
  conciergeNote: string,
): EscrowConcern {
  return {
    ...concern,
    status: 'rework-scoped',
    reworkEstimateCents,
    conciergeNote,
  };
}

// ── Build Guide chat ────────────────────────────────────────────────────────

export interface BuildGuideInput {
  projectId: string;
  milestoneId: string;
  type: BuildGuideMessageType;
  content: string;
  now?: Date;
}

export function createBuildGuideMessage(input: BuildGuideInput): BuildGuideMessage {
  const now = input.now ?? new Date();
  return {
    id: `bg-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    type: input.type,
    content: input.content,
    createdAt: now.toISOString(),
    read: false,
  };
}

/** Concierge auto-response when a concern is flagged. */
export function conciergeResponse(
  projectId: string,
  milestoneId: string,
  concernDescription: string,
  now?: Date,
): BuildGuideMessage {
  return createBuildGuideMessage({
    projectId,
    milestoneId,
    type: 'concierge',
    content: `Concern received: "${concernDescription.slice(0, 120)}". Our team will review and scope rework within 48 hours. You can track status in the Vault.`,
    now,
  });
}

// ── Summary ─────────────────────────────────────────────────────────────────

export function escrowSummary(milestones: EscrowMilestoneRecord[]): {
  heldCents: number;
  releasedCents: number;
  disputed: number;
  pending: number;
  verified: number;
  suspended: number;
  withConcerns: number;
} {
  let heldCents = 0;
  let releasedCents = 0;
  let disputed = 0;
  let pending = 0;
  let verified = 0;
  let suspended = 0;
  let withConcerns = 0;
  for (const m of milestones) {
    if (m.status === 'released') {
      releasedCents += m.amountCents;
    } else {
      heldCents += m.amountCents;
    }
    if (m.status === 'disputed' || m.status === 'appeal') disputed++;
    else if (m.status === 'verified') verified++;
    else if (m.status === 'suspended') suspended++;
    else if (m.status === 'pending') pending++;
    if (m.concernStatus === 'open' || m.concernStatus === 'under-review') withConcerns++;
  }
  return { heldCents, releasedCents, disputed, pending, verified, suspended, withConcerns };
}