import { EcoCard, Pill, EmptyState } from '@/components/ecosystem/ui';
import { fmtCents, type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { buildP4pCertificate } from '@/engine/payment/paymentCalculators';

export function P4pWidget({ milestones }: { milestones: EcosystemData['milestones'] }) {
  const cert = buildP4pCertificate(milestones, { retentionPct: 5, retentionReleasePct: 50 });

  return (
    <EcoCard title="P4P — Payment for progress" subtitle={`Interim certificate ${cert.certificateNumber} · ${cert.asOfDate}`}>
      {cert.lineItems.length === 0 ? (
        <EmptyState message="No milestones to certify yet." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-400">Gross earned</div>
              <div className="text-sm font-bold text-slate-800">{fmtCents(cert.grossEarned * 100)}</div>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <div className="text-xs text-slate-400">Retention held</div>
              <div className="text-sm font-bold text-amber-600">{fmtCents(cert.retentionWithheld * 100)}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <div className="text-xs text-slate-400">Amount due</div>
              <div className="text-sm font-bold text-emerald-600">{fmtCents(cert.amountDue * 100)}</div>
            </div>
          </div>
          <ul className="mb-3 space-y-1.5">
            {cert.lineItems.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-slate-600">{l.name}</span>
                <span className="flex items-center gap-2">
                  <Pill tone={l.progressPct === 100 ? 'good' : l.progressPct > 0 ? 'accent' : 'neutral'}>{l.progressPct.toFixed(0)}%</Pill>
                  <span className="w-20 text-right text-xs text-slate-400">{fmtCents(l.earnedValue * 100)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Previous payments · {fmtCents(cert.previousPayments * 100)}</span>
            <span>{cert.defectsLiabilityComplete ? 'Defects liability closed' : cert.practicalCompletionReached ? 'Practical completion reached' : 'Within construction'}</span>
          </div>
        </>
      )}
    </EcoCard>
  );
}
