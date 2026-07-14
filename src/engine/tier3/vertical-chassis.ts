import type { Tier1ParsedBrief } from '../tier1-types'
import type { LayoutParameters } from './layoutEngine'
import {
  type BuildingChassis,
  type StructuralSystem,
  generateBuildingChassis as canonicalGenerateChassis,
} from '../../lib/layout/vertical-chassis'

export type CoreType = 'stair' | 'lift' | 'service' | 'combined'

export interface CoreZone {
  id: string
  type: CoreType
  x: number
  y: number
  width: number
  depth: number
  hasStair: boolean
  hasLift: boolean
  hasServiceShaft: boolean
}

export interface WetWall {
  id: string
  x: number
  width: number
  floorFrom: number
  floorTo: number
}

export interface ServiceShaft {
  id: string
  x: number
  y: number
  width: number
  depth: number
  serviceTypes: string[]
  floorFrom: number
  floorTo: number
}

export interface PartyWallInfo {
  x: number
  fireRating: number
  acousticRating: number
  continuous: boolean
}

export interface CirculationZone {
  type: 'public' | 'private' | 'service'
  label: string
}

export interface StructuralAxis {
  id: string
  position: number
  direction: 'x' | 'y'
  label: string
}

export interface VerticalChassis {
  structuralAxes: StructuralAxis[]
  cores: CoreZone[]
  wetWalls: WetWall[]
  serviceShafts: ServiceShaft[]
  partyWalls: PartyWallInfo[]
  circulationZones: CirculationZone[]
  storeyCount: number
  isDuplex: boolean
  isMixedUse: boolean
  // Bridge to canonical chassis
  canonicalChassis?: BuildingChassis
}

let uidCounter = 0
function uid(prefix: string): string {
  uidCounter++
  return `${prefix}_${uidCounter}_${Date.now().toString(36)}`
}

export function generateVerticalChassis(
  params: LayoutParameters,
  brief: Tier1ParsedBrief,
): VerticalChassis {
  const floorCount = params.floorCount
  const typologyId = brief.typology?.id ?? ''
  const isDuplex = typologyId === 'duplex'
  const isMixedUse = typologyId === 'mixed-use'
  const maxSpan = params.maxStructuralSpan ?? 6.0
  const bldgWidth = params.siteWidth > 0 ? params.siteWidth : 30
  const bldgDepth = params.siteDepth > 0 ? params.siteDepth : 30

  const axes: StructuralAxis[] = []
  const cores: CoreZone[] = []
  const wetWalls: WetWall[] = []
  const shafts: ServiceShaft[] = []
  const partyWalls: PartyWallInfo[] = []
  const circZones: CirculationZone[] = []

  // Try to build the canonical chassis first as the source of truth
  let canonicalChassis: BuildingChassis | undefined
  try {
    canonicalChassis = canonicalGenerateChassis({
      typology: typologyId || 'house',
      storeyCount: floorCount,
      buildingWidth: bldgWidth,
      buildingDepth: bldgDepth,
      floorToFloorHeight: params.floorHeight || 3.0,
      wallThickness: params.wallThickness || 0.2,
      structuralSystem: floorCount <= 2 ? 'masonry' : (floorCount <= 5 ? 'rc-frame' : 'steel-frame') as StructuralSystem,
      maxStructuralSpan: maxSpan,
      hasLift: floorCount >= 3,
      hasDuplex: isDuplex,
      hasMixedUse: isMixedUse,
      programmes: Array(floorCount).fill(typologyId || 'residential'),
    })
    // Sync axes from canonical to legacy format
    for (const ca of canonicalChassis.supportAxes) {
      axes.push({
        id: ca.id,
        position: ca.position,
        direction: ca.orientation === 'horizontal' ? 'x' : 'y',
        label: ca.label,
      })
    }

    // Sync cores
    for (const cc of canonicalChassis.cores) {
      cores.push({
        id: cc.id,
        type: (cc.type === 'combined' ? 'combined' : cc.type === 'stair' ? 'stair' : 'service') as CoreType,
        x: cc.x,
        y: cc.y,
        width: cc.width,
        depth: cc.depth,
        hasStair: cc.hasStair,
        hasLift: cc.hasLift,
        hasServiceShaft: cc.hasServiceShaft ?? false,
      })
    }

    // Sync shafts
    for (const cs of canonicalChassis.shafts) {
      shafts.push({
        id: cs.id,
        x: cs.x,
        y: cs.y,
        width: cs.width,
        depth: cs.depth,
        serviceTypes: cs.serviceTypes,
        floorFrom: cs.floorFrom,
        floorTo: cs.floorTo,
      })

      // Also create a wet wall from wet shafts
      if (cs.wetStack) {
        wetWalls.push({
          id: `ww-${cs.id}`,
          x: cs.x,
          width: cs.width,
          floorFrom: cs.floorFrom,
          floorTo: cs.floorTo,
        })
      }
    }

    // Sync party walls
    for (const cp of canonicalChassis.partyWalls) {
      partyWalls.push({
        x: cp.startX,
        fireRating: cp.fireRating,
        acousticRating: cp.acousticRating,
        continuous: cp.continuous,
      })
    }

    // Circulation zones
    if (canonicalChassis.circulationModel.separated) {
      circZones.push({ type: 'public', label: 'Public Entry' })
      circZones.push({ type: 'private', label: 'Residential Lobby' })
      circZones.push({ type: 'service', label: 'Service Access' })
    } else {
      circZones.push({ type: 'public', label: 'Public Circulation' })
      circZones.push({ type: 'private', label: 'Private Zone' })
    }
  } catch {
    // Fallback: generate legacy axes directly
    const axisSpacing = Math.max(3.0, Math.min(maxSpan, 8.0))
    const numX = Math.max(2, Math.ceil(bldgWidth / axisSpacing))
    const axisLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (let i = 0; i <= numX; i++) {
      const pos = Math.round((bldgWidth * i / numX) * 1000) / 1000
      axes.push({
        id: uid('grid'),
        position: pos,
        direction: 'x',
        label: axisLabels[i] ?? `G${i + 1}`,
      })
    }

    if (isDuplex) {
      const partyX = Math.round((bldgWidth / 2) * 20) / 20
      partyWalls.push({ x: partyX, fireRating: 1.0, acousticRating: 50, continuous: floorCount >= 2 })
    }

    if (floorCount >= 2) {
      if (isDuplex) {
        const unitW = bldgWidth / 2
        for (let u = 0; u < 2; u++) {
          cores.push({
            id: uid('core'), type: 'stair',
            x: Math.round((unitW * u + unitW * 0.3) * 1000) / 1000, y: 0,
            width: 2.5, depth: 1.5, hasStair: true, hasLift: false, hasServiceShaft: false,
          })
        }
      } else if (isMixedUse) {
        cores.push({
          id: uid('core'), type: 'combined',
          x: Math.round((bldgWidth * 0.75) * 1000) / 1000, y: Math.round((bldgDepth * 0.5) * 1000) / 1000,
          width: 3.0, depth: 5.0, hasStair: true, hasLift: floorCount >= 3, hasServiceShaft: true,
        })
        circZones.push({ type: 'public', label: 'Retail Entry' })
        circZones.push({ type: 'private', label: 'Residential Lobby' })
        circZones.push({ type: 'service', label: 'Service Access' })
        shafts.push({
          id: uid('shaft'), x: Math.round((bldgWidth * 0.75 + 3.5) * 1000) / 1000,
          y: Math.round((bldgDepth * 0.5) * 1000) / 1000, width: 1.2, depth: 1.2,
          serviceTypes: ['plumbing', 'electrical'], floorFrom: 0, floorTo: floorCount - 1,
        })
      } else if (floorCount >= 3) {
        const coreX = Math.round((bldgWidth * 0.4) * 1000) / 1000
        const coreY = Math.round((bldgDepth * 0.3) * 1000) / 1000
        cores.push({
          id: uid('core'), type: 'combined', x: coreX, y: coreY,
          width: 4.0, depth: 6.0, hasStair: true, hasLift: true, hasServiceShaft: true,
        })
        shafts.push({
          id: uid('shaft'), x: Math.round((coreX + 4.5) * 1000) / 1000,
          y: Math.round((coreY + 1.0) * 1000) / 1000, width: 1.0, depth: 1.0,
          serviceTypes: ['plumbing', 'electrical', 'hvac'], floorFrom: 0, floorTo: floorCount - 1,
        })
      } else {
        cores.push({
          id: uid('core'), type: 'stair', x: 0,
          y: Math.round((bldgDepth * 0.3) * 1000) / 1000, width: 2.5, depth: 4.0,
          hasStair: true, hasLift: false, hasServiceShaft: false,
        })
      }
    } else {
      circZones.push({ type: 'public', label: 'Public Entry' })
      circZones.push({ type: 'private', label: 'Private Zone' })
    }

    const wetItems = brief.program.filter(p => p.isWetCore)
    if (wetItems.length > 0 && floorCount >= 2) {
      const wetX = Math.round((bldgWidth * 0.35) * 1000) / 1000
      wetWalls.push({ id: uid('wetwall'), x: wetX, width: 2.0, floorFrom: 0, floorTo: floorCount - 1 })
    }

    circZones.push({ type: 'public', label: 'Public Circulation' })
    circZones.push({ type: 'service', label: 'Service Circulation' })
  }

  return {
    structuralAxes: axes,
    cores,
    wetWalls,
    serviceShafts: shafts,
    partyWalls,
    circulationZones: circZones,
    storeyCount: floorCount,
    isDuplex,
    isMixedUse,
    canonicalChassis,
  }
}

export function validateConstraintReport(chassis: VerticalChassis, plans: import('./layoutEngine').FloorPlan[][]): {
  structuralAlignmentPass: boolean
  shaftContinuityPass: boolean
  circulationEgressPass: boolean
  partyWallContinuous: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  let structuralAlignmentPass = true
  let shaftContinuityPass = true
  let circulationEgressPass = true
  let partyWallContinuous = true

  if (chassis.storeyCount <= 1) {
    return {
      structuralAlignmentPass: true,
      shaftContinuityPass: true,
      circulationEgressPass: true,
      partyWallContinuous: chassis.partyWalls.length === 0,
      warnings: [],
    }
  }

  // Check structural alignment: each floor should have similar width
  if (plans.length >= 2) {
    for (let fi = 1; fi < plans.length; fi++) {
      for (const plan of plans[fi]) {
        const prevFloor = plans[fi - 1]?.find(p => p.topology === plan.topology)
        if (prevFloor && Math.abs(prevFloor.width - plan.width) > 0.5) {
          warnings.push(`Floor ${fi} ${plan.topology} width (${plan.width.toFixed(1)}) differs from floor ${fi - 1} (${prevFloor.width.toFixed(1)})`)
          structuralAlignmentPass = false
        }
      }
    }
  }

  // Check core continuity: cores should exist on every floor
  for (const core of chassis.cores) {
    for (let fi = 0; fi < plans.length; fi++) {
      const hasCoreOnFloor = plans[fi].some(plan =>
        plan.rooms.some(r => r.name === 'Stairwell' || r.name.includes('Core')),
      )
      if (!hasCoreOnFloor) {
        warnings.push(`Core ${core.id} missing on floor ${fi}`)
        shaftContinuityPass = false
      }
    }
  }

  // Check party wall continuity for duplex
  if (chassis.isDuplex) {
    for (let fi = 0; fi < plans.length; fi++) {
      const hasPartyWall = plans[fi].some(plan =>
        plan.rooms.some(r => r.name === 'Party Wall'),
      )
      if (!hasPartyWall) {
        warnings.push(`Party wall missing on floor ${fi}`)
        partyWallContinuous = false
      }
    }
  }

  // Check circulation separation for mixed-use
  if (chassis.isMixedUse) {
    const hasResidentialLobby = plans[0]?.some(plan =>
      plan.rooms.some(r => r.name.includes('Lobby') || r.name === 'Residential Lobby'),
    )
    if (!hasResidentialLobby) {
      warnings.push('Mixed-use: missing residential lobby for circulation separation')
      circulationEgressPass = false
    }
    const hasPublicEntry = plans[0]?.some(plan =>
      plan.rooms.some(r => r.zone === 'public' || r.name.includes('Shop') || r.name.includes('Retail')),
    )
    if (!hasPublicEntry) {
      warnings.push('Mixed-use: missing public/retail entry on ground floor')
      circulationEgressPass = false
    }
  }

  return {
    structuralAlignmentPass,
    shaftContinuityPass,
    circulationEgressPass,
    partyWallContinuous,
    warnings,
  }
}
