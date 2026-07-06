import type { ReactNode } from 'react'
import { CAD_HAIR, CAD_HEAVY, CAD_THIN, INK } from '@/components/drawings/cadConstants'

// ── Ground hatch defs (soil strata patterns) ──
export function GroundHatchDefs(): ReactNode {
  return (
    <defs>
      {/* Topsoil — fine dense stipple on brown */}
      <pattern id="soil-topsoil" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#b8956a" />
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth={CAD_HAIR * 0.3} opacity={0.2} />
        <circle cx="1.5" cy="1.5" r="0.4" fill={INK} opacity={0.15} />
        <circle cx="4.5" cy="4.5" r="0.4" fill={INK} opacity={0.15} />
      </pattern>

      {/* Subsoil — lighter hatch */}
      <pattern id="soil-subsoil" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" fill="#d4b896" />
        <line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth={CAD_HAIR * 0.2} opacity={0.15} />
      </pattern>

      {/* Rock — dense crosshatch on grey */}
      <pattern id="soil-rock" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#a0a8b0" />
        <line x1="0" y1="0" x2="6" y2="6" stroke={INK} strokeWidth={CAD_HAIR * 0.4} opacity={0.25} />
        <line x1="6" y1="0" x2="0" y2="6" stroke={INK} strokeWidth={CAD_HAIR * 0.4} opacity={0.25} />
        <circle cx="3" cy="3" r="0.5" fill={INK} opacity={0.15} />
      </pattern>
    </defs>
  )
}

// ── Heavy ground datum line ──
interface GroundLineProps {
  x1: number
  x2: number
  y: number
}

export function GroundLine({ x1, x2, y }: GroundLineProps): ReactNode {
  return (
    <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={CAD_HEAVY} />
  )
}

// ── Stacked soil layers below ground ──
interface SoilLayer {
  depth: number   // thickness of this layer in SVG units
  type: 'topsoil' | 'subsoil' | 'rock'
}

interface SoilLayersProps {
  x1: number
  x2: number
  topY: number
  layers: SoilLayer[]
}

const LAYER_PATTERNS: Record<string, string> = {
  topsoil: 'url(#soil-topsoil)',
  subsoil: 'url(#soil-subsoil)',
  rock: 'url(#soil-rock)',
}

export function SoilLayers({ x1, x2, topY, layers }: SoilLayersProps): ReactNode {
  const elements: ReactNode[] = []
  let currentY = topY

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    const patternId = LAYER_PATTERNS[layer.type]
    const h = layer.depth

    elements.push(
      <rect
        key={`soil-${i}`}
        x={x1}
        y={currentY}
        width={x2 - x1}
        height={h}
        fill={patternId}
        stroke="none"
      />,
    )
    // Separator line
    elements.push(
      <line
        key={`soil-sep-${i}`}
        x1={x1}
        y1={currentY}
        x2={x2}
        y2={currentY}
        stroke={INK}
        strokeWidth={CAD_THIN}
        strokeDasharray={i === 0 ? 'none' : '4 2'}
      />,
    )
    // Label
    elements.push(
      <text
        key={`soil-lab-${i}`}
        x={x2 - 4}
        y={currentY + h / 2 + 1.5}
        fontSize={5}
        fill={INK}
        fontFamily="system-ui, sans-serif"
        textAnchor="end"
        dominantBaseline="central"
        opacity={0.5}
      >
        {layer.type}
      </text>,
    )
    currentY += h
  }

  return <g>{elements}</g>
}
