import type { ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { INK, PAPER, INK_DIMENSION, CAD_HAIR, CAD_THIN } from '@/components/drawings/cadConstants'
import { TitleBlock } from '@/components/drawings/cadPrimitives'
import { renderFloorPlanSheet } from '@/components/drawings/planSheetModel'
import type { PaperSpaceLayout, Viewport, IsoPaperSize } from '@/engine/parametric/paperSpaceModel'
import { createPaperSpaceLayout, getPaperDimensions, MARGIN_MM, TITLE_BLOCK_HEIGHT_MM, VIEWPORT_SCALES } from '@/engine/parametric/paperSpaceModel'
import type { ViewportScale } from '@/engine/parametric/paperSpaceModel'

export interface SheetOptions {
  projectName?: string
  drawingNumber?: string
  date?: string
  revision?: string
}

export interface SheetOutput {
  svgWidth: number
  svgHeight: number
  elements: ReactNode[]
}

export function ScaleBar({ x, y, lengthMm, label }: { x: number; y: number; lengthMm: number; label?: string }): ReactNode {
  const segW = lengthMm / 4
  return (
    <g>
      <rect x={x} y={y} width={segW} height={4} fill={INK} stroke={INK} strokeWidth={0.3} />
      <rect x={x + segW} y={y} width={segW} height={4} fill={PAPER} stroke={INK} strokeWidth={0.3} />
      <rect x={x + segW * 2} y={y} width={segW} height={4} fill={INK} stroke={INK} strokeWidth={0.3} />
      <rect x={x + segW * 3} y={y} width={segW} height={4} fill={PAPER} stroke={INK} strokeWidth={0.3} />
      <text x={x} y={y + 10} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        0
      </text>
      <text x={x + lengthMm} y={y + 10} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        {label ?? `${lengthMm}mm`}
      </text>
    </g>
  )
}

export function NorthArrow({ cx, cy, size = 8 }: { cx: number; cy: number; size?: number }): ReactNode {
  return (
    <g>
      <circle cx={cx} cy={cy} r={size + 4} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <polygon
        points={`${cx},${cy - size - 3} ${cx - 3},${cy + size - 3} ${cx},${cy + size * 0.3} ${cx + 3},${cy + size - 3}`}
        fill={INK}
        stroke="none"
      />
      <polygon
        points={`${cx},${cy + size + 3} ${cx - 3},${cy - size + 3} ${cx},${cy - size * 0.3} ${cx + 3},${cy - size + 3}`}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      <text x={cx} y={cy + size + 12} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" fontWeight="bold">
        N
      </text>
    </g>
  )
}

function renderViewportContent(
  plan: PlanModel,
  viewport: Viewport,
  clipId: string,
): ReactNode {
  const ox = -viewport.modelX * viewport.scale * 1000 + viewport.paperX
  const oy = viewport.modelY * viewport.scale * 1000 + viewport.paperY
  const s = viewport.scale

  const wallElements: ReactNode[] = []
  for (const wall of plan.walls) {
    const x1 = ox + wall.start.x * s * 1000
    const y1 = oy - wall.start.y * s * 1000
    const x2 = ox + wall.end.x * s * 1000
    const y2 = oy - wall.end.y * s * 1000
    const sw = Math.max(wall.thickness * s * 1000, 0.5)

    wallElements.push(
      <line
        key={`vp-wall-${wall.id}`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={wall.type === 'external' ? INK : INK_DIMENSION}
        strokeWidth={wall.type === 'external' ? Math.max(sw, 1.5) : Math.max(sw, 0.8)}
        strokeLinecap="round"
      />,
    )
  }

  const roomElements: ReactNode[] = []
  for (const room of plan.rooms) {
    const rx = ox + room.x * s * 1000
    const ry = oy - (room.y + room.height) * s * 1000
    const rw = room.width * s * 1000
    const rh = room.height * s * 1000
    roomElements.push(
      <rect
        key={`vp-room-bg-${room.id}`}
        x={rx} y={ry} width={rw} height={rh}
        fill={PAPER} stroke="none" opacity={0.3}
      />,
    )
  }

  const openingElements: ReactNode[] = []
  for (const opening of plan.openings) {
    const wall = plan.walls.find(w => w.id === opening.wallId)
    if (!wall) continue
    const wallLen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wallLen < 0.001) continue
    const hDir = wall.end.x - wall.start.x
    const vDir = wall.end.y - wall.start.y
    const ux = hDir / wallLen
    const uy = vDir / wallLen
    const cx = (wall.start.x + ux * opening.offset * wallLen) * s * 1000
    const cy = (wall.start.y + uy * opening.offset * wallLen) * s * 1000
    const halfW = (opening.width / 2) * s * 1000
    const ppx = ox + cx - ux * halfW
    const ppy = oy - cy + uy * halfW
    const ppw = opening.width * s * 1000
    const pph =
      wall.type === 'internal' ? 0 :
      Math.max((opening.height ?? 2.1) * s * 1000 * 0.15, 2)

    openingElements.push(
      <g key={`vp-opening-${opening.id}`}>
        <rect x={ox + cx - halfW} y={oy - cy + (vDir === 0 ? (wall.end.y > wall.start.y ? 0 : -pph) : (hDir > 0 ? 0 : -pph))}
          width={ppw} height={pph || 2}
          fill={PAPER} stroke={INK} strokeWidth={CAD_HAIR} />
        <text x={ox + cx} y={oy - cy + 3}
          fontSize={Math.max(s * 250, 3)} fill={INK}
          fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" dominantBaseline="central">
          {opening.kind === 'door' ? 'D' : 'W'}
        </text>
      </g>,
    )
  }

  return (
    <g clipPath={`url(#${clipId})`}>
      {roomElements}
      {wallElements}
      {openingElements}
    </g>
  )
}

export function renderSheet(
  layout: PaperSpaceLayout,
  plan: PlanModel,
  options?: SheetOptions,
): SheetOutput {
  const elements: ReactNode[] = []
  const pw = layout.paperWidthMm
  const ph = layout.paperHeightMm

  elements.push(
    <rect key="sheet-bg" x={0} y={0} width={pw} height={ph} fill={PAPER} stroke={INK} strokeWidth={1} />,
    <rect key="sheet-border" x={layout.marginMm} y={layout.marginMm}
      width={pw - layout.marginMm * 2} height={ph - layout.marginMm * 2}
      fill="none" stroke={INK} strokeWidth={CAD_HAIR} />,
  )

  for (let vi = 0; vi < layout.viewports.length; vi++) {
    const vp = layout.viewports[vi]
    const clipId = `vp-clip-${vi}`

    elements.push(
      <defs key={`vp-defs-${vi}`}>
        <clipPath id={clipId}>
          <rect x={vp.paperX} y={vp.paperY} width={vp.paperWidth} height={vp.paperHeight} />
        </clipPath>
      </defs>,
    )

    elements.push(
      <rect key={`vp-rect-${vi}`}
        x={vp.paperX} y={vp.paperY}
        width={vp.paperWidth} height={vp.paperHeight}
        fill="none" stroke={INK} strokeWidth={CAD_THIN} />,
    )

    elements.push(renderViewportContent(plan, vp, clipId))

    const scaleLabel = getScaleLabel(vp.scale)
    elements.push(
      <text key={`vp-label-${vi}`}
        x={vp.paperX + 3} y={vp.paperY + vp.paperHeight - 3}
        fontSize={5} fill={INK_DIMENSION}
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {vp.label}{scaleLabel ? ` (${scaleLabel})` : ''}
      </text>,
    )
  }

  const sbY = ph - layout.marginMm - layout.titleBlockHeightMm + 15
  elements.push(
    <ScaleBar key="scale-bar" x={layout.marginMm + 10} y={sbY} lengthMm={50} label="50mm" />,
  )

  elements.push(
    <NorthArrow key="north-arrow" cx={pw - layout.marginMm - 20} cy={layout.marginMm + 20} size={8} />,
  )

  elements.push(
    <TitleBlock
      key="title-block"
      title={options?.drawingNumber ?? 'DRG-001'}
      projectName={options?.projectName ?? 'Budget Engineer'}
      date={options?.date}
      sheetWidth={pw}
      sheetHeight={ph}
    />,
  )

  return { svgWidth: pw, svgHeight: ph, elements }
}

export function createPlanSheet(
  plan: PlanModel,
  drawingNumber?: string,
  options?: {
    size?: IsoPaperSize
    scale?: ViewportScale
    orientation?: 'portrait' | 'landscape'
  },
): { layout: PaperSpaceLayout; output: SheetOutput } {
  const size = options?.size ?? 'A3'
  const pw = getPaperDimensions(size, options?.orientation ?? 'landscape').widthMm
  const ph = getPaperDimensions(size, options?.orientation ?? 'landscape').heightMm
  const usableH = ph - MARGIN_MM * 2 - TITLE_BLOCK_HEIGHT_MM

  const desiredScale = options?.scale ?? '1:100'
  const vpW = plan.width * VIEWPORT_SCALES[desiredScale] * 1000
  const vpH = plan.height * VIEWPORT_SCALES[desiredScale] * 1000
  const scale = vpW < pw * 0.8 && vpH < usableH * 0.8 ? desiredScale : '1:200'

  const layout = createPaperSpaceLayout(size, options?.orientation ?? 'landscape', [
    { modelWidth: plan.width, modelHeight: plan.height, scale },
  ])

  const output = renderSheet(layout, plan, { drawingNumber, ...options })
  return { layout, output }
}

function getScaleLabel(factor: number): string | null {
  for (const [label, f] of Object.entries(VIEWPORT_SCALES)) {
    if (Math.abs(f - factor) < 0.0001) return label
  }
  return null
}
