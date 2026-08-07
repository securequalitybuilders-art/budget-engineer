import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCloseoutStore } from '@/stores/closeoutStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { db } from '@/db/db';
import { scheduleOfValuesFromMilestones, scheduleOfValuesFromBoq, sovTotals, sovReleasedCents } from '@/engine/closeout/scheduleOfValues';
import { prepareFinalAccount, createLienWaiver, acknowledgeLienWaiver } from '@/engine/closeout/financialCloseout';
import { analyzeGainFade } from '@/engine/closeout/gainFade';
import { seedHistoricalCosts, romEstimate } from '@/engine/closeout/historicalCost';
import { summarizeLessons, lessonSeverityLabel } from '@/engine/closeout/lessonsLearned';
import type { LessonCategory, LessonSeverity, LienWaiver } from '@/domain/closeout';
import { FileText, Wallet, TrendingUp, History, BookOpen, Plus, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CloseoutPanelProps {
  projectId: string;
}

type TabId = 'sov' | 'financial' | 'gainfade' | 'historical' | 'lessons';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'sov', label: 'Schedule of Values', icon: <FileText size={14} /> },
  { id: 'financial', label: 'Financial Closeout', icon: <Wallet size={14} /> },
  { id: 'gainfade', label: 'Gain / Fade', icon: <TrendingUp size={14} /> },
  { id: 'historical', label: 'ROM & Historical', icon: <History size={14} /> },
  { id: 'lessons', label: 'Lessons Learned', icon: <BookOpen size={14} /> },
];

const STATUS_COLORS: Record<string, string> = {
  'balance-due': 'bg-amber-500/20 text-amber-400',
  settled: 'bg-emerald-500/20 text-emerald-400',
  overpaid: 'bg-rose-500/20 text-rose-400',
};

function fmtCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tone ?? 'bg-slate-50'}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}

const CATEGORIES: LessonCategory[] = ['cost', 'schedule', 'quality', 'safety', 'procurement', 'design', 'process'];
const SEVERITIES: LessonSeverity[] = ['low', 'medium', 'high'];

export function CloseoutPanel({ projectId }: CloseoutPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('sov');
  const store = useCloseoutStore(useShallow((s) => ({
    sovs: s.sovs,
    finalAccounts: s.finalAccounts,
    lienWaivers: s.lienWaivers,
    gainFades: s.gainFades,
    historicalCosts: s.historicalCosts,
    lessons: s.lessons,
    setScheduleOfValues: s.setScheduleOfValues,
    setFinalAccount: s.setFinalAccount,
    setLienWaiver: s.setLienWaiver,
    setGainFade: s.setGainFade,
    addHistoricalCost: s.addHistoricalCost,
    addLesson: s.addLesson,
  })));
  const milestones = useMilestoneStore((s) => s.milestones);

  const sov = store.sovs.find((s) => s.projectId === projectId);
  const account = store.finalAccounts.find((a) => a.projectId === projectId);
  const waivers = store.lienWaivers.filter((w) => w.projectId === projectId);
  const projectCosts = store.historicalCosts.filter((c) => c.projectId === projectId);

  const [actualByCode, setActualByCode] = useState<Record<string, string>>({});
  const [prevSovId, setPrevSovId] = useState<string | null>(null);
  if (sov && sov.id !== prevSovId) {
    setPrevSovId(sov.id);
    const init: Record<string, string> = {};
    for (const l of sov.lines) init[l.code] = '0';
    setActualByCode(init);
  }
  const [finInput, setFinInput] = useState({
    contractValueCents: 0,
    approvedVariationsCents: 0,
    paymentsToDateCents: 0,
    retentionHeldCents: 0,
    retentionReleasePct: 50,
    defectsLiabilityExpired: false,
  });
  const [lessonForm, setLessonForm] = useState({ category: 'cost' as LessonCategory, severity: 'medium' as LessonSeverity, title: '', description: '', recommendation: '' });
  const [rom, setRom] = useState({ description: '', areaM2: '', region: 'Zimbabwe', category: '' });
  const [costForm, setCostForm] = useState({ description: '', category: 'construction', region: 'Zimbabwe', areaM2: '', totalCostCents: '' });
  const [waiverNote, setWaiverNote] = useState('');

  const releasedIds = useMemo(
    () => milestones.filter((m) => m.releaseState === 'released').map((m) => m.id),
    [milestones],
  );

  const sovMeta = sov ? sovTotals(sov) : null;
  const releasedSov = sov ? sovReleasedCents(sov, releasedIds) : 0;

  const contractValue = finInput.contractValueCents || sov?.contractValueCents || 0;

  const buildSovFromMilestones = async () => {
    const built = scheduleOfValuesFromMilestones(projectId, milestones, finInput.contractValueCents || undefined);
    await store.setScheduleOfValues(built);
  };

  const buildSovFromBoq = async () => {
    const boqs = await db.boqs.where({ projectId }).toArray();
    const boq = boqs[boqs.length - 1];
    if (boq) {
      const built = scheduleOfValuesFromBoq(projectId, boq, finInput.contractValueCents || undefined);
      await store.setScheduleOfValues(built);
    }
  };

  const computeAccount = () => {
    const result = prepareFinalAccount({ projectId, ...finInput, contractValueCents: contractValue });
    void store.setFinalAccount(result);
  };

  const issueWaiver = async (scope: 'partial' | 'final') => {
    const waiver = createLienWaiver(projectId, 'General Contractor', scope, account?.balanceDueCents ?? 0);
    await store.setLienWaiver(waiver);
  };

  const ackWaiver = async (w: LienWaiver) => {
    await store.setLienWaiver(acknowledgeLienWaiver(w, waiverNote || 'Owner'));
  };

  const liveGainFade = sov
    ? analyzeGainFade(
        projectId,
        sov.lines.map((l) => ({ code: l.code, description: l.description, bidCents: l.amountCents })),
        sov.lines.map((l) => ({ code: l.code, actualCents: Number(actualByCode[l.code] ?? 0) })),
      )
    : null;

  const saveGainFade = async () => {
    if (liveGainFade) await store.setGainFade(liveGainFade);
  };

  const romResult = useMemo(
    () => romEstimate([...seedHistoricalCosts(), ...store.historicalCosts], {
      description: rom.description || 'New build',
      areaM2: Number(rom.areaM2) || 0,
      region: rom.region,
      category: rom.category || undefined,
    }),
    [rom.areaM2, rom.region, rom.category, rom.description, store.historicalCosts],
  );

  const logCostRecord = async () => {
    const areaM2 = Number(costForm.areaM2) || 0
    const totalCostCents = Number(costForm.totalCostCents) || 0
    await store.addHistoricalCost({
      id: crypto.randomUUID(),
      projectId,
      description: costForm.description || 'Logged project actual',
      category: costForm.category,
      region: costForm.region,
      areaM2,
      totalCostCents,
      costPerM2Cents: areaM2 > 0 ? Math.round(totalCostCents / areaM2) : 0,
      completedAt: new Date().toISOString(),
    });
    setCostForm({ description: '', category: 'construction', region: 'Zimbabwe', areaM2: '', totalCostCents: '' });
  };

  const submitLesson = async () => {
    await store.addLesson({
      id: crypto.randomUUID(),
      projectId,
      category: lessonForm.category,
      severity: lessonForm.severity,
      title: lessonForm.title,
      description: lessonForm.description,
      recommendation: lessonForm.recommendation,
      createdAt: new Date().toISOString(),
    });
    setLessonForm({ category: 'cost', severity: 'medium', title: '', description: '', recommendation: '' });
  };

  const lessonSummary = summarizeLessons(store.lessons);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-[var(--brand-accent)] text-slate-900'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'sov' && (
        <div className="flex flex-col gap-3">
          {!sov ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-default)] p-8 text-center">
              <FileText size={28} className="text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-secondary)]">No Schedule of Values yet. Build one from your milestones or the project BOQ.</p>
              <div className="flex gap-2">
                <button onClick={buildSovFromMilestones} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-slate-900">
                  <Plus size={14} /> Build from milestones
                </button>
                <button onClick={buildSovFromBoq} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  <Plus size={14} /> Build from BOQ
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Schedule of Values · {sov.lines.length} lines</h3>
                <button onClick={buildSovFromMilestones} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <RefreshCw size={14} /> Rebuild
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Contract value" value={fmtCents(sovMeta?.contractValueCents ?? 0)} />
                <StatCard label="Allocated" value={fmtCents(sovMeta?.allocatedCents ?? 0)} tone="bg-emerald-50" />
                <StatCard label="Released" value={fmtCents(releasedSov)} tone="bg-sky-50" />
              </div>
              {sovMeta && !sovMeta.fullyAllocated && (
                <p className="text-xs text-amber-400">Unallocated: {fmtCents(sovMeta.unallocatedCents)} — add change orders or rebalance lines.</p>
              )}
              <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 text-right font-medium">Weight</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {sov.lines.map((l) => {
                      const released = l.linkedMilestoneIds.some((id) => releasedIds.includes(id));
                      return (
                        <tr key={l.id} className="text-[var(--text-secondary)]">
                          <td className="px-3 py-2 font-mono">{l.code}</td>
                          <td className="px-3 py-2">
                            {l.description}
                            {released && <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-400">released</span>}
                          </td>
                          <td className="px-3 py-2">{l.category}</td>
                          <td className="px-3 py-2 text-right">{l.weightPct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right">{fmtCents(l.amountCents)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-default)] p-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Contract value (cents)
              <input type="number" value={finInput.contractValueCents} onChange={(e) => setFinInput((f) => ({ ...f, contractValueCents: Number(e.target.value) }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-[var(--text-primary)]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Approved variations (cents)
              <input type="number" value={finInput.approvedVariationsCents} onChange={(e) => setFinInput((f) => ({ ...f, approvedVariationsCents: Number(e.target.value) }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-[var(--text-primary)]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Payments to date (cents)
              <input type="number" value={finInput.paymentsToDateCents} onChange={(e) => setFinInput((f) => ({ ...f, paymentsToDateCents: Number(e.target.value) }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-[var(--text-primary)]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Retention held (cents)
              <input type="number" value={finInput.retentionHeldCents} onChange={(e) => setFinInput((f) => ({ ...f, retentionHeldCents: Number(e.target.value) }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-[var(--text-primary)]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
              Retention release at PC (%)
              <input type="number" value={finInput.retentionReleasePct} onChange={(e) => setFinInput((f) => ({ ...f, retentionReleasePct: Number(e.target.value) }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-[var(--text-primary)]" />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input type="checkbox" checked={finInput.defectsLiabilityExpired} onChange={(e) => setFinInput((f) => ({ ...f, defectsLiabilityExpired: e.target.checked }))} />
              Defects liability expired
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={computeAccount} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-slate-900">
              <CheckCircle2 size={14} /> Compute final account
            </button>
            <button onClick={() => issueWaiver('partial')} className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
              Issue partial lien waiver
            </button>
            <button onClick={() => issueWaiver('final')} className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
              Issue final lien waiver
            </button>
          </div>

          {account && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <StatCard label="Gross value" value={fmtCents(account.grossValueCents)} />
                <StatCard label="Retention releasable" value={fmtCents(account.retentionReleasableCents)} tone="bg-sky-50" />
                <StatCard label="Retention withheld" value={fmtCents(account.retentionWithheldCents)} tone="bg-amber-50" />
                <div className="rounded-lg px-3 py-2 bg-rose-50">
                  <div className="text-xs text-slate-400">Balance due</div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    {fmtCents(account.balanceDueCents)}
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${STATUS_COLORS[account.status]}`}>{account.status.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {waivers.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-[var(--brand-accent)]" />
                      {w.scope} lien waiver · {fmtCents(w.amountCents)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">{w.status}{w.acknowledgedBy ? ` by ${w.acknowledgedBy}` : ''}</span>
                      {w.status === 'issued' && (
                        <>
                          <input
                            value={waiverNote}
                            onChange={(e) => setWaiverNote(e.target.value)}
                            placeholder="Acknowledged by"
                            className="w-32 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-0.5"
                          />
                          <button onClick={() => ackWaiver(w)} className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">Acknowledge</button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
                {waivers.length === 0 && <p className="text-xs text-[var(--text-muted)]">No lien waivers issued yet.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'gainfade' && (
        <div className="flex flex-col gap-4">
          {!sov ? (
            <p className="text-sm text-[var(--text-secondary)]">Build a Schedule of Values first to run Gain / Fade analysis.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bid vs actual · per SOV line</h3>
                <button onClick={saveGainFade} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-slate-900">
                  <CheckCircle2 size={14} /> Save analysis
                </button>
              </div>
              {liveGainFade && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <StatCard label="Bid total" value={fmtCents(liveGainFade.bidTotalCents)} />
                  <StatCard label="Actual total" value={fmtCents(liveGainFade.actualTotalCents)} />
                  <StatCard label="Variance" value={`${fmtCents(liveGainFade.varianceCents)} (${liveGainFade.variancePct.toFixed(1)}%)`} tone={liveGainFade.varianceCents > 0 ? 'bg-rose-50' : 'bg-emerald-50'} />
                  <div className="rounded-lg px-3 py-2 bg-slate-50">
                    <div className="text-xs text-slate-400">Verdict</div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      {liveGainFade.verdict}
                      <span className="text-[9px] text-slate-400">{liveGainFade.gains} gain · {liveGainFade.fades} fade</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Line</th>
                      <th className="px-3 py-2 text-right font-medium">Bid</th>
                      <th className="px-3 py-2 text-right font-medium">Actual</th>
                      <th className="px-3 py-2 text-right font-medium">Variance %</th>
                      <th className="px-3 py-2 text-right font-medium">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {liveGainFade?.lines.map((l) => (
                      <tr key={l.code} className="text-[var(--text-secondary)]">
                        <td className="px-3 py-2">{l.code} · {l.description}</td>
                        <td className="px-3 py-2 text-right">{fmtCents(l.bidCents)}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={actualByCode[l.code] ?? '0'}
                            onChange={(e) => setActualByCode((a) => ({ ...a, [l.code]: e.target.value }))}
                            className="w-28 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-right"
                          />
                        </td>
                        <td className={`px-3 py-2 text-right ${l.varianceCents > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{l.variancePct.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">{l.verdict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'historical' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">ROM estimate from historical costs</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                Description
                <input value={rom.description} onChange={(e) => setRom((r) => ({ ...r, description: e.target.value }))} placeholder="e.g. Double-storey family home" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                Area (m²)
                <input type="number" value={rom.areaM2} onChange={(e) => setRom((r) => ({ ...r, areaM2: e.target.value }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                Region
                <input value={rom.region} onChange={(e) => setRom((r) => ({ ...r, region: e.target.value }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5" />
              </label>
            </div>
            {romResult && (
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Best" value={fmtCents(romResult.bestCents)} />
                <StatCard label="Range low" value={fmtCents(romResult.rangeLowCents)} tone="bg-sky-50" />
                <StatCard label="Range high" value={fmtCents(romResult.rangeHighCents)} tone="bg-amber-50" />
              </div>
            )}
            {romResult && (
              <p className="text-xs text-[var(--text-muted)]">
                {fmtCents(romResult.bestPerM2Cents)}/m² · {romResult.matchedRecords} matched records · confidence {romResult.confidence}
              </p>
            )}
            <div className="rounded-xl border border-[var(--border-default)] p-3">
              <h4 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Log this project's actual cost</h4>
              <div className="grid grid-cols-2 gap-2">
                <input value={costForm.description} onChange={(e) => setCostForm((c) => ({ ...c, description: e.target.value }))} placeholder="Description" className="col-span-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
                <input value={costForm.category} onChange={(e) => setCostForm((c) => ({ ...c, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
                <input value={costForm.region} onChange={(e) => setCostForm((c) => ({ ...c, region: e.target.value }))} placeholder="Region" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
                <input type="number" value={costForm.areaM2} onChange={(e) => setCostForm((c) => ({ ...c, areaM2: e.target.value }))} placeholder="Area m²" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
                <input type="number" value={costForm.totalCostCents} onChange={(e) => setCostForm((c) => ({ ...c, totalCostCents: e.target.value }))} placeholder="Total cost (cents)" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
              </div>
              <button onClick={logCostRecord} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                <Plus size={14} /> Log record
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Historical cost database</h3>
            {projectCosts.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">No logged records yet — the ROM estimator falls back to the seeded regional benchmark pool.</p>
            )}
            <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Region</th>
                    <th className="px-3 py-2 text-right font-medium">m²</th>
                    <th className="px-3 py-2 text-right font-medium">Cost/m²</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {[...seedHistoricalCosts(), ...projectCosts].map((r) => (
                    <tr key={r.id} className="text-[var(--text-secondary)]">
                      <td className="px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">{r.region}</td>
                      <td className="px-3 py-2 text-right">{r.areaM2}</td>
                      <td className="px-3 py-2 text-right">{fmtCents(r.costPerM2Cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-default)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Capture a lesson</h3>
            <div className="flex gap-2">
              <select value={lessonForm.category} onChange={(e) => setLessonForm((l) => ({ ...l, category: e.target.value as LessonCategory }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={lessonForm.severity} onChange={(e) => setLessonForm((l) => ({ ...l, severity: e.target.value as LessonSeverity }))} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs">
                {SEVERITIES.map((s) => <option key={s} value={s}>{lessonSeverityLabel(s)}</option>)}
              </select>
            </div>
            <input value={lessonForm.title} onChange={(e) => setLessonForm((l) => ({ ...l, title: e.target.value }))} placeholder="Title" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
            <textarea value={lessonForm.description} onChange={(e) => setLessonForm((l) => ({ ...l, description: e.target.value }))} placeholder="What happened" rows={2} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
            <textarea value={lessonForm.recommendation} onChange={(e) => setLessonForm((l) => ({ ...l, recommendation: e.target.value }))} placeholder="Recommendation for next project" rows={2} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs" />
            <button onClick={submitLesson} className="flex items-center gap-1.5 self-start rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-slate-900">
              <Plus size={14} /> Save lesson
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lessons log</h3>
              <span className="text-xs text-[var(--text-muted)]">{lessonSummary.total} total · {lessonSummary.highSeverity} high severity · top: {lessonSummary.topCategories.join(', ') || '—'}</span>
            </div>
            {store.lessons.length === 0 && <p className="text-xs text-[var(--text-muted)]">No lessons captured yet.</p>}
            <div className="flex flex-col gap-2">
              {store.lessons.map((l) => (
                <div key={l.id} className="rounded-xl border border-[var(--border-default)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{l.title}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)]">{l.category}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] ${l.severity === 'high' ? 'bg-rose-500/20 text-rose-400' : l.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{l.severity}</span>
                    </span>
                  </div>
                  {l.description && <p className="mt-1 text-xs text-[var(--text-secondary)]">{l.description}</p>}
                  {l.recommendation && <p className="mt-1 text-xs text-[var(--brand-accent)]">Recommendation: {l.recommendation}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
