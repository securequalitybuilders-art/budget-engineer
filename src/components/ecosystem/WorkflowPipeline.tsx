import { Link } from 'react-router-dom';
import { pipelineSummary, type WorkflowStepSummary } from '@/engine/ecosystem/workflow';
import type { EcosystemData } from '@/components/ecosystem/useEcosystemData';

const STEP_ICONS: Record<WorkflowStepSummary['step'], string> = {
  rfq: '📋',
  quote: '💬',
  award: '🏆',
  escrow: '🔒',
  delivery: '🚚',
  dispute: '🧾',
};

const STEP_LINKS: Record<WorkflowStepSummary['step'], { label: string; to: string }> = {
  rfq: { label: 'Send RFQ', to: '/ecosystem/contractor' },
  quote: { label: 'Price it', to: '/ecosystem/supplier' },
  award: { label: 'Award PO', to: '/ecosystem/contractor' },
  escrow: { label: 'Trust account', to: '/ecosystem/contractor' },
  delivery: { label: 'Confirm drop', to: '/ecosystem/supplier' },
  dispute: { label: 'Credit note', to: '/ecosystem/supplier' },
};

export function WorkflowPipeline({ data }: { data: EcosystemData }) {
  const steps = pipelineSummary({
    procurementRequests: data.procurementRequests,
    supplierQuotes: data.supplierQuotes,
    purchaseOrders: data.purchaseOrders,
    deliveryRecords: data.deliveryRecords,
    escrows: data.escrows,
  });

  return (
    <section aria-label="Procurement workflow" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">End-to-end workflow</h3>
          <p className="text-xs text-slate-400">Contractor ⇄ Supplier — RFQ through payment, escrowed at every step.</p>
        </div>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((step, i) => (
          <li key={step.step} className="relative">
            <div
              data-workflow-step={step.step}
              data-active={step.active}
              className={`flex h-full flex-col rounded-lg border px-2.5 py-2 ${step.active ? 'border-brand/30 bg-brand/5' : 'border-slate-100 bg-slate-50/50'}`}
            >
              <div className="flex items-center justify-between">
                <span aria-hidden>{STEP_ICONS[step.step]}</span>
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${step.active ? 'bg-brand-accent/15 text-brand-accent' : 'bg-slate-200 text-slate-400'}`}>
                  {step.count}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700">{i + 1}. {step.label}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-slate-400">{step.hint}</div>
              <Link to={STEP_LINKS[step.step].to} className="mt-1.5 inline-block text-[10px] font-medium text-brand-accent hover:underline">
                {STEP_LINKS[step.step].label} →
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
