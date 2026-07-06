import type { ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { CAD_HAIR, CAD_THIN, INK, PAPER } from '@/components/drawings/cadConstants'

export function renderFloorPlanSheet(plan: PlanModel): { sheetW: number; sheetH: number; elements: ReactNode } | null {
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

  // Exterior + interior wall lines (dark ink on white paper)
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
      <rect
        key={`w-${wall.id}`}
        x={ox + s(cx) - ww / 2}
        y={oy - s(cy) - wh / 2}
        width={ww}
        height={wh}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_THIN}
        transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`}
      />,
    )
  }

  // Room rectangles (white fill, thin outline) + room name + area labels
  for (const room of plan.rooms) {
    const rx = ox + s(room.x)
    const ry = oy - s(room.y + room.height)
    const rw = s(room.width)
    const rh = s(room.height)
    elements.push(
      <rect
        key={`room-${room.id}`}
        x={rx}
        y={ry}
        width={rw}
        height={rh}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_HAIR}
        opacity={0.5}
      />,
    )
    const area = (room.width * room.height).toFixed(1)
    elements.push(
      <text
        key={`room-name-${room.id}`}
        x={rx + rw / 2}
        y={ry + rh / 2 - 3}
        fontSize={Math.max(s(0.18), 4)}
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        opacity={0.8}
      >
        {room.name}
      </text>,
    )
    elements.push(
      <text
        key={`room-area-${room.id}`}
        x={rx + rw / 2}
        y={ry + rh / 2 + Math.max(s(0.18), 4) + 1}
        fontSize={Math.max(s(0.14), 3)}
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        opacity={0.5}
      >
        {area} m²
      </text>,
    )
  }

  // North arrow (top-right corner of the plan area)
  const naX = ox + s(bw) - 8
  const naY = oy - s(bh) + 8
  const naSize = 6
  elements.push(
    <g key="north-arrow">
      <line x1={naX} y1={naY + naSize} x2={naX} y2={naY - naSize} stroke={INK} strokeWidth={CAD_THIN} />
      <polygon
        points={`${naX},${naY - naSize - 2} ${naX - 2.5},${naY - 1} ${naX + 2.5},${naY - 1}`}
        fill={INK}
        stroke="none"
      />
      <text
        x={naX}
        y={naY - naSize - 5}
        fontSize={4}
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        fontWeight="bold"
      >
        N
      </text>
    </g>,
  )

  // Caption
  elements.push(
    <text
      key="caption"
      x={sheetW / 2}
      y={sheetH - 4}
      fontSize={7}
      fill={INK}
      fontFamily="system-ui, sans-serif"
      textAnchor="middle"
      fontWeight="bold"
      opacity={0.8}
    >
      FLOOR PLAN
    </text>,
  )

  return { sheetW, sheetH, elements }
}
