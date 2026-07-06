import type { ReactNode } from 'react'

function s(size: number): number { return Math.max(size, 4) }

export function LightFixture({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.4
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.6} />
      <line x1={cx - r * 0.6} y1={cy} x2={cx + r * 0.6} y2={cy} stroke={color} strokeWidth={0.4} />
      <line x1={cx} y1={cy - r * 0.6} x2={cx} y2={cy + r * 0.6} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function Socket({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.35
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.6} />
      <line x1={cx - r * 0.4} y1={cy} x2={cx + r * 0.4} y2={cy} stroke={color} strokeWidth={0.4} />
      <line x1={cx} y1={cy - r * 0.4} x2={cx} y2={cy + r * 0.4} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function Switch({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.3
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.15} stroke={color} strokeWidth={0.6} />
      <text x={cx} y={cy + 1.2} fontSize={5} fill={color} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central" fontWeight="bold">S</text>
    </g>
  )
}

export function DistributionBoard({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const h = s(size)
  const w = h * 0.7
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="none" stroke={color} strokeWidth={0.6} />
      <text x={cx} y={cy + 1.2} fontSize={5} fill={color} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central" fontWeight="bold">DB</text>
    </g>
  )
}

export function WaterCloset({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const h = s(size)
  const w = h * 0.6
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="none" stroke={color} strokeWidth={0.6} />
      <text x={cx} y={cy + 1.2} fontSize={5} fill={color} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central" fontWeight="bold">WC</text>
    </g>
  )
}

export function Basin({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.3
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.6} />
      <line x1={cx - r * 0.3} y1={cy} x2={cx + r * 0.3} y2={cy} stroke={color} strokeWidth={0.4} />
      <line x1={cx} y1={cy - r * 0.3} x2={cx} y2={cy + r * 0.3} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function Shower({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.35
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.4} strokeDasharray="2 1.5" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={color} strokeWidth={0.4} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function Sink({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const w = s(size)
  const h = w * 0.6
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="none" stroke={color} strokeWidth={0.6} rx={2} />
      <line x1={cx - w * 0.2} y1={cy} x2={cx + w * 0.2} y2={cy} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function FloorDrain({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.25
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.6} />
      <line x1={cx - r * 0.5} y1={cy} x2={cx + r * 0.5} y2={cy} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function StackRiser({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const r = s(size) * 0.3
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.2} stroke={color} strokeWidth={0.6} />
      <text x={cx} y={cy + 1.2} fontSize={5} fill={color} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central" fontWeight="bold">↑</text>
    </g>
  )
}

export function SupplyDiffuser({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const h = s(size)
  const w = h
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="none" stroke={color} strokeWidth={0.6} />
      <line x1={cx - w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy + h / 2} stroke={color} strokeWidth={0.4} />
      <line x1={cx + w / 2} y1={cy - h / 2} x2={cx - w / 2} y2={cy + h / 2} stroke={color} strokeWidth={0.4} />
    </g>
  )
}

export function ReturnGrille({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const h = s(size)
  const w = h
  const slatCount = 3
  const slatGap = h / (slatCount + 1)
  const slats: ReactNode[] = []
  for (let i = 1; i <= slatCount; i++) {
    const sy = cy - h / 2 + i * slatGap
    slats.push(<line key={i} x1={cx - w / 2} y1={sy} x2={cx + w / 2} y2={sy} stroke={color} strokeWidth={0.4} />)
  }
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="none" stroke={color} strokeWidth={0.6} />
      {slats}
    </g>
  )
}

export function FanCoilUnit({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }): ReactNode {
  const h = s(size)
  const w = h * 1.4
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="none" stroke={color} strokeWidth={0.6} rx={3} />
      <text x={cx} y={cy + 1.2} fontSize={5} fill={color} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central" fontWeight="bold">FCU</text>
    </g>
  )
}
