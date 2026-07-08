import type { PlanModel } from '../../domain/plan'
import { roomArea } from '../../lib/planGeometry'

interface RoomLabelsProps {
  model: PlanModel
}

export function RoomLabels({ model }: RoomLabelsProps) {
  return (
    <g>
      {model.rooms.map((room) => (
        <g key={`label-${room.id}`}>
          <text x={room.x + room.width / 2} y={room.y + room.height / 2 - 0.42} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={0.5}>
            {room.name}
          </text>
          <text x={room.x + room.width / 2} y={room.y + room.height / 2 + 0.18} textAnchor="middle" dominantBaseline="middle" fill="#cbd5e1" fontSize={0.34}>
            {roomArea(room).toFixed(1)} m²
          </text>
        </g>
      ))}
    </g>
  )
}
