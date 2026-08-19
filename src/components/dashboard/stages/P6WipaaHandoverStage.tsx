import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ClipboardCheck } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { wipaaSummary, buildHandoverPack } from '@/engine/sitehawk/wipaaMonitor';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

const ALERT_COLORS: Record<string, string> = {
  green: 'text-[var(--success)]',
  amber: 'text-[var(--warning)]',
  red: 'text-[var(--danger)]',
};

export function P6WipaaHandoverStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { wipaaEntries, isLoading, loadForProject, addWipaaEntry } = useSiteHawkStore(
    useShallow((s) => ({
      wipaaEntries: s.wipaaEntries,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addWipaaEntry: s.addWipaaEntry,
    })),
  );

  const [monthKey, setMonthKey] = useState('');
  const [billed, setBilled] = useState(0);
  const [incurred, setIncurred] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [overUnder, setOverUnder] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectEntries = useMemo(
    () => wipaaEntries.filter((e) => e.projectId === projectId),
    [wipaaEntries, projectId],
  );
  const summary = useMemo(() => wipaaSummary(projectEntries), [projectEntries]);

  const handover = useMemo(() => buildHandoverPack({}), []);

  const handleAdd = useCallback(async () => {
    if (!projectId || busy || !monthKey) return;
    const status: 'on-track' | 'under-billed' | 'over-billed' = overUnder > 0 ? 'over-billed' : overUnder < 0 ? 'under-billed' : 'on-track';
    setBusy(true);
    try {
      await addWipaaEntry({ monthKey, billedCents: billed, incurredCents: incurred, revenueEarnedCents: revenue, overUnderBilledCents: overUnder, status });
      setMonthKey('');
      setBilled(0);
      setIncurred(0);
      setRevenue(0);
      setOverUnder(0);
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, monthKey, billed, incurred, revenue, overUnder, addWipaaEntry]);

  const alertColor = summary.latest ? ALERT_COLORS[summary.latest.alertLevel] : 'text-[var(--text-muted)]';

  return (
    <StageScaffold
      stageId="p6-wipaa-handover"
      icon={ClipboardCheck}
      empty={!isLoading && projectEntries.length === 0}
      emptyTitle="No WIPAA data yet"
      emptyMessage="Monthly WIPAA snapshots track true profitability (billed vs incurred) — escalation alerts fire at amber (70%) and red (<70%), and the handover pack checklist closes the project."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Months tracked</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{summary.monthCount}</p>
            <p className="text-xs text-[var(--text-muted)]">WIPAA snapshots</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Latest alert</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${alertColor}`}>
              {summary.latest?.alertLevel?.toUpperCase() ?? '—'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {summary.latest ? `escalation ${summary.latest.escalationPct}%` : 'no data'}
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Over/under billed</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${summary.totalOverUnderBilledCents > 0 ? 'text-[var(--danger)]' : summary.totalOverUnderBilledCents < 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              <Money cents={Math.abs(summary.totalOverUnderBilledCents)} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {summary.totalOverUnderBilledCents > 0 ? 'over-billed' : summary.totalOverUnderBilledCents < 0 ? 'under-billed' : 'on-target'}
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Handover</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${handover.completed ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
              {handover.completed ? 'Complete' : 'Pending'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{handover.digital.length + handover.physical.length} checklist items</p>
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DzCard className="p-4 lg:col-span-2">
            <Kicker>WIPAA history</Kicker>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <FormField id="p6-month" label="Month (YYYY-MM)" className="w-36" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} placeholder="2026-08" />
              <FormField id="p6-billed" label="Billed ($)" type="number" min={0} className="w-28" value={billed} onChange={(e) => setBilled(Number(e.target.value))} />
              <FormField id="p6-incurred" label="Incurred ($)" type="number" min={0} className="w-28" value={incurred} onChange={(e) => setIncurred(Number(e.target.value))} />
              <FormField id="p6-revenue" label="Revenue ($)" type="number" min={0} className="w-28" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
              <FormField id="p6-overunder" label="Over/Under ($)" type="number" className="w-28" value={overUnder} onChange={(e) => setOverUnder(Number(e.target.value))} />
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || !monthKey}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Adding…' : 'Add snapshot'}
              </button>
            </div>

            {projectEntries.length > 0 ? (
              <DataTable
                columns={[
                  { key: 'monthKey', header: 'Month', render: (r) => <span className="font-mono text-xs">{r.monthKey}</span> },
                  { key: 'billedCents', header: 'Billed', align: 'right', render: (r) => <Money cents={r.billedCents} /> },
                  { key: 'incurredCents', header: 'Incurred', align: 'right', render: (r) => <Money cents={r.incurredCents} /> },
                  { key: 'escalationPct', header: 'Escalation', align: 'right', render: (r) => <span className={ALERT_COLORS[r.alertLevel]}>{r.escalationPct}%</span> },
                  { key: 'status', header: 'Status', render: (r) => <DzPill tone={r.status === 'on-track' ? 'verified' : r.status === 'over-billed' ? 'disputed' : 'released'}>{r.status}</DzPill> },
                  { key: 'overUnderBilledCents', header: 'Over/Under', align: 'right', render: (r) => <Money cents={r.overUnderBilledCents} /> },
                ]}
                rows={projectEntries}
                rowKey={(r) => r.id}
                className="mt-3"
              />
            ) : (
              <p className="mt-4 text-center text-xs text-[var(--text-muted)]">No WIPAA snapshots — add a monthly record above.</p>
            )}
          </DzCard>

          <DzCard className="p-4">
            <Kicker>Handover checklist</Kicker>
            <div className="mt-2 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">Digital</p>
                <ul className="mt-1 space-y-1">
                  {handover.digital.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] text-[var(--text-primary)]">
                      <span className="h-3.5 w-3.5 rounded border border-[var(--border-subtle)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">Physical</p>
                <ul className="mt-1 space-y-1">
                  {handover.physical.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] text-[var(--text-primary)]">
                      <span className="h-3.5 w-3.5 rounded border border-[var(--border-subtle)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {summary.alerts.red > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3">
                <p className="text-[11px] font-semibold text-[var(--danger)]">
                  {summary.alerts.red} red alert{summary.alerts.red > 1 ? 's' : ''} — escalation below {70}%
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Review WIPAA history before handover.</p>
              </div>
            )}
          </DzCard>
        </div>
      </PageEnter>
    </StageScaffold>
  );
}
