import type { GanttResult } from '@/lib/planning/gantt'

interface GanttChartProps {
  gantt: GanttResult
  currency: string
  compact?: boolean
}

const TRADE_COLORS: Record<string, string> = {
  Preliminaries: '#94a3b8',
  Substructure: '#f59e0b',
  Superstructure: '#3b82f6',
  Roofing: '#10b981',
  Openings: '#8b5cf6',
  Finishes: '#ec4899',
  Plumbing: '#06b6d4',
  Electrical: '#f97316',
  Mechanical: '#6366f1',
  'External Works': '#84cc16',
}

export function GanttChart({ gantt, currency, compact }: GanttChartProps) {
  const totalDays = gantt.totalDurationDays || 1
  const scale = compact ? 2 : 3
  const chartWidth = Math.max(400, totalDays * scale)
  const rowHeight = compact ? 20 : 28
  const headerHeight = 30
  const labelWidth = compact ? 100 : 130

  const weekLines: number[] = []
  for (let d = 0; d <= totalDays; d += 7) {
    weekLines.push(d)
  }

  return (
    <div className="overflow-auto rounded-lg border border-stone-700/60 bg-stone-900/50">
      <div className="p-3 text-xs font-medium text-stone-400 border-b border-stone-700/60 flex items-center justify-between">
        <span>Construction Programme — {totalDays} days | {gantt.criticalPath.length} tasks on critical path</span>
        <span className="text-cyan-400">{currency}</span>
      </div>
      <div style={{ minWidth: chartWidth + labelWidth + 20 }}>
        <div className="relative">
          <div style={{ height: headerHeight, marginLeft: labelWidth }} className="relative">
            {weekLines.map((d) => (
              <div
                key={d}
                style={{
                  position: 'absolute',
                  left: d * scale,
                  top: 0,
                  height: '100%',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{
                  position: 'absolute',
                  left: 2,
                  top: 2,
                  fontSize: 9,
                  color: '#78716c',
                  whiteSpace: 'nowrap',
                }}>
                  W{Math.floor(d / 7) + 1}
                </span>
              </div>
            ))}
          </div>

          {gantt.tasks.map((task) => {
            const color = TRADE_COLORS[task.trade] || '#6366f1'
            const left = task.startDay * scale + labelWidth
            const width = Math.max(task.durationDays * scale, 4)

            return (
              <div
                key={task.code}
                style={{
                  height: rowHeight,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  position: 'relative',
                }}
                className="hover:bg-white/5"
              >
                <div
                  style={{
                    width: labelWidth,
                    padding: '0 8px',
                    fontSize: compact ? 10 : 11,
                    color: '#a8a29e',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {task.isCritical && <span style={{ color: '#ef4444', fontSize: 8 }}>●</span>}
                  <span>{task.code}</span>
                </div>

                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  {weekLines.map((d) => (
                    <div
                      key={d}
                      style={{
                        position: 'absolute',
                        left: d * scale,
                        top: 0,
                        height: '100%',
                        borderLeft: '1px solid rgba(255,255,255,0.03)',
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: 'absolute',
                      left,
                      top: 3,
                      width,
                      height: rowHeight - 6,
                      borderRadius: 4,
                      backgroundColor: color,
                      opacity: task.isCritical ? 0.9 : 0.5,
                      border: task.isCritical ? `1px solid ${color}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 6,
                      fontSize: compact ? 8 : 9,
                      color: '#fff',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      minWidth: 12,
                    }}
                    title={`${task.name}: Day ${task.startDay}–${task.finishDay} (${task.durationDays} days)`}
                  >
                    {!compact && task.name}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
