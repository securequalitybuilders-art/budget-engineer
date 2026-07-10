import React, { useState, useCallback, useRef } from 'react'
import type { BoardAnnotation, AnnotationKind } from '@/domain/presentation'
import { usePresentationStore } from '@/stores/presentationStore'
import { uuid } from '@/lib/utils'
import { INK } from '@/components/drawings/cadConstants'

interface BoardAnnotatorProps {
  boardId: string
  boardWidth: number
  boardHeight: number
}

const ANNOTATION_COLORS = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#1a1a1a']

export function BoardAnnotator({ boardId, boardWidth, boardHeight }: BoardAnnotatorProps) {
  const [activeTool, setActiveTool] = useState<AnnotationKind | null>(null)
  const [selectedColor, setSelectedColor] = useState(ANNOTATION_COLORS[5])
  const [annotationText, setAnnotationText] = useState('')
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([])
  const svgRef = useRef<SVGSVGElement>(null)

  const addAnnotation = usePresentationStore((s) => s.addAnnotation)
  const removeAnnotation = usePresentationStore((s) => s.removeAnnotation)
  const boards = usePresentationStore((s) => s.boards)
  const board = boards.find((b) => b.id === boardId)
  const annotations = board?.annotations ?? []

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = boardWidth / rect.width
    const scaleY = boardHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [boardWidth, boardHeight])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool) return
    const pt = getSvgPoint(e)

    if (activeTool === 'textbox') {
      const ann: BoardAnnotation = {
        id: uuid(),
        kind: 'textbox',
        ...pt,
        w: 120,
        h: 24,
        text: annotationText || 'Double-click to edit',
        color: selectedColor,
        strokeWidth: 1,
      }
      addAnnotation(boardId, ann)
      setActiveTool(null)
    } else if (activeTool === 'callout' || activeTool === 'dimension' || activeTool === 'freehand') {
      setDrawingPoints([pt])
    }
  }, [activeTool, getSvgPoint, annotationText, selectedColor, addAnnotation, boardId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeTool || drawingPoints.length === 0) return
    if (activeTool === 'freehand') {
      const pt = getSvgPoint(e)
      setDrawingPoints((prev) => [...prev, pt])
    }
  }, [activeTool, drawingPoints, getSvgPoint])

  const handleMouseUp = useCallback(() => {
    if (!activeTool || drawingPoints.length < 2) {
      setDrawingPoints([])
      return
    }
    const ann: BoardAnnotation = {
      id: uuid(),
      kind: activeTool === 'freehand' ? 'freehand' : activeTool === 'callout' ? 'callout' : 'dimension',
      x: drawingPoints[0].x,
      y: drawingPoints[0].y,
      color: selectedColor,
      strokeWidth: activeTool === 'dimension' ? 0.5 : 1.5,
      points: drawingPoints,
      text: annotationText || undefined,
    }
    addAnnotation(boardId, ann)
    setDrawingPoints([])
    setActiveTool(null)
  }, [activeTool, drawingPoints, selectedColor, annotationText, addAnnotation, boardId])

  const handleDeleteAnnotation = useCallback((id: string) => {
    removeAnnotation(boardId, id)
  }, [boardId, removeAnnotation])

  const tools: Array<{ kind: AnnotationKind; label: string }> = [
    { kind: 'textbox', label: 'Text' },
    { kind: 'callout', label: 'Callout' },
    { kind: 'dimension', label: 'Dim' },
    { kind: 'freehand', label: 'Draw' },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {tools.map((t) => (
          <button
            key={t.kind}
            onClick={() => setActiveTool(activeTool === t.kind ? null : t.kind)}
            style={{
              padding: '4px 12px',
              background: activeTool === t.kind ? '#1a1a1a' : '#f0f0f0',
              color: activeTool === t.kind ? '#fff' : '#1a1a1a',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: activeTool === t.kind ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedColor(c)}
            style={{
              width: 20,
              height: 20,
              background: c,
              border: selectedColor === c ? '2px solid #000' : '1px solid #ccc',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          />
        ))}
        <input
          type="text"
          value={annotationText}
          onChange={(e) => setAnnotationText(e.target.value)}
          placeholder="Annotation text..."
          style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, width: 180 }}
        />
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        style={{ width: '100%', height: 'auto', border: '1px solid #ddd', cursor: activeTool ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {annotations.map((ann) => (
          <AnnotationElement key={ann.id} annotation={ann} onDelete={handleDeleteAnnotation} />
        ))}
        {drawingPoints.length > 0 && activeTool === 'freehand' && (
          <path
            d={drawingPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={selectedColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}

function AnnotationElement({ annotation, onDelete }: { annotation: BoardAnnotation; onDelete: (id: string) => void }) {
  switch (annotation.kind) {
    case 'textbox':
      return (
        <g
          style={{ cursor: 'pointer' }}
          onClick={() => onDelete(annotation.id)}
          data-testid="annotation-textbox"
        >
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.w ?? 100}
            height={annotation.h ?? 24}
            fill="#fff9e6"
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
          />
          <text
            x={annotation.x + 4}
            y={annotation.y + 14}
            fontFamily="Arial, sans-serif"
            fontSize={10}
            fill={INK}
          >
            {annotation.text ?? ''}
          </text>
        </g>
      )
    case 'callout':
      return (
        <g style={{ cursor: 'pointer' }} onClick={() => onDelete(annotation.id)} data-testid="annotation-callout">
          {annotation.points && annotation.points.length >= 2 && (
            <>
              <path
                d={annotation.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={annotation.color}
                strokeWidth={annotation.strokeWidth}
              />
              <circle cx={annotation.points[0].x} cy={annotation.points[0].y} r={3} fill={annotation.color} />
              {annotation.text && (
                <text
                  x={annotation.points[Math.floor(annotation.points.length / 2)].x + 4}
                  y={annotation.points[Math.floor(annotation.points.length / 2)].y - 4}
                  fontFamily="Arial, sans-serif"
                  fontSize={9}
                  fill={INK}
                >
                  {annotation.text}
                </text>
              )}
            </>
          )}
        </g>
      )
    case 'dimension':
      return (
        <g style={{ cursor: 'pointer' }} onClick={() => onDelete(annotation.id)} data-testid="annotation-dimension">
          {annotation.points && annotation.points.length >= 2 && (
            <>
              <line
                x1={annotation.points[0].x}
                y1={annotation.points[0].y}
                x2={annotation.points[1].x}
                y2={annotation.points[1].y}
                stroke={annotation.color}
                strokeWidth={annotation.strokeWidth}
                strokeDasharray="2,2"
              />
              <circle cx={annotation.points[0].x} cy={annotation.points[0].y} r={2} fill={annotation.color} />
              <circle cx={annotation.points[1].x} cy={annotation.points[1].y} r={2} fill={annotation.color} />
            </>
          )}
        </g>
      )
    case 'freehand':
      return (
        <g style={{ cursor: 'pointer' }} onClick={() => onDelete(annotation.id)} data-testid="annotation-freehand">
          {annotation.points && annotation.points.length >= 2 && (
            <path
              d={annotation.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      )
    default:
      return null
  }
}
