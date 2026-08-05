import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function ProofOfFundsWidget({ providers }: { providers: EcosystemData['providers'] }) {
  const suppliers = providers.filter((p) => p.type === 'supplier');
  const rows = suppliers.slice(0, 5).map((p) => {
    const hasCredentials = p.credentials.length > 0;
    const hasFinancials = hasCredentials && (p.totalContractValue ?? 0) > 0;
    const verified = p.verificationStatus === 'verified';
    const level = hasFinancials && verified ? 'gold' : hasCredentials || verified ? 'silver' : 'none';
    return { p, level };
  });

  return (
    <EcoCard title="Proof of funds" subtitle="Financial standing shown to buyers" icon={<span aria-hidden>💳</span>}>
      {rows.length === 0 ? (
        <EmptyState message="Register a supplier profile to display proof of funds." />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ p, level }) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{p.name}</div>
                <div className="text-[11px] text-slate-400">
                  {p.credentials.length} credential(s) · verification {p.verificationStatus}
                </div>
              </div>
              <Pill tone={level === 'gold' ? 'good' : level === 'silver' ? 'accent' : 'neutral'}>
                {level === 'gold' ? 'Gold · financials verified' : level === 'silver' ? 'Silver · listed' : 'Awaiting evidence'}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
