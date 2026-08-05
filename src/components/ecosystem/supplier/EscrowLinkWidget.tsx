import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import type { EscrowAgreement } from '@/domain/marketplace';

function proofBadge(status: EscrowAgreement['status']): { label: string; tone: 'good' | 'bad' | 'neutral' | 'accent' } {
  switch (status) {
    case 'locked': return { label: 'Proof of funds ✓', tone: 'accent' };
    case 'released': return { label: 'Settled', tone: 'good' };
    case 'refunded': return { label: 'Refunded', tone: 'neutral' };
    case 'disputed': return { label: 'Disputed', tone: 'bad' };
  }
}

export function EscrowLinkWidget({ escrows }: { escrows: EcosystemData['escrows'] }) {
  const lockedValue = escrows.filter((e) => e.status === 'locked').reduce((s, e) => s + e.totalAmount, 0);

  return (
    <EcoCard
      title="Escrow-backed contracts"
      subtitle={`${escrows.length} contracts · ${fmtCents(lockedValue * 100)} held in trust`}
      icon={<span aria-hidden>🔒</span>}
    >
      {escrows.length === 0 ? (
        <EmptyState message="No escrow contracts linked to your account yet." />
      ) : (
        <ul className="space-y-2">
          {escrows.slice(0, 5).map((e) => {
            const released = e.milestones.filter((m) => m.status === 'released').length;
            const total = e.milestones.length;
            const badge = proofBadge(e.status);
            return (
              <li key={e.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Contract {e.contractReference ?? e.id.slice(0, 8)}</span>
                  <Pill tone={badge.tone}>{badge.label}</Pill>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>{fmtCents(e.totalAmount * 100)} escrowed</span>
                  <span>{released}/{total} milestones paid · created {fmtDate(e.createdAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </EcoCard>
  );
}
