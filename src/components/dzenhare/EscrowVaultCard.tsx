import * as React from 'react';
import { ShieldCheck, Lock, BadgeCheck, CircleCheckBig, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Money, DzPill } from './primitives';

export type VaultStatus = 'pending' | 'verified' | 'released' | 'disputed';

const VAULT_META: Record<VaultStatus, { pill: 'locked' | 'verified' | 'released' | 'disputed'; label: string }> = {
  pending: { pill: 'locked', label: 'Funds secured — pending verification' },
  verified: { pill: 'verified', label: 'Funds verified' },
  released: { pill: 'released', label: 'Funds released' },
  disputed: { pill: 'disputed', label: 'Funds held — dispute in progress' },
};

/**
 * Escrow vault card: deep forest surface, gold border that pulses while funds
 * are pending verification. Big monospace secured amount + status pill.
 */
export function EscrowVaultCard({
  securedCents,
  status = 'pending',
  title = 'Funds secured',
  footnote,
  className,
}: {
  securedCents: number;
  status?: VaultStatus;
  title?: string;
  footnote?: React.ReactNode;
  className?: string;
}) {
  const meta = VAULT_META[status];
  const Icon = status === 'disputed' ? AlertTriangle : status === 'released' ? CircleCheckBig : status === 'verified' ? BadgeCheck : Lock;
  return (
    <div
      data-vault-status={status}
      className={cn(
        'relative overflow-hidden rounded-xl border border-gold/40 bg-forest p-5 text-white shadow-gold',
        status === 'pending' && 'animate-pulse-border',
        status === 'disputed' && 'border-safetyOrange/60 shadow-[0_0_20px_rgba(232,93,4,0.18)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold/90">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{title}</span>
        </div>
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            status === 'disputed' ? 'bg-safetyOrange/20 text-safetyOrange' : 'bg-gold/20 text-gold',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-[13px] text-white/70">{meta.label}</p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight">
        <Money cents={securedCents} />
      </p>
      <div className="mt-4 flex items-center justify-between">
        <DzPill tone={meta.pill} className={status === 'verified' ? 'gold-shimmer' : undefined}>
          {status}
        </DzPill>
        {footnote && <span className="text-[11px] text-white/60">{footnote}</span>}
      </div>
    </div>
  );
}
