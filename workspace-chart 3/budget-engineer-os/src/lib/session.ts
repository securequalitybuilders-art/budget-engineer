// Local-first session persistence for the currently-selected user.
// No backend / auth: we simply remember which simulated identity is active
// across reloads so RBAC context survives a page refresh.

const CURRENT_USER_KEY = 'budget-engineer-os:currentUserId';

export function loadPersistedUserId(): string | undefined {
  try {
    return localStorage.getItem(CURRENT_USER_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function persistUserId(id: string): void {
  try {
    localStorage.setItem(CURRENT_USER_KEY, id);
  } catch {
    /* storage unavailable (private mode / SSR) — non-fatal */
  }
}
