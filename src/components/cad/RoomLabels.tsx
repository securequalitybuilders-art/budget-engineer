import type { PlanModel } from '../../domain/plan'
import { roomArea } from '../../lib/geometry/plan-geometry'

interface RoomLabelsProps {
  model: PlanModel
}

function labelFontSize(room: { width: number; height: number }): number {
  const minDim = Math.min(room.width, room.height)
  if (minDim < 1.2) return 0.18
  if (minDim < 2.0) return 0.22
  return 0.30
}

function areaFontSize(room: { width: number; height: number }): number {
  const minDim = Math.min(room.width, room.height)
  if (minDim < 1.2) return 0.14
  if (minDim < 2.0) return 0.16
  return 0.22
}

export function RoomLabels({ model }: RoomLabelsProps) {
  return (
    <g>
      {model.rooms.map((room, index) => {
        const cx = room.x + room.width / 2
        const cy = room.y + room.height / 2
        const area = roomArea(room)
        const label = room.name || `Room ${index + 1}`
        const nameSize = labelFontSize(room)
        const areaSize = areaFontSize(room)
        const gap = 0.10

        return (
          <g key={`label-${room.id}`}>
            <text
              x={cx}
              y={cy - gap}
              fill="#e2e8f0"
              fontSize={nameSize}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
            >
              {label}
            </text>
            <text
              x={cx}
              y={cy + gap}
              fill="#94a3b8"
              fontSize={areaSize}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
            >
              {area} m²
            </text>
          </g>
        )
      })}
    </g>
  )
}
