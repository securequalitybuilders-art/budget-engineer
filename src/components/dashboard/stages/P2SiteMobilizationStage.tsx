import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MapPin } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { logisticsSummary } from '@/engine/sitehawk/resourceScheduling';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

export function P2SiteMobilizationStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { resourceSchedules, logistics, isLoading, loadForProject, addLogistics, stepLogistics } = useSiteHawkStore(
    useShallow((s) => ({
      resourceSchedules: s.resourceSchedules,
      logistics: s.logistics,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addLogistics: s.addLogistics,
      stepLogistics: s.stepLogistics,
    })),
  );

  const [supplier, setSupplier] = useState('');
  const [material, setMaterial] = useState('');
  const [etaDays, setEtaDays] = useState(7);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectLogistics = useMemo(
    () => logistics.filter((l) => l.projectId === projectId),
    [logistics, projectId],
  );
  const summary = useMemo(() => logisticsSummary(projectLogistics), [projectLogistics]);

  const projectResources = useMemo(
    () => resourceSchedules.filter((r) => r.projectId === projectId),
    [resourceSchedules, projectId],
  );

  const handleAdd = useCallback(async () => {
    if (!projectId || busy || !supplier || !material) return;
    setBusy(true);
    try {
      await addLogistics({ supplierName: supplier, material, etaDays });
      setSupplier('');
      setMaterial('');
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, supplier, material, etaDays, addLogistics]);

  const handleStep = useCallback(
    async (id: string) => { await stepLogistics(id); },
    [stepLogistics],
  );

  return (
    <StageScaffold
      stageId="p2-site-mobilization"
      icon={MapPin}
      empty={!isLoading && projectLogistics.length === 0 && projectResources.length === 0}
      emptyTitle="No mobilization data"
      emptyMessage="Logistics, trade scheduling and supply tracking start here — add material deliveries and step them through the geofence pipeline."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Supply lines</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{summary.total}</p>
            <p className="text-xs text-[var(--text-muted)]">active logistics records</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Delivered</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">{projectLogistics.filter((l) => l.status === 'delivered').length}</p>
            <p className="text-xs text-[var(--text-muted)]">on-site materials</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>In transit</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">{summary.inTransit}</p>
            <p className="text-xs text-[var(--text-muted)]">materials en route</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Trade shifts</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectResources.length}</p>
            <p className="text-xs text-[var(--text-muted)]">crew scheduling rows</p>
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DzCard className="p-4 lg:col-span-2">
            <Kicker>Add material delivery</Kicker>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <FormField id="p2-supplier" label="Supplier" className="w-44" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              <FormField id="p2-material" label="Material" className="w-44" value={material} onChange={(e) => setMaterial(e.target.value)} />
              <FormField id="p2-eta" label="ETA (days)" type="number" min={1} className="w-24" value={etaDays} onChange={(e) => setEtaDays(Number(e.target.value))} />
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || !supplier || !material}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Adding…' : 'Add delivery'}
              </button>
            </div>

            <DataTable
              columns={[
                { key: 'material', header: 'Material' },
                { key: 'supplierName', header: 'Supplier' },
                { key: 'status', header: 'Status', render: (r) => <DzPill tone={r.status === 'delivered' ? 'verified' : r.status === 'in-transit' ? 'released' : 'neutral'}>{r.status}</DzPill> },
                { key: 'etaDays', header: 'ETA', align: 'right', render: (r) => `${r.etaDays}d` },
                { key: 'geofenced', header: 'Geofence', render: (r) => r.geofenced ? <DzPill tone="verified">✓</DzPill> : <DzPill tone="neutral">—</DzPill> },
                { key: '_step', header: '', render: (r) => r.status !== 'delivered' ? (
                  <button type="button" onClick={() => handleStep(r.id)} className="rounded border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                    Advance →
                  </button>
                ) : null },
              ]}
              rows={projectLogistics}
              rowKey={(r) => r.id}
              className="mt-3"
            />
          </DzCard>

          <DzCard className="p-4">
            <Kicker>Resource schedule</Kicker>
            {projectResources.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No crew scheduling rows yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {projectResources.slice(0, 10).map((r) => (
                  <li key={r.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{r.trade}</p>
                      <DzPill tone="neutral">{r.crewSize} crew</DzPill>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {r.date} · {r.labourHours}h · WBS {r.autoCodedWbs}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--brand-accent)]">
                      <Money cents={r.costCents} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DzCard>
        </div>

        <DzCard className="p-4">
          <Kicker>Supply chain overview</Kicker>
          <div className="mt-2 flex gap-3 text-xs text-[var(--text-muted)]">
            <span>total: {summary.total}</span>
            <span>in-transit: {summary.inTransit}</span>
            <span>geofenced: {summary.geofenced}</span>
            <span>overdue: {summary.overdue}</span>
          </div>
        </DzCard>
      </PageEnter>
    </StageScaffold>
  );
}
