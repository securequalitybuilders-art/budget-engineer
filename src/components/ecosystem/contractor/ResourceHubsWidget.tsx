import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';

export function ResourceHubsWidget({ providers }: { providers: EcosystemData['providers'] }) {
  const contractors = providers.filter((p) => p.type === 'contractor' || p.type === 'subcontractor');
  const consultants = providers.filter((p) => p.type === 'professional' || p.type === 'consultant');
  const suppliers = providers.filter((p) => p.type === 'supplier');

  const hubs = [
    { label: 'Subcontractors', providers: contractors },
    { label: 'Consultants', providers: consultants },
    { label: 'Suppliers', providers: suppliers },
  ];

  return (
    <EcoCard title="Resource hubs" subtitle="Subcontractor, consultant and supplier pools" icon={<span aria-hidden>👥</span>}>
      {providers.length === 0 ? (
        <EmptyState message="No providers registered yet. Add providers to build your resource pool." />
      ) : (
        <div className="space-y-3">
          {hubs.map((hub) => (
            <div key={hub.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{hub.label}</span>
                <Pill tone={hub.providers.length > 0 ? 'good' : 'neutral'}>{hub.providers.length}</Pill>
              </div>
              {hub.providers.length === 0 ? (
                <p className="text-xs text-slate-300">None yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {hub.providers.slice(0, 3).map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5">
                      <span className="text-sm text-slate-600">{p.name}</span>
                      <Pill tone={p.availability?.status === 'available' ? 'accent' : 'neutral'}>
                        {p.availability?.status ?? 'n/a'}
                      </Pill>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </EcoCard>
  );
}
