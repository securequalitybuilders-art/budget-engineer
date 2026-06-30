import type { PlanModel } from '../../domain/plan'

interface DimensionLayerProps {
  model: PlanModel
}

export function DimensionLayer({ model }: DimensionLayerProps) {
  const labelStyle: React.SVGProps<SVGTextElement> = {
    fill: '#94a3b8',
    fontSize: 0.28,
    textAnchor: 'middle',
  }

  const lineStyle: React.SVGProps<SVGLineElement> = {
    stroke: '#94a3b8',
    strokeWidth: 0.02,
    strokeDasharray: '0.08 0.08',
  }

  return (
    <g>
      {model.rooms.map((room) => (
        <g key={`dim-${room.id}`}>
          {/* top width */}
          <line x1={room.x} y1={room.y - 0.22} x2={room.x + room.width} y2={room.y - 0.22} {...lineStyle} />
          <text x={room.x + room.width / 2} y={room.y - 0.30} {...labelStyle}>
            {room.width.toFixed(1)}m
          </text>
          {/* left height */}
          <line x1={room.x - 0.22} y1={room.y} x2={room.x - 0.22} y2={room.y + room.height} {...lineStyle} />
          <text x={room.x - 0.30} y={room.y + room.height / 2} {...labelStyle}>
            {room.height.toFixed(1)}m
          </text>
        </g>
      ))}
    </g>
  )
}
