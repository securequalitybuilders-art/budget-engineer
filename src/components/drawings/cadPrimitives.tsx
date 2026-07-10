import type { ReactNode } from 'react'
import { CAD_THIN, CAD_HAIR, INK, PAPER } from '@/components/drawings/cadConstants'
import type { DimensionStyle } from '@/lib/drawings/dimensionStyles'
import { dimArrowPath } from '@/lib/drawings/dimensionStyles'

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

// ── Horizontal dimension line (top) — enhanced ──
interface DimHProps {
  x1: number
  x2: number
  y: number
  label: string
  style?: DimensionStyle
}

export function DimensionLineH({ x1, x2, y, label, style }: DimHProps): ReactNode {
  const mid = (x1 + x2) / 2
  const col = style?.lineColor ?? INK
  const txtCol = style?.textColor ?? INK
  const fontSize = style?.textHeight ?? 6
  const ext = style?.extensionLineExtend ?? 2.5
  const off = style?.offsetFromOrigin ?? 2
  const arrowPath = style ? dimArrowPath(style) : null

  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={col} strokeWidth={CAD_HAIR} />
      <line x1={x1} y1={y - ext} x2={x1} y2={y + ext} stroke={col} strokeWidth={CAD_HAIR} />
      <line x1={x2} y1={y - ext} x2={x2} y2={y + ext} stroke={col} strokeWidth={CAD_HAIR} />
      {arrowPath ? (
        <>
          <path d={arrowPath} fill={col} transform={`translate(${x1}, ${y}) rotate(0)`} />
          <path d={arrowPath} fill={col} transform={`translate(${x2}, ${y}) rotate(180)`} />
        </>
      ) : (
        <>
          <line x1={mid} y1={y - 1.5} x2={mid} y2={y} stroke={col} strokeWidth={CAD_HAIR} />
        </>
      )}
      <text x={mid} y={y - off - 1} fontSize={fontSize} fill={txtCol} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </text>
    </g>
  )
}

// ── Vertical dimension line (left) — enhanced ──
interface DimVProps {
  y1: number
  y2: number
  x: number
  label: string
  style?: DimensionStyle
}

export function DimensionLineV({ y1, y2, x, label, style }: DimVProps): ReactNode {
  const mid = (y1 + y2) / 2
  const col = style?.lineColor ?? INK
  const txtCol = style?.textColor ?? INK
  const fontSize = style?.textHeight ?? 6
  const ext = style?.extensionLineExtend ?? 2.5
  const off = style?.offsetFromOrigin ?? 2

  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={col} strokeWidth={CAD_HAIR} />
      <line x1={x - ext} y1={y1} x2={x + ext} y2={y1} stroke={col} strokeWidth={CAD_HAIR} />
      <line x1={x - ext} y1={y2} x2={x + ext} y2={y2} stroke={col} strokeWidth={CAD_HAIR} />
      <text x={x - off - 1} y={mid + fontSize * 0.35} fontSize={fontSize} fill={txtCol} fontFamily="Arial, Helvetica, sans-serif" textAnchor="end" transform={`rotate(-90, ${x - off - 1}, ${mid + fontSize * 0.35})`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </text>
    </g>
  )
}

// ── Aligned dimension (angled) ──
interface DimAlignedProps {
  x1: number; y1: number; x2: number; y2: number
  label: string
  style?: DimensionStyle
}
export function DimensionLineAligned({ x1, y1, x2, y2, label, style }: DimAlignedProps): ReactNode {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
  const col = style?.lineColor ?? INK
  const txtCol = style?.textColor ?? INK
  const fontSize = style?.textHeight ?? 6
  const ext = style?.extensionLineExtend ?? 2.5

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={CAD_HAIR} />
      <line x1={x1} y1={y1 - ext} x2={x1} y2={y1 + ext} stroke={col} strokeWidth={CAD_HAIR} transform={`rotate(${angle}, ${x1}, ${y1})`} />
      <line x1={x2} y1={y2 - ext} x2={x2} y2={y2 + ext} stroke={col} strokeWidth={CAD_HAIR} transform={`rotate(${angle}, ${x2}, ${y2})`} />
      <text x={midX} y={midY - ext - 1} fontSize={fontSize} fill={txtCol} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
