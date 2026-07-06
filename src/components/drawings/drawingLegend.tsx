import type { ReactNode } from 'react'
import { CAD_HAIR, CAD_THIN, INK, PAPER } from '@/components/drawings/cadConstants'
import { MATERIAL } from '@/components/drawings/drawingColors'

export function MaterialHatchDefs(): ReactNode {
  return (
    <defs>
      {/* Concrete — stipple (fine dots) */}
      <pattern id="mat-concrete" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill={MATERIAL.concrete.fill} />
        <circle cx="2" cy="2" r="0.5" fill={INK} opacity={0.3} />
        <circle cx="6" cy="6" r="0.5" fill={INK} opacity={0.3} />
      </pattern>

      {/* Brick — diagonal hatch on red-orange fill */}
      <pattern id="mat-brick" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill={MATERIAL.brick.fill} />
        <line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth={CAD_HAIR} opacity={0.25} />
        <line x1="4" y1="0" x2="4" y2="8" stroke={INK} strokeWidth={CAD_HAIR * 0.5} opacity={0.2} />
      </pattern>

      {/* Blockwork — lighter diagonal on light grey fill */}
      <pattern id="mat-blockwork" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" fill={MATERIAL.blockwork.fill} />
        <line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth={CAD_HAIR} opacity={0.2} />
      </pattern>

      {/* Earth — denser hatch on brown fill */}
      <pattern id="mat-earth" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <rect width="6" height="6" fill={MATERIAL.earth.fill} />
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth={CAD_HAIR * 0.6} opacity={0.3} />
        <line x1="3" y1="0" x2="3" y2="6" stroke={INK} strokeWidth={CAD_HAIR * 0.3} opacity={0.2} />
      </pattern>

      {/* Insulation — crosshatch on yellow fill */}
      <pattern id="mat-insulation" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill={MATERIAL.insulation.fill} />
        <line x1="0" y1="0" x2="8" y2="8" stroke={INK} strokeWidth={CAD_HAIR * 0.5} opacity={0.2} />
        <line x1="8" y1="0" x2="0" y2="8" stroke={INK} strokeWidth={CAD_HAIR * 0.5} opacity={0.2} />
      </pattern>
    </defs>
  )
}

interface LegendBoxProps {
  items: { label: string; color: string }[]
  title: string
  x: number
  y: number
}

export function LegendBox({ items, title, x, y }: LegendBoxProps): ReactNode {
  const rowH = 14
  const swatchW = 12
  const pad = 4
  const titleH = 14
  const bw = 100
  const bh = titleH + items.length * rowH + pad

  return (
    <g>
      <rect x={x} y={y} width={bw} height={bh} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <text x={x + pad} y={y + titleH - 3} fontSize={7} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif">
        {title}
      </text>
      {items.map((item, i) => {
        const iy = y + titleH + i * rowH
        return (
          <g key={item.label}>
            <rect x={x + pad} y={iy} width={swatchW} height={8} fill={item.color} stroke={INK} strokeWidth={CAD_HAIR} />
            <text x={x + pad + swatchW + 3} y={iy + 7} fontSize={6} fill={INK} fontFamily="system-ui, sans-serif">
              {item.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
