import { useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'
import { renderCeilingPlan } from '@/components/drawings/ceilingPlanModel'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'

interface CeilingPlanViewProps {
  activePlan: PlanModel | null
}

export function CeilingPlanView({ activePlan }: CeilingPlanViewProps) {
  const rendered = useMemo(() => {
    try {
      return renderCeilingPlan(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="REFLECTED CEILING PLAN">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}
