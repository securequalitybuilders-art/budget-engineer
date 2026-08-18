// ── Plotter Simulator ──────────────────────────────────────
// React animated pen-plotter visualization.
//   • Pen-down strokes rendered as solid lines
//   • Pen-up repositioning shown as dashed lines
//   • Navy (#1a365d) pen lines, brass (#d4a574) pen head
//   • Pause/play/speed controls
//   • Time estimate display

import { useState, useEffect, useRef, useMemo } from 'react'
import type { OptimizedPenGroup } from './types'
import type { OptimizationStats } from './pathOptimizer'

// ── Types ──────────────────────────────────────────────────

export interface PlotterSimulatorProps {
  groups: OptimizedPenGroup[]
  stats?: OptimizationStats
  paperWidth?: number
  paperHeight?: number
  className?: string
}

type PlayState = 'paused' | 'playing'

interface DrawItem {
  points: Array<{ x: number; y: number }>
  penDown: boolean
  pen: number
  layer: string
}

// ── Constants ──────────────────────────────────────────────

const PEN_COLOR = '#1a365d'
const PEN_HEAD = '#d4a574'
const PEN_UP_COLOR = '#94a3b8'
const BG_COLOR = '#fafaf9'
const GRID_COLOR = '#e7e5e4'

// ── Pure helpers ───────────────────────────────────────────

function buildDrawList(groups: OptimizedPenGroup[]): DrawItem[] {
  const list: DrawItem[] = []
  for (const group of groups) {
    for (let i = 0; i < group.segments.length; i++) {
      const s = group.segments[i]
      if (s.points.length < 2) continue
      if (list.length > 0) {
        const prev = list[list.length - 1]
        const lastPt = prev.points[prev.points.length - 1]
        const firstPt = s.points[0]
        if (Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) > 0.1) {
          list.push({ points: [lastPt, firstPt], penDown: false, pen: group.pen, layer: s.layer })
        }
      }
      list.push({ points: s.points, penDown: true, pen: group.pen, layer: s.layer })
    }
  }
  return list
}

function countPoints(list: DrawItem[]): number {
  let t = 0
  for (const item of list) t += item.points.length
  return t
}

function penHeadPosition(list: DrawItem[], idx: number): { x: number; y: number } {
  let count = 0
  for (const item of list) {
    if (count + item.points.length > idx) {
      const ci = idx - count
      return item.points[Math.min(ci, item.points.length - 1)]
    }
    count += item.points.length
  }
  return list.length > 0
    ? list[list.length - 1].points[list[list.length - 1].points.length - 1]
    : { x: 0, y: 0 }
}

function visiblePathElements(list: DrawItem[], idx: number): JSX.Element[] {
  const drawn: JSX.Element[] = []
  let count = 0
  for (const item of list) {
    if (count >= idx) break
    const vis = Math.min(item.points.length, idx - count)
    if (vis >= 2) {
      const pts = item.points.slice(0, vis)
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
      drawn.push(
        <path
          key={`seg-${drawn.length}`}
          d={d}
          fill="none"
          stroke={item.penDown ? PEN_COLOR : PEN_UP_COLOR}
          strokeWidth={item.penDown ? 0.5 : 0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={item.penDown ? undefined : '3 2'}
        />
      )
    }
    count += item.points.length
  }
  return drawn
}

// ── Component ──────────────────────────────────────────────

export function PlotterSimulator({
  groups,
  stats,
  paperWidth = 841,
  paperHeight = 594,
  className = '',
}: PlotterSimulatorProps) {
  const [playState, setPlayState] = useState<PlayState>('paused')
  const [speed, setSpeed] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)

  const drawList = useMemo(() => buildDrawList(groups), [groups])
  const totalPoints = useMemo(() => countPoints(drawList), [drawList])
  const penHeadPos = useMemo(() => penHeadPosition(drawList, currentIndex), [drawList, currentIndex])
  const visiblePaths = useMemo(() => visiblePathElements(drawList, currentIndex), [drawList, currentIndex])
  const progress = totalPoints > 0 ? (currentIndex / totalPoints) * 100 : 0

  // Animation via useEffect + refs (no render-phase ref access)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (playState !== 'playing' || currentIndex >= totalPoints) return
    let cancelled = false
    lastTimeRef.current = 0

    function tick(timestamp: number) {
      if (cancelled) return
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const dt = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      setCurrentIndex(prev => {
        const next = Math.min(prev + Math.max(1, Math.floor(speed * 500 * dt)), totalPoints)
        if (next >= totalPoints) {
          queueMicrotask(() => setPlayState('paused'))
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playState, speed, currentIndex, totalPoints])

  // Reset on new groups
  const prevGroupsLenRef = useRef(groups.length)
  useEffect(() => {
    if (prevGroupsLenRef.current !== groups.length) {
      prevGroupsLenRef.current = groups.length
      setCurrentIndex(0)
    }
  }, [groups.length])

  const viewBox = `0 0 ${paperWidth} ${paperHeight}`

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        className="relative border rounded overflow-hidden"
        style={{ background: BG_COLOR }}
      >
        <svg
          viewBox={viewBox}
          className="w-full h-auto"
          style={{ maxHeight: '60vh' }}
          role="img"
          aria-label="Pen plotter simulator"
        >
          <rect x="0" y="0" width={paperWidth} height={paperHeight} fill={BG_COLOR} />

          {Array.from({ length: Math.floor(paperWidth / 50) + 1 }, (_, i) => (
            <line key={`gx-${i}`} x1={i * 50} y1={0} x2={i * 50} y2={paperHeight} stroke={GRID_COLOR} strokeWidth={0.3} />
          ))}
          {Array.from({ length: Math.floor(paperHeight / 50) + 1 }, (_, i) => (
            <line key={`gy-${i}`} x1={0} y1={i * 50} x2={paperWidth} y2={i * 50} stroke={GRID_COLOR} strokeWidth={0.3} />
          ))}

          {visiblePaths}

          {playState === 'playing' && (
            <circle cx={penHeadPos.x} cy={penHeadPos.y} r={2} fill={PEN_HEAD} stroke={PEN_HEAD} strokeWidth={1}>
              <animate attributeName="r" values="1.5;2.5;1.5" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          <rect x={paperWidth - 200} y={paperHeight - 40} width={195} height={35} fill="none" stroke={PEN_COLOR} strokeWidth={0.5} />
          <text x={paperWidth - 195} y={paperHeight - 18} fill={PEN_COLOR} fontSize={8} fontFamily="monospace">
            Budget Engineer Plotter
          </text>
          <text x={paperWidth - 195} y={paperHeight - 10} fill={PEN_COLOR} fontSize={6} fontFamily="monospace">
            {currentIndex} / {totalPoints} points
          </text>
        </svg>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={() => setPlayState(playState === 'playing' ? 'paused' : 'playing')}
          className="px-3 py-1.5 rounded font-medium border"
          style={{
            background: playState === 'playing' ? PEN_HEAD : PEN_COLOR,
            color: playState === 'playing' ? '#1a365d' : '#fff',
            borderColor: PEN_COLOR,
          }}
          aria-label={playState === 'playing' ? 'Pause simulation' : 'Play simulation'}
        >
          {playState === 'playing' ? '\u23F8 Pause' : '\u25B6 Play'}
        </button>

        <div className="flex items-center gap-1">
          <span className="text-stone-400">Speed:</span>
          {[0.5, 1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs border ${
                speed === s ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10' : 'border-stone-600'
              }`}
            >
              {s}\u00D7
            </button>
          ))}
        </div>

        <div className="flex-1 h-2 bg-stone-700 rounded overflow-hidden">
          <div className="h-full rounded transition-all" style={{ width: `${progress}%`, background: PEN_HEAD }} />
        </div>

        {stats && (
          <div className="flex gap-4 text-stone-400 text-xs">
            <span>Pens: {stats.outputPenLifts} lifts</span>
            <span>Travel: {stats.penUpReductionPct.toFixed(0)}% reduced</span>
          </div>
        )}
      </div>
    </div>
  )
}
