import type { FloorPlan, LayoutParameters } from './layoutEngine'

export interface Tier3Result {
  layoutParams: LayoutParameters
  floorPlans: FloorPlan[]
  success: boolean
  error?: string
}
