import type { GovernanceRecord, GovernanceComment } from '@/domain/governance';
import type { UserRecord } from '@/domain/rbac';
import { getGovernance, setGovernanceState, addGovernanceComment } from '@/lib/db/governance-db';
import { logTransaction } from '@/services/projectPersistenceService';

export type DemoRole = 'owner' | 'reviewer' | 'viewer';

export type GovernanceStatus = 'draft' | 'in-review' | 'approved' | 'changes-requested';

export type CommentType = 'general' | 'review' | 'approval' | 'change-request';

export interface GovernanceTimelineEvent {
  id: string;
  type: 'status-change' | 'comment';
  action: string;
  message: string;
  author: string;
  role: string;
  timestamp: string;
  commentType?: CommentType;
}

export interface GovernanceWorkflowState {
  projectId: string;
  status: GovernanceStatus;
  currentRole: DemoRole;
  comments: GovernanceComment[];
  timeline: GovernanceTimelineEvent[];
  updatedAt: string;
  warnings: string[];
}

function mapToStatus(approvalState: string): GovernanceStatus {
  switch (approvalState) {
    case 'draft': return 'draft';
    case 'in_review': return 'in-review';
    case 'approved': return 'approved';
    case 'rejected': return 'changes-requested';
    default: return 'draft';
  }
}

function roleToUserRecord(actorRole: DemoRole): UserRecord {
  const labels: Record<DemoRole, string> = {
    owner: 'Owner',
    reviewer: 'Reviewer',
    viewer: 'Viewer',
  };
  return { id: `demo-${actorRole}`, name: labels[actorRole], role: actorRole };
}

function buildTimeline(record: GovernanceRecord): GovernanceTimelineEvent[] {
  const events: GovernanceTimelineEvent[] = record.comments.map((c) => {
    if (c.action && c.action !== 'comment') {
      return {
        id: c.id,
        type: 'status-change',
        action: c.action,
        message: c.reason || c.message,
        author: c.author,
        role: c.role || '',
        timestamp: c.timestamp,
      };
    }
    return {
      id: c.id,
      type: 'comment',
      action: 'comment',
      message: c.reason || c.message,
      author: c.author,
      role: c.role || '',
      timestamp: c.timestamp,
      commentType: 'general',
    };
  });
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events;
}

function getWarnings(_status: GovernanceStatus, role: DemoRole): string[] {
  const warnings: string[] = [];
  warnings.push('Demo governance is stored in this browser. It is not legal approval.');
  if (role === 'viewer') {
    warnings.push('Viewers cannot perform governance actions. Select Owner or Reviewer to interact.');
  }
  return warnings;
}

function permissionCheck(actorRole: DemoRole, action: string): string | null {
  if (actorRole === 'viewer') {
    return `Viewers cannot ${action}. Select Owner or Reviewer.`;
  }
  if (actorRole === 'owner' && (action === 'approve' || action === 'request changes')) {
    return `Owners cannot ${action}. Select Reviewer to perform this action.`;
  }
  return null;
}

async function buildState(projectId: string, actorRole: DemoRole): Promise<GovernanceWorkflowState> {
  let record: GovernanceRecord;
  try {
    record = await getGovernance(projectId);
  } catch {
    record = {
      projectId,
      approvalState: 'draft',
      versionLabel: 'v0.1',
      owner: 'Owner',
      reviewers: ['Reviewer'],
      comments: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  const status = mapToStatus(record.approvalState);
  return {
    projectId: record.projectId,
    status,
    currentRole: actorRole,
    comments: record.comments,
    timeline: buildTimeline(record),
    updatedAt: record.lastUpdated,
    warnings: getWarnings(status, actorRole),
  };
}

export async function loadGovernanceWorkflow(projectId: string, actorRole: DemoRole = 'owner'): Promise<GovernanceWorkflowState> {
  return buildState(projectId, actorRole);
}

export async function submitForReview(projectId: string, actorRole: DemoRole): Promise<GovernanceWorkflowState> {
  const blocked = permissionCheck(actorRole, 'submit for review');
  if (blocked) return { ...await buildState(projectId, actorRole), warnings: [blocked] };

  const user = roleToUserRecord(actorRole);
  await setGovernanceState(projectId, 'in_review', user, 'submit', 'Submitted for review');
  await logTransaction(projectId, 'UPDATE', 'project', projectId, 'Governance: submitted for review');
  return buildState(projectId, actorRole);
}

export async function approveProject(projectId: string, actorRole: DemoRole, comment?: string): Promise<GovernanceWorkflowState> {
  const blocked = permissionCheck(actorRole, 'approve');
  if (blocked) return { ...await buildState(projectId, actorRole), warnings: [blocked] };

  const user = roleToUserRecord(actorRole);
  await setGovernanceState(projectId, 'approved', user, 'approve', comment || 'Approved');
  await logTransaction(projectId, 'UPDATE', 'project', projectId, 'Governance: approved');
  return buildState(projectId, actorRole);
}

export async function requestChanges(projectId: string, actorRole: DemoRole, comment?: string): Promise<GovernanceWorkflowState> {
  const blocked = permissionCheck(actorRole, 'request changes');
  if (blocked) return { ...await buildState(projectId, actorRole), warnings: [blocked] };

  const user = roleToUserRecord(actorRole);
  await setGovernanceState(projectId, 'rejected', user, 'request-changes', comment || 'Changes requested');
  await logTransaction(projectId, 'UPDATE', 'project', projectId, 'Governance: changes requested');
  return buildState(projectId, actorRole);
}

export async function resetGovernance(projectId: string, actorRole: DemoRole): Promise<GovernanceWorkflowState> {
  const blocked = permissionCheck(actorRole, 'reset to draft');
  if (blocked) return { ...await buildState(projectId, actorRole), warnings: [blocked] };

  const user = roleToUserRecord(actorRole);
  await setGovernanceState(projectId, 'draft', user, 'reset', 'Reset to draft');
  await logTransaction(projectId, 'UPDATE', 'project', projectId, 'Governance: reset to draft');
  return buildState(projectId, actorRole);
}

export async function addGovernanceCommentAction(
  input: { projectId: string; actorRole: DemoRole; type: CommentType; message: string },
): Promise<GovernanceWorkflowState> {
  const { projectId, actorRole, type, message } = input;
  if (!message.trim()) {
    const state = await buildState(projectId, actorRole);
    return { ...state, warnings: [...state.warnings, 'Comment cannot be empty.'] };
  }

  const user = roleToUserRecord(actorRole);
  const actionLabel = type === 'general' ? 'comment' : type;
  await addGovernanceComment(projectId, user, message, actionLabel);
  await logTransaction(projectId, 'UPDATE', 'project', projectId, `Governance: ${type} comment added`);
  return buildState(projectId, actorRole);
}
