import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, fmtDate, type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function EscrowLinkWidget({ escrows }: { escrows: EcosystemData['escrows'] }) {
  return (
    <EcoCard title="Escrow-backed contracts" subtitle="Payment security on every milestone" icon={<span aria-hidden>🔒</span>}>
      {escrows.length === 0 ? (
        <EmptyState message="No escrow contracts linked to your account yet." />
      ) : (
        <ul className="space-y-2">
          {escrows.slice(0, 5).map((e) => {
            const released = e.milestones.filter((m) => m.status === 'released').length;
            const total = e.milestones.length;
            return (
              <li key={e.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Contract {e.contractReference ?? e.id.slice(0, 8)}</span>
                  <Pill tone={e.status === 'released' ? 'good' : e.status === 'disputed' ? 'bad' : 'accent'}>{e.status}</Pill>
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
