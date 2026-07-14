import type { DesignOption } from '../domain/boq'
import type { PlanModel } from '../domain/plan'
import { getRoomProgram } from './roomPrograms'
import { isResidential } from './buildingTypes'
import { generateLayoutByTypology, type FloorContext } from '../lib/layout/typology-router'
import { assemblePlan } from '../lib/geometry/plan-intelligence'
import { generateBuildingChassis, validateVerticalConstraints, getConstraintsForLevel } from '../lib/layout/vertical-chassis'
import { computeLevelStack } from '../lib/layout/level-stack'
import { isWetRoom } from '../lib/layout/shaft-stack'
import { validateCirculationSeparation, buildMixedUseCirculation } from '../lib/layout/circulation-separation'
import { generatePartyWall, clampToPartyWall } from '../lib/layout/party-wall'
import { computeLevelProgrammes, getAllocationProgramme, getLevelFloorRole } from '../lib/layout/level-programme'
import { computeStructuralBridge } from '../lib/structure/structural-bridge'

function normalizeFootprint(area: number) {
  const width = Math.sqrt(area * 1.18)
  const height = area / width
  return {
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
  }
}

function programFromArea(area: number, buildingType: string): Array<{ name: string; ratio: number }> {
  if (!isResidential(buildingType)) {
    return getRoomProgram(buildingType)
  }

  if (area <= 100) {
    return [
      { name: 'Lounge / Dining', ratio: 0.22 },
      { name: 'Kitchen', ratio: 0.1 },
      { name: 'Bedroom 1', ratio: 0.14 },
      { name: 'Bedroom 2', ratio: 0.12 },
      { name: 'Bedroom 3', ratio: 0.11 },
      { name: 'Bathroom 1', ratio: 0.07 },
      { name: 'Bathroom 2', ratio: 0.06 },
      { name: 'Circulation', ratio: 0.1 },
      { name: 'Veranda', ratio: 0.08 },
    ]
  }

  if (area <= 125) {
    return [
      { name: 'Lounge / Dining', ratio: 0.24 },
      { name: 'Kitchen', ratio: 0.11 },
      { name: 'Bedroom 1', ratio: 0.15 },
      { name: 'Bedroom 2', ratio: 0.12 },
      { name: 'Bedroom 3', ratio: 0.11 },
      { name: 'Bathroom 1', ratio: 0.07 },
      { name: 'Bathroom 2', ratio: 0.06 },
      { name: 'Study / Flex', ratio: 0.06 },
      { name: 'Circulation', ratio: 0.08 },
    ]
  }

  return [
    { name: 'Lounge / Dining', ratio: 0.23 },
    { name: 'Kitchen', ratio: 0.1 },
    { name: 'Bedroom 1', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Guest Room', ratio: 0.09 },
    { name: 'Bathroom 1', ratio: 0.06 },
    { name: 'Bathroom 2', ratio: 0.05 },
    { name: 'Study / Flex', ratio: 0.05 },
    { name: 'Circulation', ratio: 0.05 },
    { name: 'Veranda', ratio: 0.05 },
    { name: 'Store', ratio: 0.03 },
    { name: 'Laundry', ratio: 0.02 },
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
    // Single floor: original path
    const rawRooms = generateLayoutByTypology(
      buildingType,
      program,
      footprint.width,
      footprint.height,
      Date.now(),
    )

    const rooms = rawRooms.map(r => ({
      id: r.id,
      name: r.name,
      x: Number(r.x.toFixed(2)),
      y: Number(r.y.toFixed(2)),
      width: Number(Math.max(r.width, 0.5).toFixed(2)),
      height: Number(Math.max(r.height, 0.5).toFixed(2)),
      color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][Math.floor(Math.random() * 8)],
    }))

    const { plan, warnings } = assemblePlan({
      rooms,
      width: footprint.width,
      height: footprint.height,
      wallThickness,
      designOptionId: design.id,
    })

    const allWarnings = [...warnings, ...verticalWarnings]
    if (allWarnings.length > 0) {
      console.warn(`[plan-generator] ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
    }
    return plan
  }

  // Multi-storey: generate per-floor rooms with level-specific programmes
  const allRooms: { id: string; name: string; x: number; y: number; width: number; height: number; color?: string }[] = []
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

    // Get constraints from chassis for this level
    const constraints = chassis ? getConstraintsForLevel(chassis, fi) : []

    // Generate level-specific rooms with retry on failure
    let rawRooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    let genSuccess = false

    for (let retry = 0; retry < 3; retry++) {
      try {
        const seed = Date.now() + fi + retry * 9973
        const candidateRooms = generateLayoutByTypology(
          buildingType,
          levelProgramme,
          footprint.width,
          footprint.height,
          seed,
          floorContext,
        )

        // Validate: no NaN, no zero-area rooms
        const valid = candidateRooms.every(r =>
          !Number.isNaN(r.x) && !Number.isNaN(r.y) &&
          !Number.isNaN(r.width) && !Number.isNaN(r.height) &&
          r.width >= 0.3 && r.height >= 0.3,
        )

        if (valid && candidateRooms.length > 0) {
          rawRooms = candidateRooms
          genSuccess = true
          break
        }
      } catch {
        // Retry with adjusted params
      }
    }

    if (!genSuccess) {
      // Fallback: generate zoned layout as last resort
      rawRooms = generateLayoutByTypology(
        buildingType,
        levelProgramme,
        footprint.width,
        footprint.height,
        Date.now() + fi,
        { ...floorContext, floorRole: 'ground-public' },
      )
      genSuccess = true
      verticalWarnings.push(`[Level ${fi}] fallback generation used after retries`)
    }

    // Offset rooms per floor vertically for visualisation
    const yOffset = fi * footprint.height * 1.1

    const levelRooms = rawRooms.map(r => ({
      id: r.id,
      name: r.name,
      x: Number(r.x.toFixed(2)),
      y: Number((r.y + yOffset).toFixed(2)),
      width: Number(Math.max(r.width, 0.5).toFixed(2)),
      height: Number(Math.max(r.height, 0.5).toFixed(2)),
      color: palette[fi % palette.length],
    }))

    // Apply party wall clamping for duplexes
    if ((buildingType === 'duplex' || buildingType === 'townhouse') && chassis?.partyWalls.length) {
      const pwX = chassis.partyWalls[0].startX
      clampToPartyWall(levelRooms, pwX)
    }

    // Add constraint markers as thin rooms
    for (const c of constraints) {
      if (c.type === 'core-reserve' || c.type === 'shaft-reserve') {
        levelRooms.push({
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

    allRooms.push(...levelRooms)
    verticalWarnings.push(`[Level ${fi}] ${floorRole}: generated ${rawRooms.length} rooms`)
  }

  // Build the plan from all rooms
  const planWidth = footprint.width
  const planHeight = footprint.height * floors * 1.1

  const { plan, warnings } = assemblePlan({
    rooms: allRooms,
    width: planWidth,
    height: planHeight,
    wallThickness,
    designOptionId: design.id,
  })

  const allWarnings = [...warnings, ...verticalWarnings]
  if (allWarnings.length > 0) {
    console.warn(`[plan-generator] ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
  }

  return plan
}
