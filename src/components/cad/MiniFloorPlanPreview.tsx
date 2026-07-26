import type { PlanModel } from '@/domain/plan'

interface MiniFloorPlanPreviewProps {
  plan: PlanModel
  width?: number
  height?: number
}

const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#2563eb']

export function MiniFloorPlanPreview({ plan, width = 200, height = 160 }: MiniFloorPlanPreviewProps) {
  const { rooms, walls, openings } = plan
  if (rooms.length === 0 && walls.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="rounded">
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="4" />
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="11">No floor plan</text>
      </svg>
    )
  }

  const pad = 16
  const minX = Math.min(...rooms.map(r => r.x), ...walls.map(w => Math.min(w.start.x, w.end.x)), 0)
  const minY = Math.min(...rooms.map(r => r.y), ...walls.map(w => Math.min(w.start.y, w.end.y)), 0)
  const maxX = Math.max(...rooms.map(r => r.x + r.width), ...walls.map(w => Math.max(w.start.x, w.end.x)), plan.width)
  const maxY = Math.max(...rooms.map(r => r.y + r.height), ...walls.map(w => Math.max(w.start.y, w.end.y)), plan.height)
  const planW = maxX - minX || plan.width
  const planH = maxY - minY || plan.height
  const scale = Math.min((width - pad * 2) / planW, (height - pad * 2) / planH, 4)
  const tx = (x: number) => pad + (x - minX) * scale
  const ty = (y: number) => pad + (y - minY) * scale
  const ts = (v: number) => v * scale

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="rounded">
      <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="4" />
      {walls.map(w => (
        <line
          key={w.id}
          x1={tx(w.start.x)} y1={ty(w.start.y)}
          x2={tx(w.end.x)} y2={ty(w.end.y)}
          stroke={w.type === 'external' ? '#94a3b8' : '#475569'}
          strokeWidth={Math.max(1.5, ts(w.thickness || 0.23) * 0.5)}
          strokeLinecap="round"
        />
      ))}
      {rooms.map((r, i) => (
        <g key={r.id}>
          <rect
            x={tx(r.x)} y={ty(r.y)}
            width={ts(r.width)} height={ts(r.height)}
            fill={PALETTE[i % PALETTE.length]}
            fillOpacity="0.25"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth="1"
            rx="2"
          />
          {ts(r.width) > 24 && ts(r.height) > 12 && (
            <text
              x={tx(r.x) + ts(r.width) / 2}
              y={ty(r.y) + ts(r.height) / 2 + 3}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="7"
              fontFamily="monospace"
            >
              {r.name.length > 6 ? r.name.slice(0, 4) + '.' : r.name}
            </text>
          )}
        </g>
      ))}
      {openings.map(o => {
        const wall = walls.find(w => w.id === o.wallId)
        if (!wall) return null
        const wx = wall.start.x
        const wy = wall.start.y
        const ww = wall.end.x - wall.start.x
        const wh = wall.end.y - wall.start.y
        const len = Math.sqrt(ww * ww + wh * wh)
        if (len === 0) return null
        const ux = ww / len
        const uy = wh / len
        const perpX = -uy * ts(o.width) * 0.4
        const perpY = ux * ts(o.width) * 0.4
        const cx = tx(wx + ux * o.offset * len)
        const cy = ty(wy + uy * o.offset * len)
        const half = ts(o.width) * 0.5
        const color = o.kind === 'door' ? '#f59e0b' : '#06b6d4'
        const gap = ts(0.05)
        return (
          <g key={o.id}>
            <line x1={cx - ux * half - ux * gap} y1={cy - uy * half - uy * gap} x2={cx + ux * half + ux * gap} y2={cy + uy * half + uy * gap} stroke={color} strokeWidth="2" strokeLinecap="round" />
            {o.kind === 'door' && (
              <line x1={cx + ux * half} y1={cy + uy * half} x2={cx + ux * half + perpX} y2={cy + uy * half + perpY} stroke={color} strokeWidth="1" strokeDasharray="1.5" />
            )}
          </g>
        )
      })}
      <text x={8} y={height - 6} fill="#475569" fontSize="8" fontFamily="monospace">
        {rooms.length} rooms · {plan.width.toFixed(1)}×{plan.height.toFixed(1)}m
      </text>
    </svg>
  )
}
