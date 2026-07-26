import type { ReactNode } from 'react'
import type { ElevationDrawing } from '@/adapters/planToElevations'
import type { PlanModel } from '@/domain/plan'
import type { CanopyParams } from '@/engine/canopy/canopyGeometry'
import { canopySectionProfile, computeSupports } from '@/engine/canopy/canopyGeometry'
import { FALLBACK_WALL_THICKNESS } from '@/adapters/planTo3d'
import { CAD_HAIR, CAD_HEAVY, CAD_THIN, CAD_MEDIUM, INK, PAPER, metresToMm } from '@/components/drawings/cadConstants'
import { getDimensionStyle } from '@/lib/drawings/dimensionStyles'
import {
  SheetBorder, TitleBlock, DimensionLineH, DimensionLineV,
  GridBubble, LevelMarker, DrawingTitle,
} from '@/components/drawings/cadPrimitives'
import { MaterialHatchDefs, LegendBox } from '@/components/drawings/drawingLegend'
import { MATERIAL_LEGEND } from '@/components/drawings/drawingColors'
import { GroundHatchDefs, SoilLayers } from '@/components/drawings/ground'
import { TreeElevation, PersonSilhouette, NumberedLegend } from '@/components/drawings/entourage'

const MARGIN_TOP = 55
const MARGIN_BOTTOM = 80
const MARGIN_LEFT = 50
const MARGIN_RIGHT = 160
const SLAB_THICKNESS = 0.15

export interface CadSheet {
  sheetW: number
  sheetH: number
  elements: ReactNode
}

export function renderSectionSheet(
  drawing: ElevationDrawing | null,
  plan: PlanModel | null,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  roofType?: 'gable' | 'canopy',
  canopyParams?: CanopyParams | null,
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
  const oy = MARGIN_TOP + s(totalH) + 30

  const sheetW = MARGIN_LEFT + s(bw) + MARGIN_RIGHT
  const sheetH = MARGIN_TOP + s(totalH) + 30 + MARGIN_BOTTOM

  const groundY = oy
  const eaveY = oy - s(bh)
  const ridgeY = oy - s(totalH)
  const ridgeCx = ox + s(bw) / 2

  const RED_DIM = getDimensionStyle('Structural')
  const elements: ReactNode[] = []

  // White background
  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  elements.push(<MaterialHatchDefs key="mat-defs" />)
  elements.push(<GroundHatchDefs key="gnd-defs" />)

  // ── Soil layers (below ground) ──
  elements.push(
    <SoilLayers
      key="soil-layers"
      x1={0}
      x2={sheetW}
      topY={groundY}
      layers={[
        { depth: s(0.6), type: 'topsoil' },
        { depth: s(0.9), type: 'subsoil' },
        { depth: MARGIN_BOTTOM - s(0.6) - s(0.9), type: 'rock' },
      ]}
    />,
  )

  // ── Ground datum line ──
  elements.push(
    <line key="ground-line" x1={0} y1={groundY} x2={sheetW} y2={groundY} stroke={INK} strokeWidth={CAD_HEAVY} />,
  )

  // ── Section cut data ──
  const cutY = plan.height / 2

  // ── Room labels behind the cut plane (light grey rects + text) ──
  const cutRooms = plan.rooms.filter(r => {
    const ry1 = r.y
    const ry2 = r.y + r.height
    return ry1 <= cutY && ry2 >= cutY
  })

  for (const room of cutRooms) {
    const rcx = room.x + room.width / 2

    const rrX = ox + s(rcx) - s(room.width) / 2
    const rrW = s(room.width)
    const area = (room.width * room.height).toFixed(1)

    for (let si = 0; si < floors; si++) {
      const roomTop = groundY - (si + 1) * s(storeyHeight) + s(SLAB_THICKNESS)
      const roomBot = groundY - si * s(storeyHeight)
      const roomH = roomBot - roomTop

      // Faint fill behind cut
      elements.push(
        <rect
          key={`room-bg-${room.id}-${si}`}
          x={rrX}
          y={roomTop}
          width={rrW}
          height={roomH}
          fill={INK}
          opacity={0.04}
          stroke="none"
        />,
      )
      // Room name label
      elements.push(
        <text
          key={`room-label-${room.id}-${si}`}
          x={rrX + rrW / 2}
          y={roomTop + roomH / 2 + 2}
          fontSize={6}
          fill={INK}
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          dominantBaseline="central"
          opacity={0.5}
        >
          {room.name}
        </text>,
      )
      // Area label
      elements.push(
        <text
          key={`room-area-${room.id}-${si}`}
          x={rrX + rrW / 2}
          y={roomTop + roomH / 2 + 10}
          fontSize={4}
          fill={INK}
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          dominantBaseline="central"
          opacity={0.35}
        >
          {area} m²
        </text>,
      )
    }
  }

  // ── Storey label (behind) ──
  for (let si = 0; si < floors; si++) {
    const labelY = groundY - si * s(storeyHeight) - s(storeyHeight) / 2
    elements.push(
      <text
        key={`storey-lab-${si}`}
        x={ox + s(bw) / 2}
        y={labelY + 2}
        fontSize={7}
        fontWeight="bold"
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        opacity={0.3}
      >
        {si === 0 ? 'GROUND FLOOR' : `FLOOR ${si + 1}`}
      </text>,
    )
  }

  // ── SOLID BLACK cut walls ──
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

    for (let si = 0; si < floors; si++) {
      const topY = groundY - (si + 1) * s(storeyHeight) + s(SLAB_THICKNESS)
      const botY = groundY - si * s(storeyHeight)
      elements.push(
        <rect
          key={`cut-wall-${wall.id}-${si}`}
          x={wx}
          y={topY}
          width={ww}
          height={botY - topY}
          fill={INK}
          stroke="none"
        />,
      )
    }

    // ── Foundation footings below ground ──
    const footingW = Math.max(s(wallThk * 3), 5)
    const footingH = s(0.4)
    const footingY = groundY + 2
    elements.push(
      <rect
        key={`footing-${wall.id}`}
        x={wx - (footingW - ww) / 2}
        y={footingY}
        width={footingW}
        height={footingH}
        fill={INK}
        stroke="none"
      />,
    )
  }

  // ── SOLID BLACK floor slabs ──
  for (let si = 0; si <= floors; si++) {
    const slabY = groundY - si * s(storeyHeight)
    const slabH = Math.max(s(SLAB_THICKNESS), 3)

    // Solid slab
    elements.push(
      <rect
        key={`slab-${si}`}
        x={ox}
        y={slabY - slabH}
        width={s(bw)}
        height={slabH}
        fill={INK}
        stroke="none"
      />,
    )

    // Floor build-up: screed line (thin white line near top of slab)
    const screedY = slabY - slabH + slabH * 0.25
    elements.push(
      <line
        key={`screed-${si}`}
        x1={ox}
        y1={screedY}
        x2={ox + s(bw)}
        y2={screedY}
        stroke={PAPER}
        strokeWidth={CAD_HAIR * 0.5}
      />,
    )

    // Ceiling line below slab (thin)
    const ceilingY = slabY
    elements.push(
      <line
        key={`ceiling-${si}`}
        x1={ox}
        y1={ceilingY}
        x2={ox + s(bw)}
        y2={ceilingY}
        stroke={PAPER}
        strokeWidth={CAD_HAIR * 0.3}
        opacity={0.5}
      />,
    )
  }

  // ── Stairs (zig-zag between floors) ──
  if (floors >= 2) {
    const stairX = ox + s(bw) * 0.6
    const treadD = s(0.28)
    const riserH = s(storeyHeight / 16)

    for (let si = 0; si < floors - 1; si++) {
      const stairBot = groundY - si * s(storeyHeight)
      const stairTop = groundY - (si + 1) * s(storeyHeight)
      const stairH = stairBot - stairTop
      const steps = 14
      const stepR = stairH / steps
      const stepT = treadD

      // Landing at top
      elements.push(
        <line
          key={`landing-${si}`}
          x1={stairX}
          y1={stairTop}
          x2={stairX + treadD * 2}
          y2={stairTop}
          stroke={INK}
          strokeWidth={CAD_THIN}
        />,
      )

      // Sawtooth treads
      const treadPoints: string[] = []
      let tx = stairX + treadD * 2
      let ty = stairTop
      for (let step = 0; step < steps; step++) {
        treadPoints.push(`${tx},${ty}`)
        ty += stepR
        treadPoints.push(`${tx},${ty}`)
        tx += stepT
        treadPoints.push(`${tx},${ty}`)
      }
      elements.push(
        <polyline
          key={`stairs-${si}`}
          points={treadPoints.join(' ')}
          fill="none"
          stroke={INK}
          strokeWidth={CAD_THIN}
          strokeLinejoin="round"
        />,
      )

      // Handrail (parallel line offset inward)
      elements.push(
        <line
          key={`handrail-${si}`}
          x1={stairX + treadD * 2}
          y1={stairTop + riserH * 2}
          x2={tx - treadD}
          y2={stairBot - riserH}
          stroke={INK}
          strokeWidth={CAD_HAIR}
          strokeDasharray="2 1.5"
        />,
      )
    }
  }

  // ── Roof: gable OR canopy ──
  const cp = roofType === 'canopy' ? canopyParams : null
  const isCanopy = cp !== null && cp !== undefined

  if (isCanopy && cp) {
    // ── Canopy roof in section ──
    try {
      const profile = canopySectionProfile(cp, 'x')
      const supports = computeSupports(cp)
      const centerX = ox + s(bw) / 2

      // Build SVG polyline points for the canopy profile curve
      const profilePts = profile.points.map(([wx, wy]) =>
        `${centerX + s(wx)},${groundY - s(wy)}`
      ).join(' ')
      const baseY = groundY - s(cp.heightAboveBuilding)

      // ETFE panel fill (light translucent fill under the curve)
      const fillPts = `${centerX + s(profile.leftX)},${baseY} ${profilePts} ${centerX + s(profile.rightX)},${baseY}`
      elements.push(
        <polygon
          key="canopy-fill"
          points={fillPts}
          fill={INK}
          opacity={0.08}
          stroke="none"
        />,
      )

      // Canopy profile curve (medium weight line)
      elements.push(
        <polyline
          key="canopy-curve"
          points={profilePts}
          fill="none"
          stroke={INK}
          strokeWidth={CAD_MEDIUM}
        />,
      )

      // Canopy bottom edge line
      elements.push(
        <line
          key="canopy-bottom"
          x1={centerX + s(profile.leftX)}
          y1={baseY}
          x2={centerX + s(profile.rightX)}
          y2={baseY}
          stroke={INK}
          strokeWidth={CAD_HAIR}
          opacity={0.3}
        />,
      )

      // Rib tick marks (sample every 4th point along profile)
      for (let i = 4; i < profile.points.length - 4; i += 4) {
        const [wx, wy] = profile.points[i]
        const px = centerX + s(wx)
        const py = groundY - s(wy)
        const tickLen = 3
        elements.push(
          <line
            key={`rib-tick-${i}`}
            x1={px - tickLen / 2}
            y1={py - tickLen}
            x2={px + tickLen / 2}
            y2={py + tickLen}
            stroke={INK}
            strokeWidth={CAD_HAIR}
            opacity={0.5}
          />,
        )
      }

      // Support columns (vertical members from canopy corners down)
      for (let si = 0; si < supports.length; si++) {
        const sup = supports[si]
        const topX = centerX + s(sup.top[0])
        const topY = groundY - s(sup.top[1])
        const baseX = centerX + s(sup.base[0])
        const baseY2 = groundY - s(sup.base[1])
        elements.push(
          <line
            key={`canopy-col-${si}`}
            x1={topX}
            y1={topY}
            x2={baseX}
            y2={baseY2}
            stroke={INK}
            strokeWidth={CAD_THIN}
            strokeDasharray="2 1.5"
          />,
        )
      }

      // Label
      elements.push(
        <text
          key="canopy-label"
          x={centerX}
          y={groundY - s(cp.heightAboveBuilding + cp.rise) - 10}
          fontSize={5}
          fill={INK}
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          dominantBaseline="text-after-edge"
        >
          CANOPY ROOF (parametric)
        </text>,
      )
    } catch {
      // Fallback to gable on error
      elements.push(
        <polygon
          key="roof-cut"
          points={`${ox - 3},${eaveY} ${ridgeCx},${ridgeY} ${ox + s(bw) + 3},${eaveY}`}
          fill={INK}
          stroke="none"
        />,
      )
    }
  } else {
    // ── Gable roof (original) ──
    elements.push(
      <polygon
        key="roof-cut"
        points={`${ox - 3},${eaveY} ${ridgeCx},${ridgeY} ${ox + s(bw) + 3},${eaveY}`}
        fill={INK}
        stroke="none"
      />,
    )
    // Roof bottom edge (white line to separate from void)
    elements.push(
      <line
        key="roof-bottom"
        x1={ox - 3}
        y1={eaveY}
        x2={ox + s(bw) + 3}
        y2={eaveY}
        stroke={PAPER}
        strokeWidth={CAD_HAIR}
      />,
    )

    // ── Roof structure (truss/rafter lines) ──
    const rafterCount = 4
    for (let i = 0; i <= rafterCount; i++) {
      const t = i / rafterCount
      const rx = ox + t * s(bw)
      const ry1 = eaveY
      const ry2 = ridgeY + (eaveY - ridgeY) * (1 - Math.abs(t - 0.5) * 2)
      elements.push(
        <line
          key={`rafter-${i}`}
          x1={rx}
          y1={ry1}
          x2={ridgeCx}
          y2={ry2}
          stroke={INK}
          strokeWidth={CAD_HAIR}
          opacity={0.4}
        />,
      )
    }
    // Collar tie at mid-height
    elements.push(
      <line
        key="collar-tie"
        x1={ox + s(bw) * 0.15}
        y1={eaveY - (eaveY - ridgeY) * 0.4}
        x2={ox + s(bw) * 0.85}
        y2={eaveY - (eaveY - ridgeY) * 0.4}
        stroke={INK}
        strokeWidth={CAD_HAIR}
        opacity={0.3}
      />,
    )
  }

  // ── Tiered horizontal dimensions ──
  const dimY1 = MARGIN_TOP - 15
  const dimY2 = MARGIN_TOP - 30
  elements.push(
    <DimensionLineH
      key="dim-h-total"
      x1={ox}
      x2={ox + s(bw)}
      y={dimY2}
      label={metresToMm(bw)}
      style={RED_DIM}
    />,
  )
  const cutBays = [...new Set(
    plan.walls
      .filter(w => w.start.y <= cutY && w.end.y >= cutY)
      .flatMap(w => [w.start.x, w.end.x]),
  )].sort((a, b) => a - b).filter(x => x >= 0 && x <= bw)
  if (cutBays.length >= 3) {
    const uniqueBays = [0, ...cutBays, bw].filter((v, i, a) => a.indexOf(v) === i)
    for (let i = 1; i < uniqueBays.length; i++) {
      const bx1 = ox + s(uniqueBays[i - 1])
      const bx2 = ox + s(uniqueBays[i])
      const bayW = uniqueBays[i] - uniqueBays[i - 1]
      if (bayW > 0.01) {
        elements.push(
          <DimensionLineH
            key={`dim-bay-${i}`}
            x1={bx1}
            x2={bx2}
            y={dimY1}
            label={metresToMm(bayW)}
            style={RED_DIM}
          />,
        )
      }
    }
  }

  // ── Tiered vertical dimensions (per-storey + total) ──
  const dimVX = MARGIN_LEFT - 15
  for (let si = 0; si < floors; si++) {
    const vy1 = groundY - si * s(storeyHeight)
    const vy2 = groundY - (si + 1) * s(storeyHeight)
    elements.push(
      <DimensionLineV
        key={`dim-v-${si}`}
        y1={vy1}
        y2={vy2}
        x={dimVX}
        label={metresToMm(storeyHeight)}
        style={RED_DIM}
      />,
    )
  }
  elements.push(
    <DimensionLineV
      key="dim-v-total"
      y1={groundY}
      y2={ridgeY}
      x={dimVX - 12}
      label={metresToMm(totalH)}
      style={RED_DIM}
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

  // ── Level markers with labels ──
  for (let si = 0; si <= floors; si++) {
    const l = si === 0 ? '+0.000' : `+${(si * storeyHeight).toFixed(3)}`
    const label = si === 0 ? 'FFL' : si === floors ? 'Wall Plate' : undefined
    elements.push(
      <LevelMarker
        key={`lvl-${si}`}
        x={ox + s(bw) + 8}
        y={groundY - si * s(storeyHeight)}
        label={`${l} m${label ? ` (${label})` : ''}`}
      />,
    )
  }

  // Ridge level
  elements.push(
    <LevelMarker
      key="lvl-ridge"
      x={ridgeCx}
      y={ridgeY - 6}
      label={`+${totalH.toFixed(3)} m (Apex)`}
    />,
  )

  // ── Material build-up callouts ──
  const calloutFontSize = 4.5
  const calloutColor = INK
  const calloutX = ox + s(bw) + 50
  const calloutLineH = 9

  const roofCallout = [
    'ROOF ASSEMBLY:',
    '• Chromadeck roofing sheets',
    '• 38×38mm battens @ 350mm c/c',
    '• 114×38mm trusses @ 800mm c/c',
    '• 6mm plasterboard ceiling',
  ]
  const wallCallout = [
    'WALL ASSEMBLY:',
    '• 19mm cement plaster (ext)',
    '• 225mm brick/block wall',
    '• 19mm cement plaster (int)',
  ]
  const fdnCallout = [
    'FOUNDATION:',
    '• 150mm hardcore filling',
    '• DPM (polyethylene sheet)',
    '• 100mm concrete slab (25 MPa)',
    '• Strip footing (Grade C35/30)',
  ]

  elements.push(
    <text key="callout-roof-title" x={calloutX} y={ridgeY + calloutLineH * 0} fontSize={calloutFontSize + 0.5} fontWeight="bold" fill={calloutColor} fontFamily="system-ui, sans-serif">
      {roofCallout[0]}
    </text>,
  )
  for (let i = 1; i < roofCallout.length; i++) {
    elements.push(
      <text key={`callout-roof-${i}`} x={calloutX + 4} y={ridgeY + calloutLineH * i} fontSize={calloutFontSize} fill={calloutColor} fontFamily="system-ui, sans-serif" opacity={0.8}>
        {roofCallout[i]}
      </text>,
    )
  }

  const wallCalloutY = ridgeY + calloutLineH * (roofCallout.length + 1)
  elements.push(
    <text key="callout-wall-title" x={calloutX} y={wallCalloutY} fontSize={calloutFontSize + 0.5} fontWeight="bold" fill={calloutColor} fontFamily="system-ui, sans-serif">
      {wallCallout[0]}
    </text>,
  )
  for (let i = 1; i < wallCallout.length; i++) {
    elements.push(
      <text key={`callout-wall-${i}`} x={calloutX + 4} y={wallCalloutY + calloutLineH * i} fontSize={calloutFontSize} fill={calloutColor} fontFamily="system-ui, sans-serif" opacity={0.8}>
        {wallCallout[i]}
      </text>,
    )
  }

  const fdnCalloutY = wallCalloutY + calloutLineH * (wallCallout.length + 1)
  elements.push(
    <text key="callout-fdn-title" x={calloutX} y={fdnCalloutY} fontSize={calloutFontSize + 0.5} fontWeight="bold" fill={calloutColor} fontFamily="system-ui, sans-serif">
      {fdnCallout[0]}
    </text>,
  )
  for (let i = 1; i < fdnCallout.length; i++) {
    elements.push(
      <text key={`callout-fdn-${i}`} x={calloutX + 4} y={fdnCalloutY + calloutLineH * i} fontSize={calloutFontSize} fill={calloutColor} fontFamily="system-ui, sans-serif" opacity={0.8}>
        {fdnCallout[i]}
      </text>,
    )
  }

  // ── Scaled entourage ──
  const personH = s(1.7)
  const treeH = s(4)
  elements.push(
    <TreeElevation key="tree-1" x={ox - 12} groundY={groundY} height={treeH} variant="round" />,
  )
  elements.push(
    <TreeElevation key="tree-2" x={ox + s(bw) + 15} groundY={groundY} height={treeH * 1.2} variant="conifer" />,
  )
  elements.push(
    <PersonSilhouette key="person" x={ox + s(bw) + 40} groundY={groundY} height={personH} />,
  )

  // ── Drawing title ──
  elements.push(
    <DrawingTitle
      key="title"
      text="SECTION A-A"
      x={ox + s(bw) / 2}
      y={groundY + MARGIN_BOTTOM - 20}
    />,
  )

  // ── Numbered legend ──
  elements.push(
    <NumberedLegend
      key="num-legend"
      items={[
        { n: 1, label: 'Reinforced concrete' },
        { n: 2, label: 'Brick/block wall' },
        { n: 3, label: 'Natural soil' },
      ]}
      x={ox}
      y={groundY + MARGIN_BOTTOM - 15}
    />,
  )

  // ── Material legend ──
  elements.push(
    <LegendBox
      key="legend"
      items={MATERIAL_LEGEND.slice(0, 3)}
      title="MATERIALS"
      x={ox + 95}
      y={groundY + MARGIN_BOTTOM - 15}
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
