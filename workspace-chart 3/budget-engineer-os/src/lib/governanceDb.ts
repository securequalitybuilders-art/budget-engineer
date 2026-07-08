import type { GovernanceRecord, ApprovalState, GovernanceComment } from '../domain/governance';
import type { UserRecord } from '../domain/rbac';
import { db } from './db';

export async function getGovernance(projectId: string): Promise<GovernanceRecord> {
  const existing = await db.governance.get(projectId);
  if (existing) return existing;
  const record: GovernanceRecord = {
    projectId,
    approvalState: 'draft',
    versionLabel: 'v0.1-enterprise',
    owner: 'Dzenhare Studio',
    reviewers: ['QS Lead', 'Architect Lead'],
    comments: [],
    lastUpdated: new Date().toISOString(),
  };
  await db.governance.put(record);
  return record;
}

export async function setGovernanceState(projectId: string, approvalState: ApprovalState, user: UserRecord, actionLabel?: string, reason?: string): Promise<GovernanceRecord> {
  const current = await getGovernance(projectId);
  const now = new Date().toISOString();
  const nextComment: GovernanceComment | undefined = actionLabel
    ? { id: crypto.randomUUID(), author: user.name, role: user.role, message: `State changed to ${approvalState}.`, timestamp: now, action: actionLabel, reason }
    : undefined;

  const next: GovernanceRecord = {
    ...current,
    approvalState,
    comments: nextComment ? [...current.comments, nextComment] : current.comments,
    lastUpdated: now,
    reviewedBy: approvalState === 'in_review' ? user.name : current.reviewedBy,
    reviewedAt: approvalState === 'in_review' ? now : current.reviewedAt,
    approvedBy: approvalState === 'approved' ? user.name : current.approvedBy,
    approvedAt: approvalState === 'approved' ? now : current.approvedAt,
    rejectedBy: approvalState === 'rejected' ? user.name : current.rejectedBy,
    rejectedAt: approvalState === 'rejected' ? now : current.rejectedAt,
    rejectionReason: approvalState === 'rejected' ? reason ?? current.rejectionReason : current.rejectionReason,
  };
  await db.governance.put(next);
  return next;
}

export async function addGovernanceComment(projectId: string, user: UserRecord, message: string, action?: string, reason?: string): Promise<GovernanceRecord> {
  const current = await getGovernance(projectId);
  const comment: GovernanceComment = { id: crypto.randomUUID(), author: user.name, role: user.role, message, timestamp: new Date().toISOString(), action, reason };
  const next: GovernanceRecord = { ...current, comments: [...current.comments, comment], lastUpdated: new Date().toISOString() };
  await db.governance.put(next);
  return next;
}
