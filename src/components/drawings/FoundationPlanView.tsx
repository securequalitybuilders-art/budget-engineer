import { useMemo, type ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { DrawingSheetLayout } from '@/components/drawings/DrawingSheetLayout'
import { DrawingEmptyState } from '@/components/drawings/DrawingEmptyState'
import { renderFoundationPlan } from '@/lib/drawings/foundationPlanRenderer'

interface FoundationPlanViewProps {
  activePlan: PlanModel | null
  floors: number
}

export function FoundationPlanView({ activePlan }: FoundationPlanViewProps): ReactNode {
  const rendered = useMemo(() => {
    try {
      return renderFoundationPlan(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rendered) return <DrawingEmptyState />

  return (
    <DrawingSheetLayout viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`} title="FOUNDATION PLAN">
      {rendered.elements}
    </DrawingSheetLayout>
  )
}
