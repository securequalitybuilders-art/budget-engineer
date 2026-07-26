import type { ReactNode } from 'react';
import { Box, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onClick?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, actionLabel, actionTo, onClick, compact }: EmptyStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center ${compact ? 'p-4' : 'p-8'}`}>
      <div className="text-[var(--text-muted)]">{icon ?? <Box size={compact ? 20 : 28} />}</div>
      <p className={`font-medium text-[var(--text-primary)] ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
      <p className={`max-w-xs text-[var(--text-muted)] ${compact ? 'text-[10px]' : 'text-xs'}`}>{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-600/30"
        >
          {actionLabel}
          <ArrowRight size={12} />
        </Link>
      )}
      {actionLabel && onClick && !actionTo && (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-600/30"
        >
          {actionLabel}
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );

  return content;
}
