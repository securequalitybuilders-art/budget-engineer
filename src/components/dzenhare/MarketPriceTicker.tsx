import { TrendingUp, TrendingDown } from 'lucide-react';
import { fmtMoney, fmtPct } from './format';
import { cn } from '@/lib/utils';

export interface TickerItem {
  symbol: string;
  label: string;
  unit: string;
  currentCents: number;
  changePct: number;
}

/**
 * Market price ticker (DzeNhare glass): gold-accent marquee with gradient edge
 * fades, pause on hover, green up / red down with icon (not colour alone).
 */
export function MarketPriceTicker({
  items,
  currency = 'USD',
  dayKey,
  className,
}: {
  items: TickerItem[];
  currency?: string;
  dayKey?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div className={cn('rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 text-[11px] text-[var(--text-muted)]', className)}>
        No market index yet - open a project to auto-compute the daily price ticker.
      </div>
    );
  }
  const doubled = [...items, ...items];
  return (
    <div
      className={cn(
        'flex items-center overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm shadow-card',
        className,
      )}
    >
      <div className="shrink-0 border-r border-[var(--border-subtle)] bg-forest px-3 py-2 text-[9px] text-white">
        <p className="font-display font-bold uppercase tracking-widest text-gold">MKT</p>
        <p>{currency}</p>
        {dayKey && <p className="text-white/70">{dayKey}</p>}
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent" />
        <div className="ticker-track flex w-max items-center gap-6 px-4 py-2 group-hover:[animation-play-state:paused] hover:[animation-play-state:paused]">
          {doubled.map((item, i) => (
            <span key={`${item.symbol}-${i}`} className="flex shrink-0 items-center gap-1.5 text-[11px]" data-symbol={item.symbol}>
              <span className="font-semibold text-[var(--text-primary)]">{item.label}</span>
              <span className="font-mono tabular-nums text-[var(--text-muted)]">
                {fmtMoney(item.currentCents)}/{item.unit}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-mono tabular-nums',
                  item.changePct >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {item.changePct >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                {fmtPct(Math.abs(item.changePct))}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
