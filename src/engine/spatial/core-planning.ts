import { roomGroupFor, type AdjacencyRoom, type OfficeRoomGroup } from './adjacency-graph'
import type { CoreBlock, CoreLayout, CoreType, FloorPlateMetrics, StructuralGrid } from '../tier1-types'
import { getRoomStandard } from '../standards/roomStandards'

export const CORE_MIN_DIMS: Record<string, { minWidth: number; minDepth: number }> = {
  Staircase: { minWidth: 3.0, minDepth: 5.5 },
  Stair: { minWidth: 3.0, minDepth: 5.5 },
  Lift: { minWidth: 2.2, minDepth: 2.4 },
  'Lift Core': { minWidth: 2.4, minDepth: 2.8 },
  'Server Room': { minWidth: 2.0, minDepth: 3.0 },
  Kitchenette: { minWidth: 2.0, minDepth: 2.5 },
  WC: { minWidth: 2.0, minDepth: 2.0 },
  Toilet: { minWidth: 2.0, minDepth: 2.0 },
}

export const CORE_GROUPS: OfficeRoomGroup[] = ['stair', 'lift', 'wc', 'server', 'kitchenette']

export function coreMinDimsFor(name: string): { minWidth: number; minDepth: number } {
  const explicit = CORE_MIN_DIMS[name]
  if (explicit) return explicit
  const std = getRoomStandard(name)
  return { minWidth: std.minWidth, minDepth: std.minDepth }
}

export function isCoreRoom(room: AdjacencyRoom): boolean {
  const group = roomGroupFor(room.name)
  return group ? CORE_GROUPS.includes(group) : false
}

export function selectCoreType(width: number, height: number, preferred?: CoreType): CoreType {
  if (preferred) return preferred
  if (width >= 60) return 'dual'
  if (width / height >= 1.5) return 'side'
  return 'central'
}

export function coreColumnWidth(coreRooms: AdjacencyRoom[]): number {
  let width = 2.0
  for (const room of coreRooms) {
    width = Math.max(width, coreMinDimsFor(room.name).minWidth)
  }
  return width
}

export interface CorePlacement {
  block: CoreBlock
  rooms: AdjacencyRoom[]
}

/**
 * Stack core rooms vertically inside a core column of fixed width.
 * Each cell height = max(minDepth, area / width); clamped so the stack never
 * exceeds the available column height.
 */
export function stackCoreRooms(
  coreRooms: AdjacencyRoom[],
  x: number,
  y: number,
  width: number,
  availableHeight: number,
): CorePlacement {
  const placed: AdjacencyRoom[] = []
  let cursor = y
  const roomIds: string[] = []
  for (const room of coreRooms) {
    const { minDepth } = coreMinDimsFor(room.name)
    const ideal = room.width * room.height > 0 ? (room.width * room.height) / width : minDepth
    const height = Math.max(minDepth, Math.min(ideal, availableHeight - (cursor - y)))
    if (height <= 0) continue
    placed.push({ ...room, x, y: cursor, width, height })
    roomIds.push(room.id)
    cursor += height
  }
  const blockHeight = cursor - y
  return { block: { roomIds, x, y, width, height: blockHeight }, rooms: placed }
}

export interface OfficeCoreResult {
  coreLayout: CoreLayout
  blocks: CoreBlock[]
  rooms: AdjacencyRoom[]
}

/**
 * Build the office core layout for a given core type. Returns the core blocks
 * plus the positioned core-room rects (already snapped to the placement grid
 * by the caller via stackCoreRooms' widths/heights).
 */
export function buildOfficeCore(
  coreRooms: AdjacencyRoom[],
  coreType: CoreType,
  corridor: { x: number; y: number; width: number; height: number },
  _corridorWidth: number,
  plateHeight: number,
): OfficeCoreResult {
  const colW = coreColumnWidth(coreRooms)
  const corrLeft = corridor.x
  const corrRight = corridor.x + corridor.width
  const blocks: CoreBlock[] = []
  const rooms: AdjacencyRoom[] = []

  if (coreType === 'side') {
    // Core sits at the top of the left column, corridor on its right.
    const leftX = corrLeft - colW
    const stack = stackCoreRooms(coreRooms, leftX, 0, colW, plateHeight)
    blocks.push(stack.block)
    rooms.push(...stack.rooms)
    return { coreLayout: { coreType, blocks, x: leftX, y: 0 }, blocks, rooms }
  }

  if (coreType === 'dual') {
    // Two core stacks: one in the left column, one in the right.
    const leftX = corrLeft - colW
    const leftRooms = coreRooms.filter(r => {
      const g = roomGroupFor(r.name)
      return g === 'stair' || g === 'lift'
    })
    const rightRooms = coreRooms.filter(r => !leftRooms.includes(r))
    const leftStack = stackCoreRooms(leftRooms.length ? leftRooms : coreRooms.slice(0, 1), leftX, 0, colW, plateHeight)
    const rightX = corrRight
    const rightStack = stackCoreRooms(rightRooms.length ? rightRooms : coreRooms.slice(1), rightX, 0, colW, plateHeight)
    blocks.push(leftStack.block, rightStack.block)
    rooms.push(...leftStack.rooms, ...rightStack.rooms)
    return { coreLayout: { coreType, blocks, x: leftX, y: 0 }, blocks, rooms }
  }

  // central — core sits at the top of the right column, corridor on its left.
  const rightX = corrRight
  const stack = stackCoreRooms(coreRooms, rightX, 0, colW, plateHeight)
  blocks.push(stack.block)
  rooms.push(...stack.rooms)
  return { coreLayout: { coreType, blocks, x: rightX, y: 0 }, blocks, rooms }
}

export function computeFloorPlate(
  width: number,
  height: number,
  programRooms: AdjacencyRoom[],
  corridorRoom: AdjacencyRoom | null,
  coreBlocks: CoreBlock[],
  grid: StructuralGrid,
): FloorPlateMetrics {
  const totalAreaM2 = width * height
  const coreAreaM2 = coreBlocks.reduce((sum, b) => sum + b.width * b.height, 0)
  const circulationAreaM2 = corridorRoom ? corridorRoom.width * corridorRoom.height : 0
  const programAreaM2 = programRooms.reduce((sum, r) => sum + r.width * r.height, 0)
  const efficiency = totalAreaM2 > 0 ? (totalAreaM2 - coreAreaM2 - circulationAreaM2) / totalAreaM2 : 0
  const columns = Math.max(1, Math.round(width / grid.spanX))
  const rows = Math.max(1, Math.round(height / grid.spanY))
  return {
    totalAreaM2,
    programAreaM2,
    circulationAreaM2,
    coreAreaM2,
    efficiency,
    grid,
    columns,
    rows,
  }
}
