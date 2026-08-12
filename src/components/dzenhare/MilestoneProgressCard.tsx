import { Camera, MapPin, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kicker, Money, DzPill } from './primitives';

/**
 * Milestone Progress Card: gold progress bar, latest site-photo thumbs, next
 * delivery, hold amount in mono, and a gold "READY FOR YOUR APPROVAL" banner
 * with Review Photos + Approve actions.
 */
export function MilestoneProgressCard({
  progressPct,
  milestoneLabel,
  photoCount = 0,
  nextDelivery,
  holdCents,
  approved,
  onReview,
  onApprove,
  className,
}: {
  progressPct: number;
  milestoneLabel: string;
  photoCount?: number;
  nextDelivery?: string;
  holdCents: number;
  approved?: boolean;
  onReview?: () => void;
  onApprove?: () => void;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, progressPct));
  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-card', className)}>
      <div className="flex items-center justify-between">
        <Kicker>{milestoneLabel}</Kicker>
        {approved ? (
          <DzPill tone="released">Approved</DzPill>
        ) : (
          <DzPill tone="verified">Ready for your approval</DzPill>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--text-muted)]">Progress</span>
          <span className="font-mono tabular-nums text-gold">{Math.round(pct)}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-forest to-gold transition-all duration-500"
            style={{ width: `${pct}%` }}
            data-progress
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-md border',
              i < photoCount
                ? 'border-gold/40 bg-[var(--bg-tertiary)] text-gold'
                : 'border-dashed border-[var(--border-default)] text-[var(--text-muted)]',
            )}
            aria-label={i < photoCount ? `Site photo ${i + 1}` : 'No photo yet'}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </div>
        ))}
        <span className="ml-1 text-[11px] text-[var(--text-muted)]">
          {photoCount > 0 ? `${photoCount} photos for review` : 'No photos uploaded yet'}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)]/60 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <MapPin className="h-3.5 w-3.5 text-earthBrown dark:text-dustySand" aria-hidden="true" />
          {nextDelivery ? `Next delivery · ${nextDelivery}` : 'Next delivery TBC'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          Hold
          <Money cents={holdCents} className="font-semibold text-[var(--text-primary)]" />
        </span>
      </div>

      {!approved && onReview && onApprove && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2.5 text-center">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-gold">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Ready for your approval
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={onReview}
              className="flex-1 rounded-lg border border-gold/50 py-2 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/10"
            >
              Review photos
            </button>
            <button
              type="button"
              onClick={onApprove}
              className="flex-1 rounded-lg bg-forest py-2 text-[12px] font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:bg-[#145A44] active:scale-[0.98] dark:bg-gold dark:text-[#1A1A1A] dark:hover:bg-[#d8b338]"
            >
              Approve & release
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
