import { useEffect } from 'react';
import { useMarketIndexStore } from '@/stores/marketIndexStore';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';

export function MarketPriceTicker() {
  const snapshot = useMarketIndexStore((s) => s.snapshot);
  const isLoading = useMarketIndexStore((s) => s.isLoading);
  const autoRefresh = useMarketIndexStore((s) => s.autoRefresh);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await autoRefresh();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [autoRefresh]);

  if (isLoading && !snapshot) {
    return (
      <div className="flex h-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border border-[var(--border-default)] border-t-[var(--brand-accent)]" />
      </div>
    );
  }

  if (!snapshot || snapshot.index.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 text-[10px] text-[var(--text-muted)]">
        No market index yet — open a project to auto-compute the daily price ticker.
      </div>
    );
  }

  const items = snapshot.index;
  const doubled = [...items, ...items];

  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="shrink-0 border-r border-[var(--border-subtle)] px-3 py-2 text-[8px] text-[var(--text-muted)]">
        <div className="font-semibold text-[var(--text-primary)]">MKT</div>
        <div>{snapshot.currency}</div>
        <div>{snapshot.dayKey}</div>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent" />
        <div className="ticker-track flex w-max items-center gap-6 px-4 py-2">
          {doubled.map((item, i) => (
            <span key={`${item.symbol}-${i}`} className="flex shrink-0 items-center gap-1.5 text-[10px]" data-symbol={item.symbol}>
              <span className="font-semibold text-[var(--text-primary)]">{item.label}</span>
              <span className="text-[var(--text-muted)]">
                {fmtCents(item.currentCents)}/{item.unit}
              </span>
              <span className={item.changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                {item.changePct >= 0 ? '▲' : '▼'} {Math.abs(item.changePct).toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
