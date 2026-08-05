import { useState } from 'react';
import { EcoCard, Pill, EmptyState, Stat } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { calculateWipaa, escrowToWipaaInput } from '@/engine/payment/paymentCalculators';

export function WipaaWidget({ escrows }: { escrows: EcosystemData['escrows'] }) {
  const escrow = escrows[0];
  const [incurred, setIncurred] = useState<number | null>(null);

  const input = escrow
    ? escrowToWipaaInput(escrow, { costsIncurredToDate: incurred ?? 0 })
    : null;
  const result = input ? calculateWipaa(input) : null;

  const statusTone = result?.billingStatus === 'on-track' ? 'good' : result?.billingStatus === 'under-billed' ? 'accent' : 'bad';

  return (
    <EcoCard title="WIPAA — revenue recognition" subtitle="Cost-to-cost accounting on escrow contracts">
      {!result ? (
        <EmptyState message="No escrow contract to run WIPAA against." />
      ) : (
        <>
          <label className="mb-3 block text-xs text-slate-400">
            Costs incurred to date
            <input type="number" value={Math.round((incurred ?? 0) / 100)}
              onChange={(e) => setIncurred(Number(e.target.value) * 100)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
          </label>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Stat label="Cost % complete" value={`${result.costPctComplete.toFixed(0)}%`} />
            <Stat label="Revenue earned" value={fmtCents(result.revenueEarned * 100)} />
            <Stat label="Gross profit earned" value={fmtCents(result.grossProfitEarned * 100)} tone={result.grossProfitEarned >= 0 ? 'good' : 'bad'} />
            <Stat label="Projected profit" value={`${fmtCents(result.projectedProfit * 100)} (${result.projectedProfitPct.toFixed(0)}%)`} tone={result.projectedProfit >= 0 ? 'good' : 'bad'} />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Billing position</span>
            <Pill tone={statusTone}>{result.billingStatus}</Pill>
          </div>
          <div className="text-xs text-slate-400">
            {result.overUnderBilled > 0
              ? `Under-billed by ${fmtCents(result.overUnderBilled * 100)} — unbilled receivable.`
              : result.overUnderBilled < 0
                ? `Over-billed by ${fmtCents(Math.abs(result.overUnderBilled) * 100)} — deferred revenue.`
                : 'Billing is on track with earned revenue.'}
          </div>
        </>
      )}
    </EcoCard>
  );
}
