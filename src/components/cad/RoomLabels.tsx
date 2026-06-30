import type { PlanModel } from '../../domain/plan'

interface RoomLabelsProps {
  model: PlanModel
}

export function RoomLabels({ model }: RoomLabelsProps) {
  return (
    <g>
      {model.rooms.map((room) => (
        <text
          key={`label-${room.id}`}
          x={room.x + room.width / 2}
          y={room.y + room.height / 2}
          fill="rgba(255,255,255,0.5)"
          fontSize={0.28}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {room.name} {(room.width * room.height).toFixed(1)}
        </text>
      ))}
    </g>
  )
}
