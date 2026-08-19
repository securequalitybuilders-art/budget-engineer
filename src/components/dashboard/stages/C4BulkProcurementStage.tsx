import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ShoppingCart,
  ShieldCheck,
  Target,
  TrendingUp,
  Send,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  valueDrivenQuote,
  commitmentTotals,
  buildDemandRadarDualView,
  type QuoteInput,
  type DemandRadarProjectEntry,
} from '@/engine/greenflag/bulkProcurement';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

/* -------------------------------------------------------------------------- */
/*  Mock data for demand radar (anonymized cross-project demand)               */
/* -------------------------------------------------------------------------- */

const MOCK_PROJECT_ENTRIES: DemandRadarProjectEntry[] = [
  { projectId: 'proj-1', projectName: 'Residential Harare', material: 'Cement 50kg', unit: 'bag', quantity: 300, neededBy: '2026-09-15', priority: 'high' },
  { projectId: 'proj-2', projectName: 'Commercial Gweru', material: 'Cement 50kg', unit: 'bag', quantity: 500, neededBy: '2026-10-01', priority: 'high' },
  { projectId: 'proj-3', projectName: 'School Mutare', material: 'Face Bricks', unit: 'each', quantity: 8000, neededBy: '2026-10-15', priority: 'medium' },
  { projectId: 'proj-1', projectName: 'Residential Harare', material: 'Face Bricks', unit: 'each', quantity: 500, neededBy: '2026-09-30', priority: 'medium' },
  { projectId: 'proj-4', projectName: 'Warehouse Bulawayo', material: 'IBR Roofing Sheets', unit: 'sheet', quantity: 120, neededBy: '2026-11-01', priority: 'low' },
];

/* -------------------------------------------------------------------------- */
/*  TCO Comparison Table                                                       */
/* -------------------------------------------------------------------------- */

function TcoComparisonTable({ scoringRows }: { scoringRows: ReturnType<typeof valueDrivenQuote>['scoringRows'] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (scoringRows.length === 0) return null;

  return (
    <DzCard className="p-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-[var(--brand-accent)]" />
        <Kicker>TCO Comparison Table — Top {scoringRows.length} suppliers ranked by Total Cost of Ownership</Kicker>
      </div>
      <div className="mt-3 space-y-2">
        {scoringRows.map((sr) => {
          const isBest = sr.tcoRow.rank === 1;
          const isExpanded = expandedId === sr.tcoRow.id;
          return (
            <div
              key={sr.tcoRow.id}
              className={`rounded-lg border p-3 transition-all ${
                isBest
                  ? 'border-[var(--brand-accent)]/50 bg-[var(--brand-primary)]/5'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isBest ? 'bg-[var(--brand-accent)] text-[var(--brand-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                    }`}
                  >
                    #{sr.tcoRow.rank}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{sr.tcoRow.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{sr.explanation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Price</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]"><Money cents={sr.tcoRow.input.priceCents} /></p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">TCO</p>
                    <p className={`text-sm font-bold ${isBest ? 'text-emerald-600' : 'text-[var(--text-primary)]'}`}>
                      <Money cents={sr.tcoRow.result.totalCostCents} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Score</p>
                    <p className="text-sm font-bold text-[var(--brand-accent)]">{sr.tcoScore}/100</p>
                  </div>
                  {isBest && <DzPill tone="verified">Rank #1</DzPill>}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : sr.tcoRow.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-primary)]/50 p-3 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-[var(--text-muted)]">Unit price</p>
                    <p className="font-semibold text-[var(--text-primary)]"><Money cents={sr.tcoRow.input.priceCents} /></p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Freight</p>
                    <p className="font-semibold text-[var(--text-primary)]"><Money cents={sr.tcoRow.input.freightCents} /></p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Downtime cost</p>
                    <p className="font-semibold text-[var(--text-primary)]"><Money cents={sr.tcoRow.result.downtimeCostCents} /></p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Defect cost</p>
                    <p className="font-semibold text-[var(--text-primary)]"><Money cents={sr.tcoRow.result.defectCostCents} /></p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Reliability bonus</p>
                    <p className="font-semibold text-emerald-600">-{sr.reliabilityBonusCents > 0 ? `$${(sr.reliabilityBonusCents / 100).toFixed(0)}` : '$0'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Defect penalty</p>
                    <p className="font-semibold text-rose-600">+{sr.defectPenaltyCents > 0 ? `$${(sr.defectPenaltyCents / 100).toFixed(0)}` : '$0'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">On-time</p>
                    <p className="font-semibold text-[var(--text-primary)]">{sr.tcoRow.input.onTimeDeliveryPct}%</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Defect rate</p>
                    <p className="font-semibold text-[var(--text-primary)]">{sr.tcoRow.input.defectRatePct}%</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DzCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Value-Driven Quoting Tool                                                  */
/* -------------------------------------------------------------------------- */

function ValueDrivenQuotingTool({
  quotes,
  quantity,
  onQuantityChange,
  onCommit,
  busy,
  bestName,
  scoringRows,
}: {
  quotes: QuoteInput[];
  quantity: number;
  onQuantityChange: (n: number) => void;
  onCommit: () => void;
  busy: boolean;
  bestName: string | null;
  scoringRows: ReturnType<typeof valueDrivenQuote>['scoringRows'];
}) {
  return (
    <DzCard className="p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--brand-accent)]" />
        <Kicker>Value-Driven Quoting Tool — TCO-enabled</Kicker>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <FormField
          id="c4-material"
          label="Material"
          className="w-48"
          value={quotes[0]?.material ?? ''}
          disabled
        />
        <FormField
          id="c4-qty"
          label="Quantity"
          type="number"
          min={1}
          className="w-32"
          value={quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
        />
        <button
          type="button"
          onClick={onCommit}
          disabled={busy || !bestName}
          className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Locking…' : 'Lock forward commitment'}
        </button>
      </div>
      {bestName && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>
            Best value: <span className="font-semibold text-[var(--text-primary)]">{bestName}</span> — see TCO table below
          </span>
        </div>
      )}
      {scoringRows.length > 0 && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {scoringRows.length} suppliers compared on TCO (price + freight + downtime + defect). "5% higher but 99% on-time saves $X downtime" saves real money.
        </p>
      )}
    </DzCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Demand Radar dual view                                                     */
/* -------------------------------------------------------------------------- */

function DemandRadarDualView({ view }: { view: ReturnType<typeof buildDemandRadarDualView> }) {
  const [mode, setMode] = useState<'aggregate' | 'project'>('aggregate');

  return (
    <DzCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--brand-accent)]" />
          <Kicker>Demand Radar — Dual View</Kicker>
        </div>
        <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 p-0.5">
          <button
            type="button"
            onClick={() => setMode('aggregate')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              mode === 'aggregate' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Aggregate
          </button>
          <button
            type="button"
            onClick={() => setMode('project')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              mode === 'project' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            By Project
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-[var(--bg-tertiary)]/30 p-2">
          <p className="text-lg font-bold text-[var(--text-primary)]">{view.totalDemandUnits.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-muted)]">Total demand units</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)]/30 p-2">
          <p className="text-lg font-bold text-[var(--text-primary)]">{view.uniqueMaterials}</p>
          <p className="text-[11px] text-[var(--text-muted)]">Unique materials</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)]/30 p-2">
          <p className="text-lg font-bold text-[var(--brand-accent)]">{view.crossProjectMaterials.length}</p>
          <p className="text-[11px] text-[var(--text-muted)]">Cross-project materials</p>
        </div>
      </div>
      {mode === 'aggregate' ? (
        <DataTable
          columns={[
            { key: 'label', header: 'Material' },
            { key: 'quantity', header: 'Quantity', align: 'right', render: (r) => `${r.quantity.toLocaleString()} ${r.unit}` },
            { key: 'projectCount', header: 'Projects', align: 'right', render: (r) => r.projectCount },
            { key: 'totalCostCents', header: 'Value', align: 'right', render: (r) => <Money cents={r.totalCostCents} /> },
          ]}
          rows={view.aggregate}
          rowKey={(r) => r.key}
          className="mt-3"
        />
      ) : (
        <DataTable
          columns={[
            { key: 'material', header: 'Material' },
            { key: 'quantity', header: 'Qty', align: 'right', render: (r) => `${r.quantity.toLocaleString()} ${r.unit}` },
            { key: 'neededBy', header: 'Needed by', align: 'right' },
            { key: 'priority', header: 'Priority', align: 'right', render: (r) => (
              <DzPill tone={r.priority === 'high' ? 'disputed' : r.priority === 'medium' ? 'neutral' : 'released'}>{r.priority}</DzPill>
            )},
          ]}
          rows={view.byProject}
          rowKey={(r) => `${r.projectId}-${r.material}`}
          className="mt-3"
        />
      )}
      {view.crossProjectMaterials.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-50/50 p-2 text-xs text-amber-700">
          <AlertTriangle className="inline h-3 w-3 mr-1" />
          Cross-project demand detected: {view.crossProjectMaterials.join(', ')} — group-buy aggregation eligible
        </div>
      )}
    </DzCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main C4 stage                                                              */
/* -------------------------------------------------------------------------- */

export function C4BulkProcurementStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { resources, forwardCommitments, isLoading, loadForProject, addCommitment } = useGreenFlagStore(
    useShallow((s) => ({
      resources: s.resources,
      forwardCommitments: s.forwardCommitments,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addCommitment: s.addCommitment,
    })),
  );

  const [material] = useState('Cement 50kg');
  const [quantity, setQuantity] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const suppliers = useMemo(
    () => resources.filter((r) => r.category === 'supplier').slice(0, 12),
    [resources],
  );

  const quotes: QuoteInput[] = useMemo(
    () =>
      suppliers.map((s, i) => ({
        id: s.id,
        name: s.name,
        material,
        priceCents: s.baseRateCents,
        freightCents: Math.round(s.baseRateCents * 0.04),
        onTimeDeliveryPct: 85 + ((s.rating * 10) % 15),
        defectRatePct: 2 + i,
        laborDowntimeCostCentsPerDay: 180000,
        leadDays: 5 + i,
        typicalLeadDays: 14,
      })),
    [suppliers, material],
  );

  const analysis = useMemo(() => valueDrivenQuote(quotes, quantity), [quotes, quantity]);
  const totals = commitmentTotals(forwardCommitments);

  const radarView = useMemo(
    () => buildDemandRadarDualView(
      // aggregate from suppliers
      suppliers.length > 0
        ? [{ key: material.toLowerCase(), label: material, unit: 'ea', quantity, avgUnitCostCents: quotes[0]?.priceCents ?? 0, totalCostCents: (quotes[0]?.priceCents ?? 0) * quantity, projectCount: 1 }]
        : [],
      MOCK_PROJECT_ENTRIES,
    ),
    [suppliers, material, quantity, quotes],
  );

  const bestQuote = analysis.bestId ? quotes.find((q) => q.id === analysis.bestId) : null;

  const handleCommit = useCallback(async () => {
    if (!projectId || busy || !analysis.bestId) return;
    const best = quotes.find((q) => q.id === analysis.bestId);
    if (!best) return;
    setBusy(true);
    try {
      await addCommitment({
        material: best.material,
        quantity,
        unit: 'ea',
        priceCents: Math.round(best.priceCents * (1 - analysis.bulk.discountPct / 100)),
        supplierId: best.id,
        commitmentDate: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, analysis, quotes, quantity, addCommitment]);

  return (
    <StageScaffold
      stageId="c4-bulk-procurement"
      icon={ShoppingCart}
      empty={!isLoading && suppliers.length === 0}
      emptyTitle="No suppliers in the hub"
      emptyMessage="Build the Resource Hub (C1) and certify suppliers (C3) first — bulk procurement compares their quotes on total cost of ownership."
    >
      <PageEnter className="space-y-4">
        {/* KPI strip */}
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>TCO-ranked suppliers</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{analysis.scoringRows.length}</p>
            <p className="text-xs text-[var(--text-muted)]">compared on price + freight + downtime + defect</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Best TCO score</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">
              {analysis.scoringRows.length > 0 ? `${analysis.scoringRows[0].tcoScore}/100` : '—'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {analysis.scoringRows[0] ? analysis.scoringRows[0].explanation : 'run quotes to score'}
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Bulk discount</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-600">{analysis.bulk.discountPct.toFixed(0)}%</p>
            <p className="text-xs text-[var(--text-muted)]">
              group price <Money cents={analysis.bulk.groupPriceCents} /> · saving <Money cents={analysis.bulk.savingCents} />
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Forward commitments</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{totals.materialCount}</p>
            <p className="text-xs text-[var(--text-muted)]">
              <Money cents={totals.lockedCents} /> locked of <Money cents={totals.totalCents} /> total
            </p>
          </DzCard>
        </div>

        {/* Value-driven quoting tool */}
        <ValueDrivenQuotingTool
          quotes={quotes}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onCommit={handleCommit}
          busy={busy}
          bestName={bestQuote?.name ?? null}
          scoringRows={analysis.scoringRows}
        />

        {/* TCO Comparison Table */}
        <TcoComparisonTable scoringRows={analysis.scoringRows} />

        {/* Demand Radar Dual View */}
        <DemandRadarDualView view={radarView} />

        {/* Forward Commitments + Locked */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DzCard className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--brand-accent)]" />
              <Kicker>Forward Commitment — Pre-lock materials at fixed price</Kicker>
            </div>
            {forwardCommitments.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">No forward commitments yet — lock the best-value quote above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {forwardCommitments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{c.material}</p>
                      <DzPill tone={c.status === 'locked' ? 'verified' : c.status === 'released' ? 'released' : 'neutral'}>{c.status}</DzPill>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {c.quantity} {c.unit} @ <Money cents={c.priceCents} /> · {new Date(c.commitmentDate).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DzCard>

          <DzCard className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--brand-accent)]" />
              <Kicker>RFQ / Tender — 3 suppliers invited</Kicker>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              RFQ/Tender module invites the top 3 TCO-scored suppliers. Each supplier receives the same BOQ lines — TCO score {analysis.scoringRows[0]?.tcoScore ?? '—'}/100 on the best quote.
            </p>
            {analysis.scoringRows.length >= 3 && (
              <div className="mt-3 space-y-1">
                {analysis.scoringRows.slice(0, 3).map((sr) => (
                  <div key={sr.tcoRow.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)]/30 px-3 py-1.5 text-xs">
                    <span className="font-medium text-[var(--text-primary)]">{sr.tcoRow.name}</span>
                    <span className="text-[var(--text-muted)]">TCO {sr.tcoScore}/100</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Send className="h-3 w-3" />
              <span>PO issued → Escrow linked → Proof-of-Funds green check</span>
            </div>
          </DzCard>
        </div>

        {/* Privacy notice */}
        <DzCard className="p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            <p>
              <strong className="text-[var(--text-primary)]">Privacy:</strong> Builder identity is <strong className="text-emerald-600">NEVER revealed</strong> to suppliers.
              All RFQs are anonymized. Suppliers compete on TCO score, not on who knows the buyer.
            </p>
          </div>
        </DzCard>
      </PageEnter>
    </StageScaffold>
  );
}
