import type { ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { CAD_THIN, CAD_MEDIUM, INK, PAPER } from '@/components/drawings/cadConstants'

export function renderMepWalls(
  plan: PlanModel, s: (v: number) => number, ox: number, oy: number,
): ReactNode[] {
  return renderAllWalls(plan, s, ox, oy, PAPER, INK, CAD_THIN)
}

export function renderFoundationWalls(
  plan: PlanModel, s: (v: number) => number, ox: number, oy: number, fdnInset = 0.15,
): ReactNode[] {
  const elements: ReactNode[] = []
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
      <rect
        key={`f-${wall.id}`}
        x={ox + s(cx) - ww / 2}
        y={oy - s(cy) - wh / 2}
        width={ww}
        height={wh}
        fill="rgba(60,60,60,0.15)"
        stroke={INK}
        strokeWidth={CAD_MEDIUM}
        transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`}
      />,
    )
  }
  return elements
}

export function renderAllWalls(
  plan: PlanModel, s: (v: number) => number, ox: number, oy: number,
  fill = PAPER, stroke = INK, strokeWidth = CAD_THIN,
  wallFilter?: (wall: PlanModel['walls'][number]) => boolean,
): ReactNode[] {
  const elements: ReactNode[] = []
  const filtered = wallFilter ? plan.walls.filter(wallFilter) : plan.walls
  for (const wall of filtered) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const cx = (wall.start.x + wall.end.x) / 2
    const cy = (wall.start.y + wall.end.y) / 2
    const wallThk = wall.thickness || plan.wallThickness || 0.23
    const ww = s(wl)
    const wh = Math.max(s(wallThk), 2)
    elements.push(
      <rect
        key={`wall-${wall.id}`}
        x={ox + s(cx) - ww / 2}
        y={oy - s(cy) - wh / 2}
        width={ww}
        height={wh}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy - s(cy)})`}
      />,
    )
  }
  return elements
}
