import * as React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import type { CostBaseline, CostAtGlance, GhostMaterial } from '@/domain/greenflag';

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100);
}

function fmtPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

/**
 * Cost at a Glance arc dial rendered as an SVG semicircle gauge.
 */
function CostDial({ costAtGlance }: { costAtGlance: CostAtGlance }) {
  const pct = Math.min(costAtGlance.budgetUtilisationPct, 100);
  const radius = 70;
  const cx = 80;
  const cy = 80;
  const startAngle = Math.PI;
  const endAngle = Math.PI + (Math.PI * pct) / 100;
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);

  const color = pct < 60 ? '#10b981' : pct < 85 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100" role="img" aria-label={`Budget utilisation ${pct}%`}>
        <path d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
        <text x={cx} y={cy - 5} textAnchor="middle" className="text-2xl font-bold" fill="var(--text-primary)">
          {fmtPct(pct)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px]" fill="var(--text-muted)">
          budget utilised
        </text>
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-3 text-center text-[11px]">
        <div>
          <div className="font-mono font-semibold text-[var(--text-primary)]">{fmtCents(costAtGlance.spentToDateCents)}</div>
          <div className="text-[var(--text-muted)]">Spent</div>
        </div>
        <div>
          <div className="font-mono font-semibold text-[var(--text-primary)]">{fmtCents(costAtGlance.committedCents)}</div>
          <div className="text-[var(--text-muted)]">Committed</div>
        </div>
        <div>
          <div className="font-mono font-semibold text-[var(--text-primary)]">{fmtCents(costAtGlance.remainingCents)}</div>
          <div className="text-[var(--text-muted)]">Remaining</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cost Baseline Document: master version-controlled budget with Cost at a Glance dial,
 * WBS breakdown, ghost materials transparency, and version status.
 */
export function CostBaselineDocument({
  baseline,
  costAtGlance,
  ghostMaterials,
}: {
  baseline: CostBaseline | null;
  costAtGlance: CostAtGlance | null;
  ghostMaterials?: GhostMaterial[];
}) {
  if (!baseline) {
    return (
      <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-stone-400" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">No Cost Baseline locked yet.</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Lock the BOQ to generate the master version-controlled budget.</p>
      </div>
    );
  }

  const ghostTotalCents = ghostMaterials?.reduce((s, g) => s + g.ghostCostCents, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-steelBlue" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cost Baseline Document</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
            {baseline.status}
          </span>
          {baseline.lockedAt && (
            <span className="text-[11px] text-[var(--text-muted)]">
              {new Date(baseline.lockedAt).toLocaleDateString('en-ZW', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Cost at a Glance dial */}
      {costAtGlance && (
        <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-4">
          <CostDial costAtGlance={costAtGlance} />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Direct Cost</div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">{fmtCents(baseline.totalCents - baseline.contingencyCents)}</div>
        </div>
        <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Contingency</div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">{fmtCents(baseline.contingencyCents)}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{fmtPct(baseline.contingencyPct)} of total</div>
        </div>
        <div className="col-span-2 rounded-lg border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10 p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--brand-accent)]">Total Budget</div>
          <div className="font-mono text-xl font-bold text-[var(--text-primary)]">{fmtCents(baseline.totalCents)}</div>
        </div>
      </div>

      {/* Ghost materials transparency */}
      {ghostMaterials && ghostMaterials.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Ghost Materials — {ghostMaterials.length} detected</span>
          </div>
          <div className="mt-2 space-y-1">
            {ghostMaterials.map((g) => (
              <div key={g.id} className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">{g.description} ({g.ghostQuantity} {g.unit} undelivered)</span>
                <span className="font-mono font-semibold text-amber-400">{fmtCents(g.ghostCostCents)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-amber-500/20 pt-1 text-[11px] font-semibold">
            <span className="text-amber-400">Total ghost material cost</span>
            <span className="font-mono text-amber-400">{fmtCents(ghostTotalCents)}</span>
          </div>
        </div>
      )}

      {/* WBS breakdown */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">WBS Breakdown</h4>
        <div className="space-y-1">
          {baseline.lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-steelBlue">{line.wbsCode}</span>
                <span className="text-[var(--text-secondary)]">{line.description}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[var(--text-muted)]">{line.quantity} {line.unit}</span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">{fmtCents(line.totalCents)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* YOUR MATERIALS FULLY TRANSPARENT */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          YOUR MATERIALS FULLY TRANSPARENT
        </div>
        <div className="mt-1 text-[11px] text-[var(--text-muted)]">
          Every line item is WBS-tagged to ZIQS SMM. Red Pen audit flags variances &gt;15% above market rates.
        </div>
      </div>
    </div>
  );
}