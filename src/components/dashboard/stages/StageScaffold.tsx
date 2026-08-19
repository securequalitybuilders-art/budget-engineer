import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { getStageDef, type StageId } from '@/lib/studio/stageRegistry';
import { DzCard, Kicker } from '@/components/dzenhare';

/**
 * Shared shell for the 11 Green Flag / Site Hawk stage views.
 * Renders the stage-def header (kicker + label + description), optional
 * inline action, and either the empty state or the stage content.
 */
export function StageScaffold({
  stageId,
  icon: Icon,
  action,
  empty,
  emptyTitle,
  emptyMessage,
  emptyAction,
  children,
}: {
  stageId: StageId;
  icon: LucideIcon;
  action?: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const def = getStageDef(stageId);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <Kicker>{def.label}</Kicker>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{def.description}</p>
          </div>
        </div>
        {action}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {empty ? (
          <div className="flex h-full items-center justify-center">
            <DzCard className="max-w-md p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                {emptyTitle ?? def.label}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {emptyMessage ?? 'Complete the previous stages first — this stage activates once its data is available.'}
              </p>
              {emptyAction && <div className="mt-4">{emptyAction}</div>}
            </DzCard>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}