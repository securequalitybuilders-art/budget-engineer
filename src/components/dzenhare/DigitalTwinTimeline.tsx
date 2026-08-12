import { CheckCircle2, Circle, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kicker } from './primitives';

export interface TwinMilestone {
  id: string;
  title: string;
  status: 'done' | 'active' | 'upcoming';
  date?: string;
  note?: string;
  photo?: string;
}

/**
 * Digital Twin Timeline: vertical construction-progress rail. The active
 * milestone is expanded with a gold left border; done items collapse to 70%
 * opacity with a green check; upcoming items use a grey dashed ring.
 */
export function DigitalTwinTimeline({
  milestones,
  className,
}: {
  milestones: TwinMilestone[];
  className?: string;
}) {
  return (
    <div className={className}>
      <Kicker className="mb-4">Digital Twin · Build Progress</Kicker>
      <ol className="space-y-3">
        {milestones.map((m) => (
          <li
            key={m.id}
            data-status={m.status}
            className={cn(
              'relative rounded-xl border p-4 transition-all duration-200',
              m.status === 'active' &&
                'border-gold/50 bg-gold/5 shadow-gold [border-left-width:3px] border-l-gold',
              m.status === 'done' && 'border-[var(--border-default)] bg-[var(--bg-secondary)] opacity-70',
              m.status === 'upcoming' &&
                'border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] opacity-80',
            )}
          >
            <div className="flex items-center gap-3">
              {m.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : m.status === 'active' ? (
                <Circle className="h-5 w-5 shrink-0 animate-pulse text-gold" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold text-[var(--text-primary)]', m.status === 'done' && 'line-through decoration-emerald-500/50')}>
                  {m.title}
                </p>
                {m.date && <p className="text-xs text-[var(--text-muted)]">{m.date}</p>}
              </div>
              {m.status === 'active' && (
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                  In progress
                </span>
              )}
            </div>
            {m.note && m.status !== 'done' && (
              <p className="mt-2 pl-8 text-[12px] leading-snug text-[var(--text-secondary)]">{m.note}</p>
            )}
            {m.photo && m.status === 'active' && (
              <div className="mt-3 flex items-center gap-2 pl-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-gold/40 bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  <Camera className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Site photo · awaiting your approval
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
