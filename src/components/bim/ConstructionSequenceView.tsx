import { useState, useEffect, useCallback, useMemo } from 'react'
import { Play, Pause, RotateCcw, Clock, Truck, Box } from 'lucide-react'
import type { PlanModel } from '@/domain/plan'
import { useMilestonePlan } from '@/hooks/useMilestonePlan'
import { PHASES } from '@/engine/construction/constructionPhases'
import {
  buildSequence,
  buildIsoTransform,
  activePhaseIndex,
  materialsArrived,
  mergeMilestoneProgress,
  phaseColor,
  phaseStageAt,
  progressAtDay,
  roomIsoPoints,
  scalePhasesToPlan,
  type SequenceItem,
} from '@/lib/construction/sequence'

interface ConstructionSequenceViewProps {
  activePlan: PlanModel | null
  projectId?: string
  budgetCents?: number
  startDate?: string
}

const SPEEDS = [1, 2, 4]

function calendarDay(startDate: string | undefined, day: number): string {
  const start = startDate ? new Date(startDate) : new Date()
  if (Number.isNaN(start.getTime())) return ''
  const d = new Date(start.getTime() + day * 86400000)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ConstructionSequenceView({ activePlan, projectId, budgetCents, startDate }: ConstructionSequenceViewProps) {
  const { milestones } = useMilestonePlan(projectId, budgetCents)
  const seq = useMemo(() => {
    const phases = activePlan ? scalePhasesToPlan(activePlan, Object.values(PHASES)) : Object.values(PHASES)
    const { items, totalDays } = buildSequence(phases)
    const merged = mergeMilestoneProgress(items, milestones)
    return { items: merged, totalDays }
  }, [activePlan, milestones])

  const [day, setDay] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const totalDays = seq.totalDays

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setDay((d) => {
        const next = d + speed * 0.5
        if (next >= totalDays) {
          setPlaying(false)
          return totalDays
        }
        return next
      })
    }, 120)
    return () => clearInterval(timer)
  }, [playing, speed, totalDays])

  const handleScrub = useCallback((value: number) => {
    setDay(Math.max(0, Math.min(totalDays, value)))
  }, [totalDays])

  const reset = useCallback(() => {
    setPlaying(false)
    setDay(0)
  }, [])

  const activeIdx = activePhaseIndex(seq.items, day)
  const activeItem = activeIdx >= 0 ? seq.items[activeIdx] : undefined
  const activeProgress = activeItem ? progressAtDay(activeItem, day) : 0
  const arrived = activeItem ? materialsArrived(activeItem.phase, activeProgress) : []

  const transform = useMemo(() => (activePlan ? buildIsoTransform(activePlan, 520, 380) : null), [activePlan])

  if (!activePlan) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-stone-800 bg-stone-900/50 p-8">
        <Box size={48} className="text-cyan-500/60" />
        <h3 className="text-lg font-semibold text-stone-200">4D Construction Sequencing</h3>
        <p className="max-w-lg text-center text-sm text-stone-400">
          Generate a design option first. The build timeline is overlaid on the plan model footprint.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-stone-200">4D Construction Sequencing</h3>
            <p className="text-xs text-stone-400">
              Day {Math.round(day)} of {totalDays} · {calendarDay(startDate, Math.floor(day))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-stone-700 bg-stone-900/80 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${speed === s ? 'bg-cyan-500/20 text-cyan-300' : 'text-stone-400 hover:text-stone-200'}`}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/30"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-700"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
          <svg viewBox="0 0 520 380" className="w-full" role="img" aria-label="Isometric construction build-up">
            <defs>
              <linearGradient id="iso-ground" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="520" height="380" rx="8" fill="url(#iso-ground)" />
            <text x="260" y="24" textAnchor="middle" fill="#475569" fontSize="11" fontFamily="Inter, Arial, sans-serif">
              Phase build-up · plan footprint (isometric)
            </text>
            {transform && (
              <g>
                {seq.items.map((item, idx) => {
                  const stage = phaseStageAt(item, day)
                  const prog = progressAtDay(item, day)
                  if (stage === 'pending') return null
                  const color = phaseColor(item.phase.id)
                  const z = stage === 'completed' ? (idx + 1) * transform.plateHeight : idx * transform.plateHeight + (prog / 100) * transform.plateHeight
                  const opacity = stage === 'completed' ? 0.9 : 0.55
                  return (
                    <g key={item.phase.id} data-layer={`iso-layer-${item.phase.id}`} data-stage={stage}>
                      {activePlan.rooms.map((room) => (
                        <polygon
                          key={`${item.phase.id}-${room.id}`}
                          points={roomIsoPoints(room, transform, z)}
                          fill={color}
                          fillOpacity={opacity}
                          stroke={color}
                          strokeWidth={0.6}
                          strokeOpacity={0.9}
                        />
                      ))}
                    </g>
                  )
                })}
                {activePlan.rooms.map((room) => (
                  <polygon
                    key={`base-${room.id}`}
                    data-layer="iso-base"
                    points={roomIsoPoints(room, transform, 0)}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1}
                  />
                ))}
              </g>
            )}
          </svg>

          <input
            type="range"
            min={0}
            max={Math.max(totalDays, 1)}
            step={0.5}
            value={day}
            onChange={(e) => handleScrub(Number(e.target.value))}
            aria-label="Construction timeline"
            className="mt-2 w-full accent-cyan-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-stone-400">
            <span>Day 0</span>
            {seq.items.map((item) => (
              <span key={item.phase.id} style={{ color: phaseColor(item.phase.id) }}>
                {item.phase.title.split(' ')[0]}
              </span>
            ))}
            <span>Day {totalDays}</span>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
              <Truck size={13} className="text-amber-400" /> Materials on site
            </h4>
            {activeItem ? (
              arrived.length > 0 ? (
                <ul className="space-y-1.5">
                  {arrived.map((b, i) => (
                    <li key={`${b.item}-${i}`} data-material={`${b.item}`} className="flex items-center justify-between rounded-md bg-stone-800/60 px-2.5 py-1.5 text-xs">
                      <span className="truncate text-stone-200">{b.item}</span>
                      <span className="ml-2 shrink-0 text-stone-400">{b.qty} {b.unit}</span>
                    </li>
                  ))}
                  {activeProgress < 100 && (
                    <li className="px-2.5 pt-1 text-[10px] text-stone-400">
                      {arrived.length} of {activeItem.phase.bom.length} materials arrived
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-stone-400">Mobilising — {activeItem.phase.trade} materials arriving.</p>
              )
            ) : (
              <p className="text-xs text-stone-400">Planning — construction starts at day 1.</p>
            )}
          </div>

          <div className="flex-1 rounded-lg border border-stone-800 bg-stone-900/50 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Sequence</h4>
            <ul className="space-y-1.5">
              {seq.items.map((item) => (
                <SequenceRow key={item.phase.id} item={item} day={day} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function SequenceRow({ item, day }: { item: SequenceItem; day: number }) {
  const stage = phaseStageAt(item, day)
  const prog = progressAtDay(item, day)
  const color = phaseColor(item.phase.id)
  const stageLabel = stage === 'completed' ? 'Done' : stage === 'in-progress' ? 'Active' : 'Pending'
  const stageClass = stage === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : stage === 'in-progress' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-stone-800 text-stone-400'

  return (
    <li
      data-phase={item.phase.id}
      data-stage={stage}
      className="flex items-center gap-2 rounded-md border border-stone-800/60 bg-stone-900/40 px-2.5 py-2"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-stone-200">{item.phase.title}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageClass}`}>{stageLabel}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-800">
            <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, backgroundColor: color }} />
          </div>
          <span className="w-16 shrink-0 text-right text-[10px] text-stone-400">
            Day {item.startDay + 1}–{item.endDay}
          </span>
        </div>
        {item.milestoneProgress !== undefined && (
          <p className="mt-1 text-[10px] text-stone-400">
            Milestone {Math.round(item.milestoneProgress)}% · {item.milestoneState}
          </p>
        )}
      </div>
    </li>
  )
}
