import type { ReactNode } from 'react'
import type { PlanModel, Opening } from '@/domain/plan'
import { CAD_HAIR, PEN_025, PEN_050, INK, INK_CUT, PAPER, INK_DIMENSION, metresToMm } from '@/components/drawings/cadConstants'
import { DimensionLineH, DimensionLineV, GridBubble, LevelMarker, TitleBlock, HatchDefs } from '@/components/drawings/cadPrimitives'
import { renderOpeningSymbol } from '@/lib/drawings/openingSymbolRenderer'
import { renderRoomFixtures } from '@/components/drawings/roomFixtures'
import { RoomTag } from '@/components/drawings/annotationTags'
import { zoneColorsForRoom } from '@/lib/drawings/roomZoneColors'

const DIM_RED = '#cc3333'
const DIM_TICK_EXT = 3
const DIM_OFFSET_FROM_WALL = 12
const DIM_BAY_OFFSET = DIM_OFFSET_FROM_WALL + 10
const DIM_OPENING_OFFSET = DIM_BAY_OFFSET + 10

interface GridAxis {
  id: string
  label: string
  position: number
  isHorizontal: boolean
}

function computeGridAxes(plan: PlanModel): GridAxis[] {
  const axes: GridAxis[] = []
  const xPositions = new Set<number>()
  const yPositions = new Set<number>()

  for (const wall of plan.walls) {
    if (Math.abs(wall.start.y - wall.end.y) < 0.01) {
      xPositions.add(wall.start.x)
      xPositions.add(wall.end.x)
    }
    if (Math.abs(wall.start.x - wall.end.x) < 0.01) {
      yPositions.add(wall.start.y)
      yPositions.add(wall.end.y)
    }
  }

  xPositions.add(plan.width)
  yPositions.add(plan.height)

  const sortedX = [...xPositions].sort((a, b) => a - b)
  const sortedY = [...yPositions].sort((a, b) => b - a)

  let labelIdx = 0
  for (const x of sortedX) {
    if (x > 0 && x <= plan.width) {
      axes.push({ id: `grid-v-${labelIdx}`, label: String.fromCharCode(65 + labelIdx), position: x, isHorizontal: false })
      labelIdx++
    }
  }

  labelIdx = 0
  for (const y of sortedY) {
    if (y > 0 && y <= plan.height) {
      axes.push({ id: `grid-h-${labelIdx}`, label: `${labelIdx + 1}`, position: y, isHorizontal: true })
      labelIdx++
    }
  }

  return axes
}

interface WallLine {
  id: string
  x1: number; y1: number; x2: number; y2: number
  thickness: number
  type: 'external' | 'internal'
}

function extractWallLines(plan: PlanModel): WallLine[] {
  return plan.walls.map(w => ({
    id: w.id,
    x1: w.start.x, y1: w.start.y,
    x2: w.end.x, y2: w.end.y,
    thickness: w.thickness || plan.wallThickness || 0.23,
    type: w.type,
  }))
}

function findOpeningsOnWall(plan: PlanModel, wallId: string): Opening[] {
  return plan.openings.filter(o => o.wallId === wallId)
}

export function renderFloorPlanSheet(plan: PlanModel): { sheetW: number; sheetH: number; elements: ReactNode } | null {
  if (!plan || plan.width <= 0 || plan.height <= 0) return null

  const drawW = 350
  const drawH = 250
  const scale = Math.min(drawW / plan.width, drawH / plan.height)
  const s = (v: number) => v * scale
  const ox = 40
  const oy = 30 + plan.height * scale + DIM_OPENING_OFFSET + DIM_TICK_EXT + 20
  const sheetW = ox + plan.width * scale + 40
  const sheetH = oy + 10 + 60

  const elements: ReactNode[] = []
  const wallLines = extractWallLines(plan)
  const gridAxes = computeGridAxes(plan)

  elements.push(<rect key="bg" x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} />)
  elements.push(<HatchDefs key="hatch-defs" />)

  // Wall poché (external walls filled, internal walls hollow)
  for (const wall of wallLines) {
    const wl = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
    if (wl < 0.01) continue
    const cx = (wall.x1 + wall.x2) / 2
    const cy = (wall.y1 + wall.y2) / 2
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1)
    const ww = s(wl)
    const wh = Math.max(s(wall.thickness), 2)

    if (wall.type === 'external') {
      elements.push(
        <rect
          key={`wall-ext-${wall.id}`}
          x={ox + s(cx) - ww / 2}
          y={oy - s(cy) - wh / 2}
          width={ww}
          height={wh}
          fill={INK_CUT}
          stroke={INK}
          strokeWidth={PEN_050}
          transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`}
        />,
      )
    } else {
      elements.push(
        <rect
          key={`wall-int-${wall.id}`}
          x={ox + s(cx) - ww / 2}
          y={oy - s(cy) - wh / 2}
          width={ww}
          height={wh}
          fill={PAPER}
          stroke={INK}
          strokeWidth={PEN_025}
          transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`}
        />,
      )
    }
  }

  // Opening symbols (draw on top of walls)
  for (const wall of wallLines) {
    const openings = findOpeningsOnWall(plan, wall.id)
    for (const opening of openings) {
      const el = renderOpeningSymbol({
        opening,
        wallStartX: wall.x1, wallStartY: wall.y1,
        wallEndX: wall.x2, wallEndY: wall.y2,
        scale, ox, oy,
      })
      if (el) elements.push(el)
    }
  }

  // Room rectangles (zone-coloured fills per brand §2.6) + annotation tags + fixtures
  for (let ri = 0; ri < plan.rooms.length; ri++) {
    const room = plan.rooms[ri]
    const rx = ox + s(room.x)
    const ry = oy - s(room.y + room.height)
    const rw = s(room.width)
    const rh = s(room.height)
    const zone = zoneColorsForRoom(room.name)

    elements.push(
      <rect
        key={`room-bg-${room.id}`}
        x={rx}
        y={ry}
        width={rw}
        height={rh}
        fill={zone.fill}
        stroke={zone.stroke}
        strokeWidth={0.5}
        fillOpacity={0.45}
      />,
    )

    const cx = rx + rw / 2
    const cy = ry + rh / 2
    elements.push(
      <RoomTag
        key={`room-tag-${room.id}`}
        room={room}
        index={ri}
        cx={cx}
        cy={cy}
        scale={scale}
      />,
    )

    const fixtures = renderRoomFixtures(room, scale, ox, oy)
    for (const f of fixtures) elements.push(f)
  }

  // Egress overlay (for printed drawings)
  if (plan.egressPoints && plan.egressPoints.length > 0) {
    const egressColors: Record<string, string> = { 'main-entry': '#22c55e', 'secondary-exit': '#f59e0b', 'emergency-exit': '#ef4444' }
    const egressLabels: Record<string, string> = { 'main-entry': 'MAIN', 'secondary-exit': 'SEC', 'emergency-exit': 'EMERG' }
    for (let ei = 0; ei < plan.egressPoints.length; ei++) {
      const ep = plan.egressPoints[ei]
      const color = egressColors[ep.type] ?? '#94a3b8'
      const label = egressLabels[ep.type] ?? ep.type
      const sx = ox + ep.x * scale
      const sy = oy - ep.y * scale
      elements.push(<circle key={`egress-outer-${ei}`} cx={sx} cy={sy} r={4} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={0.5} />)
      elements.push(<circle key={`egress-inner-${ei}`} cx={sx} cy={sy} r={1.5} fill={color} />)
      elements.push(<text key={`egress-label-${ei}`} x={sx} y={sy - 5} fill={color} fontSize={5} fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">{label}</text>)
      elements.push(<text key={`egress-desc-${ei}`} x={sx} y={sy + 6} fill={color} fontSize={4} textAnchor="middle" fontFamily="Arial, sans-serif">{ep.label}</text>)
    }
  }

  // ── Tier 1: Overall dimensions (outermost) ──
  const overallY = oy - plan.height * scale - DIM_OFFSET_FROM_WALL
  const overallX = ox - DIM_OFFSET_FROM_WALL
  elements.push(
    <DimensionLineH
      key="dim-overall-w"
      x1={ox}
      x2={ox + plan.width * scale}
      y={overallY}
      label={`${metresToMm(plan.width)}`}
      style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 6, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 2 }}
    />,
  )
  elements.push(
    <DimensionLineV
      key="dim-overall-h"
      y1={oy - plan.height * scale}
      y2={oy}
      x={overallX}
      label={`${metresToMm(plan.height)}`}
      style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 6, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 2 }}
    />,
  )

  // ── Tier 2: Structural bay dimensions ──
  const gridWallsH = wallLines.filter(w => Math.abs(w.y1 - w.y2) < 0.01 && w.type === 'external')
  const gridWallsV = wallLines.filter(w => Math.abs(w.x1 - w.x2) < 0.01 && w.type === 'external')
  const bayY = oy - plan.height * scale - DIM_BAY_OFFSET
  const bayX = ox - DIM_BAY_OFFSET

  if (gridWallsH.length >= 2) {
    const sortedH = [...gridWallsH].sort((a, b) => Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2))
    for (let i = 0; i < sortedH.length - 1; i++) {
      const left = Math.min(sortedH[i].x1, sortedH[i].x2)
      const right = Math.max(sortedH[i + 1].x1, sortedH[i + 1].x2)
      if (right - left > 0.5) {
        elements.push(
          <DimensionLineH
            key={`dim-bay-h-${i}`}
            x1={ox + left * scale}
            x2={ox + right * scale}
            y={bayY}
            label={`${metresToMm(right - left)}`}
            style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 5, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 1.5 }}
          />,
        )
      }
    }
  }

  if (gridWallsV.length >= 2) {
    const sortedV = [...gridWallsV].sort((a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2))
    for (let i = 0; i < sortedV.length - 1; i++) {
      const bottom = Math.min(sortedV[i].y1, sortedV[i].y2)
      const top = Math.max(sortedV[i + 1].y1, sortedV[i + 1].y2)
      if (top - bottom > 0.5) {
        elements.push(
          <DimensionLineV
            key={`dim-bay-v-${i}`}
            y1={oy - top * scale}
            y2={oy - bottom * scale}
            x={bayX}
            label={`${metresToMm(top - bottom)}`}
            style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 5, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 1.5 }}
          />,
        )
      }
    }
  }

  // ── Grid bubbles ──
  for (const ax of gridAxes) {
    if (!ax.isHorizontal) {
      const gx = ox + ax.position * scale
      elements.push(
        <GridBubble
          key={`grid-bubble-${ax.id}`}
          cx={gx}
          cy={DIM_OPENING_OFFSET + 10}
          label={ax.label}
          dropToY={oy - plan.height * scale - DIM_OPENING_OFFSET}
        />,
      )
    }
  }

  // ── Scale bar (bottom-left) ──
  const scaleBarY = sheetH - 50
  const scaleBarX = ox
  const scaleBarLen = 50
  const scaleBarSegments = 4
  const segLen = scaleBarLen / scaleBarSegments
  for (let i = 0; i < scaleBarSegments; i++) {
    const segX = scaleBarX + i * segLen
    elements.push(
      <rect
        key={`scale-bar-seg-${i}`}
        x={segX}
        y={scaleBarY}
        width={segLen}
        height={4}
        fill={i % 2 === 0 ? INK : PAPER}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />,
    )
    elements.push(
      <text
        key={`scale-bar-label-${i}`}
        x={segX + segLen / 2}
        y={scaleBarY + 10}
        fontSize={5}
        fill={INK}
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
      >
        {i * Math.round(scaleBarLen / scale / scaleBarSegments * 100) / 100 * 1000}m
      </text>,
    )
  }
  elements.push(
    <text key="scale-bar-title" x={scaleBarX} y={scaleBarY - 4} fontSize={5} fill={INK_DIMENSION} fontFamily="Arial, Helvetica, sans-serif">
      SCALE BAR (m)
    </text>,
  )

  // ── Enhanced North Arrow (top-right) ──
  const naX = ox + plan.width * scale + 25
  const naY = oy - plan.height * scale + 15
  const naSize = 8
  elements.push(
    <g key="north-arrow">
      <circle cx={naX} cy={naY} r={naSize + 4} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <polygon
        points={`${naX},${naY - naSize - 3} ${naX - 3},${naY + naSize - 3} ${naX},${naY + naSize * 0.3} ${naX + 3},${naY + naSize - 3}`}
        fill={INK}
        stroke="none"
      />
      <polygon
        points={`${naX},${naY + naSize + 3} ${naX - 3},${naY - naSize + 3} ${naX},${naY - naSize * 0.3} ${naX + 3},${naY - naSize + 3}`}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      <text x={naX} y={naY + naSize + 10} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" fontWeight="bold">
        N
      </text>
    </g>,
  )

  // ── Level marker (top-left) ──
  const lmX = ox + 5
  const lmY = oy - plan.height * scale - 5
  elements.push(
    <LevelMarker key="level-marker" x={lmX} y={lmY} label="FFL ±0.000" />,
  )

  // ── Caption / title ──
  elements.push(
    <text
      key="caption"
      x={ox + plan.width * scale / 2}
      y={oy + 20}
      fontSize={8}
      fill={INK}
      fontFamily="Arial, Helvetica, sans-serif"
      textAnchor="middle"
      fontWeight="bold"
    >
      FLOOR PLAN
    </text>,
  )

  elements.push(
    <text
      key="scale-label"
      x={ox + plan.width * scale / 2}
      y={oy + 30}
      fontSize={6}
      fill={INK_DIMENSION}
      fontFamily="Arial, Helvetica, sans-serif"
      textAnchor="middle"
    >
      {plan.scaleLabel || 'SCALE 1:100'}
    </text>,
  )

  // Title block
  elements.push(
    <TitleBlock
      key="title-block"
      title="FLOOR PLAN"
      projectName="Budget Engineer"
      sheetWidth={sheetW}
      sheetHeight={sheetH}
    />,
  )

  return { sheetW, sheetH, elements }
}
