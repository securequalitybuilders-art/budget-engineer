import { useMemo, type ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { CAD_HAIR, CAD_THIN, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { DISCIPLINE } from '@/components/drawings/drawingColors'
import {
  SheetBorder, TitleBlock, DimensionLineH, DimensionLineV, GridBubble, DrawingTitle,
} from '@/components/drawings/cadPrimitives'
import { NorthArrow, ScaleBar } from '@/components/drawings/entourage'
import { LightFixture, Socket, Switch, DistributionBoard } from '@/components/drawings/mepSymbols'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'
import { placeElectrical } from '@/components/drawings/mepPlacement'
import { renderMepWalls } from '@/components/drawings/wallRenderer'

const MARGIN = 15

const MEP_SYMBOLS: Record<string, (p: { cx: number; cy: number; size: number; color: string }) => ReactNode> = {
  light: (p) => <LightFixture {...p} />,
  socket: (p) => <Socket {...p} />,
  switch: (p) => <Switch {...p} />,
  db: (p) => <DistributionBoard {...p} />,
}

const LEGEND_ITEMS = [
  { key: 'light', label: 'Ceiling light' },
  { key: 'socket', label: 'Socket outlet' },
  { key: 'switch', label: 'Light switch' },
  { key: 'db', label: 'Distribution board' },
]

interface ElectricalPlanViewProps {
  activePlan: PlanModel | null
}

export function ElectricalPlanView({ activePlan }: ElectricalPlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderElectricalPlan(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="ELECTRICAL LAYOUT">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}

interface MepSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

function renderElectricalPlan(plan: PlanModel | null): MepSheet | null {
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
  const color = DISCIPLINE.electrical.color

  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)

  elements.push(...renderMepWalls(plan, s, ox, oy))

  // MEP electrical symbols
  const { symbols, runs } = placeElectrical(plan)

  // Dashed wiring runs (from DB to each light then to switches)
  const dbSym = symbols.find(s => s.type === 'db')
  if (dbSym) {
    const lightSymbols = symbols.filter(s => s.type === 'light')
    for (const lt of lightSymbols) {
      const px1 = ox + s(dbSym.cx)
      const py1 = oy - s(dbSym.cy)
      const px2 = ox + s(lt.cx)
      const py2 = oy - s(lt.cy)
      elements.push(
        <line key={`wire-${lt.cx}-${lt.cy}`} x1={px1} y1={py1} x2={px2} y2={py2} stroke={color} strokeWidth={CAD_HAIR} strokeDasharray="3 2" opacity={0.5} />,
      )
    }
  }

  if (runs.length > 0) {
    for (let i = 0; i < runs.length; i++) {
      const pts = runs[i].points.map(p => `${ox + s(p.x)},${oy - s(p.y)}`).join(' ')
      elements.push(
        <polyline key={`run-${i}`} points={pts} fill="none" stroke={color} strokeWidth={CAD_HAIR} strokeDasharray="3 2" opacity={0.4} />,
      )
    }
  }

  // Symbol components
  for (const sym of symbols) {
    const Comp = MEP_SYMBOLS[sym.type]
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
        ELECTRICAL LEGEND
      </text>
      {LEGEND_ITEMS.map((item, i) => (
        <text key={item.key} x={legendX + 4} y={legendY + 10 + (i + 1) * legendRowH} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif">
          {item.key} — {item.label}
        </text>
      ))}
    </g>,
  )

  // Title
  elements.push(<DrawingTitle key="title" text="ELECTRICAL LAYOUT (SCHEMATIC)" x={ox + s(bw) / 2} y={oy + 30} />)

  // Notes
  const notes = [
    'Electrical layout schematic — for indication only.',
    'Verify all circuits, loads, and distribution with a registered electrical engineer.',
  ]
  for (let i = 0; i < notes.length; i++) {
    elements.push(
      <text key={`note-${i}`} x={ox + s(bw) / 2} y={oy + 40 + i * 7} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.6}>
        {notes[i]}
      </text>,
    )
  }

  // Title block + border
  elements.push(<TitleBlock key="title-block" title="ELECTRICAL LAYOUT" projectName={plan.id ? `Design: ${plan.id.slice(0, 8)}` : 'Budget Engineer'} sheetWidth={sheetW} sheetHeight={sheetH} />)
  elements.push(<SheetBorder key="border" width={sheetW} height={sheetH} />)

  return { sheetW, sheetH, elements }
}
