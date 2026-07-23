import { useMemo } from 'react'
import type { ElevationDrawing } from '@/adapters/planToElevations'
import type { PlanModel } from '@/domain/plan'
import type { CanopyParams } from '@/engine/canopy/canopyGeometry'
import { renderSectionSheet } from '@/components/drawings/sectionModel'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'

interface SectionViewProps {
  drawing: ElevationDrawing | null
  activePlan: PlanModel | null
  floors: number
  storeyHeight: number
  pitchHeight: number
  roofType?: 'gable' | 'canopy'
  canopyParams?: CanopyParams | null
}

export function SectionView({ drawing, activePlan, floors, storeyHeight, pitchHeight, roofType = 'gable', canopyParams }: SectionViewProps) {
  const rendered = useMemo(() => {
    try {
      return renderSectionSheet(drawing, activePlan, floors, storeyHeight, pitchHeight, roofType, canopyParams)
    } catch {
      return null
    }
  }, [drawing, activePlan, floors, storeyHeight, pitchHeight, roofType, canopyParams])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="SECTION A-A">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}
