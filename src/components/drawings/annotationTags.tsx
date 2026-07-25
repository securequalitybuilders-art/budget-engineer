import type { ReactNode } from 'react'
import { INK, INK_DIMENSION } from '@/components/drawings/cadConstants'
import type { RoomRect } from '@/domain/plan'

interface RoomTagProps {
  room: RoomRect
  index: number
  cx: number
  cy: number
  scale: number
}

export function RoomTag({ room, index, cx, cy, scale }: RoomTagProps): ReactNode {
  const s = (v: number) => v * scale
  const area = (room.width * room.height).toFixed(1)
  const r = Math.max(s(0.25), 6)
  const circleRim = r + 1.5
  const nameUpper = room.name.toUpperCase()
  const nameY = cy + s(room.height) * 0.08
  const areaY = cy + s(room.height) * 0.22
  const tagY = cy - s(room.height) * 0.25

  return (
    <g>
      <circle cx={cx} cy={tagY} r={circleRim} fill="white" stroke={INK} strokeWidth={0.5} />
      <circle cx={cx} cy={tagY} r={r} fill={INK} />
      <text
        x={cx}
        y={tagY}
        fontSize={Math.max(s(0.18), 4)}
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="bold"
      >
        {index + 1}
      </text>
      <text
        x={cx}
        y={nameY}
        fontSize={Math.max(s(0.2), 5)}
        fill={INK}
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="bold"
      >
        {nameUpper}
      </text>
      <text
        x={cx}
        y={areaY}
        fontSize={Math.max(s(0.14), 3.5)}
        fill={INK_DIMENSION}
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {area} m²
      </text>
    </g>
  )
}

interface FloorLevelTagProps {
  x: number
  y: number
  label: string
  scale: number
}

export function FloorLevelTag({ x, y, label, scale }: FloorLevelTagProps): ReactNode {
  const s = (v: number) => v * scale
  const triSize = Math.max(s(0.15), 3)
  return (
    <g>
      <polygon
        points={`${x},${y} ${x - triSize * 3},${y - triSize} ${x + triSize * 3},${y - triSize}`}
        fill={INK}
        stroke={INK}
        strokeWidth={0.5}
      />
      <text
        x={x}
        y={y - triSize - Math.max(s(0.1), 2)}
        fontSize={Math.max(s(0.16), 3.5)}
        fill={INK}
        fontFamily="Arial, Helvetica, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  )
}

interface LeaderLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  label?: string
}

export function LeaderLine({ x1, y1, x2, y2, label }: LeaderLineProps): ReactNode {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 0.01) return null
  const nx = dx / len
  const ny = dy / len
  const arrowSize = 4
  const tipX = x2 - nx * arrowSize
  const tipY = y2 - ny * arrowSize

  return (
    <g>
      <line x1={x1} y1={y1} x2={tipX} y2={tipY} stroke={INK_DIMENSION} strokeWidth={0.3} />
      <polygon
        points={`${x2},${y2} ${x2 - nx * arrowSize - ny * arrowSize * 0.5},${y2 - ny * arrowSize + nx * arrowSize * 0.5} ${x2 - nx * arrowSize + ny * arrowSize * 0.5},${y2 - ny * arrowSize - nx * arrowSize * 0.5}`}
        fill={INK_DIMENSION}
      />
      {label && (
        <text
          x={(x1 + x2) / 2 + 4}
          y={(y1 + y2) / 2 - 2}
          fontSize={10}
          fill={INK_DIMENSION}
          fontFamily="Arial, Helvetica, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  )
}
