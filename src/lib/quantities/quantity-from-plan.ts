import type { BuildingElement } from '../../domain/boq'
import type { PlanModel } from '../../domain/plan'
import { footprintArea, grossInternalArea, wallMetrics } from '../geometry/plan-geometry'

export function deriveElementsFromPlan(plan: PlanModel): BuildingElement[] {
  const metrics = wallMetrics(plan)
  const floorArea = grossInternalArea(plan)
  const footprint = footprintArea(plan)
  const externalWallArea = Number((metrics.externalLength * 3).toFixed(2))
  const internalWallArea = Number((metrics.internalLength * 3).toFixed(2))
  const wallFinishArea = Number((externalWallArea + internalWallArea).toFixed(2))
  const foundationVolume = Number((metrics.externalLength * 0.6 * 0.25).toFixed(2))
  const foundationWallArea = Number((metrics.externalLength * 0.6).toFixed(2))
  const electricalPoints = Math.max(8, plan.rooms.length * 3)
  const plumbingPoints = Math.max(4, Math.round(plan.rooms.length * 1.2))
  const openingsCount = plan.openings.length
  const externalWorks = Number((footprint * 0.8).toFixed(2))

  return [
    { id: 'geom-foundation', type: 'foundation', category: 'foundation', name: 'Strip foundations', unit: 'm3', quantity: foundationVolume },
    { id: 'geom-foundation-wall', type: 'foundation_wall', category: 'foundation_wall', name: 'Foundation walls', unit: 'm2', quantity: foundationWallArea },
    { id: 'geom-wall', type: 'wall', category: 'wall', name: 'External and internal walls', unit: 'm2', quantity: Number((externalWallArea + internalWallArea).toFixed(2)) },
    { id: 'geom-roof', type: 'roof', category: 'roof', name: 'Roof structure', unit: 'm2', quantity: Number((footprint * 1.12).toFixed(2)) },
    { id: 'geom-floor-finish', type: 'floor_finish', category: 'floor_finish', name: 'Floor finishes', unit: 'm2', quantity: floorArea },
    { id: 'geom-wall-finish', type: 'wall_finish', category: 'wall_finish', name: 'Wall finishes', unit: 'm2', quantity: wallFinishArea },
    { id: 'geom-electrical', type: 'electrical_point', category: 'electrical_point', name: 'Electrical points', unit: 'point', quantity: electricalPoints },
    { id: 'geom-plumbing', type: 'plumbing_point', category: 'plumbing_point', name: 'Plumbing points', unit: 'point', quantity: plumbingPoints },
    { id: 'geom-openings-note', type: 'external_works', category: 'external_works', name: 'External works', unit: 'm2', quantity: externalWorks },
    { id: 'geom-openings-count', type: 'external_works', category: 'external_works', name: `Openings count ${openingsCount}`, unit: 'm2', quantity: 0 },
  ]
}
