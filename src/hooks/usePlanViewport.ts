import { useRef, useState } from 'react'

export interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

export function usePlanViewport() {
  const [view, setView] = useState<ViewportState>({ zoom: 1, panX: 0, panY: 0 })
  const dragRef = useRef<{ active: boolean; x: number; y: number; startPanX: number; startPanY: number }>({
    active: false,
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  })

  const zoomOut = () => setView((v) => ({ ...v, zoom: Math.max(0.6, Number((v.zoom - 0.1).toFixed(1)))}))
  const zoomIn = () => setView((v) => ({ ...v, zoom: Math.min(1.8, Number((v.zoom + 0.1).toFixed(1)))}))
  const reset = () => setView({ zoom: 1, panX: 0, panY: 0 })

  const onPointerDown = (x: number, y: number) => {
    dragRef.current = { active: true, x, y, startPanX: view.panX, startPanY: view.panY }
  }

  const onPointerMove = (x: number, y: number) => {
    if (!dragRef.current.active) return
    const dx = x - dragRef.current.x
    const dy = y - dragRef.current.y
    setView((v) => ({ ...v, panX: dragRef.current.startPanX + dx, panY: dragRef.current.startPanY + dy }))
  }

  const onPointerUp = () => {
    dragRef.current.active = false
  }

  return {
    view,
    zoomIn,
    zoomOut,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
