import type { ReactNode } from 'react'
import type { RoomRect } from '@/domain/plan'
import { INK, CAD_HAIR } from '@/components/drawings/cadConstants'

interface FixtureSymbol {
  roomNamePattern: RegExp
  render: (cx: number, cy: number, rw: number, rh: number, scale: number) => ReactNode
}

function renderWC(cx: number, cy: number, rw: number, rh: number, s: number): ReactNode {
  const bowlR = Math.min(rw, rh) * 0.15 * s
  const tankW = bowlR * 0.8
  const tankH = bowlR * 0.6
  return (
    <g>
      <ellipse cx={cx} cy={cy + bowlR * 0.3} rx={bowlR} ry={bowlR * 0.8} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <rect x={cx - tankW / 2} y={cy - bowlR - tankH} width={tankW} height={tankH} rx={1} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
    </g>
  )
}

function renderBasin(cx: number, cy: number, rw: number, rh: number, s: number): ReactNode {
  const basinW = Math.min(rw, rh) * 0.25 * s
  const basinH = basinW * 0.7
  return (
    <g>
      <rect x={cx - basinW / 2} y={cy - basinH / 2} width={basinW} height={basinH} rx={3} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <rect x={cx - basinW * 0.15} y={cy - 1} width={basinW * 0.3} height={2} fill={INK} stroke="none" />
    </g>
  )
}

function renderShower(cx: number, cy: number, rw: number, rh: number, s: number): ReactNode {
  const showerR = Math.min(rw, rh) * 0.2 * s
  return (
    <g>
      <circle cx={cx} cy={cy} r={showerR} fill="none" stroke={INK} strokeWidth={CAD_HAIR} strokeDasharray="3 2" />
      <circle cx={cx} cy={cy} r={2} fill={INK} stroke="none" />
      <line x1={cx - showerR * 0.5} y1={cy - showerR * 0.5} x2={cx + showerR * 0.5} y2={cy + showerR * 0.5} stroke={INK} strokeWidth={CAD_HAIR} />
    </g>
  )
}

function renderBath(cx: number, cy: number, rw: number, rh: number, s: number): ReactNode {
  const bathW = Math.min(rw, rh) * 0.35 * s
  const bathH = bathW * 0.5
  return (
    <g>
      <rect x={cx - bathW / 2} y={cy - bathH / 2} width={bathW} height={bathH} rx={bathH * 0.3} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <ellipse cx={cx} cy={cy - bathH * 0.15} rx={bathW * 0.35} ry={bathH * 0.15} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
    </g>
  )
}

function renderSink(cx: number, cy: number, rw: number, rh: number, s: number): ReactNode {
  const sinkW = Math.min(rw, rh) * 0.3 * s
  const sinkH = sinkW * 0.6
  return (
    <g>
      <rect x={cx - sinkW / 2} y={cy - sinkH / 2} width={sinkW} height={sinkH} rx={2} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <circle cx={cx - sinkW * 0.2} cy={cy} r={1.5} fill={INK} stroke="none" />
      <circle cx={cx + sinkW * 0.2} cy={cy} r={1.5} fill={INK} stroke="none" />
    </g>
  )
}

const FIXTURE_SYMBOLS: FixtureSymbol[] = [
  { roomNamePattern: /(wc|toilet|restroom|lavatory)/i, render: renderWC },
  { roomNamePattern: /(bathroom|ensuite)/i, render: (cx, cy, rw, rh, s) => {
    const midX = cx - rw * s * 0.12
    const midY = cy
    return (
      <g>
        {renderWC(midX - rw * s * 0.08, midY + rh * s * 0.05, rw * 0.6, rh * 0.5, s)}
        {renderBasin(midX + rw * s * 0.12, midY - rh * s * 0.08, rw * 0.5, rh * 0.4, s)}
      </g>
    )
  }},
  { roomNamePattern: /(shower|wet room)/i, render: renderShower },
  { roomNamePattern: /(bath|bathing)/i, render: renderBath },
  { roomNamePattern: /(kitchen|pantry)/i, render: renderSink },
]

export function renderRoomFixtures(room: RoomRect, scale: number, ox: number, oy: number, keyPrefix?: string): ReactNode[] {
  const result: ReactNode[] = []
  const sx = (v: number) => ox + v * scale
  const sy = (v: number) => oy - v * scale
  const cx = sx(room.x + room.width / 2)
  const cy = sy(room.y + room.height / 2)
  const base = keyPrefix ? `${keyPrefix}-fixture-${room.id}` : `fixture-${room.id}`

  for (let fi = 0; fi < FIXTURE_SYMBOLS.length; fi++) {
    const fixture = FIXTURE_SYMBOLS[fi]
    if (fixture.roomNamePattern.test(room.name)) {
      result.push(
        <g key={`${base}-${fi}`}>
          {fixture.render(cx, cy, room.width, room.height, 1)}
        </g>,
      )
    }
  }

  return result
}
