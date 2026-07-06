import type { ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { CAD_HAIR, CAD_THIN, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { DISCIPLINE } from '@/components/drawings/drawingColors'
import {
  SheetBorder, TitleBlock, DimensionLineH, DimensionLineV, GridBubble, DrawingTitle,
} from '@/components/drawings/cadPrimitives'
import { NorthArrow, ScaleBar } from '@/components/drawings/entourage'

const MARGIN = 15
const CEILING_GRID = 0.6

export interface CeilingSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

export function renderCeilingPlan(plan: PlanModel | null): CeilingSheet | null {
  if (!plan || plan.width <= 0 || plan.height <= 0) return null

  const bw = plan.width
  const bh = plan.height

  const drawW = 550
  const drawH = 400
  const scale = Math.min(drawW / bw, drawH / bh)
  const s = (v: number) => v * scale

  const ox = MARGIN + 30
  const oy = MARGIN + 30 + s(bh)

  const sheetW = MARGIN + 30 + s(bw) + 160
  const sheetH = MARGIN + 30 + s(bh) + 60

  const elements: ReactNode[] = []

  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)

  const planLeft = ox
  const planRight = ox + s(bw)
  const planTop = oy - s(bh)
  const planBottom = oy

  // ── Room outlines (ceiling plan mirrors floor, so same outline) ──
  for (const wall of plan.walls) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const cx = (wall.start.x + wall.end.x) / 2
    const cy = (wall.start.y + wall.end.y) / 2
    const wallThk = wall.thickness || plan.wallThickness || 0.23
    const ww = s(wl)
    const wh = Math.max(s(wallThk), 2)

    elements.push(
      <rect
        key={`wall-${wall.id}`}
        x={ox + s(cx) - ww / 2}
        y={oy - s(cy) - wh / 2}
        width={ww}
        height={wh}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_THIN}
        transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`}
      />,
    )
  }

  // ── Ceiling grid + light fixtures per room ──
  const electricalColor = DISCIPLINE.electrical.color

  for (const room of plan.rooms) {
    const rx = ox + s(room.x)
    const ry = oy - s(room.y) - s(room.height)
    const rw = s(room.width)
    const rh = s(room.height)
    const isLarge = rw > 30 && rh > 30
    const gridStepS = s(CEILING_GRID)
    const effectiveGridStep = Math.max(gridStepS, 10)

    // Ceiling grid lines (only for larger rooms)
    if (isLarge) {
      for (let gx = rx + effectiveGridStep; gx < rx + rw; gx += effectiveGridStep) {
        elements.push(
          <line
            key={`grid-v-${room.id}-${gx.toFixed(0)}`}
            x1={gx}
            y1={ry}
            x2={gx}
            y2={ry + rh}
            stroke={INK}
            strokeWidth={CAD_HAIR}
            opacity={0.25}
          />,
        )
      }
      for (let gy = ry + effectiveGridStep; gy < ry + rh; gy += effectiveGridStep) {
        elements.push(
          <line
            key={`grid-h-${room.id}-${gy.toFixed(0)}`}
            x1={rx}
            y1={gy}
            x2={rx + rw}
            y2={gy}
            stroke={INK}
            strokeWidth={CAD_HAIR}
            opacity={0.25}
          />,
        )
      }
    }

    // Light fixture (circle + cross at room centre) using electrical discipline colour
    const lcx = rx + rw / 2
    const lcy = ry + rh / 2
    const lr = Math.min(rw, rh) * 0.08
    elements.push(
      <g key={`light-${room.id}`}>
        <circle cx={lcx} cy={lcy} r={Math.max(lr, 4)} fill="none" stroke={electricalColor} strokeWidth={CAD_THIN} />
        <line x1={lcx - lr * 0.6} y1={lcy} x2={lcx + lr * 0.6} y2={lcy} stroke={electricalColor} strokeWidth={CAD_HAIR} />
        <line x1={lcx} y1={lcy - lr * 0.6} x2={lcx} y2={lcy + lr * 0.6} stroke={electricalColor} strokeWidth={CAD_HAIR} />
      </g>,
    )
  }

  // ── Overall dimensions ──
  const dimY = MARGIN + 15
  const dimX = MARGIN + 15
  elements.push(
    <DimensionLineH key="dim-h" x1={planLeft} x2={planRight} y={dimY} label={metresToMm(bw)} />,
  )
  elements.push(
    <DimensionLineV key="dim-v" y1={planBottom} y2={planTop} x={dimX} label={metresToMm(bh)} />,
  )

  // ── Grid bubbles ──
  const gridLabels = 'ABCDEFGH'
  const gridPoints = [...new Set(
    plan.walls.flatMap(w => [Math.round(w.start.x * 100), Math.round(w.end.x * 100)]),
  )].sort((a, b) => a - b)
  for (let i = 0; i < gridPoints.length && i < gridLabels.length; i++) {
    elements.push(
      <GridBubble
        key={`grid-${i}`}
        cx={planLeft + s(gridPoints[i] / 100 - (plan.walls[0]?.start.x ?? 0))}
        cy={dimY - 12}
        label={gridLabels[i]}
        dropToY={dimY}
      />,
    )
  }

  // ── North arrow ──
  elements.push(
    <NorthArrow key="north" cx={planRight + 25} cy={planTop + 25} size={18} />,
  )

  // ── Scale bar ──
  const metresPerPx = bw / s(bw)
  elements.push(
    <ScaleBar
      key="scale-bar"
      x={planLeft}
      y={planBottom + 15}
      totalPx={s(bw) * 0.4}
      metresPerPx={metresPerPx}
    />,
  )

  // ── Drawing title ──
  elements.push(
    <DrawingTitle key="title" text="REFLECTED CEILING PLAN" x={planLeft + s(bw) / 2} y={planBottom + 35} />,
  )

  // ── Level note ──
  elements.push(
    <text key="lvl-note" x={planLeft + s(bw) / 2} y={planBottom + 43} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
      Ground Floor RCP · Ceiling height ~2.7 m indicative
    </text>,
  )

  // ── Schematic note ──
  elements.push(
    <text key="schematic-note" x={planLeft + s(bw) / 2} y={planBottom + 50} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
      Ceiling layout schematic — verify with electrical engineer
    </text>,
  )

  // ── Legend ──
  const legendItems = [
    { symbol: 'O', label: 'Ceiling grid' },
    { symbol: 'X', label: 'Light fixture' },
  ]
  const legendX = planRight + 8
  const legendY = planTop + 10
  const legendRowH = 14
  const legendW = 100
  const legendH = legendItems.length * legendRowH + 8
  elements.push(
    <g key="legend">
      <rect x={legendX} y={legendY} width={legendW} height={legendH} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <text x={legendX + 4} y={legendY + 8} fontSize={5} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif">
        RCP LEGEND
      </text>
      {legendItems.map((item, i) => (
        <text key={item.symbol} x={legendX + 4} y={legendY + 8 + (i + 1) * legendRowH} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif">
          {item.symbol} — {item.label}
        </text>
      ))}
    </g>,
  )

  // ── Title block ──
  elements.push(
    <TitleBlock
      key="title-block"
      title="REFLECTED CEILING PLAN"
      projectName={plan.id ? `Design: ${plan.id.slice(0, 8)}` : 'Budget Engineer'}
      sheetWidth={sheetW}
      sheetHeight={sheetH}
    />,
  )

  // ── Sheet border ──
  elements.push(
    <SheetBorder key="border" width={sheetW} height={sheetH} />,
  )

  return { sheetW, sheetH, elements }
}
