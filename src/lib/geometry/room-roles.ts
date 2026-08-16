import type { RoomRect } from '../../domain/plan'

export type RoomRole = 'circulation' | 'public' | 'private' | 'wet' | 'service'

const ROLE_MAP: Record<string, RoomRole> = {
  'Circulation': 'circulation',
  'Corridor': 'circulation',
  'Hall': 'circulation',
  'Lobby': 'circulation',
  'Stairwell': 'circulation',
  'Stair Hall': 'circulation',
  'Gallery': 'circulation',
  'Lounge / Dining': 'public',
  'Living / Dining': 'public',
  'Living / Kitchen / Dining': 'public',
  'Living Room': 'public',
  'Lounge': 'public',
  'Dining': 'public',
  'Dining Room': 'public',
  'Reception / Waiting': 'public',
  'Reception': 'public',
  'Reception / Lobby': 'public',
  'Main Hall': 'public',
  'Main Hall / Sanctuary': 'public',
  'Sales Floor': 'public',
  'Retail Floor': 'public',
  'Shop / Convenience': 'public',
  'Open Plan Office': 'public',
  'Bedroom': 'private',
  'Master Bedroom': 'private',
  'Bedroom 1': 'private',
  'Bedroom 2': 'private',
  'Bedroom 3': 'private',
  'Guest Room': 'private',
  'Study / Flex': 'private',
  'Study': 'private',
  'Bathroom': 'wet',
  'Bathroom 1': 'wet',
  'Bathroom 2': 'wet',
  'Kitchen': 'wet',
  'Kitchenette': 'wet',
  'Laundry': 'wet',
  'Guest WC': 'wet',
  'Toilet': 'wet',
  'Store': 'service',
  'Store Room': 'service',
  'Storage': 'service',
  'Veranda': 'public',
  'Verandah': 'public',
  'Balcony': 'public',
  'Roof Terrace': 'public',
  'Courtyard': 'public',
  'Staff Room': 'service',
  'Office': 'service',
  'Admin Office': 'service',
  'Warehouse Floor': 'service',
  'Loading Bay': 'service',
  'Fuel Bay (canopy)': 'service',
  'Car Wash': 'service',
  'Pump Island': 'service',
}

export function classifyRoom(name: string): RoomRole {
  for (const [prefix, role] of Object.entries(ROLE_MAP)) {
    if (name.startsWith(prefix) || name === prefix) return role
  }
  return 'private'
}

export function isHabitable(role: RoomRole): boolean {
  return role === 'public' || role === 'private'
}

export function isDry(role: RoomRole): boolean {
  return role === 'circulation' || role === 'public' || role === 'private'
}

export function findCirculationSpine(rooms: RoomRect[]): RoomRect | null {
  const preferred = ['Circulation', 'Hall', 'Lobby', 'Corridor']
  for (const name of preferred) {
    const found = rooms.find(r => r.name === name || r.name.startsWith(name))
    if (found) return found
  }
  // Fallback: find the longest public room (likely Lounge/Dining)
  const publicRooms = rooms.filter(r => classifyRoom(r.name) === 'public')
  if (publicRooms.length > 0) {
    return publicRooms.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b))
  }
  return null
}
