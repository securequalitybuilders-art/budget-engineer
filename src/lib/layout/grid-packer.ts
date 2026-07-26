import type { LayoutTemplate, ZoneDefinition, ZoneRole } from './layout-templates'
import { isFlexibleRoom } from './layout-templates'
import { getMinimumDimensions, classifyRoom } from '../geometry/plan-intelligence'

const uid = () => Math.random().toString(36).slice(2, 10)

const GRID = 0.05
const grid = (v: number) => Math.round(v / GRID)
const ungrid = (g: number) => g * GRID
const snapGrid = (v: number) => ungrid(grid(v))
const snap05 = snapGrid

export interface GridCell {
  col: number
  row: number
  x: number
  y: number
  width: number
  height: number
  zoneId: string | null
  occupied: boolean
}

export interface PackWarning {
  message: string
  roomName?: string
  zoneId?: string
  templateId?: string
}

export interface PackResult {
  rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[]
  warnings: PackWarning[]
  valid: boolean
}

export function buildGrid(
  cols: number,
  rows: number,
  width: number,
  height: number,
): GridCell[] {
  const cellW = width / cols
  const cellH = height / rows
  const cells: GridCell[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        col: c,
        row: r,
        x: snap05(c * cellW),
        y: snap05(r * cellH),
        width: snap05(cellW),
        height: snap05(cellH),
        zoneId: null,
        occupied: false,
      })
    }
  }
  return cells
}

export function assignZonesToGrid(
  cells: GridCell[],
  template: LayoutTemplate,
): void {
  const byPriority = (a: typeof template.zones[0], b: typeof template.zones[0]) => b.priority - a.priority
  const voidZones = template.zones.filter(z => z.acceptRoles.length === 0).sort(byPriority)
  const nonVoidZones = template.zones.filter(z => z.acceptRoles.length > 0).sort(byPriority)

  for (const zone of voidZones) {
    for (const cell of cells) {
      if (
        cell.col >= zone.colStart &&
        cell.col < zone.colEnd &&
        cell.row >= zone.rowStart &&
        cell.row < zone.rowEnd
      ) {
        cell.zoneId = zone.id
      }
    }
  }

  for (const zone of nonVoidZones) {
    for (const cell of cells) {
      if (
        cell.col >= zone.colStart &&
        cell.col < zone.colEnd &&
        cell.row >= zone.rowStart &&
        cell.row < zone.rowEnd &&
        cell.zoneId === null
      ) {
        cell.zoneId = zone.id
      }
    }
  }
}

export function findZoneCells(
  cells: GridCell[],
  zoneId: string,
): GridCell[] {
  return cells.filter(c => c.zoneId === zoneId && !c.occupied)
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

interface RoomToPlace {
  name: string
  ratio: number
  minWidth: number
  minDepth: number
  role: string
  flexible: boolean
}

function classifyProgram(
  program: { name: string; ratio: number }[],
): RoomToPlace[] {
  return program.map(p => {
    const dims = getMinimumDimensions(p.name)
    return {
      name: p.name,
      ratio: p.ratio,
      minWidth: dims.minWidth,
      minDepth: dims.minDepth,
      role: classifyRoom(p.name),
      flexible: isFlexibleRoom(p.name),
    }
  })
}

/**
 * Test whether a room would fall below minimum dimensions at a given size.
 */
function belowMinimum(
  room: RoomToPlace,
  w: number,
  h: number,
): boolean {
  return w < room.minWidth - 0.01 || h < room.minDepth - 0.01
}

function packHorizontalBand(
  rooms: RoomToPlace[],
  zoneX: number,
  zoneY: number,
  zoneW: number,
  zoneH: number,
  seed: number,
  warnings: PackWarning[],
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const ordered = seed !== 0 ? seededShuffle(rooms, seed) : rooms
  const ratioSum = ordered.reduce((s, r) => s + r.ratio, 0) || 1
  const totalMinW = ordered.reduce((s, r) => s + r.minWidth, 0)

  // Try un-scaled fit first
  if (totalMinW <= zoneW) {
    const spare = zoneW - totalMinW
    const result: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    let x = 0
    for (let i = 0; i < ordered.length; i++) {
      const r = ordered[i]
      const extra = spare * (r.ratio / ratioSum)
      const w = r.minWidth + extra
      const roomX = snap05(zoneX + x)
      const remaining = zoneW - (roomX - zoneX)
      const clippedW = snap05(Math.min(w, remaining))
      result.push({
        id: uid(),
        name: r.name,
        x: roomX,
        y: snap05(zoneY),
        width: clippedW,
        height: snap05(zoneH),
      })
      x = (roomX - zoneX) + clippedW
    }
    return result
  }

  // Overflow: try vertical stacking first — if zone is deep enough,
  // split into rows so each room gets full zone width but less depth.
  if (zoneH >= ordered[0]?.minDepth * 1.5 && ordered.length > 0) {
    const rowCount = Math.min(ordered.length, Math.floor(zoneH / 1.5))
    const rowH = zoneH / rowCount
    const result: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    for (let i = 0; i < ordered.length; i++) {
      const r = ordered[i]
      const row = i % rowCount
      const w = zoneW
      const h = Math.max(0.8, Math.min(rowH, zoneH - row * rowH))
      if (belowMinimum(r, w, h)) {
        warnings.push({
          message: `Required room "${r.name}" placed below minimum depth in vertical split — layout invalid`,
          roomName: r.name,
        })
      }
      result.push({
        id: uid(),
        name: r.name,
        x: snap05(zoneX),
        y: snap05(zoneY + row * rowH),
        width: snap05(w),
        height: snap05(h),
      })
    }
    return result
  }

  // Scale-to-fit as last resort
  const totalMinW_all = ordered.reduce((s, r) => s + r.minWidth, 0)
  const scale = Math.min(1, zoneW / Math.max(totalMinW_all, 0.01))
  const result: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  let x = 0

  for (let i = 0; i < ordered.length; i++) {
    const r = ordered[i]
    const isLast = i === ordered.length - 1
    const roomX = snap05(zoneX + x)
    const remainingW = Math.max(0, zoneW - (roomX - zoneX))
    const minArea = r.minWidth * r.minDepth
    const ratioW = zoneW * (r.ratio / ratioSum)
    const areaW = zoneH > 0.01 ? minArea / zoneH : minArea
    const desiredW = Math.max(ratioW, areaW, r.minWidth * scale, 1.5 * scale)
    const w = isLast ? Math.max(0.5, remainingW) : Math.min(desiredW, remainingW)

    if (belowMinimum(r, w, zoneH) && !r.flexible) {
      warnings.push({
        message: `Required room "${r.name}" placed below minimum size in overflow — layout invalid`,
        roomName: r.name,
      })
    }

    const snappedW = snap05(Math.min(w, remainingW))
    result.push({
      id: uid(),
      name: r.name,
      x: roomX,
      y: snap05(zoneY),
      width: snappedW,
      height: snap05(zoneH),
    })
    x = (roomX - zoneX) + snappedW
  }

  return result
}

function packVerticalBand(
  rooms: RoomToPlace[],
  zoneX: number,
  zoneY: number,
  zoneW: number,
  zoneH: number,
  seed: number,
  warnings: PackWarning[],
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const ordered = seed !== 0 ? seededShuffle(rooms, seed) : rooms
  const ratioSum = ordered.reduce((s, r) => s + r.ratio, 0) || 1
  const totalMinH = ordered.reduce((s, r) => s + r.minDepth, 0)

  if (totalMinH <= zoneH) {
    const spare = zoneH - totalMinH
    const result: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    let y = 0
    for (let i = 0; i < ordered.length; i++) {
      const r = ordered[i]
      const extra = spare * (r.ratio / ratioSum)
      const h = r.minDepth + extra
      const roomY = snap05(zoneY + y)
      const remaining = zoneH - (roomY - zoneY)
      const snappedH = snap05(Math.min(h, remaining))
      result.push({
        id: uid(),
        name: r.name,
        x: snap05(zoneX),
        y: roomY,
        width: snap05(zoneW),
        height: snappedH,
      })
      y = (roomY - zoneY) + snappedH
    }
    return result
  }

  // Overflow: try horizontal split first — if zone is wide enough,
  // split into columns so each room gets full zone height but less width.
  if (zoneW >= ordered[0]?.minWidth * 1.5 && ordered.length > 0) {
    const colCount = Math.min(ordered.length, Math.floor(zoneW / 1.5))
    const colW = zoneW / colCount
    const result: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    for (let i = 0; i < ordered.length; i++) {
      const r = ordered[i]
      const col = i % colCount
      const w = Math.max(0.8, Math.min(colW, zoneW - col * colW))
      const h = zoneH
      if (belowMinimum(r, w, h)) {
        warnings.push({
          message: `Required room "${r.name}" placed below minimum width in horizontal split — layout invalid`,
          roomName: r.name,
        })
      }
      result.push({
        id: uid(),
        name: r.name,
        x: snap05(zoneX + col * colW),
        y: snap05(zoneY),
        width: snap05(w),
        height: snap05(h),
      })
    }
    return result
  }

  // Scale-to-fit as last resort
  const totalMinH_all = ordered.reduce((s, r) => s + r.minDepth, 0)
  const scale = Math.min(1, zoneH / Math.max(totalMinH_all, 0.01))
  const result: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  let y = 0

  for (let i = 0; i < ordered.length; i++) {
    const r = ordered[i]
    const isLast = i === ordered.length - 1
    const roomY = snap05(zoneY + y)
    const remainingH = Math.max(0, zoneH - (roomY - zoneY))
    const minArea = r.minWidth * r.minDepth
    const ratioH = zoneH * (r.ratio / ratioSum)
    const areaH = zoneW > 0.01 ? minArea / zoneW : minArea
    const desiredH = Math.max(ratioH, areaH, r.minDepth * scale, 1.5 * scale)
    const h = isLast ? Math.max(0.5, remainingH) : Math.min(desiredH, remainingH)

    if (belowMinimum(r, zoneW, h) && !r.flexible) {
      warnings.push({
        message: `Required room "${r.name}" placed below minimum depth — layout invalid`,
        roomName: r.name,
      })
    }

    const snappedH = snap05(Math.min(h, remainingH))
    result.push({
      id: uid(),
      name: r.name,
      x: snap05(zoneX),
      y: roomY,
      width: snap05(zoneW),
      height: snappedH,
    })
    y = (roomY - zoneY) + snappedH
  }

  return result
}

function pickDirection(
  zone: ZoneDefinition,
  cellW: number,
  cellH: number,
): 'horizontal' | 'vertical' {
  const zoneW = (zone.colEnd - zone.colStart) * cellW
  const zoneH = (zone.rowEnd - zone.rowStart) * cellH
  return zoneW > zoneH * 1.2 ? 'horizontal' : 'vertical'
}

/**
 * Zone-level packing with overflow resolution:
 *   1. Primary placement (horizontal/vertical/grid)
 *   2. Flexible rooms not placed are retried in alternative compatible zones
 *   3. Required rooms that still can't fit are flagged as invalid
 */
function packZone(
  zoneRooms: RoomToPlace[],
  zone: ZoneDefinition,
  cellW: number,
  cellH: number,
  zoneOriginX: number,
  zoneOriginY: number,
  seed: number,
  warnings: PackWarning[],
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const zoneW = (zone.colEnd - zone.colStart) * cellW
  const zoneH = (zone.rowEnd - zone.rowStart) * cellH
  const direction = pickDirection(zone, cellW, cellH)

  if (direction === 'horizontal') {
    return packHorizontalBand(zoneRooms, zoneOriginX, zoneOriginY, zoneW, zoneH, seed, warnings)
  }
  return packVerticalBand(zoneRooms, zoneOriginX, zoneOriginY, zoneW, zoneH, seed, warnings)
}

/**
 * Find alternative zones that accept a given room's role, excluding the source zone.
 */
function findAlternativeZones(
  room: RoomToPlace,
  sourceZoneId: string,
  zones: ZoneDefinition[],
): ZoneDefinition[] {
  return zones.filter(z =>
    z.id !== sourceZoneId &&
    z.acceptRoles.length > 0 &&
    z.acceptRoles.includes(room.role as ZoneRole),
  )
}

export function packTemplate(
  template: LayoutTemplate,
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
): PackResult {
  const warnings: PackWarning[] = []
  const specs = classifyProgram(program)
  const cells = buildGrid(template.cols, template.rows, width, height)
  assignZonesToGrid(cells, template)

  const cellW = width / template.cols
  const cellH = height / template.rows

  const sortedZones = [...template.zones].sort((a, b) => b.priority - a.priority)
  const allRooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const usedNames = new Set<string>()
  const zoneRoomMap = new Map<string, RoomToPlace[]>()

  // Round 1: primary zone assignment
  for (const zone of sortedZones) {
    if (zone.acceptRoles.length === 0) continue

    const zoneRooms = specs.filter(r =>
      zone.acceptRoles.includes(r.role as ZoneRole) && !usedNames.has(r.name),
    )

    if (zoneRooms.length === 0) continue

    for (const r of zoneRooms) usedNames.add(r.name)
    zoneRoomMap.set(zone.id, zoneRooms)

    const zoneOriginX = zone.colStart * cellW
    const zoneOriginY = zone.rowStart * cellH

    const placed = packZone(zoneRooms, zone, cellW, cellH, zoneOriginX, zoneOriginY, seed, warnings)

    // Check which rooms from this zone were placed
    const placedNames = new Set(placed.map(r => r.name))
    const overflowRooms = zoneRooms.filter(r => !placedNames.has(r.name))

    if (overflowRooms.length > 0) {
      // Round 2: move flexible overflow rooms to alternative zones
      const remaining: RoomToPlace[] = []
      for (const r of overflowRooms) {
        if (r.flexible) {
          const altZones = findAlternativeZones(r, zone.id, template.zones)
          let placedElsewhere = false
          for (const altZone of altZones) {
            const altOriginX = altZone.colStart * cellW
            const altOriginY = altZone.rowStart * cellH
            const altPlaced = packZone([r], altZone, cellW, cellH, altOriginX, altOriginY, seed, warnings)
            if (altPlaced.length > 0) {
              for (const p of altPlaced) {
                allRooms.push(p)
                placedNames.add(p.name)
              }
              placedElsewhere = true
              warnings.push({
                message: `Flexible room "${r.name}" overflowed to zone "${altZone.id}"`,
                roomName: r.name,
                zoneId: zone.id,
              })
              break
            }
          }
          if (!placedElsewhere) remaining.push(r)
        } else {
          remaining.push(r)
          warnings.push({
            message: `Required room "${r.name}" overflowed zone "${zone.id}" with no resolution`,
            roomName: r.name,
            zoneId: zone.id,
          })
        }
      }

      // Round 3: for remaining overflow rooms, place required rooms at minimum size in original zone
      for (const r of remaining) {
        if (!r.flexible) {
          const zoneW = (zone.colEnd - zone.colStart) * cellW
          const zoneH = (zone.rowEnd - zone.rowStart) * cellH
          const w = Math.min(r.minWidth, zoneW)
          const h = Math.min(r.minDepth, zoneH)
          if (w >= 0.5 && h >= 0.5) {
            allRooms.push({
              id: uid(),
              name: r.name,
              x: snap05(zoneOriginX + Math.max(0, zoneW - w)),
              y: snap05(zoneOriginY + Math.max(0, zoneH - h)),
              width: snap05(w),
              height: snap05(h),
            })
            placedNames.add(r.name)
            warnings.push({
              message: w < r.minWidth - 0.01 || h < r.minDepth - 0.01
                ? `Required room "${r.name}" overflowed zone "${zone.id}" — placed below minimum size, layout invalid`
                : `Required room "${r.name}" overflowed zone "${zone.id}" — placed at minimum size`,
              roomName: r.name,
              zoneId: zone.id,
            })
          }
        }
      }

      // Add the successfully placed rooms (original zone)
      for (const p of placed) {
        if (placedNames.has(p.name) && !allRooms.some(r => r.name === p.name)) {
          allRooms.push(p)
        }
      }
    } else {
      for (const p of placed) allRooms.push(p)
    }
  }

  // ── Fallback: any remaining unplaced required rooms get flagged ──
  const placedNames = new Set(allRooms.map(r => r.name))
  for (const spec of specs) {
    if (placedNames.has(spec.name)) continue
    if (spec.flexible) continue
    warnings.push({
      message: `Required room "${spec.name}" left unplaced after all overflow resolution — layout invalid`,
      roomName: spec.name,
    })
  }

  const hasInvalidRequired = warnings.some(w =>
    w.message.includes('layout invalid') || w.message.includes('overflowed'),
  )

  const circulationCells = cells.filter(c => {
    const z = template.zones.find(zn => zn.id === c.zoneId)
    return z && z.acceptRoles.includes('circulation')
  })
  const hasCirculation = allRooms.some(r =>
    r.name === 'Circulation' || r.name.includes('Hall') || r.name.includes('Corridor'),
  )
  if (!hasCirculation && circulationCells.length > 0) {
    // Find first circulation cell not overlapping any existing room
    let circCell = null
    for (const cc of circulationCells) {
      const overlaps = allRooms.some(r => {
        const eps = 0.03
        return r.x < cc.x + cc.width - eps && r.x + r.width - eps > cc.x &&
               r.y < cc.y + cc.height - eps && r.y + r.height - eps > cc.y
      })
      if (!overlaps) { circCell = cc; break }
    }
    if (circCell) {
      allRooms.push({
        id: uid(),
        name: 'Circulation',
        x: circCell.x,
        y: circCell.y,
        width: circCell.width,
        height: circCell.height,
      })
    }
  }

  return {
    rooms: allRooms,
    warnings,
    valid: !hasInvalidRequired,
  }
}
