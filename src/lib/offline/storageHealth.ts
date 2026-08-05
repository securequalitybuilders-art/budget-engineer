export const WARNING_THRESHOLD_PCT = 80;
export const CRITICAL_THRESHOLD_PCT = 95;

export type StorageLevel = 'ok' | 'warning' | 'critical';

export interface StorageHealth {
  supported: boolean;
  quotaBytes: number | null;
  usageBytes: number | null;
  remainingBytes: number | null;
  usagePct: number | null;
  level: StorageLevel;
}

/**
 * Reads the browser storage estimate. Returns null when the Storage API is
 * unavailable (older browsers / non-secure contexts) so callers degrade
 * gracefully to no banner.
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.estimate !== 'function') return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}

export function classifyStorage(quotaBytes: number, usageBytes: number): StorageHealth {
  const usagePct = quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0;
  const level: StorageLevel =
    usagePct >= CRITICAL_THRESHOLD_PCT ? 'critical' : usagePct >= WARNING_THRESHOLD_PCT ? 'warning' : 'ok';
  return {
    supported: true,
    quotaBytes,
    usageBytes,
    remainingBytes: Math.max(quotaBytes - usageBytes, 0),
    usagePct,
    level,
  };
}

export async function getStorageHealth(): Promise<StorageHealth> {
  const estimate = await getStorageEstimate();
  if (!estimate || typeof estimate.quota !== 'number' || typeof estimate.usage !== 'number') {
    return {
      supported: false,
      quotaBytes: null,
      usageBytes: null,
      remainingBytes: null,
      usagePct: null,
      level: 'ok',
    };
  }
  return classifyStorage(estimate.quota, estimate.usage);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / 10 ** (exponent * 3);
  return `${value >= 100 ? Math.round(value) : value.toFixed(value >= 10 ? 1 : 2)} ${units[exponent]}`;
}
