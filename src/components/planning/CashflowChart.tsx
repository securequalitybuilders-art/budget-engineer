import type { CashflowResult } from '@/lib/planning/cashflow'

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

interface CashflowChartProps {
  cashflow: CashflowResult
  currency: string
  compact?: boolean
}

export function CashflowChart({ cashflow, currency, compact }: CashflowChartProps) {
  const { weekly } = cashflow
  if (weekly.length === 0) return null

  const maxVal = Math.max(cashflow.peakCost, cashflow.totalCost)
  const chartHeight = compact ? 120 : 180
  const barWidth = Math.max(8, Math.min(24, Math.floor(400 / weekly.length)))
  void Math.max(300, weekly.length * (barWidth + 4))

  const scaleY = maxVal > 0 ? chartHeight / maxVal : 1

  const fmt = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toFixed(0)
  }

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-3">
      <div className="mb-2 text-xs font-medium text-stone-400 flex items-center justify-between">
        <span>Cashflow — {currency}</span>
        <span className="text-cyan-400">
          Peak: {fmt(cashflow.peakCost)} | Total: {fmt(cashflow.totalCost)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="text-[10px] text-stone-400 mb-1">Weekly Spend</div>
          <div style={{ height: chartHeight, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {weekly.map((w) => {
              const barH = Math.max(2, w.periodCost * scaleY)
              return (
                <div
                  key={w.period}
                  style={{
                    width: barWidth,
                    height: barH,
                    backgroundColor: '#06b6d4',
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.7 + (w.periodCost / maxVal) * 0.3,
                    position: 'relative',
                    flexShrink: 0,
                  }}
                  title={`${formatDate(w.startDate)}–${formatDate(w.endDate)}: ${currency} ${w.periodCost.toFixed(2)}`}
                >
                  {!compact && barH > 20 && (
                    <span style={{
                      position: 'absolute',
                      top: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 8,
                      color: '#a8a29e',
                      whiteSpace: 'nowrap',
                    }}>
                      {fmt(w.periodCost)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#78716c', marginTop: 2 }}>
            <span>{formatDate(weekly[0].startDate)}</span>
            <span>{formatDate(weekly[weekly.length - 1].endDate)}</span>
          </div>
        </div>

        <div className="border-t border-stone-700/60 pt-3">
          <div className="text-[10px] text-stone-400 mb-1">Cumulative S-Curve</div>
          <div style={{ height: chartHeight, position: 'relative' }}>
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${weekly.length - 1} ${chartHeight}`} preserveAspectRatio="none">
              <polyline
                points={weekly.map((w, i) => `${i},${chartHeight - (w.cumulativeCost / cashflow.totalCost) * chartHeight}`).join(' ')}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
              />
              {weekly.map((w, i) => (
                <circle
                  key={i}
                  cx={i}
                  cy={chartHeight - (w.cumulativeCost / cashflow.totalCost) * chartHeight}
                  r="1.5"
                  fill="#22c55e"
                />
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#78716c', marginTop: 2 }}>
              <span>{fmt(0)}</span>
              <span>{fmt(cashflow.totalCost)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs border-t border-stone-700/60 pt-2">
          <div>
            <div className="text-[10px] text-stone-400">Total Cost</div>
            <div className="font-mono text-cyan-400 font-semibold">{fmt(cashflow.totalCost)}</div>
          </div>
          <div>
            <div className="text-[10px] text-stone-400">Avg Weekly</div>
            <div className="font-mono text-stone-300">{fmt(cashflow.avgWeeklyCost)}</div>
          </div>
          <div>
            <div className="text-[10px] text-stone-400">Peak Week</div>
            <div className="font-mono text-amber-400">{fmt(cashflow.peakCost)} ({formatDate(cashflow.weekly[cashflow.peakPeriod]?.startDate ?? cashflow.startDate)})</div>
          </div>
        </div>
      </div>
    </div>
  )
}
