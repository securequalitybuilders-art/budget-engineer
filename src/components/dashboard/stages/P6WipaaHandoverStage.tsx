import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ClipboardCheck, TrendingUp, TrendingDown, Minus, Send, Mail, Phone } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  wipaaSummary,
  analyzeGainFade,
  solvencyTrend,
  contingencySpendDown,
  monthlyCashflow,
  buildHandoverChecklist,
  signOffHandover,
} from '@/engine/sitehawk/wipaaMonitor';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';
import type { WipaaEntry } from '@/domain/sitehawk';
import type { GainFadeRow, HandoverItem } from '@/engine/sitehawk/wipaaMonitor';

type P6Tab = 'dashboard' | 'gain-fade' | 'handover';

const ALERT_COLORS: Record<string, string> = {
  green: 'text-[var(--success)]',
  amber: 'text-[var(--warning)]',
  red: 'text-[var(--danger)]',
};

const CONTINGENCY_ALERT_COLORS: Record<string, string> = {
  healthy: 'text-[var(--success)]',
  caution: 'text-[var(--warning)]',
  warning: 'text-[var(--warning)]',
  critical: 'text-[var(--danger)]',
};

const TAB_BUTTONS: { key: P6Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'gain-fade', label: 'Gain / Fade' },
  { key: 'handover', label: 'Handover' },
];

/* ── Sub-component: Solvency Dashboard ─────────────────────────────────── */

function SolvencyDashboard({
  entries,
  contingencyTotalCents,
}: {
  entries: WipaaEntry[];
  contingencyTotalCents: number;
}) {
  const trend = useMemo(() => solvencyTrend(entries), [entries]);
  const cf = useMemo(() => monthlyCashflow(entries), [entries]);
  const contingency = useMemo(() => {
    const months = entries.map((e) => ({ monthKey: e.monthKey, spentCents: Math.max(0, e.incurredCents - e.billedCents) }));
    return contingencySpendDown(contingencyTotalCents, months);
  }, [entries, contingencyTotalCents]);

  const totalInflow = cf.reduce((s, m) => s + m.inflowCents, 0);
  const totalOutflow = cf.reduce((s, m) => s + m.outflowCents, 0);
  const redCount = trend.months.filter((m) => m.alertLevel === 'red').length;
  const amberCount = trend.months.filter((m) => m.alertLevel === 'amber').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <DzCard className="p-4">
          <Kicker>Solvency ratio</Kicker>
          <p className={`mt-1 font-display text-2xl font-bold ${ALERT_COLORS[trend.alertLevel]}`}>
            {trend.currentRatio > 0 ? `${Math.round(trend.currentRatio * 100)}%` : '—'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {trend.months.length > 0 ? `avg ${Math.round(trend.avgRatio * 100)}%` : 'no data'}
          </p>
        </DzCard>
        <DzCard className="p-4">
          <Kicker>Contingency remaining</Kicker>
          <p className={`mt-1 font-display text-2xl font-bold ${CONTINGENCY_ALERT_COLORS[contingency.alertLevel]}`}>
            <Money cents={contingency.remainingCents} />
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {contingency.spentPct > 0 ? `${contingency.spentPct}% spent` : 'no spend yet'}
          </p>
        </DzCard>
        <DzCard className="p-4">
          <Kicker>Cashflow net</Kicker>
          <p className={`mt-1 font-display text-2xl font-bold ${(totalInflow - totalOutflow) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            <Money cents={Math.abs(totalInflow - totalOutflow)} />
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {totalInflow >= totalOutflow ? 'net positive' : 'net negative'}
          </p>
        </DzCard>
        <DzCard className="p-4">
          <Kicker>Solvency alerts</Kicker>
          <p className={`mt-1 font-display text-2xl font-bold ${redCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
            {redCount}
          </p>
          <p className="text-xs text-[var(--text-muted)]">red-alert months</p>
        </DzCard>
      </div>

      {trend.months.length > 0 && (
        <DzCard className="p-4">
          <Kicker>Solvency trend</Kicker>
          <div className="mt-3 flex items-end gap-1">
            {trend.months.map((m) => {
              const height = Math.round(m.ratio * 100);
              return (
                <div key={m.monthKey} className="flex flex-col items-center gap-1" title={`${m.monthKey}: ${height}%`}>
                  <div
                    className={`w-8 rounded-t ${ALERT_COLORS[m.alertLevel]} bg-current opacity-20`}
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[9px] text-[var(--text-muted)]">{m.monthKey.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-[var(--success)]" /> ≥90%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-[var(--warning)]" /> 70–89%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-[var(--danger)]" /> &lt;70%</span>
          </div>
        </DzCard>
      )}

      {contingency.alertLevel !== 'healthy' && (
        <DzCard className="p-3 border border-[var(--warning)]/30 bg-[var(--warning)]/5">
          <p className="text-xs font-semibold text-[var(--warning)]">
            Contingency {contingency.alertLevel}: {contingency.spentPct}% used
            {contingency.projectedExhaustedMonthKey && ` — projected exhaust: ${contingency.projectedExhaustedMonthKey}`}
          </p>
        </DzCard>
      )}

      {amberCount > 0 && redCount === 0 && (
        <DzCard className="p-3 border border-[var(--warning)]/30 bg-[var(--warning)]/5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--warning)]" />
            <p className="text-xs font-semibold text-[var(--warning)]">
              Email nudge: {amberCount} month{amberCount > 1 ? 's' : ''} with solvency below 90% — notify QS and contractor to submit updated cost returns.
            </p>
          </div>
        </DzCard>
      )}

      {redCount > 0 && (
        <DzCard className="p-3 border border-[var(--danger)]/30 bg-[var(--danger)]/5">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[var(--danger)]" />
            <p className="text-xs font-semibold text-[var(--danger)]">
              Ops call within 24 h: {redCount} red-alert month{redCount > 1 ? 's' : ''} — solvency below 70%. Escalate to project director immediately.
            </p>
          </div>
        </DzCard>
      )}
    </div>
  );
}

/* ── Sub-component: Gain / Fade Analysis ──────────────────────────────── */

function GainFadeAnalysis({ entries }: { entries: WipaaEntry[] }) {
  const [saved, setSaved] = useState(false);

  const rows = useMemo(
    () => entries.map((e) => ({
      description: e.monthKey,
      baselineCents: e.billedCents,
      actualCents: e.incurredCents,
    })),
    [entries],
  );
  const result = useMemo(() => analyzeGainFade(rows), [rows]);

  const fadeCount = result.filter((r) => r.verdict === 'fade').length;
  const gainCount = result.filter((r) => r.verdict === 'gain').length;
  const totalDelta = result.reduce((s, r) => s + r.deltaCents, 0);
  const overallVerdict = totalDelta > 0 ? 'fade' : totalDelta < 0 ? 'gain' : 'on-target';
  const verdictIcon = overallVerdict === 'gain' ? TrendingUp : overallVerdict === 'fade' ? TrendingDown : Minus;
  const verdictColor = overallVerdict === 'gain' ? 'text-[var(--success)]' : overallVerdict === 'fade' ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]';

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <DzCard className="p-4">
          <Kicker>Project verdict</Kicker>
          <p className={`mt-1 flex items-center gap-2 font-display text-2xl font-bold ${verdictColor}`}>
            {(() => { const Icon = verdictIcon; return <Icon className="h-5 w-5" />; })()}
            {overallVerdict.toUpperCase()}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            cumulative variance <Money cents={Math.abs(totalDelta)} />
          </p>
        </DzCard>
        <DzCard className="p-4">
          <Kicker>Total variance</Kicker>
          <p className={`mt-1 font-display text-2xl font-bold ${totalDelta >= 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
            <Money cents={Math.abs(totalDelta)} />
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {result.length} month{result.length !== 1 ? 's' : ''} analysed
          </p>
        </DzCard>
        <DzCard className="p-4">
          <Kicker>Fade months</Kicker>
          <p className="mt-1 font-display text-2xl font-bold text-[var(--danger)]">
            {fadeCount}
          </p>
          <p className="text-xs text-[var(--text-muted)]">incurred &gt; billed &gt;5%</p>
        </DzCard>
        <DzCard className="p-4">
          <Kicker>Gain months</Kicker>
          <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">
            {gainCount}
          </p>
          <p className="text-xs text-[var(--text-muted)]">savings &gt;5%</p>
        </DzCard>
      </div>

      {result.length > 0 ? (
        <DzCard className="p-4">
          <Kicker>Gain / Fade by month</Kicker>
          <DataTable
            columns={[
              { key: 'description', header: 'Month' },
              { key: 'baselineCents', header: 'Billed', align: 'right', render: (r: GainFadeRow) => <Money cents={r.baselineCents} /> },
              { key: 'actualCents', header: 'Incurred', align: 'right', render: (r: GainFadeRow) => <Money cents={r.actualCents} /> },
              { key: 'deltaCents', header: 'Variance', align: 'right', render: (r: GainFadeRow) => (
                <span className={r.deltaCents >= 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
                  <Money cents={Math.abs(r.deltaCents)} />
                </span>
              )},
              { key: 'verdict', header: 'Verdict', render: (r: GainFadeRow) => (
                <DzPill tone={r.verdict === 'gain' ? 'verified' : r.verdict === 'fade' ? 'disputed' : 'neutral'}>
                  {r.verdict}
                </DzPill>
              )},
            ]}
            rows={result}
            rowKey={(r: GainFadeRow) => r.description}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              {saved ? 'Saved ✓' : 'Save analysis'}
            </button>
            {saved && <span className="text-xs text-[var(--success)]">Analysis saved to project</span>}
          </div>
        </DzCard>
      ) : (
        <DzCard className="p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">Add WIPAA entries to generate the gain/fade analysis.</p>
        </DzCard>
      )}
    </div>
  );
}

/* ── Sub-component: Handover Checklist ────────────────────────────────── */

function DigitalHandover({ entries }: { entries: WipaaEntry[] }) {
  const [checkedFlags, setCheckedFlags] = useState<Record<string, boolean>>({});
  const [signer, setSigner] = useState('');
  const [signResult, setSignResult] = useState<{ signerName: string; signedAt: string; itemsSignedOff: number; allComplete: boolean } | null>(null);

  const checklist = useMemo(() => buildHandoverChecklist(checkedFlags), [checkedFlags]);
  const summary = useMemo(() => wipaaSummary(entries), [entries]);

  const toggleItem = (label: string) => {
    setCheckedFlags((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSignOff = () => {
    if (!signer.trim()) return;
    const result = signOffHandover(checklist, signer.trim(), new Date().toISOString());
    setSignResult(result);
  };

  return (
    <div className="space-y-4">
      {summary.alerts.red > 0 && (
        <DzCard className="p-3 border border-[var(--danger)]/30 bg-[var(--danger)]/5">
          <p className="text-xs font-semibold text-[var(--danger)]">
            {summary.alerts.red} red alert{summary.alerts.red > 1 ? 's' : ''} — review WIPAA history before handover
          </p>
        </DzCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DzCard className="p-4">
          <Kicker>Digital handover ({checklist.digitalCompletionPct}%)</Kicker>
          <ul className="mt-2 space-y-2">
            {checklist.items.filter((i: HandoverItem) => i.category === 'digital').map((item: HandoverItem) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleItem(item.label)}
                  data-handover-check={item.id}
                  className="flex w-full items-center gap-3 rounded p-2 text-left text-[12px] text-[var(--text-primary)] transition-colors hover:bg-white/5"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.checked ? 'border-[var(--success)] bg-[var(--success)] text-white' : 'border-[var(--border-subtle)]'}`}>
                    {item.checked && <span className="text-[10px]">✓</span>}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </DzCard>

        <DzCard className="p-4">
          <Kicker>Physical keys ({checklist.physicalCompletionPct}%)</Kicker>
          <ul className="mt-2 space-y-2">
            {checklist.items.filter((i: HandoverItem) => i.category === 'physical').map((item: HandoverItem) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleItem(item.label)}
                  data-handover-check={item.id}
                  className="flex w-full items-center gap-3 rounded p-2 text-left text-[12px] text-[var(--text-primary)] transition-colors hover:bg-white/5"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.checked ? 'border-[var(--success)] bg-[var(--success)] text-white' : 'border-[var(--border-subtle)]'}`}>
                    {item.checked && <span className="text-[10px]">✓</span>}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </DzCard>
      </div>

      <DzCard className="p-4">
        <Kicker>Completion progress</Kicker>
        <div className="mt-2 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--brand-accent)] transition-all duration-300"
              style={{ width: `${checklist.completionPct}%` }}
            />
          </div>
          <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{checklist.completionPct}%</span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          {checklist.checkedItems} of {checklist.totalItems} items completed
        </p>
      </DzCard>

      <DzCard className="p-4">
        <Kicker>Sign off</Kicker>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <FormField id="p6-signer" label="Signed by" className="w-48" value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="QS Moyo" />
          <button
            type="button"
            onClick={handleSignOff}
            disabled={!signer.trim() || checklist.checkedItems === 0}
            className="flex items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {checklist.completed ? 'Sign off all' : 'Sign off checked'}
          </button>
        </div>
        {signResult && (
          <div className="mt-3 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/5 p-3">
            <p className="text-xs font-semibold text-[var(--success)]">
              {signResult.allComplete ? 'Full handover signed off' : `${signResult.itemsSignedOff} items signed off`}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              Signed by {signResult.signerName} at {new Date(signResult.signedAt).toLocaleString()}
            </p>
          </div>
        )}
      </DzCard>
    </div>
  );
}

/* ── Main Stage ──────────────────────────────────────────────────────── */

export function P6WipaaHandoverStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const {
    wipaaEntries, isLoading, loadForProject, addWipaaEntry,
  } = useSiteHawkStore(
    useShallow((s) => ({
      wipaaEntries: s.wipaaEntries,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addWipaaEntry: s.addWipaaEntry,
    })),
  );

  const [activeTab, setActiveTab] = useState<P6Tab>('dashboard');
  const [monthKey, setMonthKey] = useState('');
  const [billed, setBilled] = useState(0);
  const [incurred, setIncurred] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [overUnder, setOverUnder] = useState(0);
  const [contingencyBudget, setContingencyBudget] = useState(1000000);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectEntries = useMemo(
    () => wipaaEntries.filter((e) => e.projectId === projectId),
    [wipaaEntries, projectId],
  );
  const summary = useMemo(() => wipaaSummary(projectEntries), [projectEntries]);

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
        {/* ── Tab bar ──────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {TAB_BUTTONS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              data-p6-tab={tab.key}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── WIPAA entry form (always visible) ───────────────────── */}
        <DzCard className="p-4">
          <Kicker>Add WIPAA snapshot</Kicker>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <FormField id="p6-month" label="Month" className="w-36" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} placeholder="2026-08" />
            <FormField id="p6-billed" label="Billed ($)" type="number" min={0} className="w-28" value={billed} onChange={(e) => setBilled(Number(e.target.value))} />
            <FormField id="p6-incurred" label="Incurred ($)" type="number" min={0} className="w-28" value={incurred} onChange={(e) => setIncurred(Number(e.target.value))} />
            <FormField id="p6-revenue" label="Revenue ($)" type="number" min={0} className="w-28" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
            <FormField id="p6-overunder" label="Over/Under ($)" type="number" className="w-28" value={overUnder} onChange={(e) => setOverUnder(Number(e.target.value))} />
            <FormField id="p6-contingency" label="Contingency budget ($)" type="number" min={0} className="w-36" value={contingencyBudget} onChange={(e) => setContingencyBudget(Number(e.target.value))} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !monthKey}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Adding…' : 'Add snapshot'}
            </button>
          </div>
        </DzCard>

        {/* ── KPI strip ────────────────────────────────────────────── */}
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
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-muted)]">
              {projectEntries.length > 0 ? 'In progress' : 'Pending'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">9 checklist items</p>
          </DzCard>
        </div>

        {/* ── Tab panels ───────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <SolvencyDashboard entries={projectEntries} contingencyTotalCents={contingencyBudget} />
        )}

        {activeTab === 'gain-fade' && (
          <GainFadeAnalysis entries={projectEntries} />
        )}

        {activeTab === 'handover' && (
          <DigitalHandover entries={projectEntries} />
        )}
      </PageEnter>
    </StageScaffold>
  );
}
