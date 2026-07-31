import { useMemo, type ReactNode } from 'react'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'
import { renderSitePlan } from '@/lib/drawings/sitePlanRenderer'

interface SitePlanViewProps {
  activePlan: PlanModel | null
  design: DesignOption | null
  floors: number
}

export function SitePlanView({ activePlan, design, floors }: SitePlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderSitePlan(activePlan, design, floors)
    } catch {
      return null
    }
  }, [activePlan, design, floors])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="SITE PLAN">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}
