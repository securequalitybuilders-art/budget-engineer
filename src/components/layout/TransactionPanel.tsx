import { useProjectStore } from '@/stores/projectStore';
import { History, User, Bot, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectTransaction } from '@/types';

const actorConfig: Record<
  ProjectTransaction['actor'],
  { icon: typeof User; color: string }
> = {
  USER: { icon: User, color: 'text-[var(--brand-accent)]' },
  AI_AGENT: { icon: Bot, color: 'text-[var(--accent-ai)]' },
  SYSTEM: { icon: Settings, color: 'text-[var(--text-muted)]' },
};

export function TransactionPanel() {
  const { transactions } = useProjectStore();

  if (transactions.length === 0) {
    return (
      <div className="hidden flex-col items-center justify-center gap-2 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-center text-xs text-[var(--text-muted)] lg:flex lg:w-64 lg:border-t-0 lg:border-l">
        <History size={18} />
        <p>Transaction history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="hidden flex-col border-t border-[var(--border-default)] bg-[var(--bg-secondary)] lg:flex lg:w-64 lg:border-t-0 lg:border-l">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2">
        <h3 className="font-display text-sm font-semibold">History</h3>
        <History size={14} className="text-[var(--text-muted)]" />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative space-y-4 pl-4">
          <div className="absolute left-[21px] top-2 bottom-2 w-px bg-[var(--border-default)]" />
          {transactions.slice(0, 20).map((tx) => {
            const config = actorConfig[tx.actor];
            const Icon = config.icon;
            return (
              <div key={tx.id} className="relative flex gap-3">
                <div className={cn('z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--bg-secondary)]', config.color)}>
                  <Icon size={12} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {tx.action} {tx.entityType}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                  {tx.reason && (
                    <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{tx.reason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
