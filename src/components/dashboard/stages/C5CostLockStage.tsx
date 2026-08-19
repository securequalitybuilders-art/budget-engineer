import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Lock, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  dynamicCostBuildUp,
  redPenAudit,
  valueEngineeringSuggestions,
  deriveMilestoneEscrow,
  ZIQS_WBS_TEMPLATE,
} from '@/engine/greenflag/costClarification';
import { RedPenMarker } from '@/components/dzenhare/RedPenMarker';
import { CostBaselineDocument } from '@/components/c5/CostBaselineDocument';
import { BOQLockPanel } from '@/components/c5/BOQLockPanel';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, Kicker, Money, PageEnter } from '@/components/dzenhare';

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100);
}

export function C5CostLockStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const {
    boqItems, costBaselines, ghostMaterials, cashFlow, mustHaves, costAtGlance, contingencyPct,
    isLoading, loadForProject, lockBaseline, setContingencyPct,
  } = useGreenFlagStore(
    useShallow((s) => ({
      boqItems: s.boqItems,
      costBaselines: s.costBaselines,
      ghostMaterials: s.ghostMaterials,
      cashFlow: s.cashFlow,
      mustHaves: s.mustHaves,
      costAtGlance: s.costAtGlance,
      contingencyPct: s.contingencyPct,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      lockBaseline: s.lockBaseline,
      setContingencyPct: s.setContingencyPct,
    })),
  );

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

  // Rate catalogue: derive from the WBS breakdown
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
  const totalLeakageCents = useMemo(() => audit.totalLeakageCents, [audit]);

  const suggestions = useMemo(() => valueEngineeringSuggestions(projectItems), [projectItems]);
  const totalSavings = useMemo(
    () => suggestions.reduce((sum, s) => sum + s.savingCents, 0),
    [suggestions],
  );

  const baseline = useMemo(
    () => costBaselines.find((b) => b.projectId === projectId),
    [costBaselines, projectId],
  );

  const milestoneEscrows = useMemo(
    () => baseline ? deriveMilestoneEscrow(baseline) : [],
    [baseline],
  );

  const ghostTotalCents = useMemo(
    () => ghostMaterials.reduce((s, g) => s + g.ghostCostCents, 0),
    [ghostMaterials],
  );

  const handleLock = useCallback(async () => {
    if (!projectId || busy) return;
    setBusy(true);
    try {
      await lockBaseline(projectId, contingencyPct);
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, contingencyPct, lockBaseline]);

  return (
    <StageScaffold
      stageId="c5-cost-lock"
      icon={Lock}
      empty={!isLoading && projectItems.length === 0}
      emptyTitle="No BOQ items yet"
      emptyMessage="Generate the BOQ (C1) or import cost lines first — C5 tags each item to the ZIQS SMM WBS dictionary, runs the Red Pen audit, detects ghost materials, and locks the Cost Baseline."
    >
      <PageEnter className="space-y-4">
        {/* Top stat cards */}
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
                <>leakage <Money cents={totalLeakageCents} /></>
              ) : (
                'all lines within 15% of catalogue'
              )}
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Ghost materials</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${ghostMaterials.length > 0 ? 'text-amber-400' : 'text-[var(--success)]'}`}>
              {ghostMaterials.length}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {ghostMaterials.length > 0 ? (
                <>undelivered value <Money cents={ghostTotalCents} /></>
              ) : (
                'all materials verified on site'
              )}
            </p>
          </DzCard>
        </div>

        {/* Main grid: WBS + Cost Baseline Document */}
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
            <CostBaselineDocument
              baseline={baseline ?? null}
              costAtGlance={costAtGlance}
              ghostMaterials={ghostMaterials}
            />
          </DzCard>
        </div>

        {/* BOQ Lock Panel with contingency + milestone escrow */}
        <DzCard className="p-4">
          <Kicker>Milestone Escrow Derivation</Kicker>
          <BOQLockPanel
            baseline={baseline ?? null}
            cashFlow={cashFlow}
            milestoneEscrows={milestoneEscrows}
            contingencyPct={contingencyPct}
            onContingencyChange={setContingencyPct}
            onLock={handleLock}
            locked={!!baseline}
          />
        </DzCard>

        {/* Ghost Materials */}
        {ghostMaterials.length > 0 && (
          <DzCard className="p-4">
            <Kicker>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Ghost Materials — {ghostMaterials.length} detected
              </span>
            </Kicker>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              YOUR MATERIALS FULLY TRANSPARENT — these items are billed on the BOQ but not (fully) delivered to site.
            </p>
            <DataTable
              columns={[
                { key: 'wbsCode', header: 'WBS', render: (r) => <span className="font-mono text-xs">{r.wbsCode}</span> },
                { key: 'description', header: 'Material' },
                { key: 'billedQuantity', header: 'Billed', align: 'right', render: (r) => `${r.billedQuantity} ${r.unit}` },
                { key: 'deliveredQuantity', header: 'Delivered', align: 'right', render: (r) => `${r.deliveredQuantity} ${r.unit}` },
                { key: 'ghostQuantity', header: 'Ghost', align: 'right', render: (r) => (
                  <span className="font-semibold text-amber-400">{r.ghostQuantity} {r.unit}</span>
                )},
                { key: 'ghostCostCents', header: 'Cost', align: 'right', render: (r) => (
                  <span className="font-semibold text-amber-400"><Money cents={r.ghostCostCents} /></span>
                )},
                { key: 'severity', header: 'Severity', render: (r) => (
                  <DzPill tone={r.severity === 'total' ? 'disputed' : 'neutral'}>{r.severity}</DzPill>
                )},
              ]}
              rows={ghostMaterials}
              rowKey={(r) => r.id}
              className="mt-2"
            />
          </DzCard>
        )}

        {/* Red Pen audit */}
        {audit.variances.length > 0 && (
          <DzCard className="p-4">
            <Kicker>Red Pen audit — {audit.variances.length} lines checked</Kicker>
            <div className="mt-3 space-y-2">
              {audit.variances.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-steelBlue">{v.wbsCode}</span>
                      <span className="text-[11px] text-[var(--text-secondary)]">{v.description}</span>
                    </div>
                    {v.flagged && (
                      <div className="mt-1">
                        <RedPenMarker
                          original={fmtCents(v.quotedCents)}
                          revised={fmtCents(v.requiredCents)}
                          reason={`${v.description} — quoted above SADC market rate`}
                          variance={`${v.varianceCents > 0 ? '+' : ''}${fmtCents(v.varianceCents)} leakage`}
                          rule="ZIQS SMM · Red Pen audit"
                        >
                          <span className="text-xs">{fmtCents(v.quotedCents)}</span>
                        </RedPenMarker>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      catalogue {fmtCents(v.requiredCents)} · quoted {fmtCents(v.quotedCents)}
                    </span>
                    {v.flagged ? (
                      <DzPill tone="disputed">Leakage</DzPill>
                    ) : (
                      <DzPill tone="verified">OK</DzPill>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px] font-semibold">
              <span className="text-[var(--text-muted)]">Total leakage</span>
              <span className="text-[var(--danger)]"><Money cents={totalLeakageCents} /></span>
            </div>
          </DzCard>
        )}

        {/* Value engineering */}
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
            <div className="mt-3 flex justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px] font-semibold">
              <span className="text-[var(--text-muted)]">Total potential savings</span>
              <span className="text-[var(--success)]"><Money cents={totalSavings} /></span>
            </div>
          </DzCard>
        )}

        {/* Must-Haves tracker */}
        {mustHaves.length > 0 && (
          <DzCard className="p-4">
            <Kicker>My Must-Haves — Budget Allowance vs Actual Cost</Kicker>
            <div className="mt-3 space-y-2">
              {mustHaves.map((mh) => (
                <div key={mh.id} className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[var(--text-primary)]">{mh.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{mh.category}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px]">
                      <span className="text-[var(--text-muted)]">budget: {fmtCents(mh.budgetAllowanceCents)}</span>
                      <span className="text-[var(--text-muted)]">actual: {fmtCents(mh.actualCostCents)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs font-semibold ${mh.status === 'over' ? 'text-[var(--danger)]' : mh.status === 'under' ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                      {mh.varianceCents > 0 ? '+' : ''}{fmtCents(mh.varianceCents)}
                    </span>
                    {mh.status === 'over' && <TrendingUp className="h-3.5 w-3.5 text-[var(--danger)]" />}
                    {mh.status === 'under' && <TrendingDown className="h-3.5 w-3.5 text-[var(--success)]" />}
                    <DzPill tone={mh.status === 'over' ? 'disputed' : mh.status === 'under' ? 'verified' : 'neutral'}>
                      {mh.status}
                    </DzPill>
                  </div>
                </div>
              ))}
            </div>
          </DzCard>
        )}
      </PageEnter>
    </StageScaffold>
  );
}