import {
  computeEnhancedFrontElevation,
  computeEnhancedSideElevation,
  computeEnhancedSection,
} from '@/adapters/elevationEngine'
import {
  computeFrontElevation,
  computeSideElevation,
  computeSection,
} from '@/adapters/planToElevations'
import type { ElevationDrawing } from '@/adapters/planToElevations'

export function resolveFrontElevation(
  plan: Parameters<typeof computeFrontElevation>[0],
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  buildingType?: string,
): ElevationDrawing | null {
  try {
    return computeEnhancedFrontElevation(plan, floors, storeyHeight, pitchHeight, undefined, buildingType)
      ?? computeFrontElevation(plan, floors, storeyHeight, pitchHeight)
  } catch {
    return null
  }
}

export function resolveSideElevation(
  plan: Parameters<typeof computeFrontElevation>[0],
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  buildingType?: string,
): ElevationDrawing | null {
  try {
    return computeEnhancedSideElevation(plan, floors, storeyHeight, pitchHeight, undefined, buildingType)
      ?? computeSideElevation(plan, floors, storeyHeight, pitchHeight)
  } catch {
    return null
  }
}

export function resolveSection(
  plan: Parameters<typeof computeFrontElevation>[0],
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  buildingType?: string,
): ElevationDrawing | null {
  try {
    return computeEnhancedSection(plan, floors, storeyHeight, pitchHeight, undefined, buildingType)
      ?? computeSection(plan, floors, storeyHeight, pitchHeight)
  } catch {
    return null
  }
}
