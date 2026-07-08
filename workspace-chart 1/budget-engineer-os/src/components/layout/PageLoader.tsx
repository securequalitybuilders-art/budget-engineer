import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-accent)]" />
        <p className="text-sm text-[var(--text-muted)]">Loading studio...</p>
      </div>
    </div>
  );
}
