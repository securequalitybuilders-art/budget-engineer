import { useMemo, type ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { ROOF_OVERHANG } from '@/adapters/planTo3d'
import { CAD_HAIR, CAD_MEDIUM, CAD_THIN, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import {
  SheetBorder, TitleBlock, DimensionLineH, DimensionLineV, GridBubble, DrawingTitle,
} from '@/components/drawings/cadPrimitives'
import { NorthArrow, ScaleBar } from '@/components/drawings/entourage'

const MARGIN = 15

interface RoofPlanViewProps {
  activePlan: PlanModel | null
}

export function RoofPlanView({ activePlan }: RoofPlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderRoofPlan(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rendered) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Drawing unavailable — no active plan</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950/80">
      <svg
        viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`}
        className="block h-auto w-full"
        role="img"
        aria-label="ROOF PLAN"
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </div>
  )
}

export interface RoofSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

export function renderRoofPlan(plan: PlanModel | null): RoofSheet | null {
  if (!plan || plan.width <= 0 || plan.height <= 0) return null

  const bw = plan.width
  const bh = plan.height
  const overhang = ROOF_OVERHANG
  const rw = bw + overhang * 2
  const rh = bh + overhang * 2

  const drawW = 500
  const drawH = 400
  const scale = Math.min(drawW / rw, drawH / rh)
  const s = (v: number) => v * scale

  const ox = MARGIN + 30
  const oy = MARGIN + 30 + s(rh)

  const sheetW = MARGIN + 30 + s(rw) + 160
  const sheetH = MARGIN + 30 + s(rh) + 60

  const elements: ReactNode[] = []

  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)

  const roofLeft = ox
  const roofRight = ox + s(rw)
  const roofTop = oy - s(rh)
  const roofBottom = oy

  // ── Eaves outline (thin dashed outer) ──
  elements.push(
    <rect
      key="eaves"
      x={roofLeft}
      y={roofTop}
      width={s(rw)}
      height={s(rh)}
      fill="none"
      stroke={INK}
      strokeWidth={CAD_HAIR}
      strokeDasharray="3 2"
    />,
  )

  // ── Building footprint below roof (solid poché) ──
  const bldgInset = s(overhang)
  elements.push(
    <rect
      key="footprint"
      x={roofLeft + bldgInset}
      y={roofTop + bldgInset}
      width={s(bw)}
      height={s(bh)}
      fill={PAPER}
      stroke={INK}
      strokeWidth={CAD_THIN}
    />,
  )

  // ── Ridge line (centre) ──
  const ridgeX1 = roofLeft + bldgInset
  const ridgeX2 = roofLeft + bldgInset + s(bw)
  const ridgeY = roofTop + bldgInset + s(bh) / 2
  elements.push(
    <line
      key="ridge"
      x1={ridgeX1}
      y1={ridgeY}
      x2={ridgeX2}
      y2={ridgeY}
      stroke={INK}
      strokeWidth={CAD_MEDIUM}
    />,
  )

  // ── Slope lines from ridge to eaves ──
  const slopeY1 = roofTop + bldgInset
  const slopeY2 = roofBottom - bldgInset
  const slopeCount = 4
  for (let i = 0; i <= slopeCount; i++) {
    const t = i / slopeCount
    const sx = ridgeX1 + t * s(bw)
    elements.push(
      <line
        key={`slope-top-${i}`}
        x1={sx}
        y1={ridgeY}
        x2={sx}
        y2={slopeY1}
        stroke={INK}
        strokeWidth={CAD_HAIR}
        opacity={0.5}
      />,
    )
    elements.push(
      <line
        key={`slope-bot-${i}`}
        x1={sx}
        y1={ridgeY}
        x2={sx}
        y2={slopeY2}
        stroke={INK}
        strokeWidth={CAD_HAIR}
        opacity={0.5}
      />,
    )
  }

  // ── Slope-direction arrows with pitch note ──
  const arrowY = roofTop + bldgInset + s(bh) * 0.15
  elements.push(
    <g key="slope-arrow">
      <line x1={ridgeX1 + s(bw) * 0.6} y1={ridgeY} x2={ridgeX1 + s(bw) * 0.6} y2={arrowY} stroke={INK} strokeWidth={CAD_HAIR} />
      <polygon points={`${ridgeX1 + s(bw) * 0.6 - 3},${arrowY + 3} ${ridgeX1 + s(bw) * 0.6 + 3},${arrowY + 3} ${ridgeX1 + s(bw) * 0.6},${arrowY}`} fill={INK} />
      <text x={ridgeX1 + s(bw) * 0.6 + 6} y={arrowY + s(bh) * 0.08} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif">
        FALL ~1:4
      </text>
    </g>,
  )

  // ── Gutter line (along low eaves edges) ──
  const gutterY = roofBottom - bldgInset
  elements.push(
    <line
      key="gutter"
      x1={roofLeft}
      y1={gutterY}
      x2={roofRight}
      y2={gutterY}
      stroke={INK}
      strokeWidth={CAD_THIN}
    />,
  )

  // ── Downpipe markers at two corners ──
  const dpSize = 4
  const dpPositions = [
    { x: roofRight - 2, y: gutterY },
    { x: roofLeft + 2, y: gutterY },
  ]
  for (let i = 0; i < dpPositions.length; i++) {
    const dp = dpPositions[i]
    elements.push(
      <g key={`downpipe-${i}`}>
        <circle cx={dp.x} cy={dp.y - dpSize / 2} r={dpSize / 2} fill={INK} />
        <line x1={dp.x} y1={dp.y - dpSize / 2} x2={dp.x} y2={dp.y + dpSize / 2} stroke={INK} strokeWidth={CAD_THIN} />
        <text x={dp.x + 5} y={dp.y + 2} fontSize={4} fill={INK} fontFamily="system-ui, sans-serif" opacity={0.6}>
          DP
        </text>
      </g>,
    )
  }

  // ── Overall dimensions (including overhang) ──
  const dimY = MARGIN + 15
  const dimX = MARGIN + 15
  elements.push(
    <DimensionLineH key="dim-h" x1={roofLeft} x2={roofRight} y={dimY} label={metresToMm(rw)} />,
  )
  elements.push(
    <DimensionLineV key="dim-v" y1={roofBottom} y2={roofTop} x={dimX} label={metresToMm(rh)} />,
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
        cx={roofLeft + bldgInset + s(gridPoints[i] / 100 - (plan.walls[0]?.start.x ?? 0))}
        cy={dimY - 12}
        label={gridLabels[i]}
        dropToY={dimY}
      />,
    )
  }

  // ── North arrow ──
  elements.push(
    <NorthArrow key="north" cx={roofRight + 25} cy={roofTop + 25} size={18} />,
  )

  // ── Scale bar ──
  const metresPerPx = rw / s(rw)
  elements.push(
    <ScaleBar
      key="scale-bar"
      x={roofLeft}
      y={roofBottom + 15}
      totalPx={s(rw) * 0.4}
      metresPerPx={metresPerPx}
    />,
  )

  // ── Drawing title ──
  elements.push(
    <DrawingTitle key="title" text="ROOF PLAN" x={roofLeft + s(rw) / 2} y={roofBottom + 35} />,
  )

  // ── Legend ──
  const legendItems = [
    { key: 'ridge', label: 'Ridge' },
    { key: 'eaves', label: 'Eaves' },
    { key: 'gutter', label: 'Gutter' },
    { key: 'downpipe', label: 'Downpipe' },
  ]
  const legendX = roofRight + 8
  const legendY = roofTop + 10
  const legendRowH = 14
  const legendW = 100
  const legendH = legendItems.length * legendRowH + 8
  elements.push(
    <g key="legend">
      <rect x={legendX} y={legendY} width={legendW} height={legendH} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <text x={legendX + 4} y={legendY + 8} fontSize={5} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif">
        ROOF LEGEND
      </text>
      {legendItems.map((item, i) => (
        <text key={item.key} x={legendX + 4} y={legendY + 8 + (i + 1) * legendRowH} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif">
          {item.key} — {item.label}
        </text>
      ))}
    </g>,
  )

  // ── Material note ──
  elements.push(
    <text key="mat-note" x={roofLeft + s(rw) / 2} y={roofBottom + 45} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
      Roof covering indicative (IBR / tile — confirm with spec)
    </text>,
  )

  // ── Title block ──
  elements.push(
    <TitleBlock
      key="title-block"
      title="ROOF PLAN"
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
