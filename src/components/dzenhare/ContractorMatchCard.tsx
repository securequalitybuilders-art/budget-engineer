import { MapPin, Briefcase, Clock, TrendingUp, BadgeCheck, Star, FolderOpen, UserCheck, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kicker, Money } from './primitives';

export interface ContractorMetric {
  key: string;
  icon: 'location' | 'portfolio' | 'timeline' | 'trend';
  label: string;
  value: string;
}

const METRIC_ICONS = {
  location: MapPin,
  portfolio: Briefcase,
  timeline: Clock,
  trend: TrendingUp,
} as const;

/**
 * UNICORN Verified Contractor card. Internal metric rows use earthBrown icons,
 * a gold "Verified" chip, star rating, and a forest "Invite to bid" CTA.
 */
export function ContractorMatchCard({
  name,
  category,
  rating,
  reviews,
  metrics,
  wipaaScore,
  feeCents,
  ctaLabel = 'Invite to bid',
  onInvite,
  onViewProjects,
  onApprove,
  onAlternatives,
  className,
}: {
  name: string;
  category: string;
  rating: number;
  reviews: number;
  metrics: ContractorMetric[];
  /** WIPAA true-profitability score 0–100 (spec: "WIPAA Score 94%"). */
  wipaaScore?: number;
  feeCents?: number;
  ctaLabel?: string;
  onInvite?: () => void;
  onViewProjects?: () => void;
  onApprove?: () => void;
  onAlternatives?: () => void;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hasSpecActions = Boolean(onViewProjects || onApprove || onAlternatives);
  const wipaa = wipaaScore !== undefined && Number.isFinite(wipaaScore) ? wipaaScore : 0;
  const wipaaTone =
    wipaa < 0 ? 'bg-safetyOrange/15 text-safetyOrange' : wipaa < 75 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400';
  return (
    <div
      data-contractor-card
      className={cn(
        'overflow-hidden rounded-xl border border-gold/30 bg-[var(--bg-secondary)] shadow-gold',
        className,
      )}
    >
      <div className="flex items-center gap-3 bg-forest px-4 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-forest">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-white">{name}</p>
          <p className="text-[12px] text-white/70">{category}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
          <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Unicorn Verified
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-1 text-gold" aria-label={`${rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={cn('h-4 w-4', s <= Math.round(rating) ? 'fill-gold text-gold' : 'text-[var(--text-muted)]')}
              aria-hidden="true"
            />
          ))}
          <span className="ml-1 font-mono text-xs tabular-nums text-[var(--text-secondary)]">
            {rating.toFixed(1)} ({reviews} reviews)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => {
            const Icon = METRIC_ICONS[m.icon];
            return (
              <div key={m.key} className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)]/60 px-2.5 py-2">
                <Icon className="h-4 w-4 shrink-0 text-earthBrown dark:text-dustySand" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{m.label}</p>
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.value}</p>
                </div>
              </div>
            );
          })}
        </div>
        {wipaaScore !== undefined && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2">
            <Kicker>WIPAA Score</Kicker>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums', wipaaTone)}>
              {wipaa.toFixed(0)}%
              <span className="hidden font-sans text-[10px] font-semibold uppercase tracking-wide sm:inline">
                True profitability
              </span>
            </span>
          </div>
        )}
        {feeCents !== undefined && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2">
            <Kicker>Bid management fee</Kicker>
            <Money cents={feeCents} className="text-sm font-semibold text-[var(--text-primary)]" />
          </div>
        )}
        {hasSpecActions ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onApprove}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:bg-[#145A44] active:scale-[0.98] dark:bg-gold dark:text-[#1A1A1A] dark:hover:bg-[#d8b338]"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" /> Approve {name.split(' ')[0]}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onViewProjects}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-gold/40 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-gold/10"
              >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" /> View past projects
              </button>
              <button
                type="button"
                onClick={onAlternatives}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] py-2 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gold/10"
              >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> 2 alternatives
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onInvite}
            className="w-full rounded-lg bg-forest py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:bg-[#145A44] active:scale-[0.98] dark:bg-gold dark:text-[#1A1A1A] dark:hover:bg-[#d8b338]"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
