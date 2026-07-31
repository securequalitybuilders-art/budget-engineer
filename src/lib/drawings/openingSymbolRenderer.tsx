import type { ReactNode } from 'react'
import type { Opening } from '@/domain/plan'
import { DoorSwing, WindowGlazing, OpeningTag } from '@/components/drawings/openingSymbols'

interface OpeningSymbolRendererProps {
  opening: Opening
  wallStartX: number
  wallStartY: number
  wallEndX: number
  wallEndY: number
  scale: number
  ox: number
  oy: number
}

export function renderOpeningSymbol({
  opening,
  wallStartX,
  wallStartY,
  wallEndX,
  wallEndY,
  scale,
  ox,
  oy,
}: OpeningSymbolRendererProps): ReactNode {
  const wl = Math.hypot(wallEndX - wallStartX, wallEndY - wallStartY)
  const angle = Math.atan2(wallEndY - wallStartY, wallEndX - wallStartX)
  const centreDist = opening.offset * wl
  const cxM = wallStartX + centreDist * Math.cos(angle)
  const cyM = wallStartY + centreDist * Math.sin(angle)
  const halfW = opening.width / 2
  const perpAngle = angle + Math.PI / 2
  const doorInset = 0.15

  const sx = (v: number) => ox + v * scale
  const sy = (v: number) => oy - v * scale

  const cxSx = sx(cxM)
  const cxSy = sy(cyM)
  const halfWS = halfW * scale
  const perpOff = doorInset * scale

  const openLeftX = cxSx - halfWS * Math.cos(angle) - perpOff * Math.cos(perpAngle)
  const openLeftY = cxSy + halfWS * Math.sin(angle) + perpOff * Math.sin(perpAngle)

  if (opening.kind === 'door') {
    const swingLen = 0.9 * scale
    const hingeX = openLeftX
    const hingeY = openLeftY
    const swingEndX = hingeX + swingLen * Math.cos(perpAngle)
    const swingEndY = hingeY - swingLen * Math.sin(perpAngle)

    return (
      <g key={`opening-${opening.id}`}>
        <DoorSwing
          hingeX={hingeX}
          hingeY={hingeY}
          swingEndX={swingEndX}
          swingEndY={swingEndY}
          openDirection="ccw"
        />
        <OpeningTag x={cxSx} y={cxSy - 10} label={`D${opening.id.replace(/\D/g, '') || '01'}`} />
      </g>
    )
  }

  if (opening.kind === 'window') {
    return (
      <g key={`opening-${opening.id}`}>
        <WindowGlazing
          x={cxSx}
          y={cxSy}
          width={opening.width * scale}
          angle={angle}
        />
        <OpeningTag x={cxSx} y={cxSy + 10} label={`W${opening.id.replace(/\D/g, '') || '01'}`} />
      </g>
    )
  }

  return null
}
