import { generateDuplexLayout } from './typologies/residential'
import { generateApartmentLayout } from './typologies/non-residential'
import { generateZonedLayout } from '../geometry/plan-intelligence'
import { templateForTypology, pickHouseTemplate } from './layout-templates'
import { packTemplate } from './grid-packer'
import type { PlanningZoneMarker, EntranceMarkerClass } from '../../domain/plan'

export type BuildingTypology =
  | 'house'
  | 'apartment'
  | 'townhouse'
  | 'clinic'
  | 'school'
  | 'commercial'
  | 'office'
  | 'mixed-use'
  | 'duplex'
  | 'warehouse'
  | 'worship'
  | 'other'

export interface FloorContext {
  levelIndex: number
  totalFloors: number
  floorRole: string
  isGround: boolean
  isRoof: boolean
  programmeTags: string[]
}

export interface FloorLayoutResult {
  rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[]
  entranceMarkers?: PlanningZoneMarker[]
  warnings?: string[]
  valid?: boolean
}

export interface TypologyStrategy {
  id: BuildingTypology
  name: string
  generate: (
    program: { name: string; ratio: number }[],
    width: number,
    height: number,
    seed?: number,
    floorContext?: FloorContext,
  ) => FloorLayoutResult
}

const uid = () => Math.random().toString(36).slice(2, 10)

const STRATEGIES: Record<string, TypologyStrategy> = {
  'house': {
    id: 'house',
    name: 'Residential',
    generate: (program, width, height, seed = 0, floorContext?) => {
      const isUpperFloor = floorContext && !floorContext.isGround
      const isPodium = floorContext?.floorRole === 'podium'
      const isRepeatedUnit = floorContext?.floorRole === 'repeated-unit'

      if (isUpperFloor || isPodium || isRepeatedUnit) {
        return { rooms: generateZonedLayout({ program, width, height, corridorWidth: 1.5 }) }
      }

      const area = width * height
      const template = pickHouseTemplate(area, seed)
      const result = packTemplate(template, program, width, height, seed)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'apartment': {
    id: 'apartment',
    name: 'Apartment',
    generate: (program, width, height, _seed?, floorContext?) => {
      if (floorContext && floorContext.floorRole === 'podium') {
        return { rooms: generateZonedLayout({ program, width, height, corridorWidth: 2.0 }) }
      }
      return { rooms: generateApartmentLayout(program, width, height, {
        floorRole: floorContext?.floorRole,
        storeyCount: floorContext?.totalFloors ?? 2,
      })}
    },
  },
  'townhouse': {
    id: 'townhouse',
    name: 'Townhouse',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('townhouse', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'clinic': {
    id: 'clinic',
    name: 'Clinic',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('clinic', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'school': {
    id: 'school',
    name: 'School',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('school', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'commercial': {
    id: 'commercial',
    name: 'Commercial / Retail',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('commercial', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'office': {
    id: 'office',
    name: 'Office',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('office', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'mixed-use': {
    id: 'mixed-use',
    name: 'Mixed-Use',
    generate: (program, width, height, seed?, floorContext?) => {
      if (floorContext && floorContext.floorRole === 'upper-residential') {
        return { rooms: generateApartmentLayout(program, width, height, {
          floorRole: 'upper-residential',
          storeyCount: floorContext?.totalFloors ?? 2,
        })}
      }
      const t = templateForTypology('mixed-use', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)

      // Create entrance markers as first-class PlanningZoneMarker objects
      const cellW = width / t.cols
      const cellH = height / t.rows
      const entranceDefs: { zoneId: string; label: string; type: EntranceMarkerClass; w: number; h: number }[] = [
        { zoneId: 'retail-front', label: 'Retail / Public Entrance', type: 'retail-public', w: Math.min(cellW * 1.5, width * 0.2), h: Math.min(cellH * 1.5, height * 0.2) },
        { zoneId: 'lobby', label: 'Residential Lobby Entrance', type: 'residential-private', w: Math.min(cellW * 1.5, width * 0.2), h: Math.min(cellH * 1.5, height * 0.2) },
        { zoneId: 'service-rear', label: 'Service / Back-of-House Entrance', type: 'service-boh', w: Math.min(cellW, width * 0.15), h: Math.min(cellH, height * 0.15) },
      ]

      const entranceMarkers: PlanningZoneMarker[] = []
      for (const def of entranceDefs) {
        const zone = t.zones.find(z => z.id === def.zoneId)
        if (!zone) continue
        const zx = zone.colStart * cellW
        const zy = zone.rowStart * cellH
        entranceMarkers.push({
          id: uid(),
          type: def.type,
          label: def.label,
          x: Number(zx.toFixed(2)),
          y: Number(zy.toFixed(2)),
          width: Number(def.w.toFixed(2)),
          height: Number(def.h.toFixed(2)),
        })
      }

      return {
        rooms: result.rooms,
        entranceMarkers,
        warnings: result.warnings.map(w => w.message),
        valid: result.valid,
      }
    },
  },
  'duplex': {
    id: 'duplex',
    name: 'Duplex / Semi-Detached',
    generate: (program, width, height, seed) => ({ rooms: generateDuplexLayout(program, width, height, seed) }),
  },
  'warehouse': {
    id: 'warehouse',
    name: 'Warehouse + Office',
    generate: (program, width, height, seed?, floorContext?) => {
      if (floorContext && floorContext.floorRole === 'mezzanine-office') {
        return { rooms: generateZonedLayout({ program, width, height, corridorWidth: 1.5 }) }
      }
      const t = templateForTypology('warehouse', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'worship': {
    id: 'worship',
    name: 'Worship / Community Hall',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('worship', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'other': {
    id: 'other',
    name: 'General',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('house', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
}

export function getStrategy(buildingType: string): TypologyStrategy {
  const normalized = buildingType?.toLowerCase().trim() || 'house'
  const keys = Object.keys(STRATEGIES)
  for (const key of keys) {
    if (normalized === key) return STRATEGIES[key]
    if (normalized.includes(key) || key.includes(normalized)) return STRATEGIES[key]
  }
  return STRATEGIES['house']
}

export function generateLayoutByTypology(
  buildingType: string,
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
  floorContext?: FloorContext,
): FloorLayoutResult {
  const strategy = getStrategy(buildingType)
  return strategy.generate(program, width, height, seed, floorContext)
}
