import { useMemo, type ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { FALLBACK_WALL_THICKNESS } from '@/adapters/planTo3d'
import { CAD_HAIR, CAD_MEDIUM, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { MATERIAL_LEGEND } from '@/components/drawings/drawingColors'
import {
  SheetBorder, TitleBlock, DimensionLineH, DimensionLineV, GridBubble,
} from '@/components/drawings/cadPrimitives'
import { MaterialHatchDefs, LegendBox } from '@/components/drawings/drawingLegend'
import { NorthArrow, ScaleBar } from '@/components/drawings/entourage'

const MARGIN = 15

interface FoundationPlanViewProps {
  activePlan: PlanModel | null
  floors: number
}

export function FoundationPlanView({ activePlan }: FoundationPlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderFoundationPlan(activePlan)
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
        aria-label="FOUNDATION PLAN"
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </div>
  )
}

interface FoundationSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

function renderFoundationPlan(plan: PlanModel | null): FoundationSheet | null {
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
  const sheetH = MARGIN + 30 + s(bh) + 50

  const elements: ReactNode[] = []

  // White background
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  elements.push(<MaterialHatchDefs key="mat-defs" />)

  // ── Footing bands beneath each wall ──
  for (const wall of plan.walls) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue

    const wallThk = wall.thickness || plan.wallThickness || FALLBACK_WALL_THICKNESS
    const footingW = wallThk * 2.5  // indicative footing width
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)

    const cx = (wall.start.x + wall.end.x) / 2
    const cy = (wall.start.y + wall.end.y) / 2
    const sx = ox + s(cx) - (s(wl) / 2) * Math.cos(angle)
    const sy = oy - s(cy) + (s(wl) / 2) * Math.sin(angle)

    const fw = s(wl)
    const fh = Math.max(s(footingW), 4)
    const ww = Math.max(s(wallThk), 2)

    elements.push(
      <g key={`footing-${wall.id}`}>
        <rect
          x={sx}
          y={sy - fh / 2}
          width={fw}
          height={fh}
          fill="url(#mat-concrete)"
          stroke={INK}
          strokeWidth={CAD_MEDIUM}
          transform={`rotate(${-angle * (180 / Math.PI)}, ${sx + fw / 2}, ${sy})`}
        />
        <rect
          x={sx + (fw - ww) / 2}
          y={sy - ww / 2}
          width={ww}
          height={ww}
          fill="none"
          stroke={INK}
          strokeWidth={CAD_HAIR}
          strokeDasharray="2 2"
          transform={`rotate(${-angle * (180 / Math.PI)}, ${sx + fw / 2}, ${sy})`}
        />
      </g>,
    )
  }

  // ── Overall dimension strings ──
  const dimY = MARGIN + 15
  const dimX = MARGIN + 15
  elements.push(
    <DimensionLineH key="dim-h" x1={ox} x2={ox + s(bw)} y={dimY} label={metresToMm(bw)} />,
  )
  elements.push(
    <DimensionLineV key="dim-v" y1={oy} y2={oy - s(bh)} x={dimX} label={metresToMm(bh)} />,
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
        cx={ox + s(gridPoints[i] / 100)}
        cy={dimY - 12}
        label={gridLabels[i]}
        dropToY={dimY}
      />,
    )
  }

  // ── North arrow ──
  elements.push(
    <NorthArrow key="north" cx={ox + s(bw) + 20} cy={oy - s(bh) + 20} size={18} />,
  )

  // ── Scale bar ──
  const bwMetresPx = bw / s(bw)
  elements.push(
    <ScaleBar
      key="scale-bar"
      x={ox}
      y={oy + 12}
      totalPx={s(bw) * 0.4}
      metresPerPx={bwMetresPx}
    />,
  )

  // ── Material legend ──
  elements.push(
    <LegendBox
      key="legend"
      items={MATERIAL_LEGEND.slice(0, 2)}
      title="MATERIALS"
      x={ox + s(bw) + 5}
      y={oy - s(bh) + 60}
    />,
  )

  // ── Drawing title ──
  elements.push(
    <text key="title" x={ox + s(bw) / 2} y={oy + 30} fontSize={9} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
      FOUNDATION PLAN
    </text>,
  )

  // ── Indicative note ──
  elements.push(
    <text key="note" x={ox + s(bw) / 2} y={oy + 40} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
      Foundation sizes indicative/preliminary — confirm with a structural engineer
    </text>,
  )

  // ── Title block ──
  elements.push(
    <TitleBlock
      key="title-block"
      title="FOUNDATION PLAN"
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
