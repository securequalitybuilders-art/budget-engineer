export const SESSION_KEY = 'budget-engineer-os:currentUserId';

export function loadPersistedUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function persistUserId(userId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, userId);
  } catch {}
}
