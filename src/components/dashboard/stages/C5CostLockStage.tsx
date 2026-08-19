import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Lock } from 'lucide-react';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  dynamicCostBuildUp,
  redPenAudit,
  valueEngineeringSuggestions,
  ZIQS_WBS_TEMPLATE,
} from '@/engine/greenflag/costClarification';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

export function C5CostLockStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { boqItems, costBaselines, isLoading, loadForProject, lockBaseline } = useGreenFlagStore(
    useShallow((s) => ({
      boqItems: s.boqItems,
      costBaselines: s.costBaselines,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      lockBaseline: s.lockBaseline,
    })),
  );

  const [contingencyPct, setContingencyPct] = useState(9);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectItems = useMemo(
    () => boqItems.filter((i) => i.projectId === projectId),
    [boqItems, projectId],
  );

  const wbsBreakdown = useMemo(() => dynamicCostBuildUp(projectItems), [projectItems]);

  const directCostCents = useMemo(
    () => projectItems.reduce((sum, l) => sum + l.totalCents, 0),
    [projectItems],
  );

  const contingencyCents = useMemo(
    () => Math.round(directCostCents * (contingencyPct / 100)),
    [directCostCents, contingencyPct],
  );

  // Rate catalogue: derive from the SADC market rate catalogue (simplified for the stage)
  const rateCatalogue = useMemo(
    () =>
      wbsBreakdown.map((w) => ({
        description: w.name,
        rateCents: w.costCents > 0 ? Math.round(w.costCents / Math.max(projectItems.filter((p) => p.wbsCode === w.code).reduce((s, p) => s + p.quantity, 0), 1)) : 0,
      })),
    [wbsBreakdown, projectItems],
  );

  const audit = useMemo(() => redPenAudit(projectItems, rateCatalogue), [projectItems, rateCatalogue]);
  const flaggedCount = useMemo(() => audit.variances.filter((v) => v.flagged).length, [audit]);

  const suggestions = useMemo(() => valueEngineeringSuggestions(projectItems), [projectItems]);
  const totalSavings = useMemo(
    () => suggestions.reduce((sum, s) => sum + s.savingCents, 0),
    [suggestions],
  );

  const baseline = useMemo(
    () => costBaselines.find((b) => b.projectId === projectId),
    [costBaselines, projectId],
  );

  const handleLock = useCallback(async () => {
    if (!projectId || busy) return;
    setBusy(true);
    try {
      await lockBaseline(projectId, contingencyCents);
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, contingencyCents, lockBaseline]);

  return (
    <StageScaffold
      stageId="c5-cost-lock"
      icon={Lock}
      empty={!isLoading && projectItems.length === 0}
      emptyTitle="No BOQ items yet"
      emptyMessage="Generate the BOQ (C1) or import cost lines first — C5 tags each item to the ZIQS SMM WBS dictionary, runs the Red Pen audit, and locks the Cost Baseline with 9% contingency."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>BOQ lines</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectItems.length}</p>
            <p className="text-xs text-[var(--text-muted)]">tagged to {ZIQS_WBS_TEMPLATE.length} WBS codes</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Direct cost</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">
              <Money cents={directCostCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">before contingency</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Red Pen flags</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${flaggedCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {flaggedCount}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {flaggedCount > 0 ? (
                <>leakage <Money cents={audit.totalLeakageCents} /></>
              ) : (
                'all lines within 15% of catalogue'
              )}
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Value engineering</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">
              <Money cents={totalSavings} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">{suggestions.length} suggestions via group-buy</p>
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DzCard className="p-4 lg:col-span-2">
            <Kicker>WBS cost breakdown (ZIQS SMM)</Kicker>
            <DataTable
              columns={[
                { key: 'code', header: 'WBS', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
                { key: 'name', header: 'Description' },
                { key: 'category', header: 'Category' },
                { key: 'costCents', header: 'Cost', align: 'right', render: (r) => <Money cents={r.costCents} /> },
              ]}
              rows={wbsBreakdown}
              rowKey={(r) => r.code}
              className="mt-2"
            />
          </DzCard>

          <DzCard className="p-4">
            <Kicker>Lock Cost Baseline</Kicker>
            {baseline ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <DzPill tone="verified">Locked</DzPill>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(baseline.lockedAt ?? '').toLocaleDateString()}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Direct cost</span>
                    <Money cents={baseline.totalCents - baseline.contingencyCents} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Contingency ({baseline.contingencyPct}%)</span>
                    <Money cents={baseline.contingencyCents} />
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-1.5 flex justify-between text-sm font-semibold">
                    <span className="text-[var(--text-primary)]">Total</span>
                    <Money cents={baseline.totalCents} />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {baseline.lines.length} lines · region {baseline.region}
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <FormField
                  id="c5-contingency"
                  label={`Contingency %`}
                  type="number"
                  min={0}
                  max={25}
                  step={0.5}
                  value={contingencyPct}
                  onChange={(e) => setContingencyPct(Number(e.target.value))}
                />
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Direct cost</span>
                    <Money cents={directCostCents} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Contingency ({contingencyPct}%)</span>
                    <Money cents={contingencyCents} />
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-1.5 flex justify-between text-sm font-semibold">
                    <span className="text-[var(--text-primary)]">Total</span>
                    <Money cents={directCostCents + contingencyCents} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLock}
                  disabled={busy || projectItems.length === 0}
                  className="w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? 'Locking…' : 'Lock Cost Baseline'}
                </button>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Locking freezes the BOQ snapshot. Changes after lock appear as change orders.
                </p>
              </div>
            )}
          </DzCard>
        </div>

        {audit.variances.length > 0 && (
          <DzCard className="p-4">
            <Kicker>Red Pen audit — {audit.variances.length} lines checked</Kicker>
            <DataTable
              columns={[
                { key: 'wbsCode', header: 'WBS', render: (r) => <span className="font-mono text-xs">{r.wbsCode}</span> },
                { key: 'description', header: 'Item' },
                { key: 'requiredCents', header: 'Catalogue', align: 'right', render: (r) => <Money cents={r.requiredCents} /> },
                { key: 'quotedCents', header: 'Quoted', align: 'right', render: (r) => <Money cents={r.quotedCents} /> },
                {
                  key: 'varianceCents',
                  header: 'Variance',
                  align: 'right',
                  render: (r) => (
                    <span className={r.flagged ? 'font-semibold text-[var(--danger)]' : 'text-[var(--text-muted)]'}>
                      {r.varianceCents > 0 ? '+' : ''}<Money cents={r.varianceCents} />
                    </span>
                  ),
                },
                {
                  key: 'flagged',
                  header: 'Status',
                  render: (r) =>
                    r.flagged ? (
                      <DzPill tone="disputed">Leakage</DzPill>
                    ) : (
                      <DzPill tone="verified">OK</DzPill>
                    ),
                },
              ]}
              rows={audit.variances}
              rowKey={(r) => `${r.wbsCode}-${r.description}`}
              className="mt-2"
            />
          </DzCard>
        )}

        {suggestions.length > 0 && (
          <DzCard className="p-4">
            <Kicker>Value engineering suggestions</Kicker>
            <DataTable
              columns={[
                { key: 'wbsCode', header: 'WBS', render: (r) => <span className="font-mono text-xs">{r.wbsCode}</span> },
                { key: 'description', header: 'Item' },
                { key: 'currentCents', header: 'Current', align: 'right', render: (r) => <Money cents={r.currentCents} /> },
                { key: 'suggestedCents', header: 'Suggested', align: 'right', render: (r) => <Money cents={r.suggestedCents} /> },
                {
                  key: 'savingCents',
                  header: 'Saving',
                  align: 'right',
                  render: (r) => <span className="font-semibold text-[var(--success)]"><Money cents={r.savingCents} /></span>,
                },
              ]}
              rows={suggestions}
              rowKey={(r) => `${r.wbsCode}-${r.description}`}
              className="mt-2"
            />
          </DzCard>
        )}
      </PageEnter>
    </StageScaffold>
  );
}
