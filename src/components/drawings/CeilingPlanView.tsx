import { useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'
import { renderCeilingPlan } from '@/components/drawings/ceilingPlanModel'
import { ZoomableDrawing } from '@/components/drawings/ZoomableDrawing'

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
        aria-label="REFLECTED CEILING PLAN"
        style={{ maxHeight: '80vh', minHeight: 300 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rendered.elements}
      </svg>
    </ZoomableDrawing>
  )
}
