import { Sparkles, User, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kicker, Money } from './primitives';

export interface SpendDownOption {
  id: string;
  label: string;
  amountCents: number;
  source: 'ai' | 'owner';
  blurb: string;
}

/**
 * Contingency Spend-Down card: gold accent left border, each option shows a
 * source badge (AI-Suggested purple dot / owner gold dot), a forest "Select
 * option" primary and a "Refund" secondary.
 */
export function ContingencySpendDownCard({
  remainingCents,
  options,
  onSelect,
  onRefund,
  className,
}: {
  remainingCents: number;
  options: SpendDownOption[];
  onSelect?: (id: string) => void;
  onRefund?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gold/30 border-l-[3px] border-l-gold bg-dustySand/10 p-4 shadow-gold',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Kicker>Contingency · {options.length} options</Kicker>
        <span className="font-mono text-sm font-bold tabular-nums text-[var(--text-primary)]">
          <Money cents={remainingCents} /> left
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {options.map((o) => (
          <div
            key={o.id}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{o.label}</p>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                      o.source === 'ai'
                        ? 'bg-violet-500/15 text-violet-400'
                        : 'bg-gold/15 text-gold',
                    )}
                  >
                    {o.source === 'ai' ? (
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                    ) : (
                      <User className="h-2.5 w-2.5" aria-hidden="true" />
                    )}
                    {o.source === 'ai' ? 'AI-suggested' : "Tafadzwa's pick"}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-[var(--text-secondary)]">{o.blurb}</p>
              </div>
              <Money cents={o.amountCents} className="shrink-0 text-sm font-semibold text-[var(--text-primary)]" />
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onSelect?.(o.id)}
                className="flex-1 rounded-lg bg-forest py-1.5 text-[12px] font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:bg-[#145A44] active:scale-[0.98] dark:bg-gold dark:text-[#1A1A1A] dark:hover:bg-[#d8b338]"
              >
                Select option
              </button>
              {onRefund && (
                <button
                  type="button"
                  onClick={onRefund}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <Undo2 className="h-3 w-3" aria-hidden="true" /> Refund
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
