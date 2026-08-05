import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { BeforeInstallPromptEvent } from '@/types/pwa';

const DISMISS_KEY = 'be.pwa-install-dismissed';

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred || dismissed) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setDeferred(null);
    } catch {
      setDeferred(null);
    }
    setDismissed(true);
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
      aria-label="Install app"
      className="fixed inset-x-0 top-16 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 shadow-xl"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-[var(--brand-accent)]">
        <Download size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Install Budget Engineer</p>
        <p className="text-xs text-[var(--text-muted)]">Works offline on your device.</p>
      </div>
      <button
        onClick={() => void handleInstall()}
        className="min-h-[40px] shrink-0 rounded-lg bg-[var(--brand-primary)] px-3 text-sm font-medium text-white hover:opacity-90"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
