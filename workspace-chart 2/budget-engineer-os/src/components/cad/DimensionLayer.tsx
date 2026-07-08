import type { PlanModel } from '../../domain/plan'

interface DimensionLayerProps {
  model: PlanModel
}

export function DimensionLayer({ model }: DimensionLayerProps) {
  const offset = 1.2

  return (
    <g>
      <DimensionLine x1={0} y1={-offset} x2={model.width} y2={-offset} label={`${model.width.toFixed(1)} m`} />
      <DimensionLine x1={-offset} y1={0} x2={-offset} y2={model.height} label={`${model.height.toFixed(1)} m`} vertical />
    </g>
  )
}

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical = false,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  vertical?: boolean
}) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#67e8f9" strokeWidth={0.05} strokeDasharray="0.18 0.12" />
      <line x1={x1} y1={y1 - (vertical ? 0 : 0.18)} x2={x1} y2={y1 + (vertical ? 0 : 0.18)} stroke="#67e8f9" strokeWidth={0.05} />
      <line x1={x2 - (vertical ? 0 : 0)} y1={y2 - (vertical ? 0.18 : 0)} x2={x2 + (vertical ? 0 : 0)} y2={y2 + (vertical ? 0.18 : 0)} stroke="#67e8f9" strokeWidth={0.05} />
      <text
        x={mx}
        y={my + (vertical ? 0 : -0.14)}
        transform={vertical ? `rotate(-90 ${mx} ${my})` : undefined}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#67e8f9"
        fontSize={0.42}
      >
        {label}
      </text>
    </g>
  )
}
