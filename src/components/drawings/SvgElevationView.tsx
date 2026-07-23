import { useRef, useEffect } from 'react'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'

interface SvgElevationViewProps {
  svgContent: string | null
  title: string
}

export function SvgElevationView({ svgContent, title }: SvgElevationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !svgContent) return
    containerRef.current.innerHTML = svgContent
    const svgEl = containerRef.current.querySelector('svg')
    if (svgEl) {
      svgEl.style.width = '100%'
      svgEl.style.height = 'auto'
      svgEl.style.maxHeight = '80vh'
      svgEl.style.minHeight = '300px'
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      svgEl.setAttribute('role', 'img')
      svgEl.setAttribute('aria-label', title)
    }
  }, [svgContent, title])

  if (!svgContent) return <DrawingEmptyState message="Elevation unavailable — no active plan" />

  return (
    <ZoomableDrawing>
      <div className="w-full" ref={containerRef} />
    </ZoomableDrawing>
  )
}
