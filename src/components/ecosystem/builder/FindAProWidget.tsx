import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function FindAProWidget({ providers }: { providers: EcosystemData['providers'] }) {
  const available = providers
    .filter((p) => p.verificationStatus === 'verified' && p.availability?.status === 'available')
    .slice(0, 5);

  return (
    <EcoCard title="Find-a-pro" subtitle="Verified providers ready to work">
      {available.length === 0 ? (
        <EmptyState message="No verified providers available right now." />
      ) : (
        <ul className="space-y-2">
          {available.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{p.name}</div>
                <div className="text-[11px] text-slate-400">
                  {p.services?.slice(0, 3).map((s) => s.category).join(' · ') || p.type}
                  {p.rating > 0 ? ` · ★ ${p.rating.toFixed(1)}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="good">Verified</Pill>
              </div>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
