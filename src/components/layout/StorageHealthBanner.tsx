import { useEffect, useState } from 'react';
import { AlertTriangle, Download, X } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { getStorageHealth, formatBytes, type StorageHealth } from '@/lib/offline/storageHealth';

const DISMISS_KEY = 'be.storage-warning-dismissed';

const DEFAULT_BACKUP = () => {
  const projectId = useProjectStore.getState().currentProjectId;
  if (!projectId) return;
  void (async () => {
    const { exportProjectPackage, downloadBlob } = await import('@/services/projectExportImportService');
    const blob = await exportProjectPackage(projectId);
    if (blob) {
      const project = useProjectStore.getState().currentProject;
      downloadBlob(blob, `${project?.name ?? 'project'}.beproj`);
    }
  })();
};

export function StorageHealthBanner({ onBackup }: { onBackup?: () => void } = {}) {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const next = await getStorageHealth();
      if (!cancelled) setHealth(next);
    };
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!health || !health.supported || health.level === 'ok' || dismissed) return null;

  const isCritical = health.level === 'critical';
  const used = formatBytes(health.usageBytes ?? 0);
  const quota = formatBytes(health.quotaBytes ?? 0);
  const pct = health.usagePct ?? 0;

  const handleBackup = () => {
    if (onBackup) onBackup();
    else DEFAULT_BACKUP();
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // storage unavailable — keep session-only dismissal
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Storage warning"
      className={
        'fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-lg items-center gap-3 rounded-xl border p-3 shadow-xl ' +
        (isCritical
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-300')
      }
    >
      <AlertTriangle size={20} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {isCritical ? 'Device storage nearly full' : 'Local storage getting low'}
        </p>
        <p className="text-xs opacity-90">
          Using {used} of {quota} ({pct}%). Back up your projects to stay safe.
        </p>
      </div>
      <button
        onClick={handleBackup}
        className="flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-3 text-sm font-medium text-white hover:opacity-90"
      >
        <Download size={14} />
        Back up
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss storage warning"
        className="shrink-0 rounded p-1 hover:opacity-80"
      >
        <X size={16} />
      </button>
    </div>
  );
}
