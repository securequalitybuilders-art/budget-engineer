import { Lock, ChevronRight, DollarSign } from 'lucide-react';
import type { CostBaseline, CashFlowForecast } from '@/domain/greenflag';
import type { MilestoneEscrow } from '@/engine/greenflag/costClarification';

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100);
}

/**
 * BOQ Lock Panel: contingency slider, lock button, and milestone escrow
 * derivation display. Shows the 35/40/25 split with derived dollar amounts.
 */
export function BOQLockPanel({
  baseline,
  cashFlow,
  milestoneEscrows,
  contingencyPct,
  onContingencyChange,
  onLock,
  locked,
}: {
  baseline: CostBaseline | null;
  cashFlow: CashFlowForecast | null;
  milestoneEscrows: MilestoneEscrow[];
  contingencyPct: number;
  onContingencyChange: (pct: number) => void;
  onLock: () => void;
  locked: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Contingency slider */}
      <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-4">
        <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span>Contingency Allowance</span>
          <span className="font-mono text-sm text-[var(--text-primary)]">{contingencyPct}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={contingencyPct}
          onChange={(e) => onContingencyChange(Number(e.target.value))}
          disabled={locked}
          className="mt-2 w-full accent-[var(--brand-accent)]"
          aria-label="Contingency percentage"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0%</span>
          <span>SADC norm: 9%</span>
          <span>20%</span>
        </div>
      </div>

      {/* Lock button */}
      {!locked ? (
        <button
          onClick={onLock}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-primary)]/90 active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" />
          Lock Cost Baseline
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400">
          <Lock className="h-4 w-4" />
          Cost Baseline Locked
        </div>
      )}

      {/* Milestone escrow derivation */}
      {milestoneEscrows.length > 0 && (
        <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-4">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <DollarSign className="h-3.5 w-3.5" />
            Milestone Escrow Derivation
          </h4>
          <div className="space-y-2">
            {milestoneEscrows.map((ms, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent)]/20 text-[10px] font-bold text-[var(--brand-accent)]">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-secondary)]">{ms.name}</span>
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">{fmtCents(ms.amountCents)}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)]"
                      style={{ width: `${ms.pct}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{ms.pct}% of baseline</div>
                </div>
                {i < milestoneEscrows.length - 1 && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-700/50 pt-2 text-[11px] font-semibold">
            <span className="text-[var(--text-muted)]">Total escrow</span>
            <span className="font-mono text-[var(--text-primary)]">
              {fmtCents(milestoneEscrows.reduce((s, m) => s + m.amountCents, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Cash flow forecast */}
      {cashFlow && (
        <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Cash Flow Forecast
          </h4>
          <div className="space-y-1">
            {cashFlow.milestones.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-steelBlue">{m.pct}%</span>
                  <span className="text-[var(--text-secondary)]">{m.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-muted)]">
                    {new Date(m.dueDate).toLocaleDateString('en-ZW', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{fmtCents(m.amountCents)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-700/50 pt-1 text-[11px] font-semibold">
            <span className="text-[var(--text-muted)]">Contingency reserve</span>
            <span className="font-mono text-[var(--text-primary)]">{fmtCents(cashFlow.contingencyCents)}</span>
          </div>
        </div>
      )}

      {/* Lock status */}
      {locked && baseline?.lockedAt && (
        <div className="rounded-lg border border-slate-700/50 bg-[var(--bg-secondary)] p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Locked since</span>
            <span className="font-mono text-[var(--text-primary)]">
              {new Date(baseline.lockedAt).toLocaleDateString('en-ZW', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Region</span>
            <span className="text-[var(--text-primary)]">{baseline.region}</span>
          </div>
        </div>
      )}
    </div>
  );
}