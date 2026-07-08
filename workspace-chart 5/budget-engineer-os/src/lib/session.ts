const KEY = 'budget-engineer-os:currentUserId';
export function loadPersistedUserId(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
export function persistUserId(id: string | null): void { try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch {} }