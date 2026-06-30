import { useMemo } from 'react'
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
    beginMove,
    beginResize,
    updatePointer,
    endPointer,
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
          <button onClick={undo} disabled={!canUndo} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Undo</button>
          <button onClick={redo} disabled={!canRedo} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Redo</button>
          <button onClick={() => downloadTextFile(`${design.name.toLowerCase().replace(/\s+/g, '-')}.json`, exportPlanToMakerJson(model), 'application/json;charset=utf-8')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Maker JSON</button>
          <button onClick={() => downloadTextFile(`${design.name.toLowerCase().replace(/\s+/g, '-')}.dxf`, exportPlanToDxf(model), 'application/dxf')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">DXF</button>
          <button onClick={() => downloadTextFile(`${design.name.toLowerCase().replace(/\s+/g, '-')}.svg`, exportPlanToSvg(model), 'image/svg+xml;charset=utf-8')} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">SVG</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="block h-auto w-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label={`2D floor plan for ${design.name}`}
          onPointerDown={(event) => onPointerDown(event.clientX, event.clientY)}
          onPointerMove={(event) => {
            onPointerMove(event.clientX, event.clientY)
            const movementX = 'movementX' in event ? event.movementX : 0
            const movementY = 'movementY' in event ? event.movementY : 0
            const delta = toWorldDelta(movementX, movementY)
            updatePointer(delta.dx, delta.dy)
          }}
          onPointerUp={() => {
            onPointerUp()
            endPointer()
          }}
          onPointerLeave={() => {
            onPointerUp()
            endPointer()
          }}
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
                onMoveStart={beginMove}
                onResizeStart={beginResize}
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
          </g>
        </svg>
      </div>
    </div>
  )
}

function EditableRoom({
  room,
  selected,
  onMoveStart,
  onResizeStart,
}: {
  room: RoomRect
  selected: boolean
  onMoveStart: (roomId: string, x: number, y: number) => void
  onResizeStart: (roomId: string, x: number, y: number) => void
}) {
  return (
    <g>
      <rect
        x={room.x}
        y={room.y}
        width={room.width}
        height={room.height}
        fill={room.color ?? '#334155'}
        fillOpacity={selected ? 0.28 : 0.18}
        stroke={selected ? '#67e8f9' : 'rgba(255,255,255,0.16)'}
        strokeWidth={selected ? 0.08 : 0.04}
        onPointerDown={(event) => {
          event.stopPropagation()
          onMoveStart(room.id, event.clientX, event.clientY)
        }}
      />
      <rect
        x={room.x + room.width - 0.28}
        y={room.y + room.height - 0.28}
        width={0.28}
        height={0.28}
        rx={0.04}
        fill="#67e8f9"
        onPointerDown={(event) => {
          event.stopPropagation()
          onResizeStart(room.id, event.clientX, event.clientY)
        }}
      />
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
