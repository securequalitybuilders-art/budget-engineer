import * as React from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Border Beam Card — "Premium Fortress Package". A Gold→White→Gold gradient
 * sweeps the perimeter on a 3s loop. Used for the AI Studio Fortress cards.
 */
export function BorderBeamCard({
  badge,
  title,
  description,
  children,
  className,
}: {
  badge?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border-beam p-[1.5px]', className)}>
      <div className="flex h-full flex-col rounded-[11px] bg-[var(--bg-secondary)] p-5">
        {badge && (
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" /> {badge}
          </span>
        )}
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
        )}
        {children && <div className="mt-4 flex-1">{children}</div>}
      </div>
    </div>
  );
}
