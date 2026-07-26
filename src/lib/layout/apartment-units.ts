// ── Unit template types ──────────────────────────────────────

export type UnitTemplateType =
  | 'studio'
  | 'one-bed-compact'
  | 'two-bed-standard'
  | 'two-bed-corner'
  | 'family-unit'

// ── Core placement types ─────────────────────────────────────/

export type CorePlacementType =
  | 'central'
  | 'side'
  | 'end'
  | 'cluster'
  | 'dual'

export interface CorePlacement {
  type: CorePlacementType
  x: number
  y: number
  width: number
  height: number
  hasStair: boolean
  hasLift: boolean
  serviceShaftX: number
  serviceShaftY: number
}

// ── Apartment unit — first-class entity ──────────────────────/

export interface ApartmentUnitRoom {
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface ApartmentUnit {
  id: string
  label: string
  unitIndex: number
  unitType: UnitTemplateType
  x: number
  y: number
  width: number
  height: number
  isCornerUnit: boolean
  isEndUnit: boolean
  entryX: number
  entryY: number
  rooms: ApartmentUnitRoom[]
  wetCoreZone: { x: number; y: number; width: number; height: number } | null
  balconyZone: { x: number; y: number; width: number; height: number } | null
  facadeOrientation: 'north' | 'south' | 'east' | 'west'
}

// ── Apartment floor model ────────────────────────────────────/

export interface ApartmentFloorModel {
  units: ApartmentUnit[]
  corridor: { x: number; y: number; width: number; height: number } | null
  core: CorePlacement | null
  shaftRefs: { x: number; y: number; width: number; height: number; label: string }[]
  strategy: string
  unitCount: number
}

// ── Specific unit template generators ────────────────────────/

type TemplateParams = {
  ux: number
  uy: number
  uw: number
  uh: number
  facadeOrientation: 'north' | 'south' | 'east' | 'west'
  entrySide: 'top' | 'bottom' | 'left' | 'right'
}

export function generateStudioTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh, entrySide } = params
  const entryD = Math.min(1.0, Math.min(uw, uh) * 0.15)
  const rooms: ApartmentUnitRoom[] = []
  const bathW = Math.min(1.5, uw * 0.25)

  switch (entrySide) {
    case 'top':
      rooms.push({ name: 'Entry', x: ux + uw * 0.3, y: uy, width: Math.min(1.5, uw * 0.3), height: entryD })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux, y: uy + entryD, width: uw - bathW, height: uh - entryD - 1.2 })
      rooms.push({ name: 'Kitchenette', x: ux, y: uy + entryD, width: Math.min(1.5, uw * 0.25), height: 1.5 })
      rooms.push({ name: 'Bathroom', x: ux + uw - bathW, y: uy + entryD, width: bathW, height: 1.8 })
      rooms.push({ name: 'Balcony', x: ux, y: uy + uh - 1.2, width: uw, height: 1.2 })
      break
    case 'bottom':
      rooms.push({ name: 'Entry', x: ux + uw * 0.3, y: uy + uh - entryD, width: Math.min(1.5, uw * 0.3), height: entryD })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux, y: uy, width: uw - bathW, height: uh - entryD - 1.2 })
      rooms.push({ name: 'Kitchenette', x: ux, y: uy + uh - entryD - 1.5, width: Math.min(1.5, uw * 0.25), height: 1.5 })
      rooms.push({ name: 'Bathroom', x: ux + uw - bathW, y: uy, width: bathW, height: 1.8 })
      rooms.push({ name: 'Balcony', x: ux, y: uy, width: uw, height: 1.2 })
      break
    default:
      rooms.push({ name: 'Entry', x: ux, y: uy + uh * 0.3, width: entryD, height: Math.min(1.5, uh * 0.3) })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux + entryD, y: uy, width: uw - entryD - bathW, height: uh - 1.2 })
      rooms.push({ name: 'Kitchenette', x: ux + entryD, y: uy, width: 1.5, height: 1.5 })
      rooms.push({ name: 'Bathroom', x: ux + uw - bathW, y: uy, width: bathW, height: 1.8 })
      rooms.push({ name: 'Balcony', x: ux, y: uy + uh - 1.2, width: uw, height: 1.2 })
  }

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateOneBedCompactTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryD = Math.min(1.2, uh * 0.15)
  const bathW = Math.min(1.8, uw * 0.22)
  const balconyD = Math.min(1.5, uh * 0.12)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry', x: ux + Math.min(2.0, uw * 0.25), y: uy, width: Math.min(2.0, uw * 0.25), height: entryD })

  const remainY = uy + entryD
  const remainH = uh - entryD - balconyD
  const livingH = remainH * 0.45
  const kitchenH = remainH * 0.20
  const bedH = remainH - livingH - kitchenH

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: uw - bathW, height: Math.max(livingH, 2.0) })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max((uw - bathW) * 0.7, 1.5), height: Math.max(kitchenH, 1.2) })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: Math.max(uw - bathW, 2.5), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bathroom', x: ux + uw - bathW, y: remainY, width: bathW, height: Math.max(remainH, 1.5) })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyD, width: uw, height: balconyD })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateTwoBedStandardTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryD = Math.min(1.2, uh * 0.15)
  const bathW = Math.min(1.8, uw * 0.20)
  const balconyD = Math.min(1.5, uh * 0.12)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry', x: ux + Math.min(2.0, uw * 0.25), y: uy, width: Math.min(2.0, uw * 0.25), height: entryD })

  const remainY = uy + entryD
  const remainH = uh - entryD - balconyD
  const livingH = remainH * 0.38
  const kitchenH = remainH * 0.17
  const bedH = remainH - livingH - kitchenH
  const bed1W = (uw - bathW) * 0.52
  const bed2W = (uw - bathW) - bed1W

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: uw - bathW, height: Math.max(livingH, 2.5) })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max((uw - bathW) * 0.7, 1.5), height: Math.max(kitchenH, 1.5) })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: Math.max(bed1W, 2.5), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bedroom 2', x: ux + bed1W, y: remainY + livingH + kitchenH, width: Math.max(bed2W, 2.0), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bathroom', x: ux + uw - bathW, y: remainY, width: bathW, height: Math.max(remainH, 1.5) })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyD, width: uw, height: balconyD })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateTwoBedCornerTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryD = Math.min(1.2, uh * 0.12)
  const bathW = Math.min(2.0, uw * 0.18)
  const balconyD = Math.min(2.0, uh * 0.15)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry', x: ux + Math.min(2.5, uw * 0.2), y: uy, width: Math.min(2.5, uw * 0.2), height: entryD })

  const remainY = uy + entryD
  const remainH = uh - entryD - balconyD
  const livingH = remainH * 0.40
  const kitchenH = remainH * 0.16
  const bedH = remainH - livingH - kitchenH
  const bed1W = (uw - bathW) * 0.48
  const bed2W = (uw - bathW) * 0.52

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: uw - bathW, height: Math.max(livingH, 2.5) })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max((uw - bathW) * 0.65, 1.5), height: Math.max(kitchenH, 1.5) })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: Math.max(bed1W, 2.5), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bedroom 2', x: ux + bed1W, y: remainY + livingH + kitchenH, width: Math.max(bed2W, 2.5), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bathroom', x: ux + uw - bathW, y: remainY, width: bathW, height: Math.max(remainH, 1.5) })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyD, width: Math.max(uw * 1.2, 2.5), height: balconyD })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateFamilyUnitTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryD = Math.min(1.5, uh * 0.12)
  const bathW = Math.min(2.2, uw * 0.17)
  const balconyD = Math.min(2.0, uh * 0.15)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry / Hall', x: ux + Math.min(2.5, uw * 0.2), y: uy, width: Math.min(3.0, uw * 0.25), height: entryD })

  const remainY = uy + entryD
  const remainH = uh - entryD - balconyD
  const livingH = remainH * 0.35
  const kitchenH = remainH * 0.15
  const bedH = remainH - livingH - kitchenH
  const bed1W = (uw - bathW) * 0.35
  const bed2W = (uw - bathW) * 0.35
  const bed3W = (uw - bathW) - bed1W - bed2W

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: uw - bathW, height: Math.max(livingH, 2.5) })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max((uw - bathW) * 0.65, 2.0), height: Math.max(kitchenH, 1.5) })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: Math.max(bed1W, 2.5), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bedroom 2', x: ux + bed1W, y: remainY + livingH + kitchenH, width: Math.max(bed2W, 2.5), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bedroom 3', x: ux + bed1W + bed2W, y: remainY + livingH + kitchenH, width: Math.max(bed3W, 2.0), height: Math.max(bedH, 2.0) })
  rooms.push({ name: 'Bathroom 1', x: ux + uw - bathW, y: remainY, width: bathW, height: Math.max(remainH * 0.55, 1.5) })
  rooms.push({ name: 'Bathroom 2', x: ux + uw - bathW, y: remainY + Math.max(remainH * 0.55, 1.5), width: bathW, height: Math.max(remainH * 0.45, 1.5) })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyD, width: Math.max(uw * 1.3, 3.0), height: balconyD })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

// ── Template registry ────────────────────────────────────────/

type TemplateGenerator = (params: TemplateParams) => ApartmentUnitRoom[]

const TEMPLATE_REGISTRY: Record<UnitTemplateType, TemplateGenerator> = {
  'studio': generateStudioTemplate,
  'one-bed-compact': generateOneBedCompactTemplate,
  'two-bed-standard': generateTwoBedStandardTemplate,
  'two-bed-corner': generateTwoBedCornerTemplate,
  'family-unit': generateFamilyUnitTemplate,
}

export function getUnitTemplate(type: UnitTemplateType): TemplateGenerator {
  return TEMPLATE_REGISTRY[type]
}

export function listUnitTemplates(): UnitTemplateType[] {
  return Object.keys(TEMPLATE_REGISTRY) as UnitTemplateType[]
}

export function suggestUnitTemplate(
  uw: number,
  uh: number,
  isCorner: boolean,
  isEnd: boolean,
): UnitTemplateType {
  const area = uw * uh

  if (isCorner && area >= 35) return 'family-unit'
  if (isCorner && area >= 22) return 'two-bed-corner'
  if (area >= 30 && !isCorner) return 'two-bed-standard'
  if (area >= 28 && isEnd) return 'two-bed-standard'
  if (area >= 18) return 'one-bed-compact'
  return 'studio'
}

// ── Core placement logic ─────────────────────────────────────/

export function selectCorePlacement(
  type: CorePlacementType,
  width: number,
  height: number,
  coreSize: number,
): CorePlacement {
  const halfW = width / 2
  const halfH = height / 2
  const halfCore = coreSize / 2

  switch (type) {
    case 'central':
      return {
        type: 'central',
        x: halfW - halfCore,
        y: halfH - halfCore,
        width: coreSize,
        height: coreSize,
        hasStair: true,
        hasLift: true,
        serviceShaftX: halfW - 0.4,
        serviceShaftY: halfH - 0.4,
      }
    case 'side':
      return {
        type: 'side',
        x: 0,
        y: halfH - halfCore,
        width: coreSize,
        height: coreSize,
        hasStair: true,
        hasLift: true,
        serviceShaftX: 0.5,
        serviceShaftY: halfH - 0.4,
      }
    case 'end':
      return {
        type: 'end',
        x: width - coreSize,
        y: halfH - halfCore,
        width: coreSize,
        height: coreSize,
        hasStair: true,
        hasLift: true,
        serviceShaftX: width - coreSize + 0.5,
        serviceShaftY: halfH - 0.4,
      }
    case 'cluster':
      return {
        type: 'cluster',
        x: halfW - halfCore,
        y: halfH - halfCore,
        width: coreSize,
        height: coreSize,
        hasStair: true,
        hasLift: halfH > 5,
        serviceShaftX: halfW - 0.4,
        serviceShaftY: halfH - 0.4,
      }
    case 'dual': {
      const firstW = coreSize
      const gap = width * 0.15
      const secondX = width - coreSize
      return {
        type: 'dual',
        x: firstW,
        y: halfH - halfCore,
        width: secondX - firstW - gap,
        height: coreSize,
        hasStair: true,
        hasLift: true,
        serviceShaftX: firstW + 0.5,
        serviceShaftY: halfH - 0.4,
      }
    }
  }
}

export function suggestCorePlacement(
  width: number,
  height: number,
  unitCount: number,
  storeyCount: number,
  corridorType: string,
): CorePlacementType {
  const aspect = width / Math.max(height, 1)

  if (storeyCount >= 6 || (unitCount >= 8 && storeyCount >= 4)) {
    return 'dual'
  }

  if (corridorType === 'core-served-cluster' || corridorType === 'compact') {
    return 'cluster'
  }

  if (width >= 18 && aspect >= 1.2) {
    // Wide building: central core serves both sides well
    return 'central'
  }

  if (width >= 12 && width < 18) {
    // Medium width: side core, keep clear corridor
    return 'side'
  }

  if (unitCount <= 3 && width < 12) {
    // Narrow: end core
    return 'end'
  }

  return 'central'
}

// ── Build full apartment floor model ─────────────────────────/

export function buildApartmentFloorModel(
  units: ApartmentUnit[],
  corridor: { x: number; y: number; width: number; height: number } | null,
  core: CorePlacement | null,
  strategy: string,
): ApartmentFloorModel {
  const shaftRefs: { x: number; y: number; width: number; height: number; label: string }[] = []

  // Collect shaft references from unit wet-core zones
  for (const unit of units) {
    if (unit.wetCoreZone) {
      shaftRefs.push({
        ...unit.wetCoreZone,
        label: `Shaft-${unit.label}`,
      })
    }
  }

  return { units, corridor, core, shaftRefs, strategy, unitCount: units.length }
}

// ── Mixed-use residential access model ───────────────────────/

export interface MixedUseResidentialAccess {
  podiumLobby: { x: number; y: number; width: number; height: number } | null
  residentialCore: CorePlacement | null
  upperFloorRoute: {
    viaCore: boolean
    viaStair: boolean
    viaLift: boolean
    shaftContinuity: boolean
  }
  serviceSeparation: boolean
}

export function buildMixedUseAccess(
  core: CorePlacement | null,
  hasPodiumLobby: boolean,
): MixedUseResidentialAccess {
  return {
    podiumLobby: hasPodiumLobby ? { x: core?.x ?? 0, y: (core?.y ?? 0) - 2, width: core?.width ?? 4, height: 2 } : null,
    residentialCore: core,
    upperFloorRoute: {
      viaCore: core !== null,
      viaStair: core?.hasStair ?? false,
      viaLift: core?.hasLift ?? false,
      shaftContinuity: core !== null,
    },
    serviceSeparation: core !== null,
  }
}
