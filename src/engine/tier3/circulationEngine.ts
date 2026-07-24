import type { PlacedRoom } from './layoutEngine'

export interface EgressPoint {
  label: string
  x: number
  y: number
  type: 'main-entry' | 'secondary-exit' | 'emergency-exit'
}

export interface AdjacencyWarning {
  roomA: string
  roomB: string
  distance: number
  message: string
}

export interface CirculationResult {
  egressPoints: EgressPoint[]
  adjacencyWarnings: AdjacencyWarning[]
  maxTravelDistance: number
  compliant: boolean
}

const ADJACENCY_PAIRS: [string, string, string][] = [
  ['Kitchen', 'Dining Room', 'Kitchen should be near Dining Room'],
  ['Kitchen', 'Dining Area', 'Kitchen should be near Dining Area'],
  ['Kitchen', 'Laundry', 'Kitchen and Laundry should be grouped'],
  ['Bathroom', 'Master Bedroom', 'Bathroom should be near Master Bedroom'],
  ['Bathroom', 'Bedroom', 'Bathroom should be near bedrooms'],
  ['Toilet', 'Living Room', 'Toilet should be accessible from Living Room'],
  ['Living Room', 'Entrance', 'Entrance should open into Living Room or Hall'],
  ['Reception', 'Entrance', 'Reception should be near entrance'],
  ['Reception / Waiting', 'Entrance', 'Reception should be near entrance'],
  ['Reception / Lobby', 'Entrance', 'Lobby should be near entrance'],
  ['Classroom', 'Toilet Block', 'Toilets should be near classrooms'],
  ['Staff Room', 'Classroom', 'Staff Room should be near classrooms'],
  ['Kitchen (Commercial)', 'Dining Area', 'Commercial Kitchen should be adjacent to Dining Area'],
  ['Kitchen (Commercial)', 'Restaurant', 'Commercial Kitchen should be adjacent to Restaurant'],
  ['Operating Theatre', 'Nurse Station', 'Operating Theatre should be near Nurse Station'],
  ['Ward', 'Nurse Station', 'Ward should be near Nurse Station'],
  ['Sales Floor', 'Stock Room', 'Stock Room should be accessible from Sales Floor'],
  ['Open-Plan Office', 'Kitchenette', 'Kitchenette should be near Open-Plan Office'],
  ['Open-Plan Office', 'Meeting Room', 'Meeting Room should be near Open-Plan Office'],
  ['Consultation Room', 'Reception / Waiting', 'Consultation Room should be near Reception'],
  ['Treatment Room', 'Consultation Room', 'Treatment Room should be near Consultation Room'],
  ['Main Hall', 'Kitchen', 'Kitchen should be near Main Hall for catering'],
  ['Guest Room', 'Reception / Lobby', 'Guest Rooms should be accessible from Lobby'],
  ['Bar', 'Restaurant', 'Bar should be near Restaurant'],
  ['Warehouse Floor', 'Loading Bay', 'Loading Bay should be connected to Warehouse Floor'],
  ['Warehouse Floor', 'Admin Office', 'Admin Office should overlook Warehouse Floor'],
  ['Vendor Stall', 'Aisle / Corridor', 'Stalls must face public aisle'],
  ['Ground Floor Shop', 'Shared Stair / Lobby', 'Shop should be accessible from shared lobby'],
]

function roomCenter(room: PlacedRoom): { cx: number; cy: number } {
  return { cx: room.x + room.width / 2, cy: room.y + room.height / 2 }
}

function distanceBetween(a: PlacedRoom, b: PlacedRoom): number {
  const ac = roomCenter(a)
  const bc = roomCenter(b)
  return Math.sqrt((ac.cx - bc.cx) ** 2 + (ac.cy - bc.cy) ** 2)
}

function nameMatch(roomName: string, target: string): boolean {
  const clean = roomName.replace(/\s+\d+$/, '').trim()
  return clean === target || clean.startsWith(target + ' ') || clean.startsWith(target + '/')
}

const ENTRANCE_ROOM_TYPES = ['Reception', 'Reception / Waiting', 'Reception / Lobby', 'Living Room', 'Lobby', 'Entrance Hall', 'Foyer']

export function analyzeCirculation(rooms: PlacedRoom[], buildingW: number, buildingD: number): CirculationResult {
  const warnings: AdjacencyWarning[] = []
  const egressPoints: EgressPoint[] = []

  // Find main entry — place at front facade center or near public room
  const publicRooms = rooms.filter(r => r.zone === 'public' || ENTRANCE_ROOM_TYPES.some(e => nameMatch(r.name, e)))
  const mainEntryRoom = publicRooms.find(r => ENTRANCE_ROOM_TYPES.some(e => nameMatch(r.name, e))) || publicRooms[0]

  if (mainEntryRoom) {
    const entryX = mainEntryRoom.x + mainEntryRoom.width / 2
    egressPoints.push({ label: 'Main Entry', x: entryX, y: 0, type: 'main-entry' })
  } else {
    egressPoints.push({ label: 'Main Entry', x: buildingW / 2, y: 0, type: 'main-entry' })
  }

  // Secondary exit — opposite end of corridor
  const corridorRooms = rooms.filter(r => r.zone === 'circulation')
  if (corridorRooms.length > 0) {
    const lastCorridor = corridorRooms[corridorRooms.length - 1]
    const secX = lastCorridor.x + lastCorridor.width
    egressPoints.push({ label: 'Secondary Exit', x: Math.min(secX, buildingW - 0.5), y: lastCorridor.y + lastCorridor.height / 2, type: 'secondary-exit' })

    // Emergency exit at far end of corridor
    egressPoints.push({ label: 'Emergency Exit', x: Math.min(secX, buildingW - 0.5), y: lastCorridor.y + lastCorridor.height / 2 + 1, type: 'emergency-exit' })
  } else {
    // Fallback: exits at building corners
    egressPoints.push({ label: 'Secondary Exit', x: buildingW, y: buildingD / 2, type: 'secondary-exit' })
    egressPoints.push({ label: 'Emergency Exit', x: buildingW, y: buildingD - 0.5, type: 'emergency-exit' })
  }

  // Add emergency exit at back if deep plan
  if (buildingD > 12) {
    egressPoints.push({ label: 'Rear Emergency Exit', x: buildingW / 2, y: buildingD, type: 'emergency-exit' })
  }

  // Travel distance validation
  let maxTravelDistance = 0
  for (const room of rooms) {
    if (room.zone === 'circulation') continue
    if (room.name === 'Stairwell' || room.name === 'Corridor' || room.name === 'Circulation') continue
    const center = roomCenter(room)
    const distances = egressPoints.map(e => Math.sqrt((center.cx - e.x) ** 2 + (center.cy - e.y) ** 2))
    const minDist = Math.min(...distances)
    maxTravelDistance = Math.max(maxTravelDistance, minDist)
  }

  const compliant = maxTravelDistance <= 18

  // Adjacency check
  for (const [a, b, msg] of ADJACENCY_PAIRS) {
    const roomA = rooms.find(r => nameMatch(r.name, a))
    const roomB = rooms.find(r => nameMatch(r.name, b))
    if (roomA && roomB) {
      const dist = distanceBetween(roomA, roomB)
      if (dist > 12) {
        warnings.push({ roomA: a, roomB: b, distance: Math.round(dist * 10) / 10, message: msg })
      }
    }
  }

  return { egressPoints, adjacencyWarnings: warnings, maxTravelDistance: Math.round(maxTravelDistance * 10) / 10, compliant }
}

export function findEntryAdjacentRoom(rooms: PlacedRoom[]): PlacedRoom | undefined {
  return rooms.find(r => nameMatch(r.name, 'Living Room') || nameMatch(r.name, 'Reception') || nameMatch(r.name, 'Reception / Waiting') || nameMatch(r.name, 'Reception / Lobby') || nameMatch(r.name, 'Lobby') || nameMatch(r.name, 'Foyer') || nameMatch(r.name, 'Entrance Hall'))
}

export function findAdjacencyIssue(rooms: PlacedRoom[]): string | null {
  const issues = analyzeCirculation(rooms, 0, 0)
  if (issues.adjacencyWarnings.length > 0) {
    return issues.adjacencyWarnings[0].message
  }
  return null
}
