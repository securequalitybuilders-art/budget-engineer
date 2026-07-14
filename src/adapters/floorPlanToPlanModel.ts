import type { PlanModel, RoomRect } from '@/domain/plan'
import type { FloorPlan } from '@/engine/tier3/layoutEngine'
import type { DesignOption } from '@/domain/boq'
import { outerWalls, buildWallGraphFromRooms, generateSmartOpenings, validatePlanConnectivity } from '@/lib/geometry/plan-intelligence'
import { assignLevelSlabs } from '@/lib/structure/slab-system'
import { computeStructuralBridge } from '@/lib/structure/structural-bridge'
import { generateBuildingChassis } from '@/lib/layout/vertical-chassis'

const uid = () => Math.random().toString(36).slice(2, 10)
const roomPalette = ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309', '#6d28d9', '#0e7490']

function assertFiniteSize(value: number, label: string, roomName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`floorPlanToPlanModel: non-finite ${label} for room "${roomName}" (got ${value})`)
  }
}

function buildRooms(floorPlan: FloorPlan): RoomRect[] {
  return floorPlan.rooms.map((r, i) => {
    assertFiniteSize(r.width, 'width', r.name)
    assertFiniteSize(r.height, 'height', r.name)
    return {
      id: uid(),
      name: r.name,
      x: Number(r.x.toFixed(2)),
      y: Number(r.y.toFixed(2)),
      width: Number(r.width.toFixed(2)),
      height: Number(r.height.toFixed(2)),
      color: roomPalette[i % roomPalette.length],
    }
  })
}

export function floorPlanToPlanModel(
  floorPlan: FloorPlan,
  designOption: DesignOption,
): PlanModel {
  const wallThickness = 0.2
  const roomRects = buildRooms(floorPlan)

  // Use shared smart wall graph + opening generation
  const extWalls = outerWalls(floorPlan.width, floorPlan.height, wallThickness)
  const { walls: intWalls, adjacency } = buildWallGraphFromRooms(roomRects)
  const allWalls = [...extWalls, ...intWalls]

  const openings = generateSmartOpenings({
    rooms: roomRects,
    walls: allWalls,
    adjacency,
    externalWalls: extWalls,
  })

  // Validate
  const warnings = validatePlanConnectivity(roomRects, openings, allWalls)
  if (warnings.length > 0) {
    console.warn(`[floorPlanToPlanModel] ${warnings.length} validation warnings:`, warnings)
  }

  return {
    id: uid(),
    designOptionId: designOption.id,
    width: floorPlan.width,
    height: floorPlan.height,
    wallThickness,
    rooms: roomRects,
    walls: allWalls,
    openings,
    scaleLabel: '1:100 @ A3',
  }
}

/**
 * Enhanced version that also computes structural bridge data for BIM/section use.
 * Merges bridge info into the returned plan's room metadata.
 */
export function floorPlanToPlanModelWithBridge(
  floorPlan: FloorPlan,
  designOption: DesignOption,
): PlanModel & { structuralWarnings?: string[] } {
  const plan = floorPlanToPlanModel(floorPlan, designOption)
  const warnings: string[] = []

  if ((floorPlan.totalFloors ?? 1) > 1 && floorPlan.verticalChassis) {
    try {
      const chassis = generateBuildingChassis({
        typology: designOption.buildingType || 'house',
        storeyCount: floorPlan.totalFloors ?? 1,
        buildingWidth: floorPlan.width,
        buildingDepth: floorPlan.height,
        floorToFloorHeight: 3.0,
        wallThickness: 0.2,
        structuralSystem: (floorPlan.totalFloors ?? 1) <= 2 ? 'masonry' : 'rc-frame',
        maxStructuralSpan: 6.0,
        hasLift: (floorPlan.totalFloors ?? 1) >= 3,
        hasDuplex: designOption.buildingType === 'duplex',
        hasMixedUse: designOption.buildingType === 'mixed-use',
        programmes: Array(floorPlan.totalFloors ?? 1).fill(designOption.buildingType || 'residential'),
      })
      const slabInfo = assignLevelSlabs(chassis)
      const bridge = computeStructuralBridge(chassis)
      for (const sw of bridge.warnings) warnings.push(`[Structural] ${sw}`)
      ;(plan as any).slabAssignments = slabInfo
      ;(plan as any).structuralLevels = bridge.levels
    } catch {
      // bridge data is best-effort
    }
  }

  return { ...plan, structuralWarnings: warnings.length > 0 ? warnings : undefined }
}
