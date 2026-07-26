import type { PlacedRoom, ExpandedProgramItem } from './layoutEngine'
import { solveConstraintPlacement } from './constraintPlacer'

export type TopologyType = 'rectangle' | 'l-shape' | 'split-wing' | 'courtyard'

export interface TopologyBoundaryParams {
  buildingW: number
  buildingD: number
  lShape?: { vertW: number; vertH: number; horizD: number; corridorW: number }
  splitWing?: { pavW: number; leftH: number; rightH: number; galleryW: number }
  courtyard?: { wingDepth: number; outerW: number; outerD: number }
}

function roomCenterInRect(r: PlacedRoom, rx: number, ry: number, rw: number, rh: number): boolean {
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  return cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh
}

function roomIntersectsRect(r: PlacedRoom, rx: number, ry: number, rw: number, rh: number): boolean {
  return r.x < rx + rw && r.x + r.width > rx && r.y < ry + rh && r.y + r.height > ry
}

export function createLShapeBoundary(params: TopologyBoundaryParams): (room: PlacedRoom) => boolean {
  const { buildingW, buildingD, lShape } = params
  const vertW = lShape?.vertW ?? buildingW * 0.45
  const vertH = lShape?.vertH ?? buildingD
  const horizD = lShape?.horizD ?? buildingD * 0.4
  const corridorW = lShape?.corridorW ?? 2.0
  const corridorX = vertW
  const horizY = buildingD - horizD
  const courtyardX = corridorX + corridorW
  const courtyardY = 0
  const courtyardW = buildingW - courtyardX
  const courtyardH = buildingD - horizD

  return (room: PlacedRoom) => {
    const cx = room.x + room.width / 2
    const cy = room.y + room.height / 2

    if (cx >= 0 && cx <= buildingW && cy >= 0 && cy <= buildingD) {
      if (cx >= courtyardX && cx <= courtyardX + courtyardW && cy >= courtyardY && cy <= courtyardY + courtyardH) {
        return false
      }
      return true
    }
    return false
  }
}

export function createSplitWingBoundary(params: TopologyBoundaryParams): (room: PlacedRoom) => boolean {
  const { buildingW, splitWing } = params
  const pavW = splitWing?.pavW ?? buildingW * 0.4
  const leftH = splitWing?.leftH ?? 10
  const rightH = splitWing?.rightH ?? 10
  const galleryW = splitWing?.galleryW ?? 2.0
  const galleryX = pavW
  const rightX = pavW + galleryW
  const bldgD = Math.max(leftH, rightH)

  return (room: PlacedRoom) => {
    return (
      roomCenterInRect(room, 0, 0, pavW, leftH) ||
      roomCenterInRect(room, galleryX, 0, galleryW, Math.max(leftH, rightH)) ||
      roomCenterInRect(room, rightX, 0, pavW, rightH)
    )
  }
}

export function createCourtyardBoundary(params: TopologyBoundaryParams): (room: PlacedRoom) => boolean {
  const { courtyard } = params
  const wingDepth = courtyard?.wingDepth ?? 4.0
  const outerW = courtyard?.outerW ?? 20
  const outerD = courtyard?.outerD ?? 20

  return (room: PlacedRoom) => {
    if (room.x + room.width > outerW || room.y + room.height > outerD) return false
    const voidX = wingDepth
    const voidY = wingDepth
    const voidW = outerW - wingDepth * 2
    const voidD = outerD - wingDepth * 2

    if (voidW > 0 && voidD > 0 && roomCenterInRect(room, voidX, voidY, voidW, voidD)) {
      return false
    }
    return true
  }
}

export function solveTopologyPlacement(
  items: ExpandedProgramItem[],
  buildingW: number,
  buildingD: number,
  corridorY: number,
  corridorH: number,
  frontD: number,
  backD: number,
  topology: TopologyType,
  boundaryParams: TopologyBoundaryParams,
): PlacedRoom[] | null {
  let boundaryCheck: ((room: PlacedRoom) => boolean) | undefined
  const skipZoneBand = topology !== 'rectangle'

  switch (topology) {
    case 'rectangle':
      boundaryCheck = undefined
      break
    case 'l-shape':
      boundaryCheck = createLShapeBoundary(boundaryParams)
      break
    case 'split-wing':
      boundaryCheck = createSplitWingBoundary(boundaryParams)
      break
    case 'courtyard':
      boundaryCheck = createCourtyardBoundary(boundaryParams)
      break
  }

  return solveConstraintPlacement(items, buildingW, buildingD, corridorY, corridorH, frontD, backD, boundaryCheck, skipZoneBand)
}
