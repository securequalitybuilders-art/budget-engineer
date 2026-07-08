import { useRef, useState, useCallback, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { clamp, DRAWING_ZOOM_MIN, DRAWING_ZOOM_MAX } from '@/lib/drawingZoom'

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

interface ZoomableDrawingProps {
  children: ReactNode
  className?: string
  minZoom?: number
  maxZoom?: number
}

export function ZoomableDrawing({ children, className = '', minZoom = DRAWING_ZOOM_MIN, maxZoom = DRAWING_ZOOM_MAX }: ZoomableDrawingProps) {
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const dragRef = useRef<{ active: boolean; x: number; y: number; panX: number; panY: number }>({ active: false, x: 0, y: 0, panX: 0, panY: 0 })
  const pinchRef = useRef<{ dist: number; mid: { x: number; y: number }; zoom: number; panX: number; panY: number } | null>(null)
  const zoomRef = useRef(zoom)
  const panXRef = useRef(panX)
  const panYRef = useRef(panY)
  zoomRef.current = zoom
  panXRef.current = panX
  panYRef.current = panY

  const zoomIn = useCallback(() => {
    setZoom(z => clamp(z + 0.2, minZoom, maxZoom))
  }, [minZoom, maxZoom])

  const zoomOut = useCallback(() => {
    setZoom(z => clamp(z - 0.2, minZoom, maxZoom))
  }, [minZoom, maxZoom])

  const reset = useCallback(() => { setZoom(1); setPanX(0); setPanY(0) }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.002
    setZoom(z => clamp(z + delta, minZoom, maxZoom))
  }, [minZoom, maxZoom])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return
    dragRef.current = { active: true, x: e.clientX, y: e.clientY, panX: panXRef.current, panY: panYRef.current }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    setPanX(dragRef.current.panX + e.clientX - dragRef.current.x)
    setPanY(dragRef.current.panY + e.clientY - dragRef.current.y)
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false
  }, [])

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
      pinchRef.current = {
        dist: distance(t1, t2),
        mid: midpoint(t1, t2),
        zoom: zoomRef.current,
        panX: panXRef.current,
        panY: panYRef.current,
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return
    const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
    const curDist = distance(t1, t2)
    const curMid = midpoint(t1, t2)

    const prev = pinchRef.current
    const ratio = prev.dist > 0 ? curDist / prev.dist : 1
    const newZoom = clamp(prev.zoom * ratio, minZoom, maxZoom)

    const worldX = (prev.mid.x - prev.panX) / prev.zoom
    const worldY = (prev.mid.y - prev.panY) / prev.zoom

    setZoom(newZoom)
    setPanX(curMid.x - worldX * newZoom)
    setPanY(curMid.y - worldY * newZoom)
  }, [minZoom, maxZoom])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950/80 ${className}`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>

      <div
        className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-stone-900/80 p-1 shadow-lg"
        role="group"
        aria-label="Drawing zoom controls"
      >
        <button
          onClick={zoomIn}
          aria-label="Zoom in"
          className="rounded p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200 active:scale-95"
        >
          <ZoomIn size={16} />
        </button>
        <span className="min-w-[3rem] text-center text-[10px] font-medium text-stone-400 select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomOut}
          aria-label="Zoom out"
          className="rounded p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200 active:scale-95"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={reset}
          aria-label="Reset zoom"
          className="rounded p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200 active:scale-95"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  )
}
