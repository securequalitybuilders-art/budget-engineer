import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { analyzeVariation, processChangeOrder, REVERSAL_PENALTY_RATE, MAX_PENALTY_PCT } from '@/engine/sitehawk/variationVault';
import type { LensName } from '@/domain/sitehawk';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

const LENS_LABELS: Record<LensName, string> = {
  'red-pen': 'Red Pen',
  'wipaa': 'WIPAA',
  'true-ledger': 'True Ledger',
  'budget-engineer': 'Budget Engineer',
};

export function P5VariationVaultStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { variationPenalties, isLoading, loadForProject } = useSiteHawkStore(
    useShallow((s) => ({
      variationPenalties: s.variationPenalties,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
    })),
  );

  const [title, setTitle] = useState('');
  const [declaredCents, setDeclaredCents] = useState(0);
  const [lensInputs, setLensInputs] = useState<Partial<Record<LensName, number>>>({});
  const [lockedBaselineCents, setLockedBaselineCents] = useState(0);
  const [timelineDeltaDays, setTimelineDeltaDays] = useState(0);
  const [wbsCode, setWbsCode] = useState('');
  const [lastResult, setLastResult] = useState<ReturnType<typeof analyzeVariation> | null>(null);
  const [lastOrder, setLastOrder] = useState<ReturnType<typeof processChangeOrder> | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectPenalties = useMemo(
    () => variationPenalties.filter((p) => p.projectId === projectId),
    [variationPenalties, projectId],
  );

  const totalPenaltyCents = useMemo(
    () => projectPenalties.reduce((sum, p) => sum + p.penaltyCents, 0),
    [projectPenalties],
  );

  const handleAnalyze = useCallback(() => {
    if (!projectId || !title || declaredCents <= 0) return;
    const result = analyzeVariation({
      projectId,
      title,
      lines: [{ description: title, quantity: 1, unit: 'ls', unitCostCents: declaredCents }],
      declaredImpactCents: declaredCents,
      lensInputs,
    });
    setLastResult(result);
    const orderResult = processChangeOrder({
      projectId,
      title,
      lines: [{ description: title, quantity: 1, unit: 'ls', unitCostCents: declaredCents }],
      declaredImpactCents: declaredCents,
      lensInputs,
      lockedBaselineCents,
      timelineDeltaDays,
      wbsCode: wbsCode || undefined,
    });
    setLastOrder(orderResult);
  }, [projectId, title, declaredCents, lensInputs, lockedBaselineCents, timelineDeltaDays, wbsCode]);

  const updateLens = useCallback((lens: LensName, val: string) => {
    setLensInputs((prev) => ({ ...prev, [lens]: val ? Number(val) : undefined }));
  }, []);

  return (
    <StageScaffold
      stageId="p5-variation-vault"
      icon={AlertTriangle}
      empty={!isLoading && projectPenalties.length === 0 && !lastResult}
      emptyTitle="No variations logged"
      emptyMessage="Log change orders and run the 4-lens cost-impact analysis (Red Pen / WIPAA / True Ledger / Budget Engineer) — reversal penalties are capped at 10%."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Variations</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectPenalties.length}</p>
            <p className="text-xs text-[var(--text-muted)]">change orders analysed</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Total penalty</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${totalPenaltyCents > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              <Money cents={totalPenaltyCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">reversal exposure ({MAX_PENALTY_PCT}% cap)</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Penalty rate</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">{Math.round(REVERSAL_PENALTY_RATE * 100)}%</p>
            <p className="text-xs text-[var(--text-muted)]">of declared vs recommended gap</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Reversal risk</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--warning)]">
              {projectPenalties.filter((p) => p.riskFlags.length > 0).length}
            </p>
            <p className="text-xs text-[var(--text-muted)]">lens-flagged lines</p>
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DzCard className="p-4 lg:col-span-2">
            <Kicker>4-lens analysis — run a variation</Kicker>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <FormField id="p5-title" label="Change title" className="w-48" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Extra blockwork" />
              <FormField id="p5-declared" label="Declared ($)" type="number" min={0} className="w-32" value={declaredCents} onChange={(e) => setDeclaredCents(Number(e.target.value))} />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!title || declaredCents <= 0}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                Run 4-lens
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['red-pen', 'wipaa', 'true-ledger', 'budget-engineer'] as LensName[]).map((lens) => (
                <FormField
                  key={lens}
                  id={`p5-lens-${lens}`}
                  label={LENS_LABELS[lens]}
                  type="number"
                  min={0}
                  className="w-full"
                  value={lensInputs[lens] ?? ''}
                  onChange={(e) => updateLens(lens, e.target.value)}
                  placeholder={`Override ${LENS_LABELS[lens]}`}
                />
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <FormField id="p5-baseline" label="Locked baseline ($)" type="number" min={0} className="w-full" value={lockedBaselineCents} onChange={(e) => setLockedBaselineCents(Number(e.target.value))} />
              <FormField id="p5-timeline" label="Timeline delta (days)" type="number" className="w-full" value={timelineDeltaDays} onChange={(e) => setTimelineDeltaDays(Number(e.target.value))} />
              <FormField id="p5-wbs" label="WBS code" className="w-full" value={wbsCode} onChange={(e) => setWbsCode(e.target.value)} placeholder="99.00.00" />
            </div>

            {lastResult && (
              <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Declared: <Money cents={lastResult.declaredImpactCents} /></p>
                  <DzPill tone={lastResult.recommendedCents > lastResult.declaredImpactCents ? 'disputed' : 'verified'}>
                    Recommended: <Money cents={lastResult.recommendedCents} />
                  </DzPill>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Spread: <Money cents={lastResult.spreadCents} /> · Reversal penalty up to{' '}
                  {lastResult.reversalWarning ? lastResult.reversalWarning.split('(')[1]?.split(')')[0] : '0%'}
                </p>
                {lastResult.reversalWarning && (
                  <p className="text-[11px] text-[var(--warning)]">{lastResult.reversalWarning}</p>
                )}
                <DataTable
                  columns={[
                    { key: 'lens', header: 'Lens', render: (r) => <span className="font-semibold text-[var(--text-primary)]">{LENS_LABELS[r.lens]}</span> },
                    { key: 'impactCents', header: 'Impact', align: 'right', render: (r) => <Money cents={r.impactCents} /> },
                    { key: 'penaltyCents', header: 'Penalty', align: 'right', render: (r) => <span className={r.penaltyCents > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}><Money cents={r.penaltyCents} /></span> },
                    { key: 'riskFlags', header: 'Flags', render: (r) => r.riskFlags.length > 0 ? <DzPill tone="disputed">{r.riskFlags.length} flag{r.riskFlags.length > 1 ? 's' : ''}</DzPill> : <DzPill tone="verified">Clean</DzPill> },
                  ]}
                  rows={lastResult.penalties}
                  rowKey={(r) => r.id}
                />
              </div>
            )}
          </DzCard>

          {lastOrder && (
            <DzCard className="p-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <Kicker>Change Order Manager</Kicker>
                <DzPill tone={lastOrder.withinCap ? 'verified' : 'disputed'}>
                  {lastOrder.withinCap ? 'Within cap' : 'Exceeds cap'}
                </DzPill>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-3">
                  <p className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Cost impact</p>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--text-primary)]">
                    <Money cents={lastOrder.newBoqLine.totalCents} />
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{lastOrder.newBoqLine.description}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-3">
                  <p className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Timeline</p>
                  <p className={`mt-1 font-display text-xl font-bold ${lastOrder.timelineDeltaDays > 0 ? 'text-[var(--danger)]' : lastOrder.timelineDeltaDays < 0 ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                    {lastOrder.timelineDeltaDays > 0 ? '+' : ''}{lastOrder.timelineDeltaDays}d
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {lastOrder.timelineDeltaDays !== 0
                      ? lastOrder.timelineDeltaDays > 0 ? 'schedule delay' : 'schedule compression'
                      : 'no change'}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-3">
                  <p className="text-[11px] font-medium uppercase text-[var(--text-muted)]">Reversal penalty</p>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--warning)]">
                    <Money cents={lastOrder.breakdown.totalCents} />
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{MAX_PENALTY_PCT}% cap</p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-3">
                  <p className="text-[11px] font-medium uppercase text-[var(--text-muted)]">True Ledger</p>
                  <p className="mt-1 font-display text-xl font-bold text-[var(--brand-accent)]">{lastOrder.wbsCode}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    revised baseline <Money cents={lastOrder.revisedBaselineCents} />
                  </p>
                </div>
              </div>

              {/* Reversal penalty breakdown */}
              {lastOrder.breakdown.totalCents > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30 p-3">
                  <button
                    type="button"
                    onClick={() => setShowBreakdown((v) => !v)}
                    className="flex w-full items-center gap-2 text-left text-[13px] font-semibold text-[var(--text-primary)]"
                    data-testid="breakdown-toggle"
                  >
                    {showBreakdown ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Reversal penalty breakdown
                    <span className="ml-auto font-mono text-[var(--danger)]"><Money cents={lastOrder.breakdown.totalCents} /></span>
                  </button>
                  {showBreakdown && (
                    <div className="mt-2 space-y-1 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Supplier restocking</span>
                        <span className="font-mono text-[var(--danger)]"><Money cents={lastOrder.breakdown.supplierRestockingCents} /></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Labor reallocation</span>
                        <span className="font-mono text-[var(--danger)]"><Money cents={lastOrder.breakdown.laborReallocationCents} /></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Contractor overhead</span>
                        <span className="font-mono text-[var(--danger)]"><Money cents={lastOrder.breakdown.contractorOverheadCents} /></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              {lastOrder.notifications.length > 0 && (
                <ul className="mt-3 space-y-1" data-testid="co-notifications">
                  {lastOrder.notifications.map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <ShieldCheck size={12} className="mt-0.5 shrink-0 text-[var(--brand-accent)]" />
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </DzCard>
          )}

          <DzCard className="p-4">
            <Kicker>Variation history</Kicker>
            {projectPenalties.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No past variations — run a 4-lens analysis above.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {[...projectPenalties].reverse().slice(0, 8).map((p) => (
                  <li key={p.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{LENS_LABELS[p.lens]}</p>
                      <DzPill tone={p.penaltyCents > 0 ? 'disputed' : 'neutral'}>
                        <Money cents={p.penaltyCents} />
                      </DzPill>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      impact <Money cents={p.impactCents} /> · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                    {p.riskFlags.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-[var(--warning)]">{p.riskFlags[0]}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DzCard>
        </div>
      </PageEnter>
    </StageScaffold>
  );
}
