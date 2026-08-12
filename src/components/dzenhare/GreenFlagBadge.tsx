import { Check, BadgeCheck } from 'lucide-react';

/**
 * Green Flag Badge: emerald verification circle that expands on hover to show
 * the verified credentials (ZIMRA standing, NSSA clearance, insurance...).
 */
export function GreenFlagBadge({
  name,
  verified,
  className,
}: {
  name: string;
  verified: string[];
  className?: string;
}) {
  return (
    <span
      data-green-flag
      className={`group/flag relative inline-flex items-center gap-1.5 ${className ?? ''}`}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]"
        aria-hidden="true"
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{name}</span>
      <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
      <span className="sr-only">Verified: {verified.join(', ')}</span>
      <span
        role="tooltip"
        data-testid="green-flag-detail"
        className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-56 rounded-lg border border-emerald-500/40 bg-[var(--bg-elevated)] p-3 shadow-modal group-focus-within/flag:block group-hover/flag:block"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-500">Verified</span>
        <ul className="mt-1.5 space-y-1">
          {verified.map((v) => (
            <li key={v} className="flex items-start gap-1.5 text-[12px] leading-snug text-[var(--text-secondary)]">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
              {v}
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}
