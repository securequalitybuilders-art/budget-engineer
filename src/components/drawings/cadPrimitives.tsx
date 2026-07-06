import type { ReactNode } from 'react'
import { CAD_THIN, CAD_HAIR, INK, PAPER } from '@/components/drawings/cadConstants'

// ── SVG defs for hatch patterns ──
export function HatchDefs(): ReactNode {
  return (
    <defs>
      {/* Poché hatch: 45° diagonal lines for cut walls */}
      <pattern id="poche" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth={CAD_HAIR} />
      </pattern>
      {/* Earth hatch: denser stipple for ground */}
      <pattern id="earth" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <line x1="0" y1="0" x2="0" y2="4" stroke={INK} strokeWidth={CAD_HAIR * 0.6} />
        <line x1="2" y1="0" x2="2" y2="4" stroke={INK} strokeWidth={CAD_HAIR * 0.3} />
      </pattern>
    </defs>
  )
}

// ── Sheet border (thin rect around whole drawing) ──
interface SheetBorderProps {
  width: number
  height: number
  margin?: number
}

export function SheetBorder({ width, height, margin = 10 }: SheetBorderProps): ReactNode {
  return (
    <rect
      x={margin}
      y={margin}
      width={width - margin * 2}
      height={height - margin * 2}
      fill="none"
      stroke={INK}
      strokeWidth={CAD_HAIR}
    />
  )
}

// ── Title block (bottom-right) ──
interface TitleBlockProps {
  title: string
  projectName?: string
  date?: string
  sheetWidth: number
  sheetHeight: number
  margin?: number
}

export function TitleBlock({ title, projectName, date, sheetWidth, sheetHeight, margin = 10 }: TitleBlockProps): ReactNode {
  const bw = 140
  const bh = 50
  const rx = sheetWidth - margin - bw
  const ry = sheetHeight - margin - bh
  const now = date ?? new Date().toISOString().slice(0, 10)
  return (
    <g>
      <rect x={rx} y={ry} width={bw} height={bh} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <text x={rx + 4} y={ry + 12} fontSize={7} fill={INK} fontFamily="system-ui, sans-serif" fontWeight="bold">
        {title}
      </text>
      <text x={rx + 4} y={ry + 22} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif">
        {projectName ?? 'Budget Engineer'}
      </text>
      <text x={rx + 4} y={ry + 31} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif">
        SCALE 1:100 (approx)
      </text>
      <text x={rx + 4} y={ry + 39} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif">
        Dimensions in mm
      </text>
      <text x={rx + 4} y={ry + 47} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif">
        {now} · DzeNhare OS
      </text>
    </g>
  )
}

// ── Horizontal dimension line (top) ──
interface DimHProps {
  x1: number
  x2: number
  y: number
  label: string
}

export function DimensionLineH({ x1, x2, y, label }: DimHProps): ReactNode {
  const mid = (x1 + x2) / 2
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={x1} y1={y - 2.5} x2={x1} y2={y + 2.5} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={x2} y1={y - 2.5} x2={x2} y2={y + 2.5} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={mid} y1={y - 1.5} x2={mid} y2={y} stroke={INK} strokeWidth={CAD_HAIR} />
      <text x={mid} y={y - 3} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

// ── Vertical dimension line (left) ──
interface DimVProps {
  y1: number
  y2: number
  x: number
  label: string
}

export function DimensionLineV({ y1, y2, x, label }: DimVProps): ReactNode {
  const mid = (y1 + y2) / 2
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={x - 2.5} y1={y1} x2={x + 2.5} y2={y1} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={x - 2.5} y1={y2} x2={x + 2.5} y2={y2} stroke={INK} strokeWidth={CAD_HAIR} />
      <text x={x - 3} y={mid + 2} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="end" transform={`rotate(-90, ${x - 3}, ${mid + 2})`}>
        {label}
      </text>
    </g>
  )
}

// ── Grid bubble (circle + drop line) ──
interface GridBubbleProps {
  cx: number
  cy: number
  label: string
  dropToY: number
}

export function GridBubble({ cx, cy, label, dropToY }: GridBubbleProps): ReactNode {
  return (
    <g>
      <line x1={cx} y1={cy} x2={cx} y2={dropToY} stroke={INK} strokeWidth={CAD_HAIR} strokeDasharray="2 1.5" />
      <circle cx={cx} cy={cy} r={5} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <text x={cx} y={cy + 1.5} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  )
}

// ── Level marker ──
interface LevelMarkerProps {
  x: number
  y: number
  label: string
}

export function LevelMarker({ x, y, label }: LevelMarkerProps): ReactNode {
  return (
    <g>
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke={INK} strokeWidth={CAD_THIN} />
      <line x1={x - 3} y1={y} x2={x - 3} y2={y - 4} stroke={INK} strokeWidth={CAD_THIN} />
      <polygon points={`${x - 5},${y} ${x - 3},${y - 4} ${x - 1},${y}`} fill={INK} stroke="none" />
      <text x={x + 7} y={y + 3} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif">
        {label}
      </text>
    </g>
  )
}

// ── Drawing title underline ──
interface DrawingTitleProps {
  text: string
  x: number
  y: number
}

export function DrawingTitle({ text, x, y }: DrawingTitleProps): ReactNode {
  const tw = text.length * 4.5
  return (
    <g>
      <text x={x} y={y} fontSize={8} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
        {text}
      </text>
      <line x1={x - tw / 2} y1={y + 2} x2={x + tw / 2} y2={y + 2} stroke={INK} strokeWidth={CAD_THIN} />
    </g>
  )
}
