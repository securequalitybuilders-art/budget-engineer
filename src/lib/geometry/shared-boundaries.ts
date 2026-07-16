import type { WallSegment } from '../../domain/plan'
import type { RoomPolygon } from './room-polygons'
import { sharedSegment, EdgeSide } from './room-polygons'

const uid = () => Math.random().toString(36).slice(2, 10)

export interface NormalizedBoundary {
  roomAId: string
  roomBId: string
  wall: WallSegment
  sharedLength: number
  boundaryType: 'full' | 'partial'
}

export function detectSharedBoundaries(
  polygons: RoomPolygon[],
  eps = 0.05,
): NormalizedBoundary[] {
  const boundaries: NormalizedBoundary[] = []
  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      const seg = sharedSegment(polygons[i], polygons[j])
      if (!seg) continue
      const aLen = seg.side === EdgeSide.Top || seg.side === EdgeSide.Bottom
        ? polygons[i].width
        : polygons[i].height
      const bLen = seg.side === EdgeSide.Top || seg.side === EdgeSide.Bottom
        ? polygons[j].width
        : polygons[j].height
      const longer = Math.max(aLen, bLen)
      const boundaryType = seg.length >= longer - eps ? 'full' : 'partial'
      boundaries.push({
        roomAId: polygons[i].roomId,
        roomBId: polygons[j].roomId,
        wall: {
          id: uid(),
          start: seg.start,
          end: seg.end,
          thickness: 0.12,
          type: 'internal',
        },
        sharedLength: seg.length,
        boundaryType,
      })
    }
  }
  return boundaries
}

export function boundaryToWallEdge(
  boundary: NormalizedBoundary,
  padding: number = 0.12,
): WallSegment {
  return {
    id: boundary.wall.id,
    start: boundary.wall.start,
    end: boundary.wall.end,
    thickness: padding,
    type: 'internal',
  }
}

export function findBoundaryForRoom(
  boundaries: NormalizedBoundary[],
  roomId: string,
): NormalizedBoundary[] {
  return boundaries.filter(b => b.roomAId === roomId || b.roomBId === roomId)
}
