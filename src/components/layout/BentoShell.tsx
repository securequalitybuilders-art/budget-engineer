import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BentoShellProps {
  children: ReactNode;
  className?: string;
}

export function BentoShell({ children, className }: BentoShellProps) {
  return (
    <div className={cn('flex h-[calc(100vh-3.5rem)] overflow-hidden min-w-0', className)} role="region" aria-label="Studio workspace">
      {children}
    </div>
  );
}

interface BentoPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export function BentoPanel({ children, className, title, actions }: BentoPanelProps) {
  const panelId = title ? `bento-panel-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]', className)} role="region" aria-labelledby={panelId}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2">
          {title && (
            <h3 id={panelId} className="font-display text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
          )}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
