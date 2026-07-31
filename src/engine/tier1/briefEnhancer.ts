import type { Tier1ParsedBrief } from '../tier1-types'

export type SpatialRelation =
  | 'adjacent'
  | 'near'
  | 'separated'
  | 'inside'
  | 'in-front-of'
  | 'behind'
  | 'left-of'
  | 'right-of'

export interface AdjacencyConstraint {
  type: 'adjacency'
  source: string
  target: string
  relation: SpatialRelation
  weight: number
}

export interface ZoneConstraint {
  type: 'zone'
  room: string
  zone: 'front' | 'back' | 'left' | 'right' | 'upper' | 'ground'
  weight: number
}

export interface SeparationConstraint {
  type: 'separation'
  source: string
  target: string
  minDistanceM: number
  weight: number
}

export interface AreaHint {
  type: 'area-hint'
  room: string
  minAreaM2: number
  weight: number
}

export type SpatialConstraint =
  | AdjacencyConstraint
  | ZoneConstraint
  | SeparationConstraint
  | AreaHint

export interface EnhancedBrief extends Tier1ParsedBrief {
  spatialConstraints: SpatialConstraint[]
}

const ADJACENCY_PATTERNS: [RegExp, SpatialRelation][] = [
  [/(\w[\w\s]+)\s+(?:next\s+to|adjacent\s+to|beside)\s+(\w[\w\s]+)/gi, 'adjacent'],
  [/(\w[\w\s]+)\s+near\s+(\w[\w\s]+)/gi, 'near'],
  [/(\w[\w\s]+)\s+(?:close\s+to|by\s+the)\s+(\w[\w\s]+)/gi, 'near'],
  [/(\w[\w\s]+)\s+attached\s+to\s+(\w[\w\s]+)/gi, 'adjacent'],
]

const SEPARATION_PATTERNS: [RegExp, number][] = [
  [/(\w[\w\s]+)\s+away\s+from\s+(\w[\w\s]+)/gi, 3],
  [/(\w[\w\s]+)\s+separated?\s+from\s+(\w[\w\s]+)/gi, 2],
  [/(?:quiet|private)\s+(\w[\w\s]+)\s+(?:away\s+from|separated?\s+from)\s+(\w[\w\s]+)/gi, 4],
]

const ZONE_PATTERNS: [RegExp, 'front' | 'back' | 'left' | 'right'][] = [
  [/(\w[\w\s]+)\s+at\s+the\s+(front)/gi, 'front'],
  [/(\w[\w\s]+)\s+at\s+the\s+(back|rear)/gi, 'back'],
  [/(\w[\w\s]+)\s+(?:on|at)\s+the\s+(left)/gi, 'left'],
  [/(\w[\w\s]+)\s+(?:on|at)\s+the\s+(right)/gi, 'right'],
  [/(\w[\w\s]+)\s+facing\s+(north|south|east|west|street)/gi, 'front'],
]

const AREA_HINT_PATTERNS: [RegExp, number][] = [
  [/large\s+(\w[\w\s]+)/gi, 30],
  [/spacious\s+(\w[\w\s]+)/gi, 28],
  [/generous\s+(\w[\w\s]+)/gi, 26],
  [/open.?plan\s+(\w[\w\s]+)/gi, 35],
  [/compact\s+(\w[\w\s]+)/gi, 12],
  [/small\s+(\w[\w\s]+)/gi, 9],
]

function normalizeRoomName(raw: string): string {
  const lower = raw.trim().toLowerCase()
  const map: Record<string, string> = {
    bedroom: 'Bedroom',
    'master bedroom': 'Master Bedroom',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    'living room': 'Living Room',
    lounge: 'Lounge',
    dining: 'Dining Room',
    study: 'Study',
    laundry: 'Laundry',
    pantry: 'Pantry',
    garage: 'Garage',
    verandah: 'Verandah',
    porch: 'Porch',
    corridor: 'Corridor',
    hallway: 'Hallway',
    'ensuite': 'Ensuite',
    'guest wc': 'Guest WC',
    'walk-in wardrobe': 'Walk-in Wardrobe',
    'dressing room': 'Dressing Room',
    'family room': 'Family Room',
    'games room': 'Games Room',
    'home office': 'Home Office',
    'utility room': 'Utility Room',
    'store room': 'Store Room',
    'plant room': 'Plant Room',
    staircase: 'Staircase',
    stairwell: 'Stairwell',
    balcony: 'Balcony',
    terrace: 'Terrace',
    conservatory: 'Conservatory',
    'sun room': 'Sun Room',
  }
  return map[lower] ?? raw.trim()
}

function fuzzyMatchRoom(_text: string, roomName: string, programNames: string[]): string | null {
  const rn = roomName.toLowerCase()
  for (const pn of programNames) {
    if (pn.toLowerCase().includes(rn) || rn.includes(pn.toLowerCase())) return pn
  }
  if (rn.length <= 3) return null
  return roomName
}

function extractAdjacencyConstraints(text: string, programNames: string[]): AdjacencyConstraint[] {
  const result: AdjacencyConstraint[] = []
  for (const [pattern, relation] of ADJACENCY_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      const src = fuzzyMatchRoom(text, normalizeRoomName(m[1]), programNames)
      const tgt = fuzzyMatchRoom(text, normalizeRoomName(m[2]), programNames)
      if (src && tgt && src !== tgt) {
        result.push({ type: 'adjacency', source: src, target: tgt, relation, weight: 0.8 })
      }
    }
  }
  return result
}

function extractSeparationConstraints(text: string, programNames: string[]): SeparationConstraint[] {
  const result: SeparationConstraint[] = []
  for (const [pattern, minDist] of SEPARATION_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      const src = fuzzyMatchRoom(text, normalizeRoomName(m[1]), programNames)
      const tgt = fuzzyMatchRoom(text, normalizeRoomName(m[2]), programNames)
      if (src && tgt && src !== tgt) {
        result.push({ type: 'separation', source: src, target: tgt, minDistanceM: minDist, weight: 0.7 })
      }
    }
  }
  return result
}

function extractZoneConstraints(text: string, programNames: string[]): ZoneConstraint[] {
  const result: ZoneConstraint[] = []
  for (const [pattern, zone] of ZONE_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      const room = fuzzyMatchRoom(text, normalizeRoomName(m[1]), programNames)
      if (room) {
        result.push({ type: 'zone', room, zone, weight: 0.6 })
      }
    }
  }
  return result
}

function extractAreaHints(text: string, programNames: string[]): AreaHint[] {
  const result: AreaHint[] = []
  for (const [pattern, area] of AREA_HINT_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      const room = fuzzyMatchRoom(text, normalizeRoomName(m[1]), programNames)
      if (room) {
        result.push({ type: 'area-hint', room, minAreaM2: area, weight: 0.5 })
      }
    }
  }
  return result
}

export function enhanceBrief(brief: Tier1ParsedBrief): EnhancedBrief {
  const text = brief.rawText ?? ''
  const programNames = brief.program.map((p) => p.name)

  const adjacency = extractAdjacencyConstraints(text, programNames)
  const separations = extractSeparationConstraints(text, programNames)
  const zones = extractZoneConstraints(text, programNames)
  const areaHints = extractAreaHints(text, programNames)

  return {
    ...brief,
    spatialConstraints: [...adjacency, ...separations, ...zones, ...areaHints],
  }
}
