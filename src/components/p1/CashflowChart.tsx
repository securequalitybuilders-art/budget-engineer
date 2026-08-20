import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { CashflowProjectionMonth } from '@/domain/sitehawk';
import type { CostBaseline } from '@/domain/greenflag';
import type { ScheduleRecord } from '@/domain/sitehawk';
import { monthlyCashflowProjection } from '@/engine/sitehawk/criticalPath';
import { DzCard, Kicker, Money } from '@/components/dzenhare';

interface CashflowChartProps {
  baseline: CostBaseline | null;
  schedule: ScheduleRecord[];
}

function fmtMoneyShort(cents: number): string {
  const abs = Math.abs(cents);
  if (abs >= 100_000_00) return `$${(abs / 100_00).toFixed(0)}k`;
  if (abs >= 10_00) return `$${(abs / 10_00).toFixed(1)}k`;
  return `$${(abs / 100).toFixed(0)}`;
}

function BarGroup({ month, maxAbs }: { month: CashflowProjectionMonth; maxAbs: number }) {
  const inflowH = maxAbs > 0 ? (month.plannedInflowCents / maxAbs) * 100 : 0;
  const outflowH = maxAbs > 0 ? (month.plannedOutflowCents / maxAbs) * 100 : 0;
  return (
    <div className="flex flex-1 flex-col items-center gap-1" data-testid="cashflow-bar-group">
      <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 100 }}>
        <div
          className="w-3 rounded-t bg-emerald-500/70"
          style={{ height: `${Math.max(inflowH, 1)}%` }}
          title={`Inflow: ${fmtMoneyShort(month.plannedInflowCents)}`}
        />
        <div
          className="w-3 rounded-t bg-[var(--danger)]/70"
          style={{ height: `${Math.max(outflowH, 1)}%` }}
          title={`Outflow: ${fmtMoneyShort(month.plannedOutflowCents)}`}
        />
      </div>
      <span className="text-[9px] text-[var(--text-muted)]">{month.label.split(' ')[0]}</span>
    </div>
  );
}

export function CashflowChart({ baseline, schedule }: CashflowChartProps) {
  const projection = useMemo(
    () => monthlyCashflowProjection(baseline, schedule),
    [baseline, schedule],
  );

  const maxAbs = useMemo(() => {
    let max = 0;
    for (const m of projection.months) {
      max = Math.max(max, m.plannedInflowCents, m.plannedOutflowCents);
    }
    return max;
  }, [projection.months]);

  const nextMonth = useMemo(() => {
    return projection.months.find((m) => m.plannedInflowCents > 0);
  }, [projection.months]);

  if (projection.months.length === 0) {
    return (
      <DzCard className="p-4" data-testid="cashflow-chart">
        <Kicker>Cashflow Projection</Kicker>
        <p className="mt-2 py-6 text-center text-xs text-[var(--text-muted)]">No baseline or schedule — lock a cost baseline to project monthly cashflows.</p>
      </DzCard>
    );
  }

  return (
    <DzCard className="p-4" data-testid="cashflow-chart">
      <div className="mb-3 flex items-center justify-between">
        <Kicker>Cashflow Projection</Kicker>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded bg-emerald-500/70" /> Inflow
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded bg-[var(--danger)]/70" /> Outflow
          </span>
        </div>
      </div>

      {/* Next cashflow indicator */}
      {nextMonth && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2" data-testid="next-cashflow">
          <Clock className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-emerald-400">
            Next cashflow: <span className="font-bold">{nextMonth.label}</span> — <Money cents={nextMonth.plannedInflowCents} className="text-xs font-bold text-emerald-400" />
          </span>
        </div>
      )}

      {/* Bar chart */}
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {projection.months.map((m) => (
          <BarGroup key={m.monthKey} month={m} maxAbs={maxAbs} />
        ))}
      </div>

      {/* Cumulative net line */}
      <div className="mt-3 border-t border-[var(--border-default)] pt-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>Total inflow: <Money cents={projection.totalInflowCents} className="text-xs" /></span>
          <span>Total outflow: <Money cents={projection.totalOutflowCents} className="text-xs" /></span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px]">
          <span className="text-[var(--text-muted)]">Net:</span>
          {projection.months[projection.months.length - 1]?.cumulativeNetCents ?? 0}
        </div>
        <div className="mt-1 flex gap-0.5">
          {projection.months.map((m) => {
            const net = m.cumulativeNetCents;
            const h = maxAbs > 0 ? Math.min(Math.abs(net) / maxAbs * 50, 50) : 0;
            return (
              <div
                key={m.monthKey}
                className={`flex-1 rounded ${net >= 0 ? 'bg-emerald-500/40' : 'bg-[var(--danger)]/40'}`}
                style={{ height: Math.max(h, 2) }}
                title={`${m.label}: net ${fmtMoneyShort(m.netCents)}, cumulative ${fmtMoneyShort(m.cumulativeNetCents)}`}
              />
            );
          })}
        </div>
      </div>
    </DzCard>
  );
}
