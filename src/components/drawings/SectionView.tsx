import { useMemo } from 'react'
import type { ElevationDrawing } from '@/adapters/planToElevations'
import type { PlanModel } from '@/domain/plan'
import { renderSectionSheet } from '@/components/drawings/sectionModel'

interface SectionViewProps {
  drawing: ElevationDrawing | null
  activePlan: PlanModel | null
  floors: number
  storeyHeight: number
  pitchHeight: number
}

export function SectionView({ drawing, activePlan, floors, storeyHeight, pitchHeight }: SectionViewProps) {
  const rendered = useMemo(() => {
    try {
      return renderSectionSheet(drawing, activePlan, floors, storeyHeight, pitchHeight)
    } catch {
      return null
    }
  }, [drawing, activePlan, floors, storeyHeight, pitchHeight])

  if (!rendered) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Drawing unavailable — no active plan</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950/80">
      <svg
        viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`}
        className="block h-auto w-full"
        role="img"
        aria-label="SECTION A-A"
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </div>
  )
}
