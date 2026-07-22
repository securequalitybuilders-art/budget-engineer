import type { DesignOption } from '../domain/boq'
import type { PlanModel, PlanSource, PlanningZoneMarker } from '../domain/plan'
import { getRoomProgram } from './roomPrograms'
import { isResidential } from './buildingTypes'
import { generateLayoutByTypology, type FloorContext } from '../lib/layout/typology-router'
import { assemblePlan } from '../lib/geometry/plan-intelligence'

const GRID = 0.05
const snap05 = (v: number) => Math.round(v / GRID) * GRID
import { generateBuildingChassis, validateVerticalConstraints, getConstraintsForLevel } from '../lib/layout/vertical-chassis'
import { computeLevelStack } from '../lib/layout/level-stack'
import { isWetRoom } from '../lib/layout/shaft-stack'
import { validateCirculationSeparation, buildMixedUseCirculation } from '../lib/layout/circulation-separation'
import { generatePartyWall, clampToPartyWall } from '../lib/layout/party-wall'
import { computeLevelProgrammes, getAllocationProgramme, getLevelFloorRole } from '../lib/layout/level-programme'
import { computeStructuralBridge } from '../lib/structure/structural-bridge'
import { validateEntranceSeparation } from '../lib/layout/typologies/non-residential'

function normalizeFootprint(area: number) {
  const targetAspect = area <= 140 ? 1.25 : 1.18
  const width = Math.sqrt(area * targetAspect)
  const height = area / width
  return {
    width: Math.ceil(width * 10) / 10,
    height: Math.round(height * 10) / 10,
  }
}

function programFromArea(area: number, buildingType: string): Array<{ name: string; ratio: number }> {
  if (!isResidential(buildingType)) {
    return getRoomProgram(buildingType)
  }

  if (area <= 79) {
    return [
      { name: 'Living / Kitchen / Dining', ratio: 0.45 },
      { name: 'Bedroom 1', ratio: 0.24 },
      { name: 'Bedroom 2', ratio: 0.19 },
      { name: 'Bathroom 1', ratio: 0.12 },
    ]
  }

  if (area <= 80) {
    return [
      { name: 'Lounge / Dining', ratio: 0.27 },
      { name: 'Kitchen', ratio: 0.12 },
      { name: 'Bedroom 1', ratio: 0.18 },
      { name: 'Bedroom 2', ratio: 0.15 },
      { name: 'Bathroom 1', ratio: 0.10 },
      { name: 'Circulation', ratio: 0.10 },
    ]
  }

  if (area <= 100) {
    return [
      { name: 'Lounge / Dining', ratio: 0.28 },
      { name: 'Kitchen', ratio: 0.14 },
      { name: 'Bedroom 1', ratio: 0.21 },
      { name: 'Bedroom 2', ratio: 0.17 },
      { name: 'Bathroom 1', ratio: 0.11 },
      { name: 'Circulation', ratio: 0.09 },
    ]
  }

  if (area <= 110) {
    const totalNoCirc = 0.26 + 0.11 + 0.16 + 0.14 + 0.12 + 0.08
    return [
      { name: 'Lounge / Dining', ratio: 0.26 / totalNoCirc },
      { name: 'Kitchen', ratio: 0.11 / totalNoCirc },
      { name: 'Bedroom 1', ratio: 0.16 / totalNoCirc },
      { name: 'Bedroom 2', ratio: 0.14 / totalNoCirc },
      { name: 'Bedroom 3', ratio: 0.12 / totalNoCirc },
      { name: 'Bathroom 1', ratio: 0.08 / totalNoCirc },
    ]
  }

  return [
    { name: 'Lounge / Dining', ratio: 0.22 },
    { name: 'Kitchen', ratio: 0.10 },
    { name: 'Bedroom 1', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Bathroom 1', ratio: 0.07 },
    { name: 'Bathroom 2', ratio: 0.06 },
    { name: 'Veranda', ratio: 0.05 },
  ]
}

export function generatePlanModel(design: DesignOption): PlanModel {
  const area = design.grossFloorArea
  const buildingType = design.buildingType || 'house'
  const floors = Math.max(1, design.floors || 1)
  const footprint = normalizeFootprint(area)
  const wallThickness = 0.2

  const program = programFromArea(area, buildingType)

  // Level programme profile for multi-storey buildings
  const levelProfile = floors > 1 ? computeLevelProgrammes(buildingType, floors) : null

  // Generate vertical chassis for multi-storey buildings
  const verticalWarnings: string[] = []
  let chassis = null
  let structuralBridge = null
  if (floors > 1) {
    chassis = generateBuildingChassis({
      typology: buildingType,
      storeyCount: floors,
      buildingWidth: footprint.width,
      buildingDepth: footprint.height,
      floorToFloorHeight: 3.0,
      wallThickness,
      structuralSystem: floors <= 2 ? 'masonry' : 'rc-frame',
      maxStructuralSpan: 6.0,
      hasLift: floors >= 3,
      hasDuplex: buildingType === 'duplex' || buildingType === 'townhouse',
      hasMixedUse: buildingType === 'mixed-use',
      programmes: levelProfile ? levelProfile.levels.map(l => l.floorRole) : Array(floors).fill(buildingType),
    })

    // Validate vertical constraints
    const vReport = validateVerticalConstraints(chassis)
    verticalWarnings.push(...vReport.warnings)

    // Level stack check
    const stackResult = computeLevelStack(chassis)
    verticalWarnings.push(...stackResult.alignmentWarnings)

    // Circulation separation for mixed-use
    if (chassis.circulationModel.separated) {
      const circResult = validateCirculationSeparation(chassis)
      verticalWarnings.push(...circResult.warnings)
    }

    // Update circulation model for mixed-use
    if (buildingType === 'mixed-use') {
      chassis.circulationModel = buildMixedUseCirculation(chassis)
      verticalWarnings.push('[Mixed-Use] Circulation model built with retail/public, residential/private, and service/BOH routes')
    }

    // Add party wall for duplex
    if (buildingType === 'duplex' || buildingType === 'townhouse') {
      const partyWall = generatePartyWall(chassis)
      chassis.partyWalls = [partyWall]
    }

    // Compute structural bridge
    structuralBridge = computeStructuralBridge(chassis)
    for (const sw of structuralBridge.warnings) {
      verticalWarnings.push(`[Structural] ${sw}`)
    }

    // Detect wet rooms that should stack
    const wetRoomNames = program.filter(p => isWetRoom(p.name)).map(p => p.name)
    for (const w of wetRoomNames) {
      verticalWarnings.push(`[Chassis] Wet room "${w}" should stack with shaft-aligned zone`)
    }
  }

  if (floors <= 1) {
    // Single floor: retry with different seeds (→ different templates)
    let bestLayout: { rooms: any[]; warnings?: string[]; entranceMarkers?: any[]; valid?: boolean } | null = null
    let bestRejectedWarnings: string[] = []

    for (let retry = 0; retry < 3; retry++) {
      const seed = Date.now() + retry * 9973 + retry * 7919
      const layoutResult = generateLayoutByTypology(
        buildingType,
        program,
        footprint.width,
        footprint.height,
        seed,
      )

      const rawRooms = layoutResult.rooms
      const rooms = rawRooms.map(r => ({
        id: r.id,
        name: r.name,
        x: snap05(r.x),
        y: snap05(r.y),
        width: snap05(Math.max(r.width, 0.5)),
        height: snap05(Math.max(r.height, 0.5)),
        color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][((seed * 16807) % 2147483647) % 8],
      }))

      const result = assemblePlan({
        rooms,
        width: footprint.width,
        height: footprint.height,
        wallThickness,
        designOptionId: design.id,
      })

      if (!result.rejected && layoutResult.valid !== false) {
        bestLayout = { rooms: layoutResult.rooms, warnings: layoutResult.warnings, entranceMarkers: layoutResult.entranceMarkers, valid: true }
        bestRejectedWarnings = []
        const planModel = result.plan as PlanModel
        if (layoutResult.entranceMarkers && layoutResult.entranceMarkers.length > 0) {
          planModel.entranceMarkers = layoutResult.entranceMarkers
        }
        const allWarnings = [...result.warnings, ...verticalWarnings, ...(layoutResult.warnings || [])]
        if (allWarnings.length > 0) {
          console.warn(`[plan-generator] ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
        }
        return planModel
      }

      // Track best despite rejection for fallback
      if (!bestLayout || result.warnings.length < bestRejectedWarnings.length) {
        bestLayout = { rooms: layoutResult.rooms, warnings: layoutResult.warnings, entranceMarkers: layoutResult.entranceMarkers, valid: false }
        bestRejectedWarnings = result.warnings
      }
    }

    // All retries rejected — use best attempt anyway, log clearly
    console.error(`[plan-generator] PLAN REJECTED after 3 retries: ${bestRejectedWarnings.filter(w => w.includes('LAYOUT_REJECTED') || w.includes('overlap detected')).join('; ')}`)
    const finalRooms = (bestLayout?.rooms || []).map(r => ({
      id: r.id,
      name: r.name,
      x: snap05(r.x),
      y: snap05(r.y),
      width: snap05(Math.max(r.width, 0.5)),
      height: snap05(Math.max(r.height, 0.5)),
      color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][Math.abs(Date.now() * 16807) % 8],
    }))
    const fallbackResult = assemblePlan({
      rooms: finalRooms,
      width: footprint.width,
      height: footprint.height,
      wallThickness,
      designOptionId: design.id,
    })
    const planModel = fallbackResult.plan as PlanModel
    if (bestLayout?.entranceMarkers && bestLayout.entranceMarkers.length > 0) {
      planModel.entranceMarkers = bestLayout.entranceMarkers
    }
    const allWarnings = [...fallbackResult.warnings, ...verticalWarnings, ...(bestLayout?.warnings || [])]
    if (allWarnings.length > 0) {
      console.warn(`[plan-generator] ${allWarnings.length} warnings (fallback):`, allWarnings.slice(0, 8))
    }
    return planModel
  }

  // Multi-storey: generate per-floor rooms with level-specific programmes
  const allRooms: { id: string; name: string; x: number; y: number; width: number; height: number; color?: string }[] = []
  const allEntranceMarkers: PlanningZoneMarker[] = []
  const palette = ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309']

  for (let fi = 0; fi < floors; fi++) {
    const levelProgramme = levelProfile ? getAllocationProgramme(levelProfile, fi) : program
    const floorRole = levelProfile ? getLevelFloorRole(levelProfile, fi) : 'ground-public'

    const floorContext: FloorContext = {
      levelIndex: fi,
      totalFloors: floors,
      floorRole,
      isGround: fi === 0,
      isRoof: fi === floors - 1,
      programmeTags: levelProfile?.levels[fi]?.programmeTags ?? [],
    }

    // Generate level-specific rooms with retry on failure
    let rawRooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    let layoutWarnings: string[] = []
    let floorEntranceMarkers: PlanningZoneMarker[] = []
    let genSuccess = false

    for (let retry = 0; retry < 3; retry++) {
      try {
        const seed = Date.now() + fi + retry * 9973
        const candidateResult = generateLayoutByTypology(
          buildingType,
          levelProgramme,
          footprint.width,
          footprint.height,
          seed,
          floorContext,
        )

        const candidateRooms = candidateResult.rooms

        // Validate: no NaN, no zero-area rooms
        const valid = candidateRooms.every(r =>
          !Number.isNaN(r.x) && !Number.isNaN(r.y) &&
          !Number.isNaN(r.width) && !Number.isNaN(r.height) &&
          r.width >= 0.3 && r.height >= 0.3,
        )

        if (valid && candidateRooms.length > 0) {
          rawRooms = candidateRooms
          layoutWarnings = candidateResult.warnings || []
          floorEntranceMarkers = candidateResult.entranceMarkers || []
          genSuccess = true
          break
        }
      } catch {
        // Retry with adjusted params
      }
    }

    if (!genSuccess) {
      // Fallback: generate zoned layout as last resort
      const fallbackResult = generateLayoutByTypology(
        buildingType,
        levelProgramme,
        footprint.width,
        footprint.height,
        Date.now() + fi,
        { ...floorContext, floorRole: 'ground-public' },
      )
      rawRooms = fallbackResult.rooms
      layoutWarnings = fallbackResult.warnings || []
      floorEntranceMarkers = fallbackResult.entranceMarkers || []
      genSuccess = true
      verticalWarnings.push(`[Level ${fi}] fallback generation used after retries`)
    }

    // Propagate packer warnings
    for (const lw of layoutWarnings) {
      verticalWarnings.push(`[Level ${fi} Layout] ${lw}`)
    }

    // Collect entrance markers from ground floor
    if (fi === 0 && floorEntranceMarkers.length > 0) {
      allEntranceMarkers.push(...floorEntranceMarkers)
    }

    // Validate entrance separation for mixed-use ground floor
    if (buildingType === 'mixed-use' && fi === 0 && rawRooms.length > 0) {
      const entranceResult = validateEntranceSeparation(rawRooms, floorEntranceMarkers)
      if (!entranceResult.valid) {
        for (const conflict of entranceResult.conflicts) {
          verticalWarnings.push(`[Mixed-Use Entrance] ${conflict}`)
        }
      } else {
        verticalWarnings.push('[Mixed-Use Entrance] All entrances properly separated: retail/public, residential/private, service/BOH')
      }
    }

    // Offset rooms per floor vertically for visualisation
    const yOffset = fi * footprint.height * 1.1

    const levelRooms = rawRooms.map(r => ({
      id: r.id,
      name: r.name,
      x: snap05(r.x),
      y: snap05(r.y + yOffset),
      width: snap05(Math.max(r.width, 0.5)),
      height: snap05(Math.max(r.height, 0.5)),
      color: palette[fi % palette.length],
    }))

    // Apply party wall clamping for duplexes
    if ((buildingType === 'duplex' || buildingType === 'townhouse') && chassis?.partyWalls.length) {
      const pwX = chassis.partyWalls[0].startX
      clampToPartyWall(levelRooms, pwX)
    }

    allRooms.push(...levelRooms)
    verticalWarnings.push(`[Level ${fi}] ${floorRole}: generated ${rawRooms.length} rooms`)
  }

  // Collect all constraint markers across floors (for post-assemblePlan addition)
  const allConstraintMarkers: { id: string; name: string; x: number; y: number; width: number; height: number; color: string }[] = []
  for (let fi = 0; fi < floors; fi++) {
    const constraints = chassis ? getConstraintsForLevel(chassis, fi) : []
    const yOffset = fi * footprint.height * 1.1
    for (const c of constraints) {
      if (c.type === 'core-reserve' || c.type === 'shaft-reserve') {
        allConstraintMarkers.push({
          id: `constraint-${fi}-${c.type}`,
          name: `[${c.label}]`,
          x: c.x,
          y: c.y + yOffset,
          width: Math.max(c.width, 0.2),
          height: Math.max(c.depth, 0.2),
          color: '#94a3b8',
        })
      }
    }
  }

  // Build the plan from all rooms
  const planWidth = footprint.width
  const planHeight = footprint.height * floors * 1.1

  const result = assemblePlan({
    rooms: allRooms,
    width: planWidth,
    height: planHeight,
    wallThickness,
    designOptionId: design.id,
  })

  const { plan, warnings, rejected } = result
  if (rejected) {
    console.error(`[plan-generator] PLAN REJECTED: ${warnings.map(w => w.includes('LAYOUT_REJECTED') || w.includes('overlap detected') ? w : '').filter(Boolean).join('; ')}`)
  }

  const planModel = plan as PlanModel
  // Add entrance markers from ground floor if any
  if (allEntranceMarkers.length > 0) {
    planModel.entranceMarkers = allEntranceMarkers
  }

  // Add constraint markers to the final plan model (post-assemblePlan to avoid false overlap rejection)
  planModel.rooms.push(...allConstraintMarkers)

  const allWarnings = [...warnings, ...verticalWarnings]
  if (allWarnings.length > 0) {
    console.warn(`[plan-generator] ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
  }

  return planModel
}

function seedFromId(id: string): number {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash) + id.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

export function generateVariedPlanModel(
  design: DesignOption,
  seed?: number,
): PlanModel {
  const variationSeed = seed ?? seedFromId(design.id)
  const area = design.grossFloorArea
  const buildingType = design.buildingType || 'house'
  const footprint = normalizeFootprint(area)
  const wallThickness = 0.2
  const program = programFromArea(area, buildingType)

  const layoutResult = generateLayoutByTypology(
    buildingType,
    program,
    footprint.width,
    footprint.height,
    variationSeed,
  )

  const rawRooms = layoutResult.rooms

  const rooms = rawRooms.map(r => ({
    id: r.id,
    name: r.name,
    x: snap05(r.x),
    y: snap05(r.y),
    width: snap05(Math.max(r.width, 0.5)),
    height: snap05(Math.max(r.height, 0.5)),
    color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][Math.abs(variationSeed) % 8],
  }))

  const result = assemblePlan({
    rooms,
    width: footprint.width,
    height: footprint.height,
    wallThickness,
    designOptionId: design.id,
  })

  const { plan, warnings, rejected } = result
  if (rejected) {
    console.error(`[plan-generator] generateVariedPlanModel PLAN REJECTED: ${warnings.filter(w => w.includes('LAYOUT_REJECTED') || w.includes('overlap detected')).join('; ')}`)
  }

  const planModel = plan as PlanModel
  // Add entrance markers if present
  if (layoutResult.entranceMarkers && layoutResult.entranceMarkers.length > 0) {
    planModel.entranceMarkers = layoutResult.entranceMarkers
  }

  // Preserve canonical planSource (do NOT override to 'advanced-generated-plan')
  const planWithSource = rejected
    ? { ...planModel, planSource: 'canonical-generated-plan-rejected' as PlanSource }
    : planModel

  const planWarnings = layoutResult.warnings || []
  const allWarnings = [...warnings, ...planWarnings]
  if (allWarnings.length > 0) {
    console.warn(`[plan-generator] generateVariedPlanModel: ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
  }

  return planWithSource
}
