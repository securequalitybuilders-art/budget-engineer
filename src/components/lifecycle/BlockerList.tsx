import { XCircle, AlertTriangle } from 'lucide-react';

interface Blocker {
  description: string;
  severity?: 'blocking' | 'warning';
  category?: string;
}

interface BlockerListProps {
  blockers: Blocker[];
  title?: string;
  compact?: boolean;
}

export function BlockerList({ blockers, title, compact }: BlockerListProps) {
  if (blockers.length === 0) return null;

  return (
    <div className={`space-y-1 rounded-lg border ${hasBlocking(blockers) ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'} p-2`}>
      {title && (
        <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{title}</p>
      )}
      {blockers.map((b, i) => (
        <div key={i} className="flex items-start gap-1.5">
          {b.severity === 'blocking' ? (
            <XCircle size={compact ? 10 : 12} className="mt-0.5 shrink-0 text-red-400" />
          ) : (
            <AlertTriangle size={compact ? 10 : 12} className="mt-0.5 shrink-0 text-amber-400" />
          )}
          <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-[var(--text-secondary)]`}>{b.description}</span>
        </div>
      ))}
    </div>
  );
}

function hasBlocking(blockers: Blocker[]): boolean {
  return blockers.some((b) => b.severity === 'blocking');
}
