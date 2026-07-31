import type { PlanModel } from '@/domain/plan'

export type ZoneClass = 'Public' | 'Private' | 'Service'

export interface RoomRow {
  number: number
  name: string
  zone: ZoneClass
  widthMm: number
  heightMm: number
  areaM2: number
  minSadcM2: number
  compliant: boolean
  wetCore: boolean
  naturalLight: boolean
}

const SADC_MIN_AREAS: Record<string, number> = {
  'master bedroom': 16,
  bedroom: 12,
  'single bedroom': 9,
  'double bedroom': 14,
  'living room': 20,
  lounge: 20,
  'dining room': 12,
  kitchen: 8,
  bathroom: 3.5,
  'ensuite': 3,
  wc: 1.5,
  toilet: 1.5,
  study: 8,
  corridor: 2,
  hallway: 3,
  laundry: 4,
  pantry: 2,
  store: 3,
  garage: 18,
  entrance: 4,
  family: 16,
  sitting: 14,
  dressing: 4,
}

const WET_CORE_NAMES = new Set(['bathroom', 'wc', 'toilet', 'kitchen', 'laundry', 'pantry', 'ensuite'])
const PUBLIC_ZONE_NAMES = new Set(['living room', 'lounge', 'dining room', 'family', 'sitting', 'entrance', 'hallway'])
const PRIVATE_ZONE_NAMES = new Set(['master bedroom', 'bedroom', 'single bedroom', 'double bedroom', 'study', 'dressing'])

function classifyZone(name: string): ZoneClass {
  const lower = name.toLowerCase().trim()
  if (PUBLIC_ZONE_NAMES.has(lower)) return 'Public'
  if (PRIVATE_ZONE_NAMES.has(lower)) return 'Private'
  if (WET_CORE_NAMES.has(lower)) return 'Service'
  return 'Service'
}

function isWetCore(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return WET_CORE_NAMES.has(lower)
}

function requiresNaturalLight(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (isWetCore(lower) && lower !== 'pantry' && lower !== 'store') return true
  return PUBLIC_ZONE_NAMES.has(lower) || PRIVATE_ZONE_NAMES.has(lower)
}

function getMinArea(name: string): number {
  const lower = name.toLowerCase().trim()
  return SADC_MIN_AREAS[lower] ?? 6
}

export function buildRoomScheduleRows(plan: PlanModel): RoomRow[] {
  return plan.rooms.map((room, i) => {
    const area = room.width * room.height
    const minArea = getMinArea(room.name)
    return {
      number: i + 1,
      name: room.name,
      zone: classifyZone(room.name),
      widthMm: Math.round(room.width * 1000),
      heightMm: Math.round(room.height * 1000),
      areaM2: Math.round(area * 100) / 100,
      minSadcM2: minArea,
      compliant: area >= minArea - 0.5,
      wetCore: isWetCore(room.name),
      naturalLight: requiresNaturalLight(room.name),
    }
  })
}
