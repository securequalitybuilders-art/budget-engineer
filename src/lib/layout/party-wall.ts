import type { BuildingChassis, PartyWall } from './vertical-chassis'

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Party wall generation ──────────────────────────────────────

export interface PartyWallLayout {
  wall: PartyWall
  leftUnit: { rooms: PartyWallRoom[]; width: number }
  rightUnit: { rooms: PartyWallRoom[]; width: number }
}

export interface PartyWallRoom {
  name: string
  x: number
  y: number
  width: number
  height: number
  mirrored: boolean
}

/**
 * Generate a continuous party wall splitting the building in two mirrored halves.
 */
export function generatePartyWall(
  chassis: BuildingChassis,
): PartyWall {
  const pwX = chassis.width / 2

  return {
    id: uid(),
    startX: pwX,
    startY: 0,
    endX: pwX,
    endY: chassis.depth,
    fireRating: 1.0,
    acousticRating: 52,
    continuous: true,
    floorFrom: 0,
    floorTo: chassis.storeyCount - 1,
    mirroredLayout: true,
  }
}

/**
 * Mirror a room layout around the party wall axis.
 */
export function mirrorLayoutAroundPartyWall(
  wall: PartyWall,
  sourceRooms: PartyWallRoom[],
): { leftRooms: PartyWallRoom[]; rightRooms: PartyWallRoom[] } {
  const leftRooms: PartyWallRoom[] = []
  const rightRooms: PartyWallRoom[] = []

  for (const room of sourceRooms) {
    // Place on left side
    const leftRoom: PartyWallRoom = {
      ...room,
      mirrored: false,
    }
    leftRooms.push(leftRoom)

    // Mirror to right side
    const rightX = wall.startX + (wall.startX - (room.x + room.width))
    const rightRoom: PartyWallRoom = {
      ...room,
      x: rightX,
      mirrored: true,
    }
    rightRooms.push(rightRoom)
  }

  return { leftRooms, rightRooms }
}

/**
 * Create a duplex/semi-detached layout using the party wall as a mirror spine.
 */
export function generateDuplexUnitLayout(
  chassis: BuildingChassis,
  unitWidth: number,
): PartyWallLayout {
  const wall = generatePartyWall(chassis)
  const leftWidth = unitWidth
  const rightWidth = unitWidth

  return {
    wall,
    leftUnit: {
      rooms: [],
      width: leftWidth,
    },
    rightUnit: {
      rooms: [],
      width: rightWidth,
    },
  }
}

/**
 * Validate party wall continuity.
 */
export function validatePartyWall(wall: PartyWall, chassis: BuildingChassis): string[] {
  const warnings: string[] = []

  if (!wall.continuous) {
    warnings.push('Party wall is not continuous — acoustic/fire separation compromised')
  }

  if (wall.fireRating < 1.0) {
    warnings.push(`Party wall fire rating ${wall.fireRating}h is below minimum 1.0h`)
  }

  if (wall.acousticRating < 45) {
    warnings.push(`Party wall acoustic rating ${wall.acousticRating}dB is below minimum 45dB`)
  }

  if (wall.floorTo < chassis.storeyCount - 1) {
    warnings.push('Party wall does not extend to roof — fire separation incomplete')
  }

  return warnings
}

/**
 * Apply party wall as a constraint to prevent rooms crossing it.
 */
export function clampToPartyWall(
  rooms: { x: number; y: number; width: number; height: number }[],
  wallX: number,
): void {
  for (const room of rooms) {
    if (room.x + room.width > wallX) {
      room.width = Math.max(0.5, wallX - room.x)
    }
    if (room.x < wallX && room.x + room.width > wallX) {
      room.width = Math.max(0.5, wallX - room.x)
    }
  }
}
