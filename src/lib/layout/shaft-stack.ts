import type { BuildingChassis, ShaftStack } from './vertical-chassis'

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Shaft stack classification ─────────────────────────────────

export type WetStackCategory = 'full-bathroom' | 'kitchen' | 'laundry' | 'utility' | 'ablution' | 'clinical'

export interface StackedWetZone {
  id: string
  category: WetStackCategory
  shaftId: string
  floorFrom: number
  floorTo: number
  rooms: string[]
  aligned: boolean
}

export interface ShaftContinuityResult {
  continuous: boolean
  warnings: string[]
  stackedZones: StackedWetZone[]
}

// ── Wet zone detection ─────────────────────────────────────────

const WET_ROOM_NAMES = [
  'Bathroom', 'Bathroom 1', 'Bathroom 2', 'Kitchen', 'Kitchenette',
  'Laundry', 'Guest WC', 'Patient WC', 'Staff WC', 'WC',
  'Toilet', 'Ablution Block', 'Ensuite',
]

const WET_ROOM_CATEGORIES: Record<string, WetStackCategory> = {
  'Bathroom': 'full-bathroom',
  'Bathroom 1': 'full-bathroom',
  'Bathroom 2': 'full-bathroom',
  'Kitchen': 'kitchen',
  'Kitchenette': 'kitchen',
  'Laundry': 'laundry',
  'Guest WC': 'utility',
  'Patient WC': 'clinical',
  'Staff WC': 'clinical',
  'WC': 'utility',
  'Toilet': 'utility',
  'Ablution Block': 'ablution',
  'Ensuite': 'full-bathroom',
}

export function isWetRoom(name: string): boolean {
  return WET_ROOM_NAMES.some(w => name.includes(w))
}

export function getWetCategory(name: string): WetStackCategory {
  for (const [key, cat] of Object.entries(WET_ROOM_CATEGORIES)) {
    if (name.includes(key)) return cat
  }
  return 'utility'
}

// ── Shaft stacking computation ─────────────────────────────────

export interface WetRoomPlacement {
  name: string
  x: number
  y: number
  width: number
  height: number
  floorIndex: number
}

export function computeShaftStack(
  chassis: BuildingChassis,
  wetRoomsByFloor: WetRoomPlacement[][],
): ShaftContinuityResult {
  const warnings: string[] = []
  const stackedZones: StackedWetZone[] = []

  // Group wet rooms by proximity to wet shafts
  const wetShafts = chassis.shafts.filter(s => s.wetStack)

  for (let floorIdx = 0; floorIdx < wetRoomsByFloor.length; floorIdx++) {
    const floorRooms = wetRoomsByFloor[floorIdx]

    for (const room of floorRooms) {
      // Find nearest wet shaft
      let nearestShaft: ShaftStack | null = null
      let nearestDist = Infinity

      for (const shaft of wetShafts) {
        if (floorIdx < shaft.floorFrom || floorIdx > shaft.floorTo) continue
        const dist = Math.sqrt(
          (room.x + room.width / 2 - shaft.x) ** 2 +
          (room.y + room.height / 2 - shaft.y) ** 2,
        )
        if (dist < nearestDist) {
          nearestDist = dist
          nearestShaft = shaft
        }
      }

      if (nearestShaft) {
        const existingZone = stackedZones.find(
          z => z.shaftId === nearestShaft!.id && z.category === getWetCategory(room.name),
        )
        if (existingZone) {
          if (!existingZone.rooms.includes(room.name)) {
            existingZone.rooms.push(room.name)
          }
          existingZone.floorTo = Math.max(existingZone.floorTo, floorIdx)
        } else {
          stackedZones.push({
            id: uid(),
            category: getWetCategory(room.name),
            shaftId: nearestShaft.id,
            floorFrom: floorIdx,
            floorTo: floorIdx,
            rooms: [room.name],
            aligned: true,
          })
        }

        if (nearestDist > 3.0) {
          warnings.push(
            `"${room.name}" on floor ${floorIdx} is ${nearestDist.toFixed(1)}m from wet shaft — long drainage run`,
          )
        }
      } else {
        warnings.push(
          `"${room.name}" on floor ${floorIdx} has no wet shaft within range — cannot stack`,
        )
      }
    }
  }

  // Check vertical continuity
  for (const zone of stackedZones) {
    if (zone.floorTo - zone.floorFrom < chassis.storeyCount - 1) {
      warnings.push(
        `Wet stack "${zone.category}" (shaft ${zone.shaftId}) only spans floors ${zone.floorFrom}-${zone.floorTo}, not full building`,
      )
    }
  }

  const continuous = warnings.filter(w => w.includes('cannot stack') || w.includes('only spans')).length === 0

  return { continuous, warnings, stackedZones }
}

// ── Shaft continuity validation ────────────────────────────────

export function validateShaftContinuity(
  chassis: BuildingChassis,
  wetRoomsByFloor: WetRoomPlacement[][],
): { valid: boolean; warnings: string[] } {
  const result = computeShaftStack(chassis, wetRoomsByFloor)
  return { valid: result.continuous, warnings: result.warnings }
}

// ── Suggest shaft-aligned room position ───────────────────────

export function snapToShaft(
  _roomX: number,
  _roomY: number,
  roomW: number,
  roomH: number,
  shaft: ShaftStack,
): { x: number; y: number } {
  const shaftCX = shaft.x + shaft.width / 2
  const shaftCY = shaft.y + shaft.depth / 2

  return {
    x: shaftCX - roomW / 2,
    y: shaftCY - roomH / 2,
  }
}
