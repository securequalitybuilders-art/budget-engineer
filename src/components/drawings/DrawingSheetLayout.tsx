import type { ReactNode } from 'react'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'

interface DrawingSheetLayoutProps {
  viewBox: string
  title: string
  children: ReactNode
}

export function DrawingSheetLayout({ viewBox, title, children }: DrawingSheetLayoutProps) {
  return (
    <ZoomableDrawing>
      <svg
        viewBox={viewBox}
        className="block h-auto w-full"
        role="img"
        aria-label={title}
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </svg>
    </ZoomableDrawing>
  )
}
