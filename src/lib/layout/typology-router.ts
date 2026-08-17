import { generateDuplexLayout } from './typologies/residential'
import { generateApartmentLayout } from './typologies/non-residential'
import { generateOfficeLayout } from './typologies/office-strategy'
import { generateClinicLayout } from './typologies/clinic-strategy'
import { generateHotelLayout } from './typologies/hotel-strategy'
import { generateZonedLayout } from '../geometry/plan-intelligence'
import { bubbleFromRooms } from '../../engine/spatial/topological-graph'
import { templateForTypology, pickHouseTemplate } from './layout-templates'
import { packTemplate } from './grid-packer'
import { evaluateTypologyConstraints, getConstraintsForTypology } from '../../engine/architecture/typologies/constraintEvaluator'
import type { PlanningZoneMarker, EntranceMarkerClass } from '../../domain/plan'
import type { FloorContext, FloorLayoutResult, TypologyStrategy } from './typology-types'

export type { BuildingTypology, FloorContext, FloorLayoutResult, TypologyStrategy } from './typology-types'

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
      const valid = result.valid && result.warnings.filter(w => w.roomName && w.message.includes('invalid')).length === 0
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid }
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
    generate: (program, width, height, seed, floorContext) => {
      return generateClinicLayout(program, width, height, seed, floorContext)
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
  'hotel': {
    id: 'hotel',
    name: 'Hotel / Guesthouse',
    generate: (program, width, height, seed, floorContext) => {
      return generateHotelLayout(program, width, height, seed, floorContext)
    },
  },
  'office': {
    id: 'office',
    name: 'Office',
    generate: (program, width, height, seed, floorContext) => {
      return generateOfficeLayout(program, width, height, seed, floorContext)
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
  'retail': {
    id: 'retail',
    name: 'Retail / Shop',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('commercial', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'restaurant': {
    id: 'restaurant',
    name: 'Restaurant',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('commercial', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'market': {
    id: 'market',
    name: 'Market',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('commercial', width * height, seed)
      const result = packTemplate(t, program, width, height, seed ?? 0)
      return { rooms: result.rooms, warnings: result.warnings.map(w => w.message), valid: result.valid }
    },
  },
  'hall': {
    id: 'hall',
    name: 'Community Hall',
    generate: (program, width, height, seed) => {
      const t = templateForTypology('worship', width * height, seed)
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
  'petrol': {
    id: 'petrol',
    name: 'Petrol / Filling Station',
    generate: (program, width, height, seed) => {
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
  const normalized = (buildingType || 'house').toLowerCase().trim()
  const keys = Object.keys(STRATEGIES)
  for (const key of keys) {
    if (normalized === key) return STRATEGIES[key]
  }
  // Whole-token match: split on non-alphanumeric separators so 'townhouse'
  // and 'warehouse-industrial' are not swallowed by the 'house' substring.
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  for (const key of keys) {
    if (tokens.includes(key)) return STRATEGIES[key]
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
  const result = strategy.generate(program, width, height, seed, floorContext)
  if (result.rooms && !result.bubbleDiagram) {
    result.bubbleDiagram = bubbleFromRooms(result.rooms, { typologyId: strategy.id })
  }

  // Run typology constraint evaluation when constraints exist for this building type
  if (result.rooms && result.rooms.length > 0) {
    const constraintId = resolveConstraintId(buildingType)
    if (constraintId && getConstraintsForTypology(constraintId)) {
      result.constraintEvaluation = evaluateTypologyConstraints(constraintId, {
        rooms: result.rooms,
        totalWidth: width,
        totalHeight: height,
        buildingType,
      })
    }
  }

  return result
}

/** Map a buildingType string (as passed to generateLayoutByTypology) to the constraint registry id. */
function resolveConstraintId(buildingType: string): string | undefined {
  const lower = buildingType.toLowerCase().trim()
  // Exact match first
  if (getConstraintsForTypology(lower)) return lower
  // Common KB-style ids (e.g. 'house-residential', 'office-commercial')
  const candidates = [
    'house-residential', 'apartment-multi', 'clinic-health', 'school-classroom',
    'church-worship', 'office-commercial', 'retail-shop', 'hotel-fullservice',
    'warehouse-industrial', 'petrol-station', 'community-hall', 'mixed-use',
  ]
  for (const c of candidates) {
    if (lower === c || lower.includes(c.split('-')[0])) return c
  }
  return undefined
}
