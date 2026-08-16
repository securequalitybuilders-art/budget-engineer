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

function verticalStack(total: number, parts: { frac: number; min: number }[]): number[] {
  const len = parts.length
  if (len === 0) return []
  const items = parts.map(p => ({ ...p, hi: Math.max(p.frac * total, p.min) }))
  const sum = items.reduce((s, p) => s + p.hi, 0)
  const excess = total - sum
  if (excess > 0.001) {
    for (const p of items) p.hi += excess * p.frac
  } else if (excess < -0.001) {
    const slack = items.reduce((s, p) => s + Math.max(p.hi - p.min, 0), 0)
    if (slack > 0.0001) {
      for (const p of items) {
        if (p.hi > p.min) p.hi = Math.max(p.min, p.hi + excess * ((p.hi - p.min) / slack))
      }
    } else {
      const scale = total / sum
      for (const p of items) p.hi *= scale
    }
  }
  const out: number[] = []
  let used = 0
  for (let i = 0; i < len - 1; i++) {
    const v = Number(items[i].hi.toFixed(2))
    out.push(v)
    used += v
  }
  out.push(Number((total - used).toFixed(2)))
  return out
}

export function generateStudioTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh, entrySide } = params
  const entryDc = Math.max(Math.min(1.0, Math.min(uw, uh) * 0.15), 1.0)
  const bathWc = Math.max(Math.min(1.5, uw * 0.25), 1.0)
  const mainW = uw - bathWc - (entrySide === 'top' || entrySide === 'bottom' ? 0 : entryDc)
  const mainH = uh - 1.2 - (entrySide === 'top' || entrySide === 'bottom' ? entryDc : 0)
  const kitchenW = Math.min(1.5, mainW * 0.5)
  const kitchenH = Math.min(1.5, mainH * 0.5)
  const rooms: ApartmentUnitRoom[] = []

  switch (entrySide) {
    case 'top':
      rooms.push({ name: 'Entry', x: ux + uw * 0.3, y: uy, width: Math.min(1.5, uw * 0.3), height: entryDc })
      rooms.push({ name: 'Kitchenette', x: ux, y: uy + entryDc, width: kitchenW, height: kitchenH })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux, y: uy + entryDc + kitchenH, width: mainW, height: mainH - kitchenH })
      rooms.push({ name: 'Bathroom', x: ux + mainW, y: uy + entryDc, width: bathWc, height: mainH })
      rooms.push({ name: 'Balcony', x: ux, y: uy + uh - 1.2, width: uw, height: 1.2 })
      break
    case 'bottom':
      rooms.push({ name: 'Entry', x: ux + uw * 0.3, y: uy + uh - entryDc, width: Math.min(1.5, uw * 0.3), height: entryDc })
      rooms.push({ name: 'Kitchenette', x: ux, y: uy + uh - entryDc - kitchenH, width: kitchenW, height: kitchenH })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux, y: uy + 1.2, width: mainW, height: mainH - kitchenH })
      rooms.push({ name: 'Bathroom', x: ux + mainW, y: uy + 1.2, width: bathWc, height: mainH })
      rooms.push({ name: 'Balcony', x: ux, y: uy, width: uw, height: 1.2 })
      break
    case 'left':
      rooms.push({ name: 'Entry', x: ux, y: uy + uh * 0.3, width: entryDc, height: Math.min(1.5, uh * 0.3) })
      rooms.push({ name: 'Kitchenette', x: ux + entryDc, y: uy, width: kitchenW, height: kitchenH })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux + entryDc, y: uy + kitchenH, width: mainW, height: mainH - kitchenH })
      rooms.push({ name: 'Bathroom', x: ux + mainW + entryDc, y: uy, width: bathWc, height: mainH })
      rooms.push({ name: 'Balcony', x: ux, y: uy + uh - 1.2, width: uw, height: 1.2 })
      break
    case 'right':
      rooms.push({ name: 'Entry', x: ux + uw - entryDc, y: uy + uh * 0.3, width: entryDc, height: Math.min(1.5, uh * 0.3) })
      rooms.push({ name: 'Kitchenette', x: ux + bathWc, y: uy, width: kitchenW, height: kitchenH })
      rooms.push({ name: 'Studio Living / Sleeping', x: ux + bathWc, y: uy + kitchenH, width: mainW, height: mainH - kitchenH })
      rooms.push({ name: 'Bathroom', x: ux, y: uy, width: bathWc, height: mainH })
      rooms.push({ name: 'Balcony', x: ux, y: uy + uh - 1.2, width: uw, height: 1.2 })
      break
  }

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateOneBedCompactTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryDc = Math.max(Math.min(1.2, uh * 0.15), 1.0)
  const bathWc = Math.max(Math.min(1.8, uw * 0.22), 1.0)
  const balconyDc = Math.max(Math.min(1.5, uh * 0.12), 1.0)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry', x: ux + Math.min(2.0, uw * 0.25), y: uy, width: Math.min(2.0, uw * 0.25), height: entryDc })

  const remainY = uy + entryDc
  const remainH = uh - entryDc - balconyDc
  const heights = verticalStack(remainH, [
    { frac: 0.45, min: 2.0 },
    { frac: 0.2, min: 1.2 },
    { frac: 0.35, min: 2.0 },
  ])
  const livingH = heights[0]
  const kitchenH = heights[1]
  const bedH = heights[2]
  const mainW = uw - bathWc

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: mainW, height: livingH })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max(mainW * 0.7, 1.5), height: kitchenH })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: mainW, height: bedH })
  rooms.push({ name: 'Bathroom', x: ux + uw - bathWc, y: remainY, width: bathWc, height: remainH })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyDc, width: uw, height: balconyDc })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateTwoBedStandardTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryDc = Math.max(Math.min(1.2, uh * 0.15), 1.0)
  const bathWc = Math.max(Math.min(1.8, uw * 0.2), 1.0)
  const balconyDc = Math.max(Math.min(1.5, uh * 0.12), 1.0)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry', x: ux + Math.min(2.0, uw * 0.25), y: uy, width: Math.min(2.0, uw * 0.25), height: entryDc })

  const remainY = uy + entryDc
  const remainH = uh - entryDc - balconyDc
  const heights = verticalStack(remainH, [
    { frac: 0.38, min: 2.5 },
    { frac: 0.17, min: 1.5 },
    { frac: 0.45, min: 2.0 },
  ])
  const livingH = heights[0]
  const kitchenH = heights[1]
  const bedH = heights[2]
  const availW = uw - bathWc
  const widths = verticalStack(availW, [
    { frac: 0.52, min: 2.5 },
    { frac: 0.48, min: 2.0 },
  ])
  const bed1W = widths[0]
  const bed2W = widths[1]

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: availW, height: livingH })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max(availW * 0.7, 1.5), height: kitchenH })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: bed1W, height: bedH })
  rooms.push({ name: 'Bedroom 2', x: ux + bed1W, y: remainY + livingH + kitchenH, width: bed2W, height: bedH })
  rooms.push({ name: 'Bathroom', x: ux + uw - bathWc, y: remainY, width: bathWc, height: remainH })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyDc, width: uw, height: balconyDc })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateTwoBedCornerTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryDc = Math.max(Math.min(1.2, uh * 0.12), 1.0)
  const bathWc = Math.max(Math.min(2.0, uw * 0.18), 1.0)
  const balconyDc = Math.max(Math.min(2.0, uh * 0.15), 1.0)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry', x: ux + Math.min(2.5, uw * 0.2), y: uy, width: Math.min(2.5, uw * 0.2), height: entryDc })

  const remainY = uy + entryDc
  const remainH = uh - entryDc - balconyDc
  const heights = verticalStack(remainH, [
    { frac: 0.4, min: 2.5 },
    { frac: 0.16, min: 1.5 },
    { frac: 0.44, min: 2.0 },
  ])
  const livingH = heights[0]
  const kitchenH = heights[1]
  const bedH = heights[2]
  const availW = uw - bathWc
  const widths = verticalStack(availW, [
    { frac: 0.48, min: 2.5 },
    { frac: 0.52, min: 2.5 },
  ])
  const bed1W = widths[0]
  const bed2W = widths[1]

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: availW, height: livingH })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max(availW * 0.65, 1.5), height: kitchenH })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: bed1W, height: bedH })
  rooms.push({ name: 'Bedroom 2', x: ux + bed1W, y: remainY + livingH + kitchenH, width: bed2W, height: bedH })
  rooms.push({ name: 'Bathroom', x: ux + uw - bathWc, y: remainY, width: bathWc, height: remainH })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyDc, width: Math.min(Math.max(uw * 1.2, 2.5), uw), height: balconyDc })

  return rooms.map(r => ({ ...r, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(Math.max(r.width, 1.0).toFixed(2)), height: Number(Math.max(r.height, 1.0).toFixed(2)) }))
}

export function generateFamilyUnitTemplate(params: TemplateParams): ApartmentUnitRoom[] {
  const { ux, uy, uw, uh } = params
  const entryDc = Math.max(Math.min(1.5, uh * 0.12), 1.0)
  const bathWc = Math.max(Math.min(2.2, uw * 0.17), 1.0)
  const balconyDc = Math.max(Math.min(2.0, uh * 0.15), 1.0)
  const rooms: ApartmentUnitRoom[] = []

  rooms.push({ name: 'Entry / Hall', x: ux + Math.min(2.5, uw * 0.2), y: uy, width: Math.min(3.0, uw * 0.25), height: entryDc })

  const remainY = uy + entryDc
  const remainH = uh - entryDc - balconyDc
  const heights = verticalStack(remainH, [
    { frac: 0.35, min: 2.5 },
    { frac: 0.15, min: 1.5 },
    { frac: 0.5, min: 2.0 },
  ])
  const livingH = heights[0]
  const kitchenH = heights[1]
  const bedH = heights[2]
  const availW = uw - bathWc
  const widths = verticalStack(availW, [
    { frac: 0.35, min: 2.5 },
    { frac: 0.35, min: 2.5 },
    { frac: 0.3, min: 2.0 },
  ])
  const bed1W = widths[0]
  const bed2W = widths[1]
  const bed3W = widths[2]
  const bathHeights = verticalStack(remainH, [
    { frac: 0.55, min: 1.5 },
    { frac: 0.45, min: 1.5 },
  ])
  const bath1H = bathHeights[0]
  const bath2H = bathHeights[1]

  rooms.push({ name: 'Living / Dining', x: ux, y: remainY, width: availW, height: livingH })
  rooms.push({ name: 'Kitchen', x: ux, y: remainY + livingH, width: Math.max(availW * 0.65, 2.0), height: kitchenH })
  rooms.push({ name: 'Bedroom 1', x: ux, y: remainY + livingH + kitchenH, width: bed1W, height: bedH })
  rooms.push({ name: 'Bedroom 2', x: ux + bed1W, y: remainY + livingH + kitchenH, width: bed2W, height: bedH })
  rooms.push({ name: 'Bedroom 3', x: ux + bed1W + bed2W, y: remainY + livingH + kitchenH, width: bed3W, height: bedH })
  rooms.push({ name: 'Bathroom 1', x: ux + uw - bathWc, y: remainY, width: bathWc, height: bath1H })
  rooms.push({ name: 'Bathroom 2', x: ux + uw - bathWc, y: remainY + bath1H, width: bathWc, height: bath2H })
  rooms.push({ name: 'Balcony', x: ux, y: uy + uh - balconyDc, width: Math.min(Math.max(uw * 1.3, 3.0), uw), height: balconyDc })

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
