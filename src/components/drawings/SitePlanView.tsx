import { useMemo, type ReactNode } from 'react'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import { CAD_HAIR, CAD_MEDIUM, CAD_THIN, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { MATERIAL } from '@/components/drawings/drawingColors'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'
import {
  SheetBorder, TitleBlock, DimensionLineH,
} from '@/components/drawings/cadPrimitives'
import { NorthArrow, ScaleBar, CarSilhouette } from '@/components/drawings/entourage'

const MARGIN = 15

interface SitePlanViewProps {
  activePlan: PlanModel | null
  design: DesignOption | null
  floors: number
}

export function SitePlanView({ activePlan, design }: SitePlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderSitePlan(activePlan, design)
    } catch {
      return null
    }
  }, [activePlan, design])

  if (!rendered) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Drawing unavailable — no active plan</p>
      </div>
    )
  }

  return (
    <ZoomableDrawing>
      <svg
        viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`}
        className="block h-auto w-full"
        role="img"
        aria-label="SITE PLAN"
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </ZoomableDrawing>
  )
}

interface SitePlanSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

function renderSitePlan(plan: PlanModel | null, _design: DesignOption | null): SitePlanSheet | null {
  if (!plan || plan.width <= 0 || plan.height <= 0) return null

  // Assume a schematic plot: building inset from plot boundary
  const bw = plan.width
  const bh = plan.height
  const setback = Math.max(bw, bh) * 0.5  // indicative setback
  const plotW = bw + setback * 2
  const plotH = bh + setback * 2

  // Scale: fit the plot into the sheet
  const drawW = 500
  const drawH = 400
  const scale = Math.min(drawW / plotW, drawH / plotH)
  const s = (v: number) => v * scale

  const ox = MARGIN + 20  // plot left margin
  const oy = MARGIN + 20 + s(plotH)  // plot bottom Y (SVG Y down)

  const sheetW = MARGIN + 20 + s(plotW) + 140
  const sheetH = MARGIN + 20 + s(plotH) + 50

  const elements: ReactNode[] = []

  // White background
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)

  // ── Plot boundary (dashed, wide) ──
  const plotLeft = ox
  const plotRight = ox + s(plotW)
  const plotTop = oy - s(plotH)
  const plotBottom = oy

  elements.push(
    <rect
      key="plot-boundary"
      x={plotLeft}
      y={plotTop}
      width={s(plotW)}
      height={s(plotH)}
      fill="none"
      stroke={INK}
      strokeWidth={CAD_THIN}
      strokeDasharray="6 3"
    />,
  )

  // ── Building footprint (solid poché) ──
  const bldgLeft = ox + s(setback)
  const bldgTop = oy - s(setback) - s(bh)
  const bldgWidth = s(bw)
  const bldgHeight = s(bh)

  elements.push(
    <rect
      key="building-footprint"
      x={bldgLeft}
      y={bldgTop}
      width={bldgWidth}
      height={bldgHeight}
      fill={MATERIAL.concrete.fill}
      stroke={INK}
      strokeWidth={CAD_MEDIUM}
    />,
  )

  // Entry indicator (small triangle on bottom edge)
  const entryX = bldgLeft + bldgWidth / 2
  elements.push(
    <polygon
      key="entry"
      points={`${entryX - 4},${bldgTop + bldgHeight} ${entryX + 4},${bldgTop + bldgHeight} ${entryX},${bldgTop + bldgHeight - 6}`}
      fill={PAPER}
      stroke={INK}
      strokeWidth={CAD_HAIR}
    />,
  )

  // ── Road / access strip (bottom edge) ──
  const roadTop = plotBottom + 2
  const roadH = 20
  elements.push(
    <rect
      key="road"
      x={plotLeft - 10}
      y={roadTop}
      width={s(plotW) + 20}
      height={roadH}
      fill={PAPER}
      stroke={INK}
      strokeWidth={CAD_THIN}
    />,
  )
  // Road centre line (dashed)
  elements.push(
    <line
      key="road-centre"
      x1={plotLeft - 10}
      y1={roadTop + roadH / 2}
      x2={plotLeft + s(plotW) + 10}
      y2={roadTop + roadH / 2}
      stroke={INK}
      strokeWidth={CAD_HAIR}
      strokeDasharray="4 3"
    />,
  )

  // ── Trees (top view: circles with shadow) ──
  const trees = [
    { x: plotLeft + s(plotW) * 0.1, y: plotTop + s(plotH) * 0.15 },
    { x: plotLeft + s(plotW) * 0.85, y: plotTop + s(plotH) * 0.2 },
    { x: plotLeft + s(plotW) * 0.08, y: plotTop + s(plotH) * 0.7 },
    { x: plotLeft + s(plotW) * 0.8, y: plotTop + s(plotH) * 0.75 },
  ]
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i]
    const r = 6 + (i % 3) * 2
    elements.push(
      <g key={`tree-${i}`}>
        <ellipse cx={t.x + 2} cy={t.y + 2} rx={r} ry={r * 0.7} fill="#8a6d3b" opacity={0.12} />
        <circle cx={t.x} cy={t.y} r={r} fill="#5a9a5a" stroke={INK} strokeWidth={CAD_HAIR} />
      </g>,
    )
  }

  // ── Parking bays (stripped area) ──
  const parkX = plotRight + 5
  const parkY = plotBottom - 30
  elements.push(
    <rect
      key="parking"
      x={parkX}
      y={parkY}
      width={25}
      height={30}
      fill={PAPER}
      stroke={INK}
      strokeWidth={CAD_HAIR}
      strokeDasharray="2 2"
    />,
  )
  elements.push(
    <text key="park-lab" x={parkX + 12.5} y={parkY + 15} fontSize={4} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central">
      PARK
    </text>,
  )

  // ── Car silhouette on road ──
  elements.push(
    <CarSilhouette key="car" x={plotLeft + s(plotW) * 0.35} groundY={roadTop + roadH - 2} length={18} />,
  )

  // ── Setback dimensions ──
  const dimY = plotTop - 12
  elements.push(
    <DimensionLineH
      key="dim-plot-w"
      x1={plotLeft}
      x2={plotRight}
      y={dimY}
      label={metresToMm(plotW)}
    />,
  )
  elements.push(
    <DimensionLineH
      key="dim-setback-l"
      x1={plotLeft}
      x2={bldgLeft}
      y={dimY - 10}
      label={`${metresToMm(setback)} (schematic)`}
    />,
  )

  // ── North arrow ──
  elements.push(
    <NorthArrow key="north" cx={plotRight + 30} cy={plotTop + 25} size={18} />,
  )

  // ── Scale bar ──
  const scaleBarMetresPx = plotW / s(plotW)  // metres per px
  elements.push(
    <ScaleBar
      key="scale-bar"
      x={plotLeft}
      y={plotBottom + roadH + 15}
      totalPx={s(plotW) * 0.4}
      metresPerPx={scaleBarMetresPx}
    />,
  )

  // ── Drawing title ──
  elements.push(
    <text key="title" x={plotLeft + s(plotW) / 2} y={plotBottom + roadH + 40} fontSize={9} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
      SITE PLAN
    </text>,
  )

  // ── Coverage note ──
  const footprintArea = bw * bh
  const plotArea = plotW * plotH
  const coveragePct = ((footprintArea / plotArea) * 100).toFixed(1)
  elements.push(
    <text key="coverage" x={plotLeft + s(plotW) / 2} y={plotBottom + roadH + 50} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
      Site coverage {coveragePct}% (indicative — verify with local authority)
    </text>,
  )

  // ── Title block ──
  elements.push(
    <TitleBlock
      key="title-block"
      title="SITE PLAN"
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
