import { useEffect, useMemo, useRef } from 'react'
import type { DesignOption } from '../../domain/boq'
import type { Opening, PlanModel, RoomRect, WallSegment } from '../../domain/plan'
import { generatePlanModel } from '../../engine/plan-generator'
import { DimensionLayer } from './DimensionLayer'
import { RoomLabels } from './RoomLabels'
import { usePlanViewport } from '../../hooks/usePlanViewport'
import { useEditablePlan } from '../../hooks/useEditablePlan'
import { downloadTextFile } from '../../lib/export/file-export'
import { exportPlanToDxf, exportPlanToMakerJson } from '../../lib/export/maker-export'
import { exportPlanToSvg } from '../../lib/export/svg-export'
import { TraceBackdrop, BackdropControls } from './TraceBackdrop'
import type { BackdropState } from '@/lib/import/backdropUtils'

interface PlanCanvasProps {
  projectId: string | null
  design: DesignOption | null
  persistedPlan?: PlanModel | null
  onSavePlan?: (projectId: string, designId: string, plan: PlanModel) => void
  backdrop?: BackdropState | null
  onBackdropUpdate?: (update: Partial<BackdropState>) => void
  onBackdropSetScale?: (knownWidth: number, knownHeight: number) => void
  onBackdropClear?: () => void
  onDesignCreated?: (projectId: string, plan: PlanModel) => void
}

function createEmptyPlan(): PlanModel {
  return {
    id: `trace-canvas-${Date.now()}`,
    designOptionId: '',
    width: 20,
    height: 20,
    wallThickness: 0.23,
    rooms: [],
    walls: [],
    openings: [],
    scaleLabel: '1:100 @ A3',
  }
}

const canvasWidth = 920
const canvasHeight = 640

export function PlanCanvas({
  projectId,
  design,
  persistedPlan = null,
  onSavePlan,
  backdrop,
  onBackdropUpdate,
  onBackdropSetScale,
  onBackdropClear,
  onDesignCreated,
}: PlanCanvasProps) {
  const createdRef = useRef(false)
  const baseModel = useMemo<PlanModel | null>(() => {
    if (design) return generatePlanModel(design)
    if (backdrop?.imageDataUrl) return createEmptyPlan()
    return null
  }, [design, backdrop?.imageDataUrl])
  const { view, zoomIn, zoomOut, reset, onPointerDown, onPointerMove, onPointerUp } = usePlanViewport()
  const {
    model,
    selectedRoomId,
    selectedOpeningId,
    clearSelection,
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
    addRoom,
    deleteRoom,
    addOpening,
    beginMoveOpening,
    deleteOpening,
    nudgeRoom,
    nudgeOpening,
    snapStep,
    setSnapStep,
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
      if (projectId && design && onSavePlan) {
        onSavePlan(projectId, design.id, next)
      } else if (projectId && !design && backdrop?.imageDataUrl && next.rooms.length > 0 && !createdRef.current && onDesignCreated) {
        createdRef.current = true
        onDesignCreated(projectId, next)
      }
    },
  )

  const lastPointer = useRef({ x: 0, y: 0 })
  const modelRef = useRef(model)
  modelRef.current = model
  const nudgeRoomRef = useRef(nudgeRoom)
  nudgeRoomRef.current = nudgeRoom
  const nudgeOpeningRef = useRef(nudgeOpening)
  nudgeOpeningRef.current = nudgeOpening

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement && document.activeElement !== document.body) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedOpeningId) { deleteOpening(selectedOpeningId); return }
        if (selectedRoomId) deleteRoom(selectedRoomId)
        return
      }
      if (e.key.startsWith('Arrow') && activeMode === 'idle') {
        e.preventDefault()
        const plan = modelRef.current
        if (!plan) return
        const step = e.shiftKey ? snapStep * 10 : snapStep
        if (selectedOpeningId) {
          const wall = plan.walls.find((w) => w.id === plan.openings.find((o) => o.id === selectedOpeningId)?.wallId)
          if (!wall) return
          const wallLen = Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2)
          if (wallLen < 0.01) return
          const offsetStep = step / wallLen
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudgeOpeningRef.current(selectedOpeningId, -offsetStep)
          else nudgeOpeningRef.current(selectedOpeningId, offsetStep)
          return
        }
        if (selectedRoomId) {
          let dx = 0; let dy = 0
          if (e.key === 'ArrowLeft') dx = -step
          else if (e.key === 'ArrowRight') dx = step
          else if (e.key === 'ArrowUp') dy = -step
          else if (e.key === 'ArrowDown') dy = step
          nudgeRoomRef.current(selectedRoomId, dx, dy)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedRoomId, selectedOpeningId, deleteRoom, deleteOpening, snapStep, activeMode])

  if (!model) {
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

  let dimensionLabel: { text: string; x: number; y: number } | null = null
  if (activeMode !== 'idle') {
    if (activeMode === 'opening-move' && selectedOpeningId) {
      const opening = model.openings.find((o) => o.id === selectedOpeningId)
      if (opening) {
        const wall = model.walls.find((w) => w.id === opening.wallId)
        if (wall) {
          const horizontal = wall.start.y === wall.end.y
          const cx = horizontal ? wall.start.x + (wall.end.x - wall.start.x) * opening.offset : wall.start.x
          const cy = horizontal ? wall.start.y : wall.start.y + (wall.end.y - wall.start.y) * opening.offset
          dimensionLabel = { text: `${(opening.offset * 100).toFixed(0)}%`, x: cx, y: cy - 0.5 }
        }
      }
    } else if ((activeMode === 'move' || activeMode === 'resize') && selectedRoomId) {
      const room = model.rooms.find((r) => r.id === selectedRoomId)
      if (room) {
        dimensionLabel = { text: `${room.width.toFixed(2)} × ${room.height.toFixed(2)}`, x: room.x + room.width / 2, y: room.y + room.height / 2 }
      }
    }
  }

  function handleSvgPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget as Element
    svg.setPointerCapture(event.pointerId)
    lastPointer.current = { x: event.clientX, y: event.clientY }

    const target = event.target as Element | null
    const openingEl = target?.closest('[data-opening-id]') as Element | null
    const openingId = openingEl?.getAttribute('data-opening-id')

    if (openingId) {
      beginMoveOpening(openingId)
      return
    }

    const roomEl = target?.closest('[data-room-id]') as Element | null
    const roomId = roomEl?.getAttribute('data-room-id')

    if (roomId) {
      const isResize = roomEl?.getAttribute('data-resize') === 'true'
      if (isResize) {
        beginResize(roomId, event.clientX, event.clientY)
      } else {
        beginMove(roomId, event.clientX, event.clientY)
      }
    } else {
      clearSelection()
      onPointerDown(event.clientX, event.clientY)
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
    }
  }

  function handleSvgPointerUp() {
    onPointerUp()
    endPointer()
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

          <span className="text-slate-600">|</span>

          <button onClick={() => addRoom()} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700">+ Room</button>
          <button onClick={() => selectedRoomId && deleteRoom(selectedRoomId)} disabled={!selectedRoomId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:text-slate-400">− Room</button>

          <span className="text-slate-600">|</span>

          <button onClick={() => addOpening('door')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700">+ Door</button>
          <button onClick={() => addOpening('window')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700">+ Window</button>

          <select
            value={String(snapStep)}
            onChange={(e) => setSnapStep(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white"
          >
            <option value="0.05">Snap 0.05m</option>
            <option value="0.1">Snap 0.1m</option>
            <option value="0.2">Snap 0.2m</option>
            <option value="0.5">Snap 0.5m</option>
            <option value="1">Snap 1m</option>
          </select>

          <span className="text-slate-600">|</span>

          <button onClick={undo} disabled={!canUndo} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-400">Undo</button>
          <button onClick={redo} disabled={!canRedo} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-400">Redo</button>

          <span className="text-slate-600">|</span>

          <button onClick={() => downloadTextFile(`${(design?.name ?? 'tracing-canvas').toLowerCase().replace(/\s+/g, '-')}.json`, exportPlanToMakerJson(model), 'application/json;charset=utf-8')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Maker JSON</button>
          <button onClick={() => downloadTextFile(`${(design?.name ?? 'tracing-canvas').toLowerCase().replace(/\s+/g, '-')}.dxf`, exportPlanToDxf(model), 'application/dxf')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">DXF</button>
          <button onClick={() => downloadTextFile(`${(design?.name ?? 'tracing-canvas').toLowerCase().replace(/\s+/g, '-')}.svg`, exportPlanToSvg(model), 'image/svg+xml;charset=utf-8')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">SVG</button>
        </div>
      </div>

      {backdrop && onBackdropUpdate && onBackdropSetScale && onBackdropClear && (
        <div className="mb-3">
          <BackdropControls
            backdrop={backdrop}
            onUpdate={onBackdropUpdate}
            onSetScale={onBackdropSetScale}
            onClear={onBackdropClear}
          />
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="block h-auto w-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label={design ? `2D floor plan for ${design.name}` : 'Tracing canvas'}
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
            {backdrop && (
              <TraceBackdrop backdrop={backdrop} planWidth={model.width} planHeight={model.height} />
            )}

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
              return (
                <EditableOpening
                  key={opening.id}
                  opening={opening}
                  wall={wall}
                  selected={selectedOpeningId === opening.id}
                />
              )
            })}
            <RoomLabels model={model} />
            <DimensionLayer model={model} />

            {dimensionLabel && (
              <text
                x={dimensionLabel.x}
                y={dimensionLabel.y}
                fill="#67e8f9"
                fontSize={0.35}
                textAnchor="middle"
                dominantBaseline="central"
                pointerEvents="none"
              >
                {dimensionLabel.text}
              </text>
            )}

            <text x={0} y={-1.9} fill="#67e8f9" fontSize={0.56}>Footprint: {model.width.toFixed(1)}m × {model.height.toFixed(1)}m</text>
          </g>

          <g transform={`translate(24 ${canvasHeight - 36})`}>
            <text fill="#cbd5e1" fontSize="12">Scale {model.scaleLabel}</text>
            <text x={0} y={16} fill="#94a3b8" fontSize="11">Dimensions in metres</text>
          </g>
        </svg>

        {activeMode !== 'idle' && (
          <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-3 rounded border border-slate-700/50 bg-slate-900/80 px-3 py-1.5 text-[10px] text-cyan-300">
            {activeMode === 'opening-move' ? 'dragging opening…' : activeMode === 'move' ? 'moving…' : 'resizing…'}
          </div>
        )}
      </div>

      <div className="mt-2 text-[10px] text-slate-400">{model.openings.length} openings</div>

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
            title={`Snapshot ${i + 1} — ${plan.rooms.length} rooms, ${plan.openings.length} openings`}
            onClick={onUndo}
          >
            {plan.rooms.length}r {plan.openings.length}o
          </div>
        ))}
        <div className="shrink-0 rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-300">
          Now
        </div>
        {timeline.future.map((plan, i) => (
          <div
            key={i}
            className="shrink-0 cursor-pointer rounded border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            title={`Future ${i + 1} — ${plan.rooms.length} rooms, ${plan.openings.length} openings`}
            onClick={onRedo}
          >
            {plan.rooms.length}r {plan.openings.length}o
          </div>
        ))}
      </div>
      {activeMode !== 'idle' && (
        <span className="shrink-0 text-[10px] text-amber-400 italic">
          {activeMode === 'move' ? 'moving…' : activeMode === 'resize' ? 'resizing…' : 'opening…'}
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

function EditableOpening({
  opening,
  wall,
  selected,
}: {
  opening: Opening
  wall: WallSegment
  selected: boolean
}) {
  const horizontal = wall.start.y === wall.end.y
  const cx = horizontal
    ? wall.start.x + (wall.end.x - wall.start.x) * opening.offset
    : wall.start.x
  const cy = horizontal
    ? wall.start.y
    : wall.start.y + (wall.end.y - wall.start.y) * opening.offset

  const half = opening.width / 2
  const strokeColor = opening.kind === 'door' ? '#f59e0b' : '#38bdf8'
  const selectedColor = '#67e8f9'

  return (
    <g data-opening-id={opening.id} style={{ cursor: 'pointer' }}>
      {selected && (
        <circle cx={cx} cy={cy} r={0.3} fill="none" stroke={selectedColor} strokeWidth={0.06} strokeDasharray="0.12 0.1" pointerEvents="none" />
      )}
      {horizontal ? (
        <line
          x1={cx - half}
          y1={cy}
          x2={cx + half}
          y2={cy}
          stroke={selected ? selectedColor : strokeColor}
          strokeWidth={selected ? 0.22 : 0.16}
          strokeLinecap="round"
          pointerEvents="none"
        />
      ) : (
        <line
          x1={cx}
          y1={cy - half}
          x2={cx}
          y2={cy + half}
          stroke={selected ? selectedColor : strokeColor}
          strokeWidth={selected ? 0.22 : 0.16}
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}
      {selected && (
        <circle cx={cx} cy={cy} r={0.08} fill={selectedColor} pointerEvents="none" />
      )}
    </g>
  )
}
