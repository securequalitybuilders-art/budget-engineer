import type { ReactNode } from 'react'
import { INK, PAPER, CAD_HAIR, PEN_025 } from '@/components/drawings/cadConstants'

interface DoorSwingProps {
  hingeX: number
  hingeY: number
  swingEndX: number
  swingEndY: number
  openDirection: 'cw' | 'ccw'
  scale?: number
}

export function DoorSwing({ hingeX, hingeY, swingEndX, swingEndY, openDirection, scale = 1 }: DoorSwingProps): ReactNode {
  const dx = swingEndX - hingeX
  const dy = swingEndY - hingeY
  const radius = Math.hypot(dx, dy)
  const startAngle = Math.atan2(dy, dx)
  const sweepAngle = openDirection === 'cw' ? Math.PI / 2 : -Math.PI / 2

  const startA = startAngle
  const endA = startAngle + sweepAngle
  const r = radius

  const x1 = hingeX + r * Math.cos(startA)
  const y1 = hingeY + r * Math.sin(startA)
  const x2 = hingeX + r * Math.cos(endA)
  const y2 = hingeY + r * Math.sin(endA)

  const largeArc = Math.abs(sweepAngle) > Math.PI ? 1 : 0
  const sweep = sweepAngle > 0 ? 1 : 0

  return (
    <g>
      <circle cx={hingeX} cy={hingeY} r={1.2 * scale} fill={INK} stroke="none" />
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
        fill="none"
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      <line x1={hingeX} y1={hingeY} x2={swingEndX} y2={swingEndY} stroke={INK} strokeWidth={CAD_HAIR} />
    </g>
  )
}

interface WindowGlazingProps {
  x: number
  y: number
  width: number
  angle: number
  scale?: number
}

export function WindowGlazing({ x, y, width, angle, scale = 1 }: WindowGlazingProps): ReactNode {
  const bars = Math.max(1, Math.floor(width / (0.4 * scale)))
  const barSpacing = width / (bars + 1)
  const barLines: ReactNode[] = []

  for (let i = 1; i <= bars; i++) {
    const bx = x - width / 2 + i * barSpacing
    barLines.push(
      <line
        key={`glazing-${i}`}
        x1={bx}
        y1={y - 4 * scale}
        x2={bx}
        y2={y + 4 * scale}
        stroke={INK}
        strokeWidth={CAD_HAIR}
        transform={`rotate(${-angle * (180 / Math.PI)}, ${bx}, ${y})`}
      />,
    )
  }

  return (
    <g>
      <line x1={x - width / 2} y1={y} x2={x + width / 2} y2={y} stroke={INK} strokeWidth={PEN_025} />
      <line
        x1={x - width / 2}
        y1={y - 4 * scale}
        x2={x - width / 2}
        y2={y + 4 * scale}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      <line
        x1={x + width / 2}
        y1={y - 4 * scale}
        x2={x + width / 2}
        y2={y + 4 * scale}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      {barLines}
    </g>
  )
}

interface OpeningTagProps {
  x: number
  y: number
  label: string
}

export function OpeningTag({ x, y, label }: OpeningTagProps): ReactNode {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={PAPER} stroke={INK} strokeWidth={CAD_HAIR} />
      <text
        x={x}
        y={y + 1.5}
        fontSize={5}
        fill={INK}
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  )
}

