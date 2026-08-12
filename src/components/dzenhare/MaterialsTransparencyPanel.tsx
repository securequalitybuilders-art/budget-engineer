import { Truck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kicker, Money } from './primitives';

export interface MaterialLine {
  id: string;
  name: string;
  supplier: string;
  totalCents: number;
  qty?: string;
}

/**
 * Materials Transparency Panel: per-line material + supplier + mono money,
 * a locked-until gold note, and a Track Deliveries CTA.
 */
export function MaterialsTransparencyPanel({
  materials,
  totalCents,
  lockedUntil,
  ctaLabel = 'Track deliveries',
  onTrack,
  className,
}: {
  materials: MaterialLine[];
  totalCents: number;
  lockedUntil?: string;
  ctaLabel?: string;
  onTrack?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-card', className)}>
      <div className="flex items-center justify-between">
        <Kicker>Materials · Locked pricing</Kicker>
        {lockedUntil && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
            <Lock className="h-3 w-3" aria-hidden="true" /> Locked until {lockedUntil}
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {materials.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)]/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.name}</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {m.supplier}
                {m.qty ? ` · ${m.qty}` : ''}
              </p>
            </div>
            <Money cents={m.totalCents} className="text-[13px] font-semibold text-[var(--text-primary)]" />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Total secured</span>
          <Money cents={totalCents} className="text-lg font-bold text-[var(--text-primary)]" />
        </div>
        <button
          type="button"
          onClick={onTrack}
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3.5 py-2 text-xs font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:bg-[#145A44] active:scale-[0.98] dark:bg-gold dark:text-[#1A1A1A] dark:hover:bg-[#d8b338]"
        >
          <Truck className="h-3.5 w-3.5" aria-hidden="true" /> {ctaLabel}
        </button>
      </div>
    </div>
  );
}
