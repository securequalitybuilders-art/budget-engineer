import { useRef, useEffect } from 'react'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'

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

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Elevation unavailable — no active plan</p>
      </div>
    )
  }

  return (
    <ZoomableDrawing>
      <div className="w-full" ref={containerRef} />
    </ZoomableDrawing>
  )
}
