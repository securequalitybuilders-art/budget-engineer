import { useMemo, useState, useRef, useCallback, type ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { computePresentationLayout, type CellRect } from '@/components/drawings/presentationSheetModel'
import { renderRoofPlan } from '@/components/drawings/roofPlanModel'
import { renderCeilingPlan } from '@/components/drawings/ceilingPlanModel'
import { renderFloorPlanSheet } from '@/components/drawings/planSheetModel'
import { computeFrontElevation, computeSideElevation, computeSection, type ElevationDrawing } from '@/adapters/planToElevations'
import { renderSectionSheet } from '@/components/drawings/sectionModel'
import {
  CAD_THIN, CAD_HAIR, CAD_MEDIUM, INK, PAPER,
} from '@/components/drawings/cadConstants'
import { DISCIPLINE } from '@/components/drawings/drawingColors'
import { SheetBorder } from '@/components/drawings/cadPrimitives'
import { ProfessionalTitleBlock } from '@/components/drawings/ProfessionalTitleBlock'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'
import { placeElectrical, placePlumbing, placeHvac } from '@/components/drawings/mepPlacement'
import { LightFixture, Socket, Switch, DistributionBoard } from '@/components/drawings/mepSymbols'
import { WaterCloset, Basin, Shower, Sink, FloorDrain, StackRiser } from '@/components/drawings/mepSymbols'
import { SupplyDiffuser, ReturnGrille, FanCoilUnit } from '@/components/drawings/mepSymbols'
import { exportSheetPng, exportSheetPdf } from '@/adapters/sheetExport'

const MEP_COLORS = {
  electrical: DISCIPLINE.electrical.color,
  plumbing: DISCIPLINE.plumbing.color,
  hvac: DISCIPLINE.hvac.color,
}

interface PresentationSheetViewProps {
  activePlan: PlanModel | null
  design: DesignOption | null
  floors: number
  storeyHeight: number
  pitchHeight: number
}

export function PresentationSheetView({ activePlan, design: _design, floors, storeyHeight, pitchHeight }: PresentationSheetViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null)

  const layout = useMemo(() => computePresentationLayout(), [])

  const rendered = useMemo(() => {
    try {
      return renderAllCells(activePlan, floors, storeyHeight, pitchHeight, layout)
    } catch {
      return null
    }
  }, [activePlan, floors, storeyHeight, pitchHeight, layout])

  const handleExportPng = useCallback(async () => {
    setExportError(null)
    setExporting('png')
    try {
      if (svgRef.current) {
        await exportSheetPng(svgRef.current)
      }
    } catch (e) {
      setExportError(`PNG export failed: ${(e as Error).message}`)
    } finally {
      setExporting(null)
    }
  }, [])

  const handleExportPdf = useCallback(async () => {
    setExportError(null)
    setExporting('pdf')
    try {
      if (svgRef.current) {
        await exportSheetPdf(svgRef.current)
      }
    } catch (e) {
      setExportError(`PDF export failed: ${(e as Error).message}`)
    } finally {
      setExporting(null)
    }
  }, [])

  if (!activePlan || floors < 1) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Drawing unavailable — no active plan</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 p-2">
        <span className="text-xs font-medium text-stone-400">Export:</span>
        <button
          onClick={handleExportPng}
          disabled={exporting !== null}
          aria-label="Export presentation sheet as PNG image"
          className="rounded bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-600/30 disabled:opacity-50"
        >
          {exporting === 'png' ? 'Exporting…' : 'Export PNG'}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={exporting !== null}
          aria-label="Export presentation sheet as PDF document"
          className="rounded bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-600/30 disabled:opacity-50"
        >
          {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>

      {exportError && (
        <div className="rounded-lg border border-red-700/60 bg-red-950/60 p-3 text-xs text-red-300" role="alert">
          {exportError}
        </div>
      )}

      <ZoomableDrawing>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.sheetW} ${layout.sheetH}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Presentation sheet — A1 composed drawing"
          style={{ maxHeight: '85vh', minHeight: 400 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {rendered}
        </svg>
      </ZoomableDrawing>
    </div>
  )
}

function renderAllCells(
  plan: PlanModel | null,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  layout: { sheetW: number; sheetH: number; cells: CellRect[] },
): ReactNode {
  if (!plan || plan.width <= 0 || plan.height <= 0 || floors < 1) return null

  const elements: ReactNode[] = []

  elements.push(
    <rect key="bg" x={0} y={0} width={layout.sheetW} height={layout.sheetH} fill={PAPER} />,
  )

  for (const cell of layout.cells) {
    const cellEls = renderCellContent(cell, plan, floors, storeyHeight, pitchHeight)
    if (cellEls) {
      elements.push(...cellEls)
    } else {
      elements.push(renderFallbackCell(cell))
    }
  }

  elements.push(...renderMasterTitleBlock(plan, layout))

  elements.push(
    <SheetBorder key="border" width={layout.sheetW} height={layout.sheetH} />,
  )

  return elements
}

function renderCellContent(
  cell: CellRect,
  plan: PlanModel,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
): ReactNode[] | null {
  const pad = 8
  const innerW = cell.w - pad * 2
  const innerH = cell.h - pad * 2 - 16

  switch (cell.id) {
    case 'front-elevation': {
      const drawing = computeFrontElevation(plan, floors, storeyHeight, pitchHeight)
      if (!drawing) return null
      return embedElevationDrawing(drawing, cell, innerW, innerH, pad, 'FRONT ELEVATION')
    }
    case 'side-elevation': {
      const drawing = computeSideElevation(plan, floors, storeyHeight, pitchHeight)
      if (!drawing) return null
      return embedElevationDrawing(drawing, cell, innerW, innerH, pad, 'SIDE ELEVATION')
    }
    case 'section': {
      const drawing = computeSection(plan, floors, storeyHeight, pitchHeight)
      if (!drawing) return null
      return embedSectionDrawing(drawing, plan, floors, storeyHeight, pitchHeight, cell, innerW, innerH, pad)
    }
    case 'floor-plan': {
      const rendered = renderFloorPlanSheet(plan)
      if (!rendered) return null
      return embedSheetDrawing(rendered.elements, rendered.sheetW, rendered.sheetH, cell, innerW, innerH, pad, 'FLOOR PLAN')
    }
    case 'site-plan': {
      const rendered = renderSimpleDrawing(plan, 'Site Plan')
      if (!rendered) return null
      return embedSheetDrawing(rendered.elements, rendered.sheetW, rendered.sheetH, cell, innerW, innerH, pad, 'SITE PLAN')
    }
    case 'foundation': {
      const rendered = renderFoundationDrawing(plan)
      if (!rendered) return null
      return embedSheetDrawing(rendered.elements, rendered.sheetW, rendered.sheetH, cell, innerW, innerH, pad, 'FOUNDATION PLAN')
    }
    case 'roof-plan': {
      const rendered = renderRoofPlan(plan)
      if (!rendered) return null
      return embedSheetDrawing(rendered.elements, rendered.sheetW, rendered.sheetH, cell, innerW, innerH, pad, 'ROOF PLAN')
    }
    case 'rcp': {
      const rendered = renderCeilingPlan(plan)
      if (!rendered) return null
      return embedSheetDrawing(rendered.elements, rendered.sheetW, rendered.sheetH, cell, innerW, innerH, pad, 'RCP')
    }
    case 'mep-overview': {
      return embedMepOverview(plan, cell, innerW, innerH, pad)
    }
    default:
      return null
  }
}

function embedElevationDrawing(
  drawing: ElevationDrawing,
  cell: CellRect,
  innerW: number,
  innerH: number,
  pad: number,
  label: string,
): ReactNode[] {
  const vbParts = drawing.viewBox.split(' ').map(Number)
  const [vbX, vbY, vbW, vbH] = vbParts

  const scaleX = innerW / vbW
  const scaleY = innerH / vbH
  const scale = Math.min(scaleX, scaleY) * 0.85

  const offsetX = cell.x + pad + (innerW - vbW * scale) / 2
  const offsetY = cell.y + pad + (innerH - vbH * scale) / 2

  const els: ReactNode[] = []

  const groupKey = `${cell.id}-drawing`
  const groupEls: ReactNode[] = []

  groupEls.push(
    <rect key="bg" x={vbX} y={vbY} width={vbW} height={vbH} fill={PAPER} />,
  )

  for (const line of drawing.lines) {
    groupEls.push(
      <line key={`l-${line.x1}-${line.y1}-${line.x2}-${line.y2}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.stroke || INK} strokeWidth={line.strokeWidth || CAD_THIN} />,
    )
  }

  for (const rect of drawing.rects) {
    groupEls.push(
      <rect key={`r-${rect.x}-${rect.y}`} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={rect.fill || 'none'} stroke={rect.stroke || INK} strokeWidth={CAD_THIN} />,
    )
  }

  for (const poly of drawing.polygons) {
    const pts = poly.points.map(p => `${p.x},${p.y}`).join(' ')
    groupEls.push(
      <polygon key={`p-${pts.slice(0, 20)}`} points={pts} fill={poly.fill || 'none'} stroke={poly.stroke || INK} strokeWidth={CAD_THIN} />,
    )
  }

  for (const text of drawing.texts) {
    groupEls.push(
      <text key={`t-${text.x}-${text.y}`} x={text.x} y={text.y} fontSize={text.fontSize || 4} fill={text.fill || INK} fontFamily="system-ui, sans-serif" textAnchor={(text.anchor || 'start') as 'start' | 'middle' | 'end'}>
        {text.text}
      </text>,
    )
  }

  els.push(
    <g key={groupKey} transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
      {groupEls}
    </g>,
  )

  els.push(renderCaption(cell, label))
  return els
}

function embedSectionDrawing(
  drawing: ElevationDrawing,
  plan: PlanModel,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  cell: CellRect,
  innerW: number,
  innerH: number,
  pad: number,
): ReactNode[] | null {
  const rendered = renderSectionSheet(drawing, plan, floors, storeyHeight, pitchHeight)
  if (!rendered) return null
  return embedSheetDrawing(rendered.elements, rendered.sheetW, rendered.sheetH, cell, innerW, innerH, pad, 'SECTION A-A')
}

function renderSimpleDrawing(plan: PlanModel, _title: string): { sheetW: number; sheetH: number; elements: ReactNode } | null {
  const bw = plan.width
  const bh = plan.height
  if (bw <= 0 || bh <= 0) return null

  const drawW = 400
  const drawH = 300
  const scale = Math.min(drawW / bw, drawH / bh)
  const s = (v: number) => v * scale
  const ox = 30
  const oy = 30 + s(bh)
  const sheetW = ox + s(bw) + 30
  const sheetH = oy + 30

  const elements: ReactNode[] = []
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  for (const wall of plan.walls) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const cx = (wall.start.x + wall.end.x) / 2
    const cy = (wall.start.y + wall.end.y) / 2
    const wallThk = wall.thickness || plan.wallThickness || 0.23
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const ww = s(wl)
    const wh = Math.max(s(wallThk), 2)
    elements.push(
      <rect key={`w-${wall.id}`} x={ox + s(cx) - ww / 2} y={oy - s(cy) - wh / 2} width={ww} height={wh} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`} />,
    )
  }

  for (const opening of plan.openings) {
    const wall = plan.walls.find(w => w.id === opening.wallId)
    if (!wall) continue
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const opOff = opening.offset * wl
    const halfW = opening.width / 2
    const opCx = wall.start.x + (opOff / wl) * (wall.end.x - wall.start.x)
    const opCy = wall.start.y + (opOff / wl) * (wall.end.y - wall.start.y)

    elements.push(
      <rect key={`op-${opening.id}`} x={ox + s(opCx - halfW)} y={oy - s(opCy) - s(0.23) / 2} width={s(opening.width)} height={Math.max(s(0.23), 2)} fill="rgba(245,158,11,0.18)" stroke={INK} strokeWidth={CAD_HAIR} transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(opCx)}, ${oy - s(opCy)})`} />,
    )
  }

  return { sheetW, sheetH, elements }
}

function renderFoundationDrawing(plan: PlanModel): { sheetW: number; sheetH: number; elements: ReactNode } | null {
  if (!plan || plan.width <= 0 || plan.height <= 0) return null
  const bw = plan.width
  const bh = plan.height
  const drawW = 400
  const drawH = 300
  const scale = Math.min(drawW / bw, drawH / bh)
  const s = (v: number) => v * scale
  const ox = 30
  const oy = 30 + s(bh)
  const sheetW = ox + s(bw) + 30
  const sheetH = oy + 30

  const elements: ReactNode[] = []
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  const fdnInset = 0.15
  for (const wall of plan.walls) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const cx = (wall.start.x + wall.end.x) / 2
    const cy = (wall.start.y + wall.end.y) / 2
    const fdnWidth = (wall.thickness || plan.wallThickness || 0.23) + fdnInset * 2
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const ww = s(wl)
    const wh = Math.max(s(fdnWidth), 3)
    elements.push(
      <rect key={`f-${wall.id}`} x={ox + s(cx) - ww / 2} y={oy - s(cy) - wh / 2} width={ww} height={wh} fill="rgba(60,60,60,0.15)" stroke={INK} strokeWidth={CAD_MEDIUM} transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`} />,
    )
  }
  return { sheetW, sheetH, elements }
}

function embedSheetDrawing(
  elements: ReactNode,
  origW: number,
  origH: number,
  cell: CellRect,
  innerW: number,
  innerH: number,
  pad: number,
  label: string,
): ReactNode[] {
  if (!elements) return [renderFallbackCell(cell)]

  const scaleX = innerW / origW
  const scaleY = innerH / origH
  const scale = Math.min(scaleX, scaleY) * 0.85

  const offsetX = cell.x + pad + (innerW - origW * scale) / 2
  const offsetY = cell.y + pad + (innerH - origH * scale) / 2

  const els: ReactNode[] = []

  els.push(
    <g key={label} transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
      {elements}
    </g>,
  )

  els.push(renderCaption(cell, label))
  return els
}

function embedMepOverview(
  plan: PlanModel,
  cell: CellRect,
  innerW: number,
  innerH: number,
  pad: number,
): ReactNode[] {
  const els: ReactNode[] = []
  const thirdW = innerW / 3
  const midY = cell.y + pad + innerH / 2

  const electrical = placeElectrical(plan)
  const plumbing = placePlumbing(plan)
  const hvac = placeHvac(plan)

  const ec = MEP_COLORS.electrical
  const pc = MEP_COLORS.plumbing
  const hc = MEP_COLORS.hvac

  const symSize = (s: number) => Math.max(s, 4)
  const scale = Math.min(thirdW, innerH) / 12

  const renderSymbols = (symbols: Array<{ type: string; cx: number; cy: number; size: number }>, color: string, baseX: number) => {
    const gEls: ReactNode[] = []
    for (const sym of symbols) {
      const sx = baseX + (sym.cx / plan.width) * thirdW
      const sy = midY - (innerH * 0.3) + (sym.cy / plan.height) * innerH * 0.4
      const sz = symSize(sym.size) * scale
      switch (sym.type) {
        case 'light': case 'socket': case 'switch': case 'db': {
          const Comp = sym.type === 'light' ? LightFixture : sym.type === 'socket' ? Socket : sym.type === 'switch' ? Switch : DistributionBoard
          gEls.push(<Comp key={`${sym.type}-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />)
          break
        }
        case 'wc': gEls.push(<WaterCloset key={`wc-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'basin': gEls.push(<Basin key={`basin-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'shower': gEls.push(<Shower key={`shower-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'sink': gEls.push(<Sink key={`sink-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'drain': gEls.push(<FloorDrain key={`drain-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'stack': gEls.push(<StackRiser key={`stack-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'supply': gEls.push(<SupplyDiffuser key={`supply-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'return': gEls.push(<ReturnGrille key={`return-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
        case 'fcu': gEls.push(<FanCoilUnit key={`fcu-${sym.cx}`} cx={sx} cy={sy} size={sz} color={color} />); break
      }
    }
    return gEls
  }

  els.push(
    <g key="mep-elec">
      <text x={cell.x + pad + thirdW * 0 + thirdW / 2} y={cell.y + pad + 10} fontSize={8} fill={ec} fontFamily="system-ui, sans-serif" textAnchor="middle" fontWeight="bold">ELECTRICAL</text>
      {renderSymbols(electrical.symbols.slice(0, 6), ec, cell.x + pad)}
    </g>,
  )
  els.push(
    <g key="mep-plumb">
      <text x={cell.x + pad + thirdW * 1 + thirdW / 2} y={cell.y + pad + 10} fontSize={8} fill={pc} fontFamily="system-ui, sans-serif" textAnchor="middle" fontWeight="bold">PLUMBING</text>
      {renderSymbols(plumbing.symbols.slice(0, 6), pc, cell.x + pad + thirdW)}
    </g>,
  )
  els.push(
    <g key="mep-hvac">
      <text x={cell.x + pad + thirdW * 2 + thirdW / 2} y={cell.y + pad + 10} fontSize={8} fill={hc} fontFamily="system-ui, sans-serif" textAnchor="middle" fontWeight="bold">HVAC</text>
      {renderSymbols(hvac.symbols.slice(0, 6), hc, cell.x + pad + thirdW * 2)}
    </g>,
  )

  els.push(renderCaption(cell, 'ELECTRICAL / PLUMBING / HVAC'))
  return els
}

function renderCaption(cell: CellRect, label: string): ReactNode {
  return (
    <text
      key={`cap-${cell.id}`}
      x={cell.x + cell.w / 2}
      y={cell.y + cell.h - 4}
      fontSize={7}
      fill={INK}
      fontFamily="system-ui, sans-serif"
      textAnchor="middle"
      fontWeight="bold"
      opacity={0.8}
    >
      {label}
    </text>
  )
}

function renderFallbackCell(cell: CellRect): ReactNode {
  return (
    <g key={`fallback-${cell.id}`}>
      <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} opacity={0.3} />
      <text
        x={cell.x + cell.w / 2}
        y={cell.y + cell.h / 2}
        fontSize={10}
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        opacity={0.4}
      >
        N/A
      </text>
      <text
        x={cell.x + cell.w / 2}
        y={cell.y + cell.h - 4}
        fontSize={7}
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        fontWeight="bold"
        opacity={0.6}
      >
        {cell.label}
      </text>
    </g>
  )
}

function renderMasterTitleBlock(plan: PlanModel, layout: { sheetW: number; sheetH: number }): ReactNode[] {
  const today = new Date().toISOString().slice(0, 10)
  const projectName = plan.id ? `Design: ${plan.id.slice(0, 8)}` : 'Budget Engineer'

  return [
    <ProfessionalTitleBlock
      key="master-title-block"
      projectName={projectName}
      drawingTitle="Architectural Presentation Sheet"
      sheetNumber="A-001"
      discipline="A"
      revision="00"
      scale="1:100 (approx)"
      date={today}
      drawnBy="Budget Engineer Studio"
      status="Preliminary"
      sheetWidth={layout.sheetW}
      sheetHeight={layout.sheetH}
      margin={10}
    />,
    <text key="disclaimer" x={layout.sheetW / 2} y={layout.sheetH - 8} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" opacity={0.4}>
      Drawings indicative — verify with registered professionals. Generated by DzeNhare OS / Budget Engineer.
    </text>,
  ]
}
