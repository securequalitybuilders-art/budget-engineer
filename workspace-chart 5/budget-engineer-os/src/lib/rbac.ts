import type { User, UserRole } from '../domain/rbac';
export type GovernanceAction = 'review' | 'approve' | 'reject' | 'comment';
export function canReview(user: User): boolean { return user.role === 'owner' || user.role === 'reviewer'; }
export function canApprove(user: User): boolean { return user.role === 'owner'; }
export function canReject(user: User): boolean { return user.role === 'owner' || user.role === 'reviewer'; }
export function canComment(user: User): boolean { return user.role === 'owner' || user.role === 'reviewer'; }
export function isAuthorized(user: User, action: GovernanceAction): boolean {
  if (action === 'review') return canReview(user);
  if (action === 'approve') return canApprove(user);
  if (action === 'reject') return canReject(user);
  if (action === 'comment') return canComment(user);
  return false;
}
export function unauthorizedReason(user: User, action: GovernanceAction): string | undefined {
  if (isAuthorized(user, action)) return undefined;
  const required = action === 'approve' ? 'Owner' : 'Owner or Reviewer';
  return `Your role (${roleLabel(user.role)}) cannot ${action} this project. Requires: ${required}.`;
}
export function roleLabel(role: UserRole): string {
  if (role === 'owner') return 'Owner';
  if (role === 'reviewer') return 'Reviewer';
  return 'Viewer';
}