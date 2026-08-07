import { getRoomStandard, type RoomZone } from '../standards/roomStandards'

export type { RoomZone } from '../standards/roomStandards'

export interface RoomClass {
  zone: RoomZone
  isWetCore: boolean
  minWidth: number
  minDepth: number
}

function toRoomClass(std: ReturnType<typeof getRoomStandard>): RoomClass {
  return {
    zone: std.zone,
    isWetCore: std.isWetCore,
    minWidth: std.minWidth,
    minDepth: std.minDepth,
  }
}

/**
 * Classifies a room name into a {@link RoomClass}. Dimension/zone values
 * delegate to the single room-standards authority (Zimbabwe §5 + extended
 * SADC inventory) so tier3 layout, validation and generation stay consistent
 * with plan-intelligence.
 */
export function classifyRoom(name: string): RoomClass {
  return toRoomClass(getRoomStandard(name))
}

export function dimForRoom(name: string, minDims: Record<string, { minWidth: number; minDepth: number }>): { minWidth: number; minDepth: number } {
  if (minDims[name]) return minDims[name]
  for (const [key, dim] of Object.entries(minDims)) {
    if (name.startsWith(key) || key.startsWith(name)) return dim
  }
  const cls = classifyRoom(name)
  return { minWidth: cls.minWidth, minDepth: cls.minDepth }
}
