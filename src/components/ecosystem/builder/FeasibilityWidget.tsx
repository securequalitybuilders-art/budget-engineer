import { useState } from 'react';
import { EcoCard, Stat, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { assessCashVsScope } from '@/engine/ecosystem/walletToWall';

export function FeasibilityWidget({ estimatedCostCents }: { estimatedCostCents: number }) {
  const [cash, setCash] = useState(Math.round(estimatedCostCents * 0.6));
  const [income, setIncome] = useState(estimatedCostCents / 24);
  const [months, setMonths] = useState(12);

  const result = assessCashVsScope({
    cashOnHandCents: cash,
    estimatedBuildCostCents: estimatedCostCents,
    monthlyIncomeCents: income,
    monthsToBuild: months,
  });

  const verdictTone = result.verdict === 'proceed' ? 'good' : result.verdict === 'caution' ? 'warn' : 'bad';

  return (
    <EcoCard title="Wallet-to-wall check" subtitle="Can the cash cover the build?" icon={<span aria-hidden>🛡️</span>}>
      {estimatedCostCents <= 0 ? (
        <EmptyState message="Generate a design + BOQ first to run the feasibility check." />
      ) : (
        <>
          <div className="mb-3 space-y-3">
            <label className="block text-xs text-slate-400">
              Cash on hand
              <input type="number" value={Math.round(cash / 100)} onChange={(e) => setCash(Number(e.target.value) * 100)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
            </label>
            <label className="block text-xs text-slate-400">
              Monthly income
              <input type="number" value={Math.round(income / 100)} onChange={(e) => setIncome(Number(e.target.value) * 100)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
            </label>
            <label className="block text-xs text-slate-400">
              Months to build
              <input type="number" value={months} min={1} onChange={(e) => setMonths(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
            </label>
          </div>
          <div className={`mb-3 rounded-lg border px-3 py-2 text-sm font-medium ${
            result.verdict === 'proceed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : result.verdict === 'caution' ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {result.verdict === 'proceed' ? 'Proceed — cash covers scope + contingency'
              : result.verdict === 'caution' ? 'Caution — build is scoped to the limit of your cash'
              : 'White-elephant risk — the build would overreach the available cash'}
          </div>
          <ul className="mb-3 space-y-1">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                <span className="mt-0.5 text-slate-300">•</span>{r}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Affordability ratio" value={`${(result.affordabilityRatio * 100).toFixed(0)}%`} tone={verdictTone} />
            <Stat label="Required cash" value={fmtCents(result.requiredCashCents)} />
            <Stat label="Funding gap" value={fmtCents(result.fundingGapCents)} tone={result.fundingGapCents > 0 ? 'bad' : 'good'} />
            <Stat label="Shortfall after income" value={fmtCents(result.shortfallCents)} tone={result.shortfallCents > 0 ? 'warn' : 'good'} />
          </div>
        </>
      )}
    </EcoCard>
  );
}
