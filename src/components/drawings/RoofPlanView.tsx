import { useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'
import { renderRoofPlan } from '@/components/drawings/roofPlanModel'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'

interface RoofPlanViewProps {
  activePlan: PlanModel | null
}

export function RoofPlanView({ activePlan }: RoofPlanViewProps) {
  const rendered = useMemo(() => {
    try {
      return renderRoofPlan(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="ROOF PLAN">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}
