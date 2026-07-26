const uid = () => Math.random().toString(36).slice(2, 10)

// ── Support types ──────────────────────────────────────────────

export type StructuralSystem = 'masonry' | 'rc-frame' | 'steel-frame' | 'hybrid'
export type FloorSystem = 'two-way-slab' | 'one-way-slab' | 'flat-plate' | 'ribbed' | 'timber-joist'
export type LateralSystem = 'shear-wall' | 'moment-frame' | 'braced-frame' | 'core'
export type CoreType = 'stair' | 'lift' | 'combined' | 'service'
export type ShaftServiceType = 'plumbing' | 'drainage' | 'electrical' | 'hvac' | 'fire' | 'data'
export type RouteType = 'public' | 'private' | 'service' | 'emergency'
export type StackStrategy = 'free' | 'stacked' | 'repeated-unit' | 'mirrored-duplex'

// ── SupportAxis ────────────────────────────────────────────────

export interface SupportAxis {
  id: string
  label: string
  orientation: 'horizontal' | 'vertical'
  position: number
  spanMin: number
  spanMax: number
  supportType: 'wall' | 'beam' | 'column'
  loadBearing: boolean
}

export interface GridBay {
  id: string
  axisAId: string
  axisBId: string
  width: number
  depth: number
}

// ── VerticalCore ───────────────────────────────────────────────

export interface VerticalCore {
  id: string
  type: CoreType
  x: number
  y: number
  width: number
  depth: number
  floorFrom: number
  floorTo: number
  hasStair: boolean
  hasLift: boolean
  hasServiceShaft: boolean
  protectedRoute: boolean
  lobbyZone: boolean
}

// ── ShaftStack ─────────────────────────────────────────────────

export interface ShaftStack {
  id: string
  x: number
  y: number
  width: number
  depth: number
  serviceTypes: ShaftServiceType[]
  floorFrom: number
  floorTo: number
  wetStack: boolean
  label: string
}

// ── PartyWall ──────────────────────────────────────────────────

export interface PartyWall {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  fireRating: number
  acousticRating: number
  continuous: boolean
  floorFrom: number
  floorTo: number
  mirroredLayout: boolean
}

// ── CirculationModel ───────────────────────────────────────────

export interface CirculationModel {
  publicRoutes: RouteSegment[]
  privateRoutes: RouteSegment[]
  serviceRoutes: RouteSegment[]
  emergencyRoutes: RouteSegment[]
  separated: boolean
}

export interface RouteSegment {
  id: string
  from: string
  to: string
  via: string[]
  routeType: RouteType
  protected: boolean
}

// ── LevelModel ─────────────────────────────────────────────────

export interface LevelModel {
  id: string
  number: number
  elevation: number
  floorToFloorHeight: number
  assignedProgramme: string
  requiredSupportAxes: string[]
  requiredShaftRefs: string[]
  requiredCoreRefs: string[]
  planConstraints: PlanConstraint[]
  isGround: boolean
  isRoof: boolean
}

export interface PlanConstraint {
  type: 'core-reserve' | 'shaft-reserve' | 'party-wall' | 'support-wall' | 'circulation-zone' | 'wet-zone'
  x: number
  y: number
  width: number
  depth: number
  label: string
}

// ── BuildingChassis ────────────────────────────────────────────

export interface BuildingChassis {
  id: string
  typology: string
  storeyCount: number
  structuralSystem: StructuralSystem
  floorSystem: FloorSystem
  lateralSystem: LateralSystem
  supportAxes: SupportAxis[]
  gridBays: GridBay[]
  cores: VerticalCore[]
  shafts: ShaftStack[]
  partyWalls: PartyWall[]
  levels: LevelModel[]
  circulationModel: CirculationModel
  stackStrategy: StackStrategy
  maxStructuralSpan: number
  slabThickness: number
  wallThickness: number
  floorToFloorHeight: number
  width: number
  depth: number
}

// ── VerticalConstraintReport ───────────────────────────────────

export interface VerticalConstraintReport {
  supportAlignmentPass: boolean
  shaftContinuityPass: boolean
  partyWallContinuityPass: boolean
  circulationSeparationPass: boolean
  wetCoreStackingPass: boolean
  verticalEgressPass: boolean
  warnings: string[]
  failures: string[]
}

// ── Generation Parameters ──────────────────────────────────────

export interface ChassisGenerationParams {
  typology: string
  storeyCount: number
  buildingWidth: number
  buildingDepth: number
  floorToFloorHeight: number
  wallThickness: number
  structuralSystem: StructuralSystem
  maxStructuralSpan: number
  hasLift: boolean
  hasDuplex: boolean
  hasMixedUse: boolean
  programmes: string[]
}

// ── Chassis Generator ──────────────────────────────────────────

const DEFAULT_SLAB_THICKNESS = 0.15

function detectStructuralSystem(typology: string, storeyCount: number): StructuralSystem {
  if (storeyCount <= 2) return 'masonry'
  if (storeyCount <= 5) return 'rc-frame'
  if (storeyCount >= 6) return 'steel-frame'
  if (typology === 'mixed-use') return 'hybrid'
  return 'masonry'
}

function detectFloorSystem(structural: StructuralSystem): FloorSystem {
  switch (structural) {
    case 'masonry': return 'timber-joist'
    case 'rc-frame': return 'two-way-slab'
    case 'steel-frame': return 'ribbed'
    case 'hybrid': return 'flat-plate'
  }
}

function detectLateralSystem(structural: StructuralSystem, storeyCount: number): LateralSystem {
  if (storeyCount <= 2) return 'shear-wall'
  if (storeyCount >= 6) return 'core'
  if (structural === 'steel-frame') return 'braced-frame'
  return 'moment-frame'
}

function detectStackStrategy(typology: string, storeyCount: number): StackStrategy {
  if (typology === 'duplex') return 'mirrored-duplex'
  if (typology === 'apartment' || typology === 'townhouse') return 'repeated-unit'
  if (storeyCount >= 3) return 'stacked'
  return 'free'
}

function generateSupportAxes(params: ChassisGenerationParams): SupportAxis[] {
  const axes: SupportAxis[] = []
  const span = Math.min(params.maxStructuralSpan, params.buildingWidth)

  // Vertical support axes
  const axisCount = Math.max(2, Math.ceil(params.buildingWidth / span))
  const axisSpacing = params.buildingWidth / axisCount
  for (let i = 0; i <= axisCount; i++) {
    axes.push({
      id: uid(),
      label: String(i + 1),
      orientation: 'horizontal',
      position: i * axisSpacing,
      spanMin: axisSpacing * 0.5,
      spanMax: axisSpacing * 1.2,
      supportType: params.storeyCount <= 2 ? 'wall' : 'beam',
      loadBearing: true,
    })
  }

  // Horizontal support axes
  const horizCount = Math.max(2, Math.ceil(params.buildingDepth / span))
  const horizSpacing = params.buildingDepth / horizCount
  for (let i = 0; i <= horizCount; i++) {
    axes.push({
      id: uid(),
      label: String.fromCharCode(65 + i),
      orientation: 'vertical',
      position: i * horizSpacing,
      spanMin: horizSpacing * 0.5,
      spanMax: horizSpacing * 1.2,
      supportType: params.storeyCount <= 2 ? 'wall' : 'beam',
      loadBearing: true,
    })
  }

  return axes
}

function generateGridBays(axes: SupportAxis[]): GridBay[] {
  const vertAxes = axes.filter(a => a.orientation === 'horizontal').sort((a, b) => a.position - b.position)
  const horizAxes = axes.filter(a => a.orientation === 'vertical').sort((a, b) => a.position - b.position)
  const bays: GridBay[] = []

  for (let vi = 0; vi < vertAxes.length - 1; vi++) {
    for (let hi = 0; hi < horizAxes.length - 1; hi++) {
      bays.push({
        id: uid(),
        axisAId: vertAxes[vi].label + horizAxes[hi].label,
        axisBId: vertAxes[vi + 1].label + horizAxes[hi + 1].label,
        width: vertAxes[vi + 1].position - vertAxes[vi].position,
        depth: horizAxes[hi + 1].position - horizAxes[hi].position,
      })
    }
  }

  return bays
}

function generateCores(params: ChassisGenerationParams): VerticalCore[] {
  const cores: VerticalCore[] = []

  // Stair core (always present for >= 2 storeys)
  if (params.storeyCount >= 2) {
    const stairWidth = params.storeyCount <= 4 ? 2.5 : 2.8
    const stairDepth = params.storeyCount <= 4 ? 5.0 : 5.5
    const hasLift = params.storeyCount >= 3 || params.hasLift
    cores.push({
      id: uid(),
      type: hasLift ? 'combined' : 'stair',
      x: Math.max(0, params.buildingWidth * 0.15),
      y: 0,
      width: stairWidth,
      depth: stairDepth,
      floorFrom: 0,
      floorTo: params.storeyCount - 1,
      hasStair: true,
      hasLift,
      hasServiceShaft: false,
      protectedRoute: params.storeyCount >= 3,
      lobbyZone: params.storeyCount >= 4,
    })

    // Second stair for larger buildings
    if (params.storeyCount >= 5 || params.buildingWidth > 20) {
      cores.push({
        id: uid(),
        type: 'stair',
        x: params.buildingWidth - stairWidth - Math.max(0, params.buildingWidth * 0.15),
        y: 0,
        width: stairWidth,
        depth: stairDepth,
        floorFrom: 0,
        floorTo: params.storeyCount - 1,
        hasStair: true,
        hasLift: false,
        hasServiceShaft: false,
        protectedRoute: true,
        lobbyZone: false,
      })
    }
  }

  return cores
}

function generateShafts(params: ChassisGenerationParams): ShaftStack[] {
  const shafts: ShaftStack[] = []

  // Plumbing shaft near wet core zone
  const wetX = params.buildingWidth * 0.65
  shafts.push({
    id: uid(),
    x: wetX,
    y: params.buildingDepth * 0.6,
    width: 0.6,
    depth: 0.6,
    serviceTypes: ['plumbing', 'drainage'],
    floorFrom: 0,
    floorTo: params.storeyCount - 1,
    wetStack: true,
    label: 'Plumbing Riser',
  })

  // Electrical/data shaft
  shafts.push({
    id: uid(),
    x: params.buildingWidth * 0.35,
    y: params.buildingDepth * 0.6,
    width: 0.4,
    depth: 0.4,
    serviceTypes: ['electrical', 'data'],
    floorFrom: 0,
    floorTo: params.storeyCount - 1,
    wetStack: false,
    label: 'Electrical Riser',
  })

  // HVAC shaft for larger buildings
  if (params.storeyCount >= 3) {
    shafts.push({
      id: uid(),
      x: params.buildingWidth * 0.5,
      y: params.buildingDepth * 0.3,
      width: 0.6,
      depth: 0.6,
      serviceTypes: ['hvac'],
      floorFrom: 0,
      floorTo: params.storeyCount - 1,
      wetStack: false,
      label: 'HVAC Riser',
    })
  }

  return shafts
}

function generatePartyWalls(params: ChassisGenerationParams): PartyWall[] {
  if (!params.hasDuplex) return []

  const pwX = params.buildingWidth / 2
  return [{
    id: uid(),
    startX: pwX,
    startY: 0,
    endX: pwX,
    endY: params.buildingDepth,
    fireRating: 1.0,
    acousticRating: 52,
    continuous: true,
    floorFrom: 0,
    floorTo: params.storeyCount - 1,
    mirroredLayout: true,
  }]
}

function generateLevels(params: ChassisGenerationParams, cores: VerticalCore[], shafts: ShaftStack[]): LevelModel[] {
  const levels: LevelModel[] = []
  for (let i = 0; i < params.storeyCount; i++) {
    const programme = params.programmes[i] || 'residential'

    const constraints: PlanConstraint[] = []
    for (const core of cores) {
      if (i >= core.floorFrom && i <= core.floorTo) {
        constraints.push({
          type: 'core-reserve',
          x: core.x,
          y: core.y,
          width: core.width,
          depth: core.depth,
          label: `Core: ${core.type}`,
        })
      }
    }
    for (const shaft of shafts) {
      if (i >= shaft.floorFrom && i <= shaft.floorTo) {
        constraints.push({
          type: 'shaft-reserve',
          x: shaft.x,
          y: shaft.y,
          width: shaft.width,
          depth: shaft.depth,
          label: shaft.label,
        })
      }
    }

    levels.push({
      id: uid(),
      number: i,
      elevation: i * params.floorToFloorHeight,
      floorToFloorHeight: params.floorToFloorHeight,
      assignedProgramme: programme,
      requiredSupportAxes: [],
      requiredShaftRefs: shafts.filter(s => i >= s.floorFrom && i <= s.floorTo).map(s => s.id),
      requiredCoreRefs: cores.filter(c => i >= c.floorFrom && i <= c.floorTo).map(c => c.id),
      planConstraints: constraints,
      isGround: i === 0,
      isRoof: i === params.storeyCount - 1,
    })
  }
  return levels
}

function generateCirculationModel(params: ChassisGenerationParams): CirculationModel {
  const model: CirculationModel = {
    publicRoutes: [],
    privateRoutes: [],
    serviceRoutes: [],
    emergencyRoutes: [],
    separated: params.hasMixedUse,
  }

  if (params.storeyCount >= 2) {
    model.emergencyRoutes.push({
      id: uid(),
      from: 'floor',
      to: 'ground',
      via: ['stair-core'],
      routeType: 'emergency',
      protected: true,
    })
  }

  if (params.hasMixedUse) {
    model.publicRoutes.push({
      id: uid(),
      from: 'ground-public',
      to: 'ground-exit',
      via: ['ground-floor'],
      routeType: 'public',
      protected: false,
    })
    model.privateRoutes.push({
      id: uid(),
      from: 'upper-residential',
      to: 'ground-exit',
      via: ['stair-core', 'ground-lobby'],
      routeType: 'private',
      protected: true,
    })
    model.serviceRoutes.push({
      id: uid(),
      from: 'service-core',
      to: 'service-exit',
      via: ['service-corridor'],
      routeType: 'service',
      protected: false,
    })
  }

  return model
}

export function generateBuildingChassis(params: ChassisGenerationParams): BuildingChassis {
  const structuralSystem = params.structuralSystem || detectStructuralSystem(params.typology, params.storeyCount)
  const supportAxes = generateSupportAxes(params)
  const gridBays = generateGridBays(supportAxes)
  const cores = generateCores(params)
  const shafts = generateShafts(params)
  const partyWalls = generatePartyWalls(params)
  const levels = generateLevels(params, cores, shafts)
  const circulationModel = generateCirculationModel(params)
  const stackStrategy = detectStackStrategy(params.typology, params.storeyCount)

  return {
    id: uid(),
    typology: params.typology,
    storeyCount: params.storeyCount,
    structuralSystem,
    floorSystem: detectFloorSystem(structuralSystem),
    lateralSystem: detectLateralSystem(structuralSystem, params.storeyCount),
    supportAxes,
    gridBays,
    cores,
    shafts,
    partyWalls,
    levels,
    circulationModel,
    stackStrategy,
    maxStructuralSpan: params.maxStructuralSpan,
    slabThickness: DEFAULT_SLAB_THICKNESS,
    wallThickness: params.wallThickness,
    floorToFloorHeight: params.floorToFloorHeight,
    width: params.buildingWidth,
    depth: params.buildingDepth,
  }
}

// ── Validation ─────────────────────────────────────────────────

function checkSupportAlignment(chassis: BuildingChassis): string[] {
  const warnings: string[] = []
  if (chassis.storeyCount <= 1) return warnings

  for (const axis of chassis.supportAxes) {
    if (axis.supportType === 'wall' && !axis.loadBearing) {
      warnings.push(`Support axis ${axis.label} is non-load-bearing — check wall continuity`)
    }
  }

  // Check that every upper level has axis constraints
  for (const level of chassis.levels) {
    if (!level.isGround && level.requiredSupportAxes.length === 0) {
      warnings.push(`Level ${level.number} has no support axis requirements — walls may be unsupported`)
    }
  }

  return warnings
}

function checkShaftContinuity(chassis: BuildingChassis): string[] {
  const warnings: string[] = []
  for (const shaft of chassis.shafts) {
    if (shaft.floorFrom > 0) {
      warnings.push(`Shaft ${shaft.label} starts at floor ${shaft.floorFrom}, not ground — verify structural penetration`)
    }
    if (shaft.floorTo < chassis.storeyCount - 1 && shaft.wetStack) {
      warnings.push(`Wet stack ${shaft.label} does not extend to roof — venting may be incomplete`)
    }
  }
  return warnings
}

function checkPartyWallContinuity(chassis: BuildingChassis): string[] {
  const warnings: string[] = []
  for (const pw of chassis.partyWalls) {
    if (!pw.continuous) {
      warnings.push(`Party wall ${pw.id} is not continuous — verify fire/acoustic separation`)
    }
    if (pw.floorTo < chassis.storeyCount - 1) {
      warnings.push(`Party wall does not extend to roof deck`)
    }
  }
  return warnings
}

function checkCirculationSeparation(chassis: BuildingChassis): string[] {
  const warnings: string[] = []
  if (!chassis.circulationModel.separated) return warnings

  const hasPublic = chassis.circulationModel.publicRoutes.length > 0
  const hasPrivate = chassis.circulationModel.privateRoutes.length > 0
  const hasService = chassis.circulationModel.serviceRoutes.length > 0

  if (hasPublic && hasPrivate) {
    // Check no shared via nodes
    for (const pub of chassis.circulationModel.publicRoutes) {
      for (const priv of chassis.circulationModel.privateRoutes) {
        const sharedVia = pub.via.filter(v => priv.via.includes(v))
        if (sharedVia.length > 0 && !priv.protected) {
          warnings.push(`Public route shares "${sharedVia[0]}" with unprotected private route — circulation not properly separated`)
        }
      }
    }
  }

  if (hasService && hasPrivate) {
    for (const svc of chassis.circulationModel.serviceRoutes) {
      for (const priv of chassis.circulationModel.privateRoutes) {
        const sharedVia = svc.via.filter(v => priv.via.includes(v))
        if (sharedVia.length > 0) {
          warnings.push(`Service route shares "${sharedVia[0]}" with private route — service circulation should be separated`)
        }
      }
    }
  }

  return warnings
}

function checkVerticalEgress(chassis: BuildingChassis): string[] {
  const warnings: string[] = []
  if (chassis.storeyCount <= 1) return warnings

  const stairCores = chassis.cores.filter(c => c.hasStair)
  if (stairCores.length === 0) {
    warnings.push(`No stair core for ${chassis.storeyCount}-storey building — vertical egress missing`)
  }

  if (chassis.storeyCount >= 5 && stairCores.length < 2) {
    warnings.push(`Building with ${chassis.storeyCount} storeys should have at least 2 stair cores for egress`)
  }

  for (const core of stairCores) {
    if (chassis.storeyCount >= 3 && !core.protectedRoute) {
      warnings.push(`Stair core ${core.id} is not a protected route in a ${chassis.storeyCount}-storey building`)
    }
  }

  return warnings
}

function checkWetCoreStacking(chassis: BuildingChassis): string[] {
  const warnings: string[] = []
  const wetShafts = chassis.shafts.filter(s => s.wetStack)

  if (wetShafts.length === 0 && chassis.storeyCount >= 2) {
    warnings.push('No wet stack shafts defined — bathrooms/kitchens may not stack vertically')
  }

  for (const shaft of wetShafts) {
    if (shaft.floorTo - shaft.floorFrom < chassis.storeyCount - 1) {
      warnings.push(`Wet stack ${shaft.label} only spans floors ${shaft.floorFrom}-${shaft.floorTo}, not full building height`)
    }
  }

  return warnings
}

export function validateVerticalConstraints(chassis: BuildingChassis): VerticalConstraintReport {
  const supportWarnings = checkSupportAlignment(chassis)
  const shaftWarnings = checkShaftContinuity(chassis)
  const partyWallWarnings = checkPartyWallContinuity(chassis)
  const circWarnings = checkCirculationSeparation(chassis)
  const egressWarnings = checkVerticalEgress(chassis)
  const wetStackWarnings = checkWetCoreStacking(chassis)

  const allWarnings = [
    ...supportWarnings,
    ...shaftWarnings,
    ...partyWallWarnings,
    ...circWarnings,
    ...egressWarnings,
    ...wetStackWarnings,
  ]

  return {
    supportAlignmentPass: supportWarnings.length === 0,
    shaftContinuityPass: shaftWarnings.length === 0,
    partyWallContinuityPass: partyWallWarnings.length === 0,
    circulationSeparationPass: circWarnings.length === 0,
    wetCoreStackingPass: wetStackWarnings.length === 0,
    verticalEgressPass: egressWarnings.length === 0,
    warnings: allWarnings,
    failures: allWarnings.filter(w => w.includes('missing') || w.includes('not')),
  }
}

// ── Chassis → PlanConstraints helper ───────────────────────────

export function getConstraintsForLevel(chassis: BuildingChassis, levelIndex: number): PlanConstraint[] {
  const level = chassis.levels[levelIndex]
  if (!level) return []

  const constraints: PlanConstraint[] = [...level.planConstraints]

  // Add party wall constraints
  for (const pw of chassis.partyWalls) {
    if (levelIndex >= pw.floorFrom && levelIndex <= pw.floorTo) {
      constraints.push({
        type: 'party-wall',
        x: pw.startX,
        y: pw.startY,
        width: Math.abs(pw.endX - pw.startX) || 0.2,
        depth: Math.abs(pw.endY - pw.startY) || 0.2,
        label: 'Party Wall',
      })
    }
  }

  // Add wet zone constraints aligned to shafts
  for (const shaft of chassis.shafts) {
    if (shaft.wetStack && levelIndex >= shaft.floorFrom && levelIndex <= shaft.floorTo) {
      constraints.push({
        type: 'wet-zone',
        x: Math.max(0, shaft.x - 0.5),
        y: Math.max(0, shaft.y - 0.5),
        width: shaft.width + 1.0,
        depth: shaft.depth + 3.0,
        label: 'Wet Zone (stacked)',
      })
    }
  }

  return constraints
}
