import { useMemo, useRef, useState } from 'react'
import type { DesignOption } from '../../domain/boq'
import type { PlanModel, RoomRect, WallSegment } from '../../domain/plan'
import { generatePlanModel } from '../../engine/plan-generator'
import { DimensionLayer } from './DimensionLayer'
import { RoomLabels } from './RoomLabels'
import { usePlanViewport } from '../../hooks/usePlanViewport'
import { useEditablePlan } from '../../hooks/useEditablePlan'
import { downloadTextFile } from '../../lib/export/file-export'
import { exportPlanToDxf, exportPlanToMakerJson } from '../../lib/export/maker-export'
import { exportPlanToSvg } from '../../lib/export/svg-export'

interface PlanCanvasProps {
  projectId: string | null
  design: DesignOption | null
  persistedPlan?: PlanModel | null
  onSavePlan?: (projectId: string, designId: string, plan: PlanModel) => void
}

const canvasWidth = 920
const canvasHeight = 640

export function PlanCanvas({ projectId, design, persistedPlan = null, onSavePlan }: PlanCanvasProps) {
  const baseModel = useMemo<PlanModel | null>(() => (design ? generatePlanModel(design) : null), [design])
  const { view, zoomIn, zoomOut, reset, onPointerDown, onPointerMove, onPointerUp } = usePlanViewport()
  const {
    model,
    selectedRoomId,
    setSelectedRoomId,
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
    activeMode,
    timeline,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditablePlan(
    baseModel,
    persistedPlan,
    (next) => {
      if (projectId && design && onSavePlan) onSavePlan(projectId, design.id, next)
    },
  )

  const lastPointer = useRef({ x: 0, y: 0 })
  const [debugInfo, setDebugInfo] = useState({ mode: '', roomId: '', dx: 0, dy: 0 })

  if (!design || !model) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No active design selected. Choose a design option to render a 2D floor plan.
      </div>
    )
  }

  const padding = 72
  const scale = Math.min(
    (canvasWidth - padding * 2) / model.width,
    (canvasHeight - padding * 2) / model.height,
  ) * view.zoom

  const tx = padding + view.panX
  const ty = padding + view.panY
  const toWorldDelta = (dx: number, dy: number) => ({ dx: dx / scale, dy: dy / scale })

  function handleSvgPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget as Element
    svg.setPointerCapture(event.pointerId)
    lastPointer.current = { x: event.clientX, y: event.clientY }

    const target = event.target as Element | null
    const roomEl = target?.closest('[data-room-id]') as Element | null
    const roomId = roomEl?.getAttribute('data-room-id')

    if (roomId) {
      const isResize = roomEl?.getAttribute('data-resize') === 'true'
      if (isResize) {
        beginResize(roomId, event.clientX, event.clientY)
      } else {
        beginMove(roomId, event.clientX, event.clientY)
      }
      setDebugInfo({ mode: isResize ? 'resize' : 'move', roomId, dx: 0, dy: 0 })
    } else {
      setSelectedRoomId(null)
      onPointerDown(event.clientX, event.clientY)
      setDebugInfo({ mode: 'pan', roomId: '', dx: 0, dy: 0 })
    }
  }

  function handleSvgPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const dx = event.clientX - lastPointer.current.x
    const dy = event.clientY - lastPointer.current.y
    lastPointer.current = { x: event.clientX, y: event.clientY }

    onPointerMove(event.clientX, event.clientY)
    if (activeMode !== 'idle') {
      const world = toWorldDelta(dx, dy)
      updatePointer(world.dx, world.dy)
      setDebugInfo((prev) => ({ ...prev, dx: prev.dx + world.dx, dy: prev.dy + world.dy }))
    }
  }

  function handleSvgPointerUp() {
    onPointerUp()
    endPointer()
    setDebugInfo({ mode: '', roomId: '', dx: 0, dy: 0 })
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">2D CAD Canvas</h2>
          <p className="mt-1 text-sm text-slate-300">Editable parametric SVG plan with snapping, constraints, undo/redo, and export actions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={zoomOut} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">−</button>
          <div className="min-w-[72px] text-center text-sm text-slate-300">{Math.round(view.zoom * 100)}%</div>
          <button onClick={zoomIn} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">+</button>
          <button onClick={reset} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Reset</button>
          <button onClick={undo} disabled={!canUndo} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-400">Undo</button>
          <button onClick={redo} disabled={!canRedo} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-400">Redo</button>
          <button onClick={() => downloadTextFile(`${design.name.toLowerCase().replace(/\s+/g, '-')}.json`, exportPlanToMakerJson(model), 'application/json;charset=utf-8')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Maker JSON</button>
          <button onClick={() => downloadTextFile(`${design.name.toLowerCase().replace(/\s+/g, '-')}.dxf`, exportPlanToDxf(model), 'application/dxf')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">DXF</button>
          <button onClick={() => downloadTextFile(`${design.name.toLowerCase().replace(/\s+/g, '-')}.svg`, exportPlanToSvg(model), 'image/svg+xml;charset=utf-8')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">SVG</button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="block h-auto w-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label={`2D floor plan for ${design.name}`}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

          <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
            {model.rooms.map((room) => (
              <EditableRoom
                key={room.id}
                room={room}
                selected={selectedRoomId === room.id}
              />
            ))}

            {model.walls.map((wall) => renderWall(wall))}
            {model.openings.map((opening) => {
              const wall = model.walls.find((item) => item.id === opening.wallId)
              if (!wall) return null
              return renderOpening(wall, opening.offset, opening.width, opening.kind)
            })}
            <RoomLabels model={model} />
            <DimensionLayer model={model} />

            <text x={0} y={-1.9} fill="#67e8f9" fontSize={0.56}>Footprint: {model.width.toFixed(1)}m × {model.height.toFixed(1)}m</text>
          </g>

          <g transform={`translate(24 ${canvasHeight - 36})`}>
            <text fill="#cbd5e1" fontSize="12">Scale {model.scaleLabel}</text>
            <text x={0} y={16} fill="#94a3b8" fontSize="11">Dimensions in metres</text>
          </g>
        </svg>

        {activeMode !== 'idle' && (
          <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-3 rounded border border-slate-700/50 bg-slate-900/80 px-3 py-1.5 text-[10px] text-slate-400">
            <span>{debugInfo.mode}</span>
            <span>room: {debugInfo.roomId.slice(0, 8)}</span>
            <span>dx: {debugInfo.dx.toFixed(3)}</span>
            <span>dy: {debugInfo.dy.toFixed(3)}</span>
          </div>
        )}
      </div>

      <TimelinePanel timeline={timeline} onUndo={undo} onRedo={redo} activeMode={activeMode} />
    </div>
  )
}

function TimelinePanel({ timeline, onUndo, onRedo, activeMode }: {
  timeline: { past: PlanModel[]; future: PlanModel[] }
  onUndo: () => void
  onRedo: () => void
  activeMode: string
}) {
  const total = timeline.past.length + 1 + timeline.future.length
  if (total === 1) return null

  return (
    <div className="mt-3 flex items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timeline</span>
      <div className="flex items-center gap-1">
        {timeline.past.map((plan, i) => (
          <div
            key={i}
            className="shrink-0 cursor-pointer rounded border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            title={`Snapshot ${i + 1} — ${plan.rooms.length} rooms`}
            onClick={onUndo}
          >
            {plan.rooms.length} rooms
          </div>
        ))}
        <div className="shrink-0 rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-300">
          Now
        </div>
        {timeline.future.map((plan, i) => (
          <div
            key={i}
            className="shrink-0 cursor-pointer rounded border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            title={`Future ${i + 1} — ${plan.rooms.length} rooms`}
            onClick={onRedo}
          >
            {plan.rooms.length} rooms
          </div>
        ))}
      </div>
      {activeMode !== 'idle' && (
        <span className="shrink-0 text-[10px] text-amber-400 italic">
          {activeMode === 'move' ? 'moving…' : 'resizing…'}
        </span>
      )}
    </div>
  )
}

const HANDLE = 0.2

function EditableRoom({
  room,
  selected,
}: {
  room: RoomRect
  selected: boolean
}) {
  return (
    <g>
      {selected && (
        <rect
          x={room.x - 0.08}
          y={room.y - 0.08}
          width={room.width + 0.16}
          height={room.height + 0.16}
          fill="none"
          stroke="#67e8f9"
          strokeWidth={0.06}
          strokeDasharray="0.16 0.12"
          pointerEvents="none"
        />
      )}
      <rect
        x={room.x}
        y={room.y}
        width={room.width}
        height={room.height}
        fill={room.color ?? '#334155'}
        fillOpacity={selected ? 0.28 : 0.18}
        stroke={selected ? '#67e8f9' : 'rgba(255,255,255,0.16)'}
        strokeWidth={selected ? 0.08 : 0.04}
        data-room-id={room.id}
      />
      {selected && (
        <>
          <rect x={room.x - HANDLE / 2} y={room.y - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="nwse-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x + room.width / 2 - HANDLE / 2} y={room.y - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="ns-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x + room.width - HANDLE / 2} y={room.y - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="nesw-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x - HANDLE / 2} y={room.y + room.height / 2 - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="ew-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x + room.width - HANDLE / 2} y={room.y + room.height / 2 - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="ew-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x - HANDLE / 2} y={room.y + room.height - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="nesw-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x + room.width / 2 - HANDLE / 2} y={room.y + room.height - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="ns-resize"
            data-room-id={room.id} data-resize="true" />
          <rect x={room.x + room.width - HANDLE / 2} y={room.y + room.height - HANDLE / 2} width={HANDLE} height={HANDLE} rx={0.04} fill="#67e8f9" cursor="nwse-resize"
            data-room-id={room.id} data-resize="true" />
        </>
      )}
    </g>
  )
}

function renderWall(wall: WallSegment) {
  return (
    <line
      key={wall.id}
      x1={wall.start.x}
      y1={wall.start.y}
      x2={wall.end.x}
      y2={wall.end.y}
      stroke={wall.type === 'external' ? '#f8fafc' : '#cbd5e1'}
      strokeWidth={wall.thickness}
      strokeLinecap="square"
      pointerEvents="none"
    />
  )
}

function renderOpening(wall: WallSegment, offsetRatio: number, width: number, kind: 'door' | 'window') {
  const horizontal = wall.start.y === wall.end.y
  const x = horizontal
    ? wall.start.x + (wall.end.x - wall.start.x) * offsetRatio
    : wall.start.x
  const y = horizontal
    ? wall.start.y
    : wall.start.y + (wall.end.y - wall.start.y) * offsetRatio

  const half = width / 2

  return horizontal ? (
    <line
      key={`${wall.id}-${kind}-${offsetRatio}`}
      x1={x - half}
      y1={y}
      x2={x + half}
      y2={y}
      stroke={kind === 'door' ? '#f59e0b' : '#38bdf8'}
      strokeWidth={0.16}
      strokeLinecap="round"
      pointerEvents="none"
    />
  ) : (
    <line
      key={`${wall.id}-${kind}-${offsetRatio}`}
      x1={x}
      y1={y - half}
      x2={x}
      y2={y + half}
      stroke={kind === 'door' ? '#f59e0b' : '#38bdf8'}
      strokeWidth={0.16}
      strokeLinecap="round"
      pointerEvents="none"
    />
  )
}
