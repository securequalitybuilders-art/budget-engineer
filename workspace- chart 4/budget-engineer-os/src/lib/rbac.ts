import { User } from '../domain/rbac';

export type GovernanceAction = 'review' | 'approve' | 'reject' | 'comment';

export function canReview(user: User): boolean {
  return user.role === 'owner' || user.role === 'reviewer';
}

export function canApprove(user: User): boolean {
  return user.role === 'owner';
}

export function canReject(user: User): boolean {
  return user.role === 'owner' || user.role === 'reviewer';
}

export function canComment(user: User): boolean {
  return user.role === 'owner' || user.role === 'reviewer';
}

export function isAuthorized(user: User, action: GovernanceAction): boolean {
  switch (action) {
    case 'review': return canReview(user);
    case 'approve': return canApprove(user);
    case 'reject': return canReject(user);
    case 'comment': return canComment(user);
  }
}

export function unauthorizedReason(user: User, action: GovernanceAction): string | undefined {
  if (isAuthorized(user, action)) return undefined;
  switch (action) {
    case 'approve': return `Your role (${roleLabel(user.role)}) cannot approve this project. Requires: Owner.`;
    case 'reject': return `Your role (${roleLabel(user.role)}) cannot reject this project. Requires: Owner or QS Reviewer.`;
    case 'review': return `Your role (${roleLabel(user.role)}) cannot submit for review. Requires: Owner or QS Reviewer.`;
    case 'comment': return `Your role (${roleLabel(user.role)}) cannot comment. Requires: Owner or QS Reviewer.`;
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'owner': return 'Owner';
    case 'reviewer': return 'QS Reviewer';
    case 'viewer': return 'Stakeholder Viewer';
    default: return role;
  }
}
