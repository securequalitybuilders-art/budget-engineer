import type { UserRecord } from '../../domain/rbac';

export function canReview(user: UserRecord) {
  return user.role === 'owner' || user.role === 'reviewer';
}

export function canApprove(user: UserRecord) {
  return user.role === 'owner';
}

export function canReject(user: UserRecord) {
  return user.role === 'owner' || user.role === 'reviewer';
}

export function canComment(user: UserRecord) {
  return user.role === 'owner' || user.role === 'reviewer';
}

export type GovernanceAction = 'review' | 'approve' | 'reject' | 'comment';

const ACTION_LABELS: Record<GovernanceAction, string> = {
  review: 'send this project to review',
  approve: 'approve this project',
  reject: 'reject this project',
  comment: 'add a governance comment',
};

const ACTION_ALLOWED: Record<GovernanceAction, (user: UserRecord) => boolean> = {
  review: canReview,
  approve: canApprove,
  reject: canReject,
  comment: canComment,
};

const ACTION_REQUIRED_ROLE: Record<GovernanceAction, string> = {
  review: 'Owner or Reviewer',
  approve: 'Owner',
  reject: 'Owner or Reviewer',
  comment: 'Owner or Reviewer',
};

export function isAuthorized(user: UserRecord, action: GovernanceAction): boolean {
  return ACTION_ALLOWED[action](user);
}

export function unauthorizedReason(user: UserRecord, action: GovernanceAction): string | undefined {
  if (isAuthorized(user, action)) return undefined;
  return `Your role (${roleLabel(user.role)}) cannot ${ACTION_LABELS[action]}. Requires: ${ACTION_REQUIRED_ROLE[action]}.`;
}

export function roleLabel(role: UserRecord['role']): string {
  if (role === 'owner') return 'Owner';
  if (role === 'reviewer') return 'Reviewer';
  return 'Viewer';
}
