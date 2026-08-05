import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { buildMarketIndex, FX_USD_TO_ZWG } from '@/engine/ecosystem/priceIndex';

export function PriceIndexWidget({ rates }: { rates: EcosystemData['rates'] }) {
  const index = buildMarketIndex(rates, FX_USD_TO_ZWG, 'USD');
  const topMovers = [...index].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 7);

  return (
    <EcoCard title="SADC materials price index" subtitle="30-day ticker vs the rate catalogue" icon={<span aria-hidden>📈</span>}>
      {topMovers.length === 0 ? (
        <EmptyState message="No market rates loaded." />
      ) : (
        <ul className="space-y-1.5">
          {topMovers.map((m) => (
            <li key={m.symbol} className="flex items-center justify-between text-sm">
              <span className="truncate text-slate-600">{m.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{fmtCents(m.currentCents)}/{m.unit}</span>
                <Pill tone={m.changePct >= 0 ? 'bad' : 'good'}>
                  {m.changePct >= 0 ? '▲' : '▼'} {Math.abs(m.changePct).toFixed(1)}%
                </Pill>
              </span>
            </li>
          ))}
        </ul>
      )}
    </EcoCard>
  );
}
