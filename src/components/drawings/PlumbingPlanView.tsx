import { useMemo, type ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { CAD_HAIR, CAD_THIN, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { DISCIPLINE } from '@/components/drawings/drawingColors'
import {
  SheetBorder, TitleBlock, DimensionLineH, DimensionLineV, GridBubble, DrawingTitle,
} from '@/components/drawings/cadPrimitives'
import { NorthArrow, ScaleBar } from '@/components/drawings/entourage'
import { WaterCloset, Basin, Shower, Sink, FloorDrain, StackRiser } from '@/components/drawings/mepSymbols'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'
import { placePlumbing } from '@/components/drawings/mepPlacement'
import { renderMepWalls } from '@/components/drawings/wallRenderer'

const MARGIN = 15

const PLUMBING_SYMBOLS: Record<string, (p: { cx: number; cy: number; size: number; color: string }) => ReactNode> = {
  wc: (p) => <WaterCloset {...p} />,
  basin: (p) => <Basin {...p} />,
  shower: (p) => <Shower {...p} />,
  sink: (p) => <Sink {...p} />,
  drain: (p) => <FloorDrain {...p} />,
  stack: (p) => <StackRiser {...p} />,
}

const LEGEND_ITEMS = [
  { key: 'WC', label: 'Water closet' },
  { key: 'basin', label: 'Wash basin' },
  { key: 'shower', label: 'Shower' },
  { key: 'sink', label: 'Kitchen sink' },
  { key: 'drain', label: 'Floor drain' },
  { key: 'stack', label: 'Stack/riser' },
]

interface PlumbingPlanViewProps {
  activePlan: PlanModel | null
}

export function PlumbingPlanView({ activePlan }: PlumbingPlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderPlumbingPlan(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="PLUMBING AND DRAINAGE">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}

interface MepSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

function renderPlumbingPlan(plan: PlanModel | null): MepSheet | null {
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
  const color = DISCIPLINE.plumbing.color

  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)

  elements.push(...renderMepWalls(plan, s, ox, oy))

  // Plumbing placement
  const { symbols, runs } = placePlumbing(plan)

  // Pipe runs (dashed blue)
  for (let i = 0; i < runs.length; i++) {
    const pts = runs[i].points.map(p => `${ox + s(p.x)},${oy - s(p.y)}`).join(' ')
    elements.push(
      <polyline key={`pipe-run-${i}`} points={pts} fill="none" stroke={color} strokeWidth={CAD_HAIR} strokeDasharray="4 2" opacity={0.6} />,
    )
  }

  // Symbol components
  for (const sym of symbols) {
    const Comp = PLUMBING_SYMBOLS[sym.type]
    if (Comp) {
      elements.push(
        <Comp key={`${sym.type}-${sym.cx}-${sym.cy}`} cx={ox + s(sym.cx)} cy={oy - s(sym.cy)} size={sym.size} color={color} />,
      )
    }
  }

  // Dimensions
  const dimY = MARGIN + 15
  const dimX = MARGIN + 15
  elements.push(<DimensionLineH key="dim-h" x1={ox} x2={ox + s(bw)} y={dimY} label={metresToMm(bw)} />)
  elements.push(<DimensionLineV key="dim-v" y1={oy} y2={oy - s(bh)} x={dimX} label={metresToMm(bh)} />)

  // Grid bubbles
  const gridLabels = 'ABCDEFGH'
  const gridPoints = [...new Set(plan.walls.flatMap(w => [Math.round(w.start.x * 100), Math.round(w.end.x * 100)]))].sort((a, b) => a - b)
  for (let i = 0; i < gridPoints.length && i < gridLabels.length; i++) {
    elements.push(<GridBubble key={`grid-${i}`} cx={ox + s(gridPoints[i] / 100)} cy={dimY - 12} label={gridLabels[i]} dropToY={dimY} />)
  }

  // North arrow
  elements.push(<NorthArrow key="north" cx={ox + s(bw) + 20} cy={oy - s(bh) + 20} size={18} />)

  // Scale bar
  const metresPerPx = bw / s(bw)
  elements.push(<ScaleBar key="scale-bar" x={ox} y={oy + 12} totalPx={s(bw) * 0.4} metresPerPx={metresPerPx} />)

  // Legend
  const legendX = ox + s(bw) + 5
  const legendY = oy - s(bh) + 5
  const legendRowH = 14
  const legendW = 100
  const legendH = LEGEND_ITEMS.length * legendRowH + 16
  elements.push(
    <g key="legend">
      <rect x={legendX} y={legendY} width={legendW} height={legendH} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <text x={legendX + 4} y={legendY + 10} fontSize={7} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif">
        PLUMBING LEGEND
      </text>
      {LEGEND_ITEMS.map((item, i) => (
        <text key={item.key} x={legendX + 4} y={legendY + 10 + (i + 1) * legendRowH} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif">
          {item.key} — {item.label}
        </text>
      ))}
    </g>,
  )

  // Title
  elements.push(<DrawingTitle key="title" text="PLUMBING & DRAINAGE (SCHEMATIC)" x={ox + s(bw) / 2} y={oy + 30} />)

  // Notes
  const notes = [
    'Plumbing & drainage layout schematic — for indication only.',
    'Verify pipe sizes, routing and connection points with a registered plumbing/civil engineer.',
  ]
  for (let i = 0; i < notes.length; i++) {
    elements.push(
      <text key={`note-${i}`} x={ox + s(bw) / 2} y={oy + 40 + i * 7} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
        {notes[i]}
      </text>,
    )
  }

  // Title block + border
  elements.push(<TitleBlock key="title-block" title="PLUMBING & DRAINAGE" projectName={plan.id ? `Design: ${plan.id.slice(0, 8)}` : 'Budget Engineer'} sheetWidth={sheetW} sheetHeight={sheetH} />)
  elements.push(<SheetBorder key="border" width={sheetW} height={sheetH} />)

  return { sheetW, sheetH, elements }
}
