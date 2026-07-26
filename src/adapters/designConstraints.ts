import type { SiteContext } from '@/domain/site'

export interface DesignConstraints {
  setbacks?: { front: number; rear: number; sides: [number, number] }
  maxSiteCoverage?: number
  maxBuildingDepth?: number
  singleLoaded?: boolean
  entrancePreference?: 'north' | 'south' | 'east' | 'west'
  groupWetRooms?: boolean
  maxStructuralSpan?: number
  prioritizeVentilation?: boolean
  minExits?: number
}

export function composeDesignConstraints(
  site?: SiteContext | null,
  briefConstraints?: { maxStructuralSpan?: number; minExits?: number },
): DesignConstraints {
  const constraints: DesignConstraints = {}

  if (site) {
    if (site.setbacks) {
      constraints.setbacks = site.setbacks
    }
    if (site.accessEdges && site.accessEdges.length > 0) {
      const road = site.accessEdges.find(e => e.type === 'vehicle')
      if (road) {
        const edgeCenter = road.location[Math.floor(road.location.length / 2)]
        if (edgeCenter.x < 0) constraints.entrancePreference = 'west'
        else if (edgeCenter.x > 0) constraints.entrancePreference = 'east'
        else if (edgeCenter.y < 0) constraints.entrancePreference = 'north'
        else constraints.entrancePreference = 'south'
      }
    }
  }

  if (briefConstraints) {
    if (briefConstraints.maxStructuralSpan != null) {
      constraints.maxStructuralSpan = briefConstraints.maxStructuralSpan
    }
    if (briefConstraints.minExits != null) {
      constraints.minExits = briefConstraints.minExits
    }
  }

  return constraints
}
