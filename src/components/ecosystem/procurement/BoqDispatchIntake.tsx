import { useMemo, useState } from 'react';
import { EcoCard, EmptyState, Pill } from '@/components/ecosystem/ui';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import type { BOQ, Project } from '@/types';
import type { Provider } from '@/domain/marketplace';
import type { DispatchOrder } from '@/domain/dispatch';
import { createDispatchFromBoq } from '@/lib/dispatch/dispatchActions';
import { forecastBulkDemand } from '@/engine/dispatch/jitDispatchEngine';

export function BoqDispatchIntake({ projects, boqs, providers, orders, onChanged }: {
  projects: Project[];
  boqs: BOQ[];
  providers: Provider[];
  orders: DispatchOrder[];
  onChanged: () => Promise<void>;
}) {
  const [projectId, setProjectId] = useState('');
  const [boqId, setBoqId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const suppliers = providers.filter((p) => p.type === 'supplier');
  const projectBoqs = projectId ? boqs.filter((b) => b.projectId === projectId) : boqs;
  const boq = boqs.find((b) => b.id === boqId);
  const supplier = suppliers.find((p) => p.id === supplierId);
  const demand = useMemo(() => forecastBulkDemand(orders), [orders]);
  const demandTotal = demand.reduce((s, r) => s + r.totalCostCents, 0);
  const demandSaving = demand.reduce((s, r) => s + r.savingCents, 0);

  const create = async () => {
    if (!boq || !supplier) return;
    setBusy(true);
    setError('');
    try {
      const project = projects.find((p) => p.id === boq.projectId);
      await createDispatchFromBoq({
        projectId: boq.projectId,
        projectName: project?.name,
        boq,
        provider: supplier,
      });
      setBoqId('');
      setSupplierId('');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispatch failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EcoCard
      title="Dispatch from BOQ"
      subtitle="Uber-style JIT: broadcast a bill of quantities to the nearest suppliers and hold payment in escrow"
      icon={<span aria-hidden>📦</span>}
      className="lg:col-span-2"
    >
      {boqs.length === 0 ? (
        <EmptyState message="No bills of quantities yet. Generate a BOQ on any project first." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">PROJECT</span>
            <select
              aria-label="Project"
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setBoqId(''); }}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">BILL OF QUANTITIES</span>
            <select
              aria-label="Bill of quantities"
              value={boqId}
              onChange={(e) => setBoqId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="">Select a BOQ…</option>
              {projectBoqs.map((b) => (
                <option key={b.id} value={b.id}>
                  {projects.find((p) => p.id === b.projectId)?.name ?? 'Project'} · {fmtCents(b.totalCents)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">SUPPLIER</span>
            <select
              aria-label="Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="">Select a supplier…</option>
              {suppliers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · ⭐ {p.rating.toFixed(1)}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {boq ? (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{boq.sections.length} sections · {boq.sections.reduce((s, sec) => s + sec.items.length, 0)} line items</span>
            <span className="font-bold text-brand-accent">{fmtCents(boq.totalCents)}</span>
          </div>
          <ul className="grid gap-1 text-[11px] text-slate-400 sm:grid-cols-2">
            {boq.sections.slice(0, 3).map((s) => (
              <li key={s.id} className="truncate">{s.title}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill tone="accent">Bulk demand: {fmtCents(demandTotal)} across {demand.length} materials</Pill>
          {demandSaving > 0 ? <Pill tone="good">group-buy saving {fmtCents(demandSaving)}</Pill> : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="mt-3 flex justify-end">
        <button
          onClick={create}
          disabled={!boq || !supplier || busy}
          className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Dispatching…' : 'Dispatch order'}
        </button>
      </div>
    </EcoCard>
  );
}
