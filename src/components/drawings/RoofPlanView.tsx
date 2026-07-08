import { useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'
import { renderRoofPlan } from '@/components/drawings/roofPlanModel'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'

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

  if (!rendered) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Drawing unavailable — no active plan</p>
      </div>
    )
  }

  return (
    <ZoomableDrawing>
      <svg
        viewBox={`0 0 ${rendered.sheetW} ${rendered.sheetH}`}
        className="block h-auto w-full"
        role="img"
        aria-label="ROOF PLAN"
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </ZoomableDrawing>
  )
}
