import { useEffect, useMemo, useState } from 'react';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useProcurementStore } from '@/stores/procurementStore';
import { useChangeStore } from '@/stores/changeStore';
import { db } from '@/db/db';
import { summarizeLedger } from '@/engine/ledger/trueLedger';
import { analyzeChangeImpact, type ChangeImpactResult, type LensName } from '@/engine/change/changeLensEngine';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { Receipt, RefreshCw, AlertTriangle, CheckCircle2, Wallet, Gauge } from 'lucide-react';
import type { BOQ, Rate } from '@/types';
import type { ChangeOrder } from '@/domain/change';

const LENS_COLORS: Record<LensName, string> = {
  'red-pen': 'text-red-400',
  wipaa: 'text-amber-400',
  'true-ledger': 'text-cyan-400',
  'budget-engineer': 'text-green-400',
};

const LENS_ORDER: LensName[] = ['red-pen', 'wipaa', 'true-ledger', 'budget-engineer'];

export function TrueLedgerPanel({ projectId }: { projectId: string }) {
  const entries = useLedgerStore((s) => s.entries);
  const analyses = useLedgerStore((s) => s.analyses);
  const isLoading = useLedgerStore((s) => s.isLoading);
  const loadLedger = useLedgerStore((s) => s.loadForProject);
  const codePurchaseOrder = useLedgerStore((s) => s.codePurchaseOrder);
  const setAnalysis = useLedgerStore((s) => s.setAnalysis);

  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders);
  const loadProcurement = useProcurementStore((s) => s.loadForProject);
  const changeOrders = useChangeStore((s) => s.changeOrders);
  const loadChanges = useChangeStore((s) => s.loadForProject);

  const [boq, setBoq] = useState<BOQ | null>(null);
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [codingBusy, setCodingBusy] = useState(false);
  const [analyzingBusy, setAnalyzingBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    loadLedger(projectId);
    loadProcurement(projectId);
    loadChanges(projectId);
    (async () => {
      const [found, allRates] = await Promise.all([
        db.boqs.where({ projectId }).first(),
        db.rates.toArray(),
      ]);
      if (!cancelled) {
        setBoq(found ?? null);
        setRates(allRates.length > 0 ? allRates : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, loadLedger, loadProcurement, loadChanges]);

  const summary = useMemo(() => summarizeLedger(entries), [entries]);

  const codedPoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) if (e.source === 'purchase-order') ids.add(e.sourceId);
    return ids;
  }, [entries]);

  const uncodedPocs = useMemo(
    () => purchaseOrders.filter((po) => !codedPoIds.has(po.id)),
    [purchaseOrders, codedPoIds]
  );

  const analysesByNumber = useMemo(() => {
    const map = new Map<string, ChangeImpactResult>();
    for (const a of analyses) map.set(a.changeOrderNumber, a);
    return map;
  }, [analyses]);

  const pendingAnalyses = useMemo(
    () => changeOrders.filter((co) => !analysesByNumber.has(co.changeOrderNumber)),
    [changeOrders, analysesByNumber]
  );

  const autoCodedPct = entries.length > 0
    ? Math.round((entries.filter((e) => e.codingMethod === 'auto').length / entries.length) * 100)
    : 0;

  const handleCodeAll = async () => {
    if (codingBusy || uncodedPocs.length === 0) return;
    setCodingBusy(true);
    for (const po of uncodedPocs) await codePurchaseOrder(po.id);
    setCodingBusy(false);
  };

  const handleAnalyzeAll = async () => {
    if (analyzingBusy || pendingAnalyses.length === 0) return;
    setAnalyzingBusy(true);
    for (const co of pendingAnalyses) {
      const result = analyzeChangeImpact({
        change: { changeOrderNumber: co.changeOrderNumber, declaredImpactCents: co.costImpactCents },
        boq,
        rates: rates ?? [],
        ledgerEntries: entries,
      });
      await setAnalysis(result);
    }
    setAnalyzingBusy(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-full max-w-md space-y-3">
          <div className="h-4 w-1/3 shimmer rounded-md" />
          <div className="h-8 w-full shimmer rounded-md" />
          <div className="h-8 w-full shimmer rounded-md" />
          <div className="h-8 w-3/4 shimmer rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Receipt size={14} />}
          label="Total committed"
          value={fmtCents(summary.totalCents)}
          color="text-cyan-400"
          detail={`${summary.entryCount} coded line(s)`}
        />
        <StatCard
          icon={<Wallet size={14} />}
          label="Restockable cover"
          value={fmtCents(summary.restockableCents)}
          color="text-green-400"
          detail={`${fmtCents(summary.oneTimeCents)} one-time`}
        />
        <StatCard
          icon={<Gauge size={14} />}
          label="Auto-coded"
          value={`${autoCodedPct}%`}
          color="text-amber-400"
          detail={`${summary.unallocatedCount} uncoded line(s)`}
        />
        <StatCard
          icon={summary.unallocatedCents > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          label="Unallocated"
          value={fmtCents(summary.unallocatedCents)}
          color={summary.unallocatedCents > 0 ? 'text-red-400' : 'text-green-400'}
          detail={summary.unallocatedCents > 0 ? 'Needs manual coding' : 'All coded'}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCodeAll}
          disabled={codingBusy || uncodedPocs.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-1.5 text-[10px] font-medium text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/25 disabled:opacity-40"
        >
          <RefreshCw size={12} className={codingBusy ? 'animate-spin' : ''} />
          {codingBusy ? 'Coding…' : `Code ${uncodedPocs.length} purchase order(s)`}
        </button>
        <button
          type="button"
          onClick={handleAnalyzeAll}
          disabled={analyzingBusy || pendingAnalyses.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-1.5 text-[10px] font-medium text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/25 disabled:opacity-40"
        >
          <Gauge size={12} className={analyzingBusy ? 'animate-spin' : ''} />
          {analyzingBusy ? 'Analyzing…' : `Analyze ${pendingAnalyses.length} change order(s)`}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* WBS breakdown */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-3 text-xs font-semibold text-[var(--text-primary)]">WBS breakdown</h3>
          {summary.byCode.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)]">No ledger entries yet. Code a purchase order to start.</p>
          ) : (
            <div className="space-y-2">
              {summary.byCode.slice(0, 6).map((row) => {
                const pct = summary.totalCents > 0 ? (row.amountCents / summary.totalCents) * 100 : 0;
                return (
                  <div key={row.code} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] text-[var(--text-secondary)]">
                        <span className="font-mono text-[var(--text-muted)]">{row.code}</span> · {row.name}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium text-[var(--text-primary)]">
                        {fmtCents(row.amountCents)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                      <div
                        className="h-full rounded-full bg-[var(--brand-accent)]"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Purchase orders */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-3 text-xs font-semibold text-[var(--text-primary)]">Purchase orders</h3>
          {purchaseOrders.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)]">No purchase orders for this project.</p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {purchaseOrders.map((po) => {
                const coded = codedPoIds.has(po.id);
                return (
                  <div key={po.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[10px] text-[var(--text-primary)]">{po.poNumber} · {po.title}</div>
                      <div className="text-[9px] text-[var(--text-muted)]">{fmtCents(po.totalCents)} · {po.status}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${coded ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {coded ? 'Coded' : 'Uncoded'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Change order analyses */}
      {changeOrders.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-3 text-xs font-semibold text-[var(--text-primary)]">Change Order 4-lens analysis</h3>
          {changeOrders.map((co) => {
            const result = analysesByNumber.get(co.changeOrderNumber);
            return <ChangeOrderAnalysis key={co.id} change={co} result={result} />;
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, detail }: {
  icon: React.ReactNode; label: string; value: string; color: string; detail: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[var(--text-muted)]">
        {icon}
        <span className="text-[9px] font-medium">{label}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[8px] text-[var(--text-tertiary)]">{detail}</div>
    </div>
  );
}

function ChangeOrderAnalysis({ change, result }: {
  change: ChangeOrder; result: ChangeImpactResult | undefined;
}) {
  const byLens = new Map<string, number>();
  if (result) {
    for (const lens of result.lenses) byLens.set(lens.name, lens.impactCents);
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold text-[var(--text-primary)]">
            {change.changeOrderNumber} · {change.title}
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">
            Declared {fmtCents(change.costImpactCents)} · {change.category}
          </div>
        </div>
        {result && (
          <div className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-medium text-cyan-400">
            Recommended {fmtCents(result.recommendedImpactCents)}
          </div>
        )}
      </div>

      {!result ? (
        <p className="mt-2 text-[9px] text-[var(--text-muted)]">
          Not analyzed yet — click "Analyze change orders" above.
        </p>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LENS_ORDER.map((name) => (
              <div key={name} className="rounded-md bg-[var(--bg-secondary)] px-2 py-1.5">
                <div className="text-[9px] font-medium capitalize text-[var(--text-muted)]">{name.replace('-', ' ')}</div>
                <div className={`text-[11px] font-bold ${LENS_COLORS[name]}`}>{fmtCents(byLens.get(name) ?? 0)}</div>
              </div>
            ))}
          </div>
          {result.riskFlags.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.riskFlags.map((flag, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[9px] text-amber-400">
                  <AlertTriangle size={10} />
                  {flag}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
