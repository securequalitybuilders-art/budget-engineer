import { useMemo, type ReactNode } from 'react'
import type { ElevationDrawing } from '@/adapters/planToElevations'
import type { PlanModel } from '@/domain/plan'
import { FALLBACK_WALL_THICKNESS } from '@/adapters/planTo3d'
import { CAD_HEAVY, CAD_MEDIUM, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import {
  HatchDefs, SheetBorder, TitleBlock, DimensionLineH, DimensionLineV,
  GridBubble, LevelMarker, DrawingTitle,
} from '@/components/drawings/cadPrimitives'
import { MaterialHatchDefs, LegendBox } from '@/components/drawings/drawingLegend'
import { MATERIAL_LEGEND } from '@/components/drawings/drawingColors'

interface SectionViewProps {
  drawing: ElevationDrawing | null
  activePlan: PlanModel | null
  floors: number
  storeyHeight: number
  pitchHeight: number
}

const MARGIN_TOP = 55
const MARGIN_BOTTOM = 55
const MARGIN_LEFT = 50
const MARGIN_RIGHT = 160

export function SectionView({ drawing, activePlan, floors, storeyHeight, pitchHeight }: SectionViewProps) {
  const rendered = useMemo(() => {
    try {
      return renderSectionSheet(drawing, activePlan, floors, storeyHeight, pitchHeight)
    } catch {
      return null
    }
  }, [drawing, activePlan, floors, storeyHeight, pitchHeight])

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
        aria-label="SECTION A-A"
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

function renderSectionSheet(
  drawing: ElevationDrawing | null,
  plan: PlanModel | null,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
): CadSheet | null {
  if (!drawing || !plan || plan.width <= 0 || floors < 1) return null

  const bw = plan.width
  const bh = floors * storeyHeight
  const totalH = bh + pitchHeight

  const drawW = 600
  const drawH = 400
  const scale = Math.min(drawW / bw, drawH / totalH)
  const s = (v: number) => v * scale

  const ox = MARGIN_LEFT
  const oy = MARGIN_TOP + s(totalH) + 10  // +10 for ground depth

  const sheetW = MARGIN_LEFT + s(bw) + MARGIN_RIGHT
  const sheetH = MARGIN_TOP + s(totalH) + 10 + MARGIN_BOTTOM

  const groundY = oy
  const eaveY = oy - s(bh)
  const ridgeY = oy - s(totalH)
  const ridgeCx = ox + s(bw) / 2

  const elements: ReactNode[] = []

  // White background
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  elements.push(<HatchDefs key="defs" />)
  elements.push(<MaterialHatchDefs key="mat-defs" />)

  // ── Earth / ground datum ──
  // Ground fill with earth pattern (brown + hatch)
  elements.push(
    <rect key="earth-fill" x={0} y={groundY} width={sheetW} height={MARGIN_BOTTOM} fill="url(#mat-earth)" stroke="none" />,
  )
  // Ground line (extra heavy)
  elements.push(
    <line key="ground-line" x1={0} y1={groundY} x2={sheetW} y2={groundY} stroke={INK} strokeWidth={CAD_HEAVY} />,
  )

  // ── Floor slabs (concrete fill with heavy outlines) ──
  for (let si = 0; si <= floors; si++) {
    const slabY = groundY - si * s(storeyHeight)
    elements.push(
      <rect
        key={`slab-${si}`}
        x={ox}
        y={slabY - 2}
        width={s(bw)}
        height={4}
        fill="url(#mat-concrete)"
        stroke={INK}
        strokeWidth={CAD_MEDIUM}
      />,
    )
  }

  // ── Cut walls (coloured material poché) ──
  const cutY = plan.height / 2
  const cutWalls = plan.walls.filter(w => {
    const minWy = Math.min(w.start.y, w.end.y)
    const maxWy = Math.max(w.start.y, w.end.y)
    return minWy <= cutY && maxWy >= cutY
  })

  for (const wall of cutWalls) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const t = wl > 0 ? (cutY - wall.start.y) / (wall.end.y - wall.start.y) : 0
    const cx = wall.start.x + (wall.end.x - wall.start.x) * t
    const wallThk = wall.thickness || plan.wallThickness || FALLBACK_WALL_THICKNESS

    const wx = ox + s(cx) - s(wallThk) / 2
    const ww = Math.max(s(wallThk), 3)

    // External walls = brick, internal = blockwork
    const matFill = wall.type === 'external' ? 'url(#mat-brick)' : 'url(#mat-blockwork)'

    for (let si = 0; si < floors; si++) {
      const topY = groundY - (si + 1) * s(storeyHeight)
      const botY = groundY - si * s(storeyHeight)
      elements.push(
        <rect
          key={`poche-${wall.id}-${si}`}
          x={wx}
          y={topY}
          width={ww}
          height={botY - topY}
          fill={matFill}
          stroke={INK}
          strokeWidth={CAD_MEDIUM}
        />,
      )
    }
  }

  // ── Roof gable ──
  elements.push(
    <polygon
      key="roof"
      points={`${ox - 3},${eaveY} ${ridgeCx},${ridgeY} ${ox + s(bw) + 3},${eaveY}`}
      fill={PAPER}
      stroke={INK}
      strokeWidth={CAD_MEDIUM}
      strokeLinejoin="round"
    />,
  )

  // ── Horizontal dimension at top ──
  const dimY = MARGIN_TOP - 15
  elements.push(
    <DimensionLineH
      key="dim-h"
      x1={ox}
      x2={ox + s(bw)}
      y={dimY}
      label={metresToMm(bw)}
    />,
  )

  // ── Vertical dimension on left ──
  const dimX = MARGIN_LEFT - 15
  elements.push(
    <DimensionLineV
      key="dim-v"
      y1={groundY}
      y2={ridgeY}
      x={dimX}
      label={metresToMm(totalH)}
    />,
  )

  // ── Grid bubbles ──
  const bubbleY = MARGIN_TOP - 30
  const gridLabels = 'ABCDEFGHIJ'
  const gridPoints = [...new Set(
    plan.walls
      .filter(w => w.start.y <= cutY && w.end.y >= cutY)
      .flatMap(w => [w.start.x, w.end.x])
      .map(x => Math.round(x * 100)),
  )].sort((a, b) => a - b)

  for (let i = 0; i < gridPoints.length && i < gridLabels.length; i++) {
    elements.push(
      <GridBubble
        key={`grid-${i}`}
        cx={ox + s(gridPoints[i] / 100)}
        cy={bubbleY}
        label={gridLabels[i]}
        dropToY={MARGIN_TOP}
      />,
    )
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

  // Ridge level
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
      text="SECTION A-A"
      x={ox + s(bw) / 2}
      y={groundY + 30}
    />,
  )

  // ── Material legend ──
  elements.push(
    <LegendBox
      key="legend"
      items={MATERIAL_LEGEND.slice(0, 4)}
      title="MATERIALS"
      x={ox}
      y={groundY + 45}
    />,
  )

  // ── Title block ──
  elements.push(
    <TitleBlock
      key="title-block"
      title="SECTION A-A"
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
