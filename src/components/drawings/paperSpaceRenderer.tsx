import type { ReactNode } from 'react'
import { INK, PAPER, CAD_HAIR } from '@/components/drawings/cadConstants'

export function ScaleBar({ x, y, lengthMm, label }: { x: number; y: number; lengthMm: number; label?: string }): ReactNode {
  const segW = lengthMm / 4
  return (
    <g>
      <rect x={x} y={y} width={segW} height={4} fill={INK} stroke={INK} strokeWidth={0.3} />
      <rect x={x + segW} y={y} width={segW} height={4} fill={PAPER} stroke={INK} strokeWidth={0.3} />
      <rect x={x + segW * 2} y={y} width={segW} height={4} fill={INK} stroke={INK} strokeWidth={0.3} />
      <rect x={x + segW * 3} y={y} width={segW} height={4} fill={PAPER} stroke={INK} strokeWidth={0.3} />
      <text x={x} y={y + 10} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        0
      </text>
      <text x={x + lengthMm} y={y + 10} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        {label ?? `${lengthMm}mm`}
      </text>
    </g>
  )
}

export function NorthArrow({ cx, cy, size = 8 }: { cx: number; cy: number; size?: number }): ReactNode {
  return (
    <g>
      <circle cx={cx} cy={cy} r={size + 4} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <polygon
        points={`${cx},${cy - size - 3} ${cx - 3},${cy + size - 3} ${cx},${cy + size * 0.3} ${cx + 3},${cy + size - 3}`}
        fill={INK}
        stroke="none"
      />
      <polygon
        points={`${cx},${cy + size + 3} ${cx - 3},${cy - size + 3} ${cx},${cy - size * 0.3} ${cx + 3},${cy - size + 3}`}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      <text x={cx} y={cy + size + 12} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" fontWeight="bold">
        N
      </text>
    </g>
  )
}
