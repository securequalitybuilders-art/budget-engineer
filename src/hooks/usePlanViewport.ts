import { useRef, useState } from 'react'

export interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

export const ZOOM_MIN = 0.3
export const ZOOM_MAX = 3.0

function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
}

export function midpoint(pA: { x: number; y: number }, pB: { x: number; y: number }): { x: number; y: number } {
  return { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 }
}

export function pinchScale(prevDist: number, newDist: number, prevScale: number): number {
  if (prevDist <= 0 || newDist <= 0) return clampZoom(prevScale)
  return clampZoom(prevScale * (newDist / prevDist))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
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

  const zoomOut = () => setView((v) => ({ ...v, zoom: clampZoom(Number((v.zoom - 0.1).toFixed(1))) }))
  const zoomIn = () => setView((v) => ({ ...v, zoom: clampZoom(Number((v.zoom + 0.1).toFixed(1))) }))
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

  function applyPinchZoom(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    prevP1: { x: number; y: number },
    prevP2: { x: number; y: number },
  ): Partial<ViewportState> {
    const prevMid = midpoint(prevP1, prevP2)
    const curMid = midpoint(p1, p2)
    const prevDist = distance(prevP1, prevP2)
    const curDist = distance(p1, p2)

    const newZoom = pinchScale(prevDist, curDist, view.zoom)

    const worldX = (prevMid.x - view.panX) / view.zoom
    const worldY = (prevMid.y - view.panY) / view.zoom

    const newPanX = curMid.x - worldX * newZoom
    const newPanY = curMid.y - worldY * newZoom

    return { zoom: newZoom, panX: newPanX, panY: newPanY }
  }

  const pinchZoom = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    prevP1: { x: number; y: number },
    prevP2: { x: number; y: number },
  ) => {
    setView((v) => ({ ...v, ...applyPinchZoom(p1, p2, prevP1, prevP2) }))
  }

  return {
    view,
    zoomIn,
    zoomOut,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    pinchZoom,
  }
}
