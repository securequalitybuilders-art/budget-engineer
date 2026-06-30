import { useMemo, useState } from 'react'
import type { CadDocument, CadOpening, CadTool, CadWall } from '../../domain/cad'
import type { PlanModel } from '../../domain/plan'
import { moveOpeningOffset, moveWallEndpoint, setActiveTool, toggleLayer } from '../../lib/cad/cad-editing'
import { healCadDocument } from '../../lib/cad/cad-healing'
import { addAnnotation, addFloor, addOpening, addWall, deleteOpening, deleteWall, setActiveFloor } from '../../lib/cad/cad-commands'
import { addBlock } from '../../lib/cad/cad-blocks'
import { generateDimensionAnnotations } from '../../lib/cad/cad-dimensions'
import { exportCobieLikeJson, exportIfcLikeJson } from '../../lib/cad/cad-exchange'
import { cadDocumentToRichPlanModel } from '../../lib/cad/cad-plan-sync'
import { applyProfessionalDxfLayerSemantics } from '../../lib/cad/cad-dxf-semantics'
import { joinWalls, reconstructRoomsFromWalls, splitWallAtMidpoint } from '../../lib/cad/cad-topology'
import { trimWallsAtIntersection, offsetWallChain } from '../../lib/cad/cad-intersections'
import { moveAnnotationText, offsetWall, trimWallToBounds } from '../../lib/cad/cad-professional'
import { downloadTextFile } from '../../lib/export/file-export'
import { CadToolbar } from './CadToolbar'
import { CadCommandPanel } from './CadCommandPanel'
import { CadGeometryPanel } from './CadGeometryPanel'
import { CadProfessionalPanel } from './CadProfessionalPanel'
import { BlockLibraryPanel } from './BlockLibraryPanel'
import { CadExchangePanel } from './CadExchangePanel'

interface WallFirstCanvasProps {
  document: CadDocument | null
  basePlan: PlanModel | null
  onChange: (next: CadDocument) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const canvasWidth = 920
const canvasHeight = 640

export function WallFirstCanvas({ document, basePlan, onChange, onUndo, onRedo, canUndo, canRedo }: WallFirstCanvasProps) {
  const [drag, setDrag] = useState<{ type: 'wall-start' | 'wall-end' | 'opening'; id: string } | null>(null)
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null)
  const [secondSelectedWallId, setSecondSelectedWallId] = useState<string | null>(null)
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [draftWallStart, setDraftWallStart] = useState<{ x: number; y: number } | null>(null)
  const model = useMemo(() => (document ? cadDocumentToRichPlanModel(document, basePlan) : null), [document, basePlan])

  if (!document || !model) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">No CAD document available.</div>
  }

  const doc = document
  const reconstructedRooms = reconstructRoomsFromWalls(doc)
  const padding = 72
  const scale = Math.min((canvasWidth - padding * 2) / model.width, (canvasHeight - padding * 2) / model.height)
  const tx = padding
  const ty = padding

  const visible = (layerId: string) => doc.layers.find((layer) => layer.id === layerId)?.visible !== false
  const visibleWalls = doc.walls.filter((wall) => wall.floorId === doc.activeFloorId && visible(wall.layerId))
  const visibleOpenings = doc.openings.filter((opening) => opening.floorId === doc.activeFloorId && visible(opening.layerId))
  const visibleAnnotations = doc.annotations.filter((annotation) => annotation.floorId === doc.activeFloorId && visible(annotation.layerId))
  const visibleBlocks = doc.blocks.filter((block) => block.floorId === doc.activeFloorId)

  function toWorld(clientX: number, clientY: number, rect: DOMRect) {
    return {
      x: (clientX - rect.left - tx) / scale,
      y: (clientY - rect.top - ty) / scale,
    }
  }

  function updateTool(tool: CadTool) {
    onChange(setActiveTool(doc, tool))
  }

  function handleCanvasClick(world: { x: number; y: number }) {
    if (doc.activeTool === 'wall') {
      if (!draftWallStart) {
        setDraftWallStart(world)
        return
      }
      onChange(addWall(doc, doc.activeFloorId, draftWallStart, world))
      setDraftWallStart(null)
      return
    }

    if (doc.activeTool === 'annotation') {
      const text = `Note ${doc.annotations.length + 1}`
      onChange(addAnnotation(doc, text, world))
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Wall-First CAD Authoring</h2>
          <p className="mt-1 text-sm text-slate-300">Professional wall-first CAD authoring with geometry intelligence, BIM metadata, exchange scaffolds, and vertical coordination groundwork.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CadToolbar doc={doc} onToolChange={updateTool} />
          <button onClick={() => onChange(healCadDocument(doc))} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Heal Topology</button>
        </div>
      </div>

      <CadCommandPanel
        doc={doc}
        selectedWallId={selectedWallId}
        selectedOpeningId={selectedOpeningId}
        onAddDoor={() => selectedWallId && onChange(addOpening(doc, selectedWallId, 'door'))}
        onAddWindow={() => selectedWallId && onChange(addOpening(doc, selectedWallId, 'window'))}
        onDeleteWall={() => selectedWallId && onChange(deleteWall(doc, selectedWallId))}
        onDeleteOpening={() => selectedOpeningId && onChange(deleteOpening(doc, selectedOpeningId))}
        onAddFloor={() => onChange(addFloor(doc, `Floor ${doc.floors.length + 1}`, doc.floors.length * 3.2))}
        onUndo={() => onUndo?.()}
        onRedo={() => onRedo?.()}
        canUndo={!!canUndo}
        canRedo={!!canRedo}
      />

      <CadGeometryPanel
        selectedWallId={selectedWallId}
        secondSelectedWallId={secondSelectedWallId}
        onSplitWall={() => selectedWallId && onChange(splitWallAtMidpoint(doc, selectedWallId))}
        onJoinWalls={() => selectedWallId && secondSelectedWallId && onChange(joinWalls(doc, selectedWallId, secondSelectedWallId))}
        onGenerateDimensions={() => onChange(generateDimensionAnnotations(doc))}
        reconstructedRoomCount={reconstructedRooms.length}
      />

      <CadProfessionalPanel
        selectedWallId={selectedWallId}
        selectedAnnotationId={selectedAnnotationId}
        onOffsetWall={() => selectedWallId && onChange(offsetWall(doc, selectedWallId, 0.2))}
        onTrimWall={() => selectedWallId && onChange(trimWallToBounds(doc, selectedWallId, model.width, model.height))}
        onEditAnnotation={() => {
          if (!selectedAnnotationId) return
          const existing = doc.annotations.find((annotation) => annotation.id === selectedAnnotationId)
          const next = typeof window !== 'undefined' ? window.prompt('Edit annotation text', existing?.text ?? '') : null
          if (next !== null) onChange(moveAnnotationText(doc, selectedAnnotationId, next))
        }}
        onApplyDxfSemantics={() => onChange(applyProfessionalDxfLayerSemantics(doc))}
      />

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <BlockLibraryPanel onInsert={(type) => onChange(addBlock(doc, type, 2, 2))} />
        <CadExchangePanel
          onExportIfc={() => downloadTextFile('model.ifc-like.json', exportIfcLikeJson(doc), 'application/json;charset=utf-8')}
          onExportCobie={() => downloadTextFile('model.cobie-like.json', exportCobieLikeJson(doc), 'application/json;charset=utf-8')}
        />
      </section>

      <div className="my-4 flex flex-wrap gap-2">
        {doc.layers.map((layer) => (
          <button key={layer.id} onClick={() => onChange(toggleLayer(doc, layer.id))} className={`rounded-xl border px-3 py-2 text-xs ${layer.visible ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-slate-900 text-slate-400'}`}>
            {layer.name}
          </button>
        ))}
        {doc.floors.map((floor) => (
          <button key={floor.id} onClick={() => onChange(setActiveFloor(doc, floor.id))} className={`rounded-xl border px-3 py-2 text-xs ${doc.activeFloorId === floor.id ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-slate-900 text-slate-400'}`}>
            {floor.name}
          </button>
        ))}
        {selectedWallId && secondSelectedWallId && (
          <button onClick={() => onChange(trimWallsAtIntersection(doc, selectedWallId, secondSelectedWallId))} className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">Trim at Intersection</button>
        )}
        {selectedWallId && (
          <button onClick={() => onChange(offsetWallChain(doc, selectedWallId, 0.2))} className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">Offset Chain</button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="block h-auto w-full"
          onClick={(event) => {
            const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
            handleCanvasClick(toWorld(event.clientX, event.clientY, rect))
          }}
          onPointerMove={(event) => {
            if (!drag) return
            const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
            const world = toWorld(event.clientX, event.clientY, rect)
            if (drag.type === 'wall-start') onChange(moveWallEndpoint(doc, drag.id, 'start', world))
            if (drag.type === 'wall-end') onChange(moveWallEndpoint(doc, drag.id, 'end', world))
            if (drag.type === 'opening') {
              const opening = doc.openings.find((item) => item.id === drag.id)
              const wall = doc.walls.find((item) => item.id === opening?.wallId)
              if (!opening || !wall) return
              const ratio = openingRatioForPoint(wall, world)
              onChange(moveOpeningOffset(doc, opening.id, ratio))
            }
          }}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <defs>
            <pattern id="grid2" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="url(#grid2)" />
          <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
            {model.rooms.map((room) => (
              <rect key={room.id} x={room.x} y={room.y} width={room.width} height={room.height} fill="#6366f1" fillOpacity={0.08} stroke="rgba(99,102,241,0.18)" strokeWidth={0.04} />
            ))}
            {visibleWalls.map((wall) => (
              <EditableWall
                key={wall.id}
                wall={wall}
                selected={selectedWallId === wall.id}
                secondary={secondSelectedWallId === wall.id}
                onSelect={(multi) => {
                  if (multi && selectedWallId && selectedWallId !== wall.id) {
                    setSecondSelectedWallId(wall.id)
                  } else {
                    setSelectedWallId(wall.id)
                    setSecondSelectedWallId(null)
                  }
                  setSelectedOpeningId(null)
                }}
                onDragStart={setDrag}
              />
            ))}
            {visibleOpenings.map((opening) => {
              const wall = doc.walls.find((item) => item.id === opening.wallId)
              return wall ? <EditableOpening key={opening.id} opening={opening} wall={wall} selected={selectedOpeningId === opening.id} onSelect={() => { setSelectedOpeningId(opening.id); setSelectedWallId(wall.id); setSelectedAnnotationId(null) }} onDragStart={setDrag} /> : null
            })}
            {visibleAnnotations.map((annotation) => (
              <text key={annotation.id} x={annotation.position.x} y={annotation.position.y} fill={annotation.kind === 'dimension' ? '#67e8f9' : '#f59e0b'} fontSize={annotation.kind === 'dimension' ? 0.32 : 0.42} onClick={(e) => { e.stopPropagation(); setSelectedAnnotationId(annotation.id); setSelectedWallId(null); setSelectedOpeningId(null) }}>{annotation.text}</text>
            ))}
            {visibleBlocks.map((block) => (
              <rect key={block.id} x={block.position.x} y={block.position.y} width={block.width} height={block.height} fill={block.blockType === 'stair' ? '#8b5cf6' : '#22c55e'} fillOpacity={0.22} stroke={block.blockType === 'core' ? '#f97316' : '#94a3b8'} strokeWidth={0.05} />
            ))}
            {draftWallStart && doc.activeTool === 'wall' && <circle cx={draftWallStart.x} cy={draftWallStart.y} r={0.22} fill="#22d3ee" />}
          </g>
        </svg>
      </div>
    </section>
  )
}

function EditableWall({ wall, selected, secondary, onSelect, onDragStart }: { wall: CadWall; selected: boolean; secondary: boolean; onSelect: (multi: boolean) => void; onDragStart: (drag: { type: 'wall-start' | 'wall-end'; id: string }) => void }) {
  const stroke = selected ? '#22d3ee' : secondary ? '#facc15' : wall.structuralRole === 'external' ? '#f8fafc' : '#cbd5e1'
  return (
    <g>
      <line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke={stroke} strokeWidth={wall.thickness} strokeLinecap="square" onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey) }} />
      <circle cx={wall.start.x} cy={wall.start.y} r={0.18} fill="#67e8f9" onPointerDown={(e) => { e.stopPropagation(); onSelect(e.shiftKey); onDragStart({ type: 'wall-start', id: wall.id }) }} />
      <circle cx={wall.end.x} cy={wall.end.y} r={0.18} fill="#67e8f9" onPointerDown={(e) => { e.stopPropagation(); onSelect(e.shiftKey); onDragStart({ type: 'wall-end', id: wall.id }) }} />
    </g>
  )
}

function EditableOpening({ opening, wall, selected, onSelect, onDragStart }: { opening: CadOpening; wall: CadWall; selected: boolean; onSelect: () => void; onDragStart: (drag: { type: 'opening'; id: string }) => void }) {
  const point = pointOnWall(wall, opening.offsetRatio)
  const horizontal = wall.start.y === wall.end.y
  const half = opening.width / 2
  return horizontal ? (
    <line x1={point.x - half} y1={point.y} x2={point.x + half} y2={point.y} stroke={selected ? '#facc15' : opening.kind === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth={0.16} strokeLinecap="round" onPointerDown={(e) => { e.stopPropagation(); onSelect(); onDragStart({ type: 'opening', id: opening.id }) }} />
  ) : (
    <line x1={point.x} y1={point.y - half} x2={point.x} y2={point.y + half} stroke={selected ? '#facc15' : opening.kind === 'door' ? '#f59e0b' : '#38bdf8'} strokeWidth={0.16} strokeLinecap="round" onPointerDown={(e) => { e.stopPropagation(); onSelect(); onDragStart({ type: 'opening', id: opening.id }) }} />
  )
}

function pointOnWall(wall: CadWall, ratio: number) {
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * ratio,
    y: wall.start.y + (wall.end.y - wall.start.y) * ratio,
  }
}

function openingRatioForPoint(wall: CadWall, point: { x: number; y: number }) {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const lengthSq = dx * dx + dy * dy || 1
  const projection = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSq
  return Math.max(0.1, Math.min(0.9, projection))
}
