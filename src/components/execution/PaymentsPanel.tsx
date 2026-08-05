import { useMemo, useState } from 'react';
import { Receipt, TrendingUp, AlertTriangle, CheckCircle2, ArrowUpRight } from 'lucide-react';
import type { Milestone } from '@/domain/milestone';
import {
  buildP4pCertificate,
  calculateWipaa,
} from '@/engine/payment/paymentCalculators';

interface PaymentsPanelProps {
  milestones: Milestone[];
  contractValue: number;
  billedToDate: number;
}

export default function PaymentsPanel({ milestones, contractValue, billedToDate }: PaymentsPanelProps) {
  const [retentionPct, setRetentionPct] = useState(5);
  const [retentionReleasePct, setRetentionReleasePct] = useState(50);
  const [practicalCompletionReached, setPracticalCompletionReached] = useState(false);
  const [defectsLiabilityComplete, setDefectsLiabilityComplete] = useState(false);
  const [previousPayments, setPreviousPayments] = useState<number>(billedToDate);
  const [costsIncurredToDate, setCostsIncurredToDate] = useState<number>(0);
  const [totalEstimatedCosts, setTotalEstimatedCosts] = useState<number>(contractValue);

  const certificate = useMemo(
    () =>
      buildP4pCertificate(milestones, {
        retentionPct,
        retentionReleasePct,
        practicalCompletionReached,
        defectsLiabilityComplete,
        previousPayments,
      }),
    [milestones, retentionPct, retentionReleasePct, practicalCompletionReached, defectsLiabilityComplete, previousPayments]
  );

  const wipaa = useMemo(
    () =>
      calculateWipaa({
        contractValue,
        costsIncurredToDate,
        totalEstimatedCosts,
        billedToDate,
      }),
    [contractValue, costsIncurredToDate, totalEstimatedCosts, billedToDate]
  );

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const numberInput = (label: string, value: number, onChange: (n: number) => void, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-stone-400">{label}</span>
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-sm text-stone-200 outline-none focus:border-stone-600"
      />
      {hint && <span className="mt-0.5 block text-[10px] text-stone-400">{hint}</span>}
    </label>
  );

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-700 bg-stone-900 accent-emerald-500"
      />
      {label}
    </label>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium text-stone-200">
            <Receipt size={18} className="text-emerald-500" />
            P4P — Payment for Progress
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Interim certificate #<span className="font-semibold text-stone-300">{certificate.certificateNumber}</span> · {certificate.asOfDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {toggle('Practical completion', practicalCompletionReached, setPracticalCompletionReached)}
          {toggle('Defects liability expired', defectsLiabilityComplete, setDefectsLiabilityComplete)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Gross earned" value={formatMoney(certificate.grossEarned)} tone="text-stone-200" />
        <SummaryCard label="Retention held" value={formatMoney(certificate.retentionWithheld)} tone="text-amber-400" />
        <SummaryCard label="Retention released" value={formatMoney(certificate.retentionReleased)} tone="text-cyan-400" />
        <SummaryCard label="Amount due" value={formatMoney(certificate.amountDue)} tone="text-emerald-400" accent />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {numberInput('Retention %', retentionPct, setRetentionPct)}
        {numberInput('Release at PC %', retentionReleasePct, setRetentionReleasePct)}
        {numberInput('Previous payments', previousPayments, setPreviousPayments, 'Cumulative amount already paid')}
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-900 text-stone-400">
            <tr>
              <th className="px-3 py-2 font-medium">Work package</th>
              <th className="px-3 py-2 font-medium text-right">Contract</th>
              <th className="px-3 py-2 font-medium text-right">Progress</th>
              <th className="px-3 py-2 font-medium text-right">Earned</th>
              <th className="px-3 py-2 font-medium text-right">Retention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {certificate.lineItems.map((item) => (
              <tr key={item.id} className="bg-stone-900/40">
                <td className="px-3 py-2 text-stone-300">{item.name}</td>
                <td className="px-3 py-2 text-right text-stone-400">{formatMoney(item.contractValue)}</td>
                <td className="px-3 py-2 text-right text-stone-200">{item.progressPct}%</td>
                <td className="px-3 py-2 text-right text-stone-200">{formatMoney(item.earnedValue)}</td>
                <td className="px-3 py-2 text-right text-amber-400/90">{formatMoney(item.retention)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-stone-800 pt-4">
        <h3 className="flex items-center gap-2 text-lg font-medium text-stone-200">
          <TrendingUp size={18} className="text-cyan-500" />
          WIPAA — Work-in-Progress Accounting Adjustment
        </h3>
        <p className="text-xs text-stone-400 mt-0.5 mb-3">
          Cost-to-cost revenue recognition: earned revenue vs billed revenue to date.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {numberInput('Contract value', contractValue, () => undefined, 'Read-only from budget')}
          {numberInput('Costs incurred to date', costsIncurredToDate, setCostsIncurredToDate)}
          {numberInput('Total estimated costs', totalEstimatedCosts, setTotalEstimatedCosts)}
          {numberInput('Billed to date', billedToDate, () => undefined, 'Escrow releases')}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="% complete (cost)" value={`${wipaa.costPctComplete}%`} tone="text-stone-200" />
          <SummaryCard label="Revenue earned" value={formatMoney(wipaa.revenueEarned)} tone="text-stone-200" />
          <SummaryCard
            label="Gross profit earned"
            value={formatMoney(wipaa.grossProfitEarned)}
            tone={wipaa.grossProfitEarned >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          />
          <SummaryCard
            label="Over / under billed"
            value={formatMoney(wipaa.overUnderBilled)}
            tone={wipaa.overUnderBilled >= 0 ? 'text-cyan-400' : 'text-amber-400'}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <BillingBadge status={wipaa.billingStatus} />
          <span className="text-stone-400">
            Projected profit: <span className="font-semibold text-stone-200">{formatMoney(wipaa.projectedProfit)}</span>
            {' '}({wipaa.projectedProfitPct}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, accent }: { label: string; value: string; tone: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-stone-800 bg-stone-900'}`}>
      <div className="text-[11px] text-stone-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function BillingBadge({ status }: { status: 'under-billed' | 'over-billed' | 'on-track' }) {
  if (status === 'on-track') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-400">
        <CheckCircle2 size={13} /> On track — billed matches earned revenue
      </span>
    );
  }
  if (status === 'under-billed') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-1 font-medium text-cyan-400">
        <ArrowUpRight size={13} /> Under-billed — unbilled receivable (WIP asset)
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-400">
      <AlertTriangle size={13} /> Over-billed — deferred revenue (WIP liability)
    </span>
  );
}
