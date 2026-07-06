import { useMemo, type ReactNode } from 'react'
import type { ElevationDrawing } from '@/adapters/planToElevations'
import type { PlanModel } from '@/domain/plan'
import { CAD_HEAVY, CAD_MEDIUM, CAD_THIN, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { MATERIAL } from '@/components/drawings/drawingColors'
import {
  HatchDefs, SheetBorder, TitleBlock, DimensionLineH, DimensionLineV,
  GridBubble, LevelMarker, DrawingTitle,
} from '@/components/drawings/cadPrimitives'

interface ElevationViewProps {
  drawing: ElevationDrawing | null
  activePlan: PlanModel | null
  floors: number
  storeyHeight: number
  pitchHeight: number
  title: string
}

// Margins around the drawing within the sheet
const MARGIN_TOP = 55
const MARGIN_BOTTOM = 45
const MARGIN_LEFT = 50
const MARGIN_RIGHT = 160

export function ElevationView({ drawing, activePlan, floors, storeyHeight, pitchHeight, title }: ElevationViewProps) {
  const rendered = useMemo(() => {
    try {
      return renderCadSheet(drawing, activePlan, floors, storeyHeight, pitchHeight, title)
    } catch {
      return null
    }
  }, [drawing, activePlan, floors, storeyHeight, pitchHeight, title])

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
        aria-label={title}
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </div>
  )
}

interface CadSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

function renderCadSheet(
  drawing: ElevationDrawing | null,
  plan: PlanModel | null,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  title: string,
): CadSheet | null {
  if (!drawing || !plan || plan.width <= 0 || floors < 1) return null

  const bw = plan.width
  const bh = floors * storeyHeight
  const totalH = bh + pitchHeight

  // Scale: fit the building into the drawing area
  const drawW = 600
  const drawH = 400
  const scale = Math.min(drawW / bw, drawH / totalH)
  const s = (v: number) => v * scale

  // Origin in sheet coordinates (where building bottom-left goes)
  const ox = MARGIN_LEFT
  const oy = MARGIN_TOP + s(totalH)  // top of drawing area + building height (Y down)

  // Sheet dimensions
  const sheetW = MARGIN_LEFT + s(bw) + MARGIN_RIGHT
  const sheetH = MARGIN_TOP + s(totalH) + MARGIN_BOTTOM

  // Ground level Y
  const groundY = oy
  const eaveY = oy - s(bh)
  const ridgeY = oy - s(totalH)

  const elements: ReactNode[] = []

  // White background
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  elements.push(<HatchDefs key="defs" />)

  // ── Building outline ──
  // Roof gable
  const ridgeCx = ox + s(bw) / 2
  elements.push(
    <polygon
      key="roof"
      points={`${ox - 2},${eaveY} ${ridgeCx},${ridgeY} ${ox + s(bw) + 2},${eaveY}`}
      fill={PAPER}
      stroke={INK}
      strokeWidth={CAD_MEDIUM}
      strokeLinejoin="round"
    />,
  )

  // Wall outline (left, right, top)
  elements.push(
    <line key="wl" x1={ox} y1={eaveY} x2={ox} y2={groundY} stroke={INK} strokeWidth={CAD_MEDIUM} />,
    <line key="wr" x1={ox + s(bw)} y1={eaveY} x2={ox + s(bw)} y2={groundY} stroke={INK} strokeWidth={CAD_MEDIUM} />,
    <line key="wt" x1={ox} y1={eaveY} x2={ox + s(bw)} y2={eaveY} stroke={INK} strokeWidth={CAD_MEDIUM} />,
  )

  // Ground line (heavy)
  elements.push(
    <line key="gl" x1={0} y1={groundY} x2={sheetW} y2={groundY} stroke={INK} strokeWidth={CAD_HEAVY} />,
  )

  // ── Openings from drawing data ──
  const vbParts = drawing.viewBox.split(' ').map(Number)
  const drawWorldH = vbParts[3]
  // planToElevations uses PADDING=2 on all sides of the viewBox.
  // Derive it from the difference between viewBox height and actual building height.
  const PADDING = (drawWorldH - totalH) / 2
  const groundViewBoxY = vbParts[1] + drawWorldH - PADDING

  for (const rect of drawing.rects) {
    const irx = ox + ((rect.x - PADDING) / bw) * s(bw)
    const iry = oy - ((groundViewBoxY - rect.y) / totalH) * s(totalH)
    const irw = s(rect.w)
    const irh = s(rect.h)

    const isWindow = rect.fill === undefined || rect.fill === MATERIAL.glass.fill
    elements.push(
      <rect
        key={`op-${irx}-${iry}`}
        x={irx}
        y={iry}
        width={Math.max(irw, 1)}
        height={Math.max(irh, 1)}
        fill={isWindow ? MATERIAL.glass.fill : PAPER}
        stroke={INK}
        strokeWidth={CAD_THIN}
      />,
    )
  }

  // ── Horizontal dimension string at top ──
  const dimY = MARGIN_TOP - 15
  elements.push(
    <DimensionLineH
      key="dim-h-total"
      x1={ox}
      x2={ox + s(bw)}
      y={dimY}
      label={metresToMm(bw)}
    />,
  )

  // Per-bay dimensions (at each external wall)
  const wallXPositions: number[] = []
  for (const w of plan.walls) {
    if (Math.abs(w.start.y - plan.height) < 0.05 || Math.abs(w.end.y - plan.height) < 0.05) {
      wallXPositions.push(ox + s(w.start.x), ox + s(w.end.x))
    }
  }
  const uniqueX = [...new Set(wallXPositions.map(x => Math.round(x * 10)))].sort((a, b) => a - b)
  for (let i = 0; i < uniqueX.length - 1; i++) {
    const d = (uniqueX[i + 1] - uniqueX[i]) / scale
    if (d > 0.5) {
      elements.push(
        <DimensionLineH
          key={`dim-h-${i}`}
          x1={uniqueX[i] / 10}
          x2={uniqueX[i + 1] / 10}
          y={dimY + 12}
          label={metresToMm(d)}
        />,
      )
    }
  }

  // ── Vertical dimension string on left ──
  const dimX = MARGIN_LEFT - 15
  elements.push(
    <DimensionLineV
      key="dim-v-total"
      y1={groundY}
      y2={ridgeY}
      x={dimX}
      label={metresToMm(totalH)}
    />,
  )

  // Per-storey dimensions
  for (let si = 0; si < floors; si++) {
    const floorY = groundY - si * s(storeyHeight)
    const nextFloorY = groundY - (si + 1) * s(storeyHeight)
    elements.push(
      <DimensionLineV
        key={`dim-v-fl-${si}`}
        y1={floorY}
        y2={nextFloorY}
        x={dimX - 12}
        label={metresToMm(storeyHeight)}
      />,
    )
  }

  // ── Grid bubbles along top ──
  const bubbleY = MARGIN_TOP - 30
  const gridLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let gridIdx = 0

  // At each wall start/end on the front face
  const gridPoints = [...new Set(
    plan.walls
      .filter(w => Math.abs(w.start.y - plan.height) < 0.05 || Math.abs(w.end.y - plan.height) < 0.05)
      .flatMap(w => [w.start.x, w.end.x])
      .map(x => Math.round(x * 100)),
  )].sort((a, b) => a - b)

  for (const gx of gridPoints) {
    if (gridIdx >= gridLabels.length) break
    elements.push(
      <GridBubble
        key={`grid-${gridIdx}`}
        cx={ox + s(gx / 100)}
        cy={bubbleY}
        label={gridLabels[gridIdx]}
        dropToY={MARGIN_TOP}
      />,
    )
    gridIdx++
  }

  // ── Level markers ──
  for (let si = 0; si <= floors; si++) {
    const l = si === 0 ? '+0.000' : `+${(si * storeyHeight).toFixed(3)}`
    elements.push(
      <LevelMarker
        key={`lvl-${si}`}
        x={ox + s(bw) + 8}
        y={groundY - si * s(storeyHeight)}
        label={`${l} m`}
      />,
    )
  }

  // Ridge level marker
  elements.push(
    <LevelMarker
      key="lvl-ridge"
      x={ridgeCx}
      y={ridgeY - 6}
      label={`+${totalH.toFixed(3)} m`}
    />,
  )

  // ── Drawing title ──
  elements.push(
    <DrawingTitle
      key="title"
      text={title}
      x={ox + s(bw) / 2}
      y={groundY + 25}
    />,
  )

  // ── Title block ──
  elements.push(
    <TitleBlock
      key="title-block"
      title={title}
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
