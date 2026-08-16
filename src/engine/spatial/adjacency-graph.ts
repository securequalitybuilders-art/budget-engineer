import type { AdjacencyGraphModel, AdjacencyRule } from '../tier1-types'

export interface AdjacencyRoom {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

export type OfficeRoomGroup =
  | 'reception'
  | 'open-plan'
  | 'private-office'
  | 'meeting'
  | 'kitchenette'
  | 'wc'
  | 'server'
  | 'stair'
  | 'lift'
  | 'corridor'

export interface RoomGroupSpec {
  group: string
  patterns: string[]
}

interface GroupPattern extends RoomGroupSpec {
  group: OfficeRoomGroup
}

export function buildGroupClassifier(groups: RoomGroupSpec[]): (name: string) => string | null {
  const index = groups
    .flatMap(g => g.patterns.map(p => ({ group: g.group, pattern: p })))
    .sort((a, b) => b.pattern.length - a.pattern.length)
  return (name: string): string | null => {
    const normalized = normalizeRoomName(name)
    if (!normalized) return null
    for (const { group, pattern } of index) {
      if (normalized.includes(pattern)) return group
    }
    return null
  }
}

export const OFFICE_ROOM_GROUPS: GroupPattern[] = [
  { group: 'reception', patterns: ['reception / waiting', 'reception', 'receptionist', 'lobby'] },
  { group: 'open-plan', patterns: ['open-plan office', 'open plan office', 'open-plan', 'open plan', 'open office', 'bullpen'] },
  { group: 'private-office', patterns: ['private office', 'executive office', 'director office', 'manager office', 'administrative office', 'admin office'] },
  { group: 'meeting', patterns: ['conference room', 'meeting room', 'board room', 'boardroom', 'meeting', 'conference'] },
  { group: 'kitchenette', patterns: ['kitchenette', 'kitchen', 'pantry', 'tea room', 'break room', 'staff room'] },
  { group: 'wc', patterns: ['guest wc', 'customer wc', 'staff wc', 'wc', 'toilet', 'ablution', 'washroom', 'restroom'] },
  { group: 'server', patterns: ['server room', 'server', 'it room', 'data room', 'comms room', 'communications room'] },
  { group: 'stair', patterns: ['staircase', 'stairwell', 'stair hall', 'stairs', 'stair'] },
  { group: 'lift', patterns: ['lift core', 'lift lobby', 'elevator', 'lift'] },
  { group: 'corridor', patterns: ['corridor', 'circulation', 'passage', 'entry hall', 'entrance hall'] },
]

export function normalizeRoomName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
}

const OFFICE_CLASSIFIER = buildGroupClassifier(OFFICE_ROOM_GROUPS)

export function roomGroupFor(name: string): OfficeRoomGroup | null {
  return OFFICE_CLASSIFIER(name) as OfficeRoomGroup | null
}

/** Mirror of plan-intelligence shared-boundary semantics (eps 0.01). */
export function sharedBoundaryLength(a: AdjacencyRoom, b: AdjacencyRoom, eps = 0.01): number {
  // a is left of b — vertical shared edge
  if (Math.abs(a.x + a.width - b.x) < eps) {
    const overlapStart = Math.max(a.y, b.y)
    const overlapEnd = Math.min(a.y + a.height, b.y + b.height)
    return Math.max(0, overlapEnd - overlapStart)
  }
  // b is left of a
  if (Math.abs(b.x + b.width - a.x) < eps) {
    const overlapStart = Math.max(a.y, b.y)
    const overlapEnd = Math.min(a.y + a.height, b.y + b.height)
    return Math.max(0, overlapEnd - overlapStart)
  }
  // a is above b — horizontal shared edge
  if (Math.abs(a.y + a.height - b.y) < eps) {
    const overlapStart = Math.max(a.x, b.x)
    const overlapEnd = Math.min(a.x + a.width, b.x + b.width)
    return Math.max(0, overlapEnd - overlapStart)
  }
  // b is above a
  if (Math.abs(b.y + b.height - a.y) < eps) {
    const overlapStart = Math.max(a.x, b.x)
    const overlapEnd = Math.min(a.x + a.width, b.x + b.width)
    return Math.max(0, overlapEnd - overlapStart)
  }
  return 0
}

export function rectsTouch(a: AdjacencyRoom, b: AdjacencyRoom, minOverlap = 0.5, eps = 0.01): boolean {
  return sharedBoundaryLength(a, b, eps) >= minOverlap
}

export function buildAdjacencyEdges(rooms: AdjacencyRoom[]): Array<{ fromId: string; toId: string; length: number }> {
  const edges: Array<{ fromId: string; toId: string; length: number }> = []
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const length = sharedBoundaryLength(rooms[i], rooms[j])
      if (length > 0) {
        edges.push({ fromId: rooms[i].id, toId: rooms[j].id, length })
      }
    }
  }
  return edges
}

export interface OfficeAdjacencyModel {
  rules: AdjacencyRule[]
  groups: Record<string, OfficeRoomGroup | null>
  edges: Array<{ fromId: string; toId: string; length: number }>
}

export const OFFICE_ADJACENCY_RULES: AdjacencyRule[] = [
  { from: 'reception', to: 'corridor', weight: 3 },
  { from: 'open-plan', to: 'meeting', weight: 3 },
  { from: 'private-office', to: 'corridor', weight: 3 },
  { from: 'open-plan', to: 'corridor', weight: 2 },
  { from: 'meeting', to: 'corridor', weight: 2 },
  { from: 'kitchenette', to: 'open-plan', weight: 2 },
  { from: 'wc', to: 'corridor', weight: 2 },
  { from: 'server', to: 'corridor', weight: 2 },
  { from: 'stair', to: 'corridor', weight: 2 },
  { from: 'reception', to: 'open-plan', weight: 1 },
]

export function applicableRules(rules: AdjacencyRule[], presentGroups: Set<string>): AdjacencyRule[] {
  return rules.filter(r => presentGroups.has(r.from) && presentGroups.has(r.to))
}

export function computeAdjacencyScore(
  rules: AdjacencyRule[],
  rooms: AdjacencyRoom[],
  touch: (a: AdjacencyRoom, b: AdjacencyRoom) => boolean = rectsTouch,
  groupFor: (name: string) => string | null = roomGroupFor,
): AdjacencyGraphModel {
  const groups = new Map<string, string | null>()
  for (const room of rooms) groups.set(room.id, groupFor(room.name))
  const presentGroups = new Set<string>()
  for (const g of groups.values()) if (g) presentGroups.add(g)

  const groupRooms = new Map<string, AdjacencyRoom[]>()
  for (const room of rooms) {
    const g = groups.get(room.id)
    if (!g) continue
    if (!groupRooms.has(g)) groupRooms.set(g, [])
    groupRooms.get(g)!.push(room)
  }

  const applicable = applicableRules(rules, presentGroups)
  let satisfiedWeight = 0
  let totalWeight = 0
  const satisfied: AdjacencyRule[] = []
  const violated: AdjacencyRule[] = []
  const edges: AdjacencyGraphModel['edges'] = []

  for (const rule of applicable) {
    totalWeight += rule.weight
    const fromRooms = groupRooms.get(rule.from) ?? []
    const toRooms = groupRooms.get(rule.to) ?? []
    let met = false
    outer: for (const a of fromRooms) {
      for (const b of toRooms) {
        if (a.id !== b.id && touch(a, b)) {
          met = true
          break outer
        }
      }
    }
    edges.push({ from: rule.from, to: rule.to, weight: rule.weight, satisfied: met })
    if (met) {
      satisfiedWeight += rule.weight
      satisfied.push(rule)
    } else {
      violated.push(rule)
    }
  }

  return {
    rules: applicable,
    satisfiedWeight,
    totalWeight,
    score: totalWeight > 0 ? satisfiedWeight / totalWeight : 1,
    satisfied,
    violated,
    edges,
  }
}

export type ClinicRoomGroup =
  | 'reception'
  | 'waiting'
  | 'consultation'
  | 'treatment'
  | 'pharmacy'
  | 'nurse'
  | 'staff'
  | 'records'
  | 'store'
  | 'wc'
  | 'stair'
  | 'lift'
  | 'corridor'

export const CLINIC_ROOM_GROUPS: RoomGroupSpec[] = [
  { group: 'reception', patterns: ['reception / waiting', 'reception', 'receptionist', 'lobby', 'front desk'] },
  { group: 'waiting', patterns: ['waiting room', 'waiting area', 'waiting', 'patient lounge', 'seating'] },
  { group: 'consultation', patterns: ['consultation room', 'consulting room', 'consultation', 'exam room', 'examination room', 'doctor room', 'physician room'] },
  { group: 'treatment', patterns: ['treatment room', 'procedure room', 'minor theatre', 'treatment', 'recovery room', 'dressing room', 'injection room', 'plaster room'] },
  { group: 'pharmacy', patterns: ['pharmacy', 'dispensary', 'medicine store', 'drug store'] },
  { group: 'nurse', patterns: ['nurse station', 'nurses station', 'nurses base', 'nurse base'] },
  { group: 'staff', patterns: ['staff room', 'staff area', 'staff office', 'staff', 'admin office', 'administrative office', 'reception office'] },
  { group: 'records', patterns: ['records room', 'records', 'archive', 'file room'] },
  { group: 'store', patterns: ['store room', 'storage room', 'store', 'storage', 'utility room', 'cleaner room'] },
  { group: 'wc', patterns: ['patient wc', 'staff wc', 'wc', 'toilet', 'ablution', 'washroom', 'restroom'] },
  { group: 'stair', patterns: ['staircase', 'stairwell', 'stair hall', 'stairs', 'stair'] },
  { group: 'lift', patterns: ['lift core', 'lift lobby', 'elevator', 'lift'] },
  { group: 'corridor', patterns: ['corridor', 'circulation', 'passage', 'entry hall', 'entrance hall'] },
]

const CLINIC_CLASSIFIER = buildGroupClassifier(CLINIC_ROOM_GROUPS)

export function roomGroupForClinic(name: string): ClinicRoomGroup | null {
  return CLINIC_CLASSIFIER(name) as ClinicRoomGroup | null
}

export const CLINIC_ADJACENCY_RULES: AdjacencyRule[] = [
  { from: 'consultation', to: 'corridor', weight: 3 },
  { from: 'treatment', to: 'corridor', weight: 3 },
  { from: 'reception', to: 'corridor', weight: 2 },
  { from: 'pharmacy', to: 'reception', weight: 3 },
  { from: 'treatment', to: 'staff', weight: 2 },
  { from: 'wc', to: 'corridor', weight: 2 },
]

export type HotelRoomGroup =
  | 'guest'
  | 'lobby'
  | 'restaurant'
  | 'kitchen'
  | 'conference'
  | 'back-of-house'
  | 'admin'
  | 'wc'
  | 'stair'
  | 'lift'
  | 'corridor'

export const HOTEL_ROOM_GROUPS: RoomGroupSpec[] = [
  { group: 'guest', patterns: ['guest room', 'guest suite', 'hotel room', 'hotel suite', 'bedroom', 'guest accommodation', 'sleeping room'] },
  { group: 'lobby', patterns: ['reception / lobby', 'lobby', 'reception', 'receptionist', 'front desk', 'entrance hall', 'atrium'] },
  { group: 'restaurant', patterns: ['restaurant', 'dining room', 'dining area', 'dining', 'cafe', 'cafeteria', 'breakfast room', 'banquet hall', 'banquet room'] },
  { group: 'kitchen', patterns: ['commercial kitchen', 'kitchen', 'food prep', 'prep kitchen', 'servery'] },
  { group: 'conference', patterns: ['conference room', 'conference', 'meeting room', 'board room', 'boardroom', 'function room', 'seminar room', 'ballroom'] },
  { group: 'back-of-house', patterns: ['back of house', 'back-of-house', 'laundry', 'linen room', 'linen', 'housekeeping', 'store room', 'storage room', 'storage', 'plant room', 'boiler room', 'utility room', 'staff canteen', 'staff changing'] },
  { group: 'admin', patterns: ['admin office', 'administrative office', 'manager office', 'front office', 'office'] },
  { group: 'wc', patterns: ['public wc', 'guest wc', 'staff wc', 'wc', 'toilet', 'ablution', 'washroom', 'restroom'] },
  { group: 'stair', patterns: ['staircase', 'stairwell', 'stair hall', 'stairs', 'stair'] },
  { group: 'lift', patterns: ['lift core', 'lift lobby', 'elevator', 'lift'] },
  { group: 'corridor', patterns: ['corridor', 'circulation', 'passage', 'walkway', 'entry hall', 'entrance hall'] },
]

const HOTEL_CLASSIFIER = buildGroupClassifier(HOTEL_ROOM_GROUPS)

export function roomGroupForHotel(name: string): HotelRoomGroup | null {
  return HOTEL_CLASSIFIER(name) as HotelRoomGroup | null
}

export const HOTEL_ADJACENCY_RULES: AdjacencyRule[] = [
  { from: 'guest', to: 'corridor', weight: 3 },
  { from: 'lobby', to: 'corridor', weight: 3 },
  { from: 'restaurant', to: 'kitchen', weight: 3 },
  { from: 'restaurant', to: 'corridor', weight: 2 },
  { from: 'conference', to: 'corridor', weight: 2 },
  { from: 'wc', to: 'corridor', weight: 2 },
  { from: 'stair', to: 'corridor', weight: 2 },
  { from: 'lift', to: 'corridor', weight: 2 },
  { from: 'kitchen', to: 'corridor', weight: 1 },
  { from: 'lobby', to: 'restaurant', weight: 1 },
]
