import type { ReactNode } from 'react'
import { CAD_HAIR, CAD_THIN, INK, PAPER } from '@/components/drawings/cadConstants'

// ── Tree elevation silhouettes ──
interface TreeElevationProps {
  x: number
  groundY: number
  height?: number
  variant?: 'round' | 'conifer' | 'palm'
}

export function TreeElevation({ x, groundY, height = 40, variant = 'round' }: TreeElevationProps): ReactNode {
  const trunkH = height * 0.35
  const crownH = height - trunkH
  const trunkW = 3
  const trunkColor = '#5c3a21'
  const leafColor = '#3a7a3a'
  const shadowColor = '#8a6d3b'
  const shadowW = height * 0.9
  const shadowH = 3
  const shadowY = groundY - 1

  const crown = variant === 'round' ? (
    <ellipse cx={x} cy={groundY - trunkH - crownH * 0.4} rx={crownH * 0.55} ry={crownH * 0.45} fill={leafColor} />
  ) : variant === 'conifer' ? (
    <polygon
      points={`${x},${groundY - trunkH - crownH} ${x - crownH * 0.4},${groundY - trunkH} ${x + crownH * 0.4},${groundY - trunkH}`}
      fill={leafColor}
    />
  ) : (
    // palm — trunk curved + fronds
    <>
      <path
        d={`M${x},${groundY} Q${x + 4},${groundY - trunkH} ${x + 2},${groundY - trunkH - 2}`}
        stroke={trunkColor}
        strokeWidth={2}
        fill="none"
      />
      {[-1, -0.5, 0, 0.5, 1].map((dx, i) => (
        <line
          key={`frond-${i}`}
          x1={x + 2}
          y1={groundY - trunkH - 2}
          x2={x + 2 + dx * crownH * 0.35}
          y2={groundY - trunkH - crownH + Math.abs(dx) * 5}
          stroke={leafColor}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}
    </>
  )

  // Cast shadow ellipse
  const shadow = (
    <ellipse cx={x} cy={shadowY} rx={shadowW / 2} ry={shadowH} fill={shadowColor} opacity={0.15} />
  )

  // Trunk
  const trunk = variant !== 'palm' ? (
    <rect x={x - trunkW / 2} y={groundY - trunkH} width={trunkW} height={trunkH} fill={trunkColor} rx={1} />
  ) : null

  return (
    <g>
      {shadow}
      {trunk}
      {crown}
    </g>
  )
}

// ── Person silhouette ──
interface PersonSilhouetteProps {
  x: number
  groundY: number
  height?: number
}

export function PersonSilhouette({ x, groundY, height = 25 }: PersonSilhouetteProps): ReactNode {
  const headR = height * 0.12
  const bodyH = height * 0.5
  const armSpan = height * 0.2
  const bodyW = height * 0.2
  const bodyTop = groundY - headR * 2 - bodyH
  const headCy = bodyTop - headR
  const footY = groundY
  const color = '#6b7280'

  return (
    <g>
      {/* Head */}
      <circle cx={x} cy={headCy} r={headR} fill={color} />
      {/* Body */}
      <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} rx={1} />
      {/* Arms */}
      <line x1={x - bodyW / 2} y1={bodyTop + bodyH * 0.2} x2={x - armSpan} y2={bodyTop + bodyH * 0.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={x + bodyW / 2} y1={bodyTop + bodyH * 0.2} x2={x + armSpan} y2={bodyTop + bodyH * 0.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Legs */}
      <line x1={x - bodyW / 4} y1={bodyTop + bodyH} x2={x - bodyW / 4 - 2} y2={footY} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={x + bodyW / 4} y1={bodyTop + bodyH} x2={x + bodyW / 4 + 2} y2={footY} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  )
}

// ── Car silhouette (plan/elevation hybrid) ──
interface CarSilhouetteProps {
  x: number
  groundY: number
  length?: number
}

export function CarSilhouette({ x, groundY, length = 50 }: CarSilhouetteProps): ReactNode {
  const carH = length * 0.3
  const roofH = carH * 0.4
  const wheelR = carH * 0.12
  const color = '#4a5568'
  const roofColor = '#6b7280'

  return (
    <g>
      {/* Body */}
      <rect x={x - length / 2} y={groundY - carH} width={length} height={carH} fill={color} rx={3} />
      {/* Roof/cabin */}
      <rect x={x - length * 0.15} y={groundY - carH - roofH} width={length * 0.3} height={roofH} fill={roofColor} rx={2} />
      {/* Windows */}
      <rect x={x - length * 0.12} y={groundY - carH - roofH + 2} width={length * 0.1} height={roofH - 4} fill={PAPER} rx={1} />
      <rect x={x + 2} y={groundY - carH - roofH + 2} width={length * 0.1} height={roofH - 4} fill={PAPER} rx={1} />
      {/* Wheels */}
      <circle cx={x - length * 0.3} cy={groundY - wheelR} r={wheelR} fill={INK} />
      <circle cx={x + length * 0.3} cy={groundY - wheelR} r={wheelR} fill={INK} />
    </g>
  )
}

// ── North arrow ──
interface NorthArrowProps {
  cx: number
  cy: number
  size?: number
}

export function NorthArrow({ cx, cy, size = 20 }: NorthArrowProps): ReactNode {
  const half = size / 2
  const tip = cy - half
  const left = cx - half * 0.6
  const right = cx + half * 0.6
  const midLeft = cx - half * 0.3
  const midRight = cx + half * 0.3

  return (
    <g>
      {/* Circle */}
      <circle cx={cx} cy={cy} r={half} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      {/* North triangle (filled) — top half */}
      <polygon points={`${cx},${tip} ${left},${cy} ${midLeft},${cy}`} fill={INK} />
      {/* South triangle (white) — bottom half */}
      <polygon points={`${midRight},${cy} ${right},${cy} ${cx},${tip}`} fill={PAPER} stroke={INK} strokeWidth={CAD_HAIR} />
      {/* N label */}
      <text x={cx} y={tip - 3} fontSize={6} fontWeight="bold" fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
        N
      </text>
    </g>
  )
}

// ── Scale bar ──
interface ScaleBarProps {
  x: number
  y: number
  totalPx: number
  metresPerPx: number
  label?: string
}

export function ScaleBar({ x, y, totalPx, metresPerPx }: ScaleBarProps): ReactNode {
  // Generate tick segments: assume 0, 5m, 10m, 15m ...
  const segmentM = 5
  const segmentPx = segmentM / metresPerPx
  const count = Math.max(1, Math.floor(totalPx / segmentPx))
  const actualPx = count * segmentPx
  const barH = 4
  const tickH = 6
  const ticks: ReactNode[] = []

  for (let i = 0; i <= count; i++) {
    const tx = x + i * segmentPx
    ticks.push(
      <line key={`tick-${i}`} x1={tx} y1={y} x2={tx} y2={y + tickH} stroke={INK} strokeWidth={CAD_HAIR} />,
    )
    if (i < count) {
      const fill = i % 2 === 0 ? INK : PAPER
      ticks.push(
        <rect key={`seg-${i}`} x={tx} y={y} width={segmentPx} height={barH} fill={fill} stroke={INK} strokeWidth={CAD_HAIR} />,
      )
    }
    // Label
    ticks.push(
      <text key={`lab-${i}`} x={tx} y={y + tickH + 8} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
        {i * segmentM}
      </text>,
    )
  }

  return (
    <g>
      {ticks}
      <text x={x + actualPx / 2} y={y + tickH + 16} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle">
        metres
      </text>
    </g>
  )
}

// ── Numbered legend (circled numbers ① ② ③ + labels) ──
interface NumberedLegendProps {
  items: { n: number; label: string }[]
  x: number
  y: number
}

export function NumberedLegend({ items, x, y }: NumberedLegendProps): ReactNode {
  const rowH = 14
  const circleR = 5
  const pad = 4
  const bw = 120
  const bh = items.length * rowH + pad

  return (
    <g>
      <rect x={x} y={y} width={bw} height={bh} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      {items.map((item, i) => {
        const iy = y + pad + i * rowH
        return (
          <g key={item.n}>
            <circle cx={x + circleR + pad} cy={iy + circleR} r={circleR} fill={PAPER} stroke={INK} strokeWidth={CAD_HAIR} />
            <text x={x + circleR + pad} y={iy + circleR + 1.5} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="central">
              {item.n}
            </text>
            <text x={x + circleR * 2 + pad * 2} y={iy + circleR + 1.5} fontSize={5} fill={INK} fontFamily="system-ui, sans-serif" dominantBaseline="central">
              {item.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
