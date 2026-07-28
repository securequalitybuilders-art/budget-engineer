import type { EgressPoint } from '@/domain/plan'

const EGRESS_COLORS: Record<string, string> = {
  'main-entry': '#22c55e',
  'secondary-exit': '#f59e0b',
  'emergency-exit': '#ef4444',
}

const EGRESS_LABELS: Record<string, string> = {
  'main-entry': 'MAIN',
  'secondary-exit': 'SEC',
  'emergency-exit': 'EMERG',
}

interface EgressOverlayProps {
  egressPoints: EgressPoint[]
  maxTravelDistance?: number
  egressCompliant?: boolean
}

export function EgressOverlay({ egressPoints, maxTravelDistance, egressCompliant }: EgressOverlayProps) {
  return (
    <g>
      {egressPoints.map((ep, i) => {
        const color = EGRESS_COLORS[ep.type] ?? '#94a3b8'
        const label = EGRESS_LABELS[ep.type] ?? ep.type
        return (
          <g key={`egress-${i}`}>
            <circle cx={ep.x} cy={ep.y} r={0.3} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.06} />
            <circle cx={ep.x} cy={ep.y} r={0.12} fill={color} />
            <text x={ep.x} y={ep.y - 0.5} fill={color} fontSize={0.28} fontWeight="bold" textAnchor="middle" pointerEvents="none">
              {label}
            </text>
            <text x={ep.x} y={ep.y + 0.5} fill={color} fontSize={0.22} textAnchor="middle" pointerEvents="none">
              {ep.label}
            </text>
          </g>
        )
      })}
      {maxTravelDistance != null && (
        <g>
          <rect x={0.2} y={-2.6} width={3.6} height={0.9} rx={0.12} fill={egressCompliant ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'} stroke={egressCompliant ? '#22c55e' : '#ef4444'} strokeWidth={0.04} />
          <text x={0.4} y={-2.0} fill={egressCompliant ? '#22c55e' : '#ef4444'} fontSize={0.28} fontWeight="bold" pointerEvents="none">
            Travel: {maxTravelDistance.toFixed(1)}m {egressCompliant ? '✓' : '✗'}
          </text>
          <text x={0.4} y={-2.0} fontSize={0.2} fill="#94a3b8" dy={0.35} pointerEvents="none">
            Max allowed: 18m
          </text>
        </g>
      )}
    </g>
  )
}
