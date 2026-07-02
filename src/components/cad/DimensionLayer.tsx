import type { PlanModel } from '../../domain/plan'

interface DimensionLayerProps {
  model: PlanModel
}

const labelStyle: React.SVGProps<SVGTextElement> = {
  fill: '#94a3b8',
  fontSize: 0.30,
  textAnchor: 'middle',
}

const lineStyle: React.SVGProps<SVGLineElement> = {
  stroke: '#94a3b8',
  strokeWidth: 0.03,
  strokeDasharray: '0.08 0.08',
}

function OverallDimensions({ model }: { model: PlanModel }) {
  const yOff = 0.45
  const xOff = 0.55
  const tick = 0.12

  return (
    <g>
      {/* Top width dimension */}
      <line x1={0} y1={-yOff} x2={model.width} y2={-yOff} {...lineStyle} />
      <line x1={0} y1={-yOff + tick} x2={0} y2={-yOff - tick} stroke="#94a3b8" strokeWidth={0.03} />
      <line x1={model.width} y1={-yOff + tick} x2={model.width} y2={-yOff - tick} stroke="#94a3b8" strokeWidth={0.03} />
      <text x={model.width / 2} y={-yOff - 0.15} {...labelStyle}>
        {model.width.toFixed(1)} m
      </text>

      {/* Left height dimension */}
      <line x1={-xOff} y1={0} x2={-xOff} y2={model.height} {...lineStyle} />
      <line x1={-xOff + tick} y1={0} x2={-xOff - tick} y2={0} stroke="#94a3b8" strokeWidth={0.03} />
      <line x1={-xOff + tick} y1={model.height} x2={-xOff - tick} y2={model.height} stroke="#94a3b8" strokeWidth={0.03} />
      <text
        x={-xOff - 0.15}
        y={model.height / 2}
        {...labelStyle}
        textAnchor="end"
        writingMode="vertical-rl"
      >
        {model.height.toFixed(1)} m
      </text>
    </g>
  )
}

export function DimensionLayer({ model }: DimensionLayerProps) {
  return <OverallDimensions model={model} />
}
