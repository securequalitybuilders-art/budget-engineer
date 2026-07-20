import type { CadDocument, Vec2, RoomProgramme, FaçadeOrientation } from '@/domain/ws6-types';
import type { FrontageMapping, FaçadeSegment, FaçadeComposition } from '@/domain/ws6-types';

const ENTRANCE_PROGRAMMES: RoomProgramme[] = ['Living Room', 'Reception', 'Lobby', 'Porch', 'Hallway'];
const PUBLIC_FRONTAGE: Set<string> = new Set([
  'Living Room', 'Reception', 'Lobby', 'Porch', 'Reception / Waiting',
  'Sales Floor', 'Open Plan', 'Meeting Room', 'Dining Area',
  'Dining Room', 'Family Room', 'Lounge',
]);
const SERVICE_FRONTAGE: Set<string> = new Set([
  'Kitchen', 'Laundry', 'Utility Room', 'Store Room', 'Plant Room',
  'Pantry', 'Bathroom', 'W/C', 'Ensuite', 'Garage',
  'Commercial Kitchen', 'Stock Room', 'Storage',
]);

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function wallMidpoint(w: { start: Vec2; end: Vec2 }): Vec2 {
  return { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
}

function orientWall(w: { start: Vec2; end: Vec2 }): FaçadeOrientation {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return 'front';
  const dir = { x: dx / len, y: dy / len };
  if (Math.abs(dir.y) < 0.1) return dir.x > 0 ? 'front' : 'rear';
  if (Math.abs(dir.x) < 0.1) return dir.y > 0 ? 'left' : 'right';
  return 'front';
}

function computeBuildingExtents(walls: { start: Vec2; end: Vec2 }[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const allPts = walls.flatMap(w => [w.start, w.end]);
  const xs = allPts.map(p => p.x);
  const ys = allPts.map(p => p.y);
  return {
    minX: Math.min(...xs, 0),
    maxX: Math.max(...xs, 1),
    minY: Math.min(...ys, 0),
    maxY: Math.max(...ys, 1),
  };
}

function roomFrontageType(programme: RoomProgramme): 'public' | 'private' | 'service' {
  if (PUBLIC_FRONTAGE.has(programme)) return 'public';
  if (SERVICE_FRONTAGE.has(programme)) return 'service';
  return 'private';
}

function getBestOrientationForRoom(
  programme: RoomProgramme,
  allExtWalls: { start: Vec2; end: Vec2; id: string }[],
): FaçadeOrientation {
  const frontType = roomFrontageType(programme);
  const frontWalls = allExtWalls.filter(w => orientWall(w) === 'front');
  const rearWalls = allExtWalls.filter(w => orientWall(w) === 'rear');

  if (frontType === 'public' && frontWalls.length > 0) return 'front';
  if (frontType === 'service' && rearWalls.length > 0) return 'rear';
  if (frontType === 'public') return 'front';
  if (frontType === 'service') return 'rear';

  const leftWalls = allExtWalls.filter(w => orientWall(w) === 'left');
  const rightWalls = allExtWalls.filter(w => orientWall(w) === 'right');

  if (leftWalls.length > 0) return 'left';
  if (rightWalls.length > 0) return 'right';

  return frontWalls.length > 0 ? 'front' : 'rear';
}

export function computeFaçadeComposition(cad: CadDocument, orientation: FaçadeOrientation): FaçadeComposition {
  const orientedWalls = cad.walls.filter(w => {
    if (!w.structural) return false;
    return orientWall(w) === orientation;
  });

  const extents = computeBuildingExtents(cad.walls);
  const { minX, maxX, minY, maxY } = extents;

  const segments: FaçadeSegment[] = orientedWalls.map(w => {
    const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
    const wallOpenings = cad.openings.filter(o => o.wallId === w.id);
    const wallMid = wallMidpoint(w);

    const rooms: string[] = [];
    if (cad.roomProgramme) {
      const sortedRooms = Object.entries(cad.roomProgramme)
        .map(([rid, prog], idx) => ({ rid, prog: prog as string, idx }));
      const roomCount = sortedRooms.length;

      for (const r of sortedRooms) {
        const t = roomCount > 1 ? r.idx / (roomCount - 1) : 0.5;
        const nearWall = findWallAtProportion(wallMid, orientation, cad.walls.filter(w => w.structural), t);
        if (nearWall && nearWall.id === w.id) {
          rooms.push(r.prog);
        }
      }

      if (rooms.length === 0 && sortedRooms.length > 0) {
        const progsOnOrientation = sortedRooms.filter(r => {
          const rOrient = getBestOrientationForRoom(r.prog as RoomProgramme, cad.walls.filter(ww => ww.structural));
          return rOrient === orientation;
        });
        if (progsOnOrientation.length > 0) {
          const wallProgrammes = sortedRooms.filter(r => {
            const nearWall = findWallAtProportion(wallMid, orientation, cad.walls.filter(w => w.structural), roomCount > 1 ? r.idx / (roomCount - 1) : 0.5);
            return nearWall && nearWall.id === w.id;
          });
          if (wallProgrammes.length > 0) {
            rooms.push(...wallProgrammes.map(r => r.prog));
          }
        }
      }

      if (rooms.length === 0 && sortedRooms.length > 0) {
        const closest = findClosestRoomToWall(w, sortedRooms, cad.walls.filter(w => w.structural), orientation);
        if (closest) rooms.push(closest.prog);
      }
    }

    const entranceWeight = wallOpenings.some(o => {
      if (o.kind !== 'door') return false;
      return rooms.some(r => ENTRANCE_PROGRAMMES.includes(r as RoomProgramme));
    }) ? 3 : (wallOpenings.length > 0 ? 1 : 0);

    return {
      wallId: w.id,
      floorId: w.floorId,
      start: w.start,
      end: w.end,
      length: len,
      rooms,
      openingCount: wallOpenings.length,
      entranceWeight,
    };
  });

  let entranceX: number | null = null;
  let entranceFloor: string | null = null;
  for (const seg of segments) {
    if (seg.entranceWeight >= 3) {
      const midX = (seg.start.x + seg.end.x) / 2;
      entranceX = orientation === 'front' || orientation === 'rear' ? midX : (seg.start.y + seg.end.y) / 2;
      entranceFloor = seg.floorId;
      break;
    }
  }

  const topFloor = cad.floors[cad.floors.length - 1];
  const totalHeight = topFloor ? topFloor.elevation + topFloor.height : 6;

  return {
    orientation,
    buildingEdgeTop: orientation === 'front' || orientation === 'rear' ? minY : minX,
    buildingEdgeBottom: orientation === 'front' || orientation === 'rear' ? maxY : maxX,
    buildingEdgeLeft: orientation === 'front' || orientation === 'rear' ? minX : minY,
    buildingEdgeRight: orientation === 'front' || orientation === 'rear' ? maxX : maxY,
    width: orientation === 'front' || orientation === 'rear' ? (maxX - minX) : (maxY - minY),
    totalHeight,
    segments,
    entranceX,
    entranceFloor,
  };
}

function findWallAtProportion(_mid: Vec2, orientation: FaçadeOrientation, allExtWalls: { start: Vec2; end: Vec2; id: string }[], t: number): { id: string } | null {
  const oriented = allExtWalls.filter(w => orientWall(w) === orientation);
  if (oriented.length === 0) return null;
  oriented.sort((a, b) => {
    const ma = wallMidpoint(a);
    const mb = wallMidpoint(b);
    return orientation === 'front' || orientation === 'rear'
      ? ma.x - mb.x
      : ma.y - mb.y;
  });
  const idx = Math.min(Math.floor(t * oriented.length), oriented.length - 1);
  return oriented[idx];
}

function findClosestRoomToWall(
  wall: { start: Vec2; end: Vec2 },
  sortedRooms: { rid: string; prog: string; idx: number }[],
  extWalls: { start: Vec2; end: Vec2; id: string }[],
  orientation: FaçadeOrientation,
): { prog: string } | null {
  const wallMid = wallMidpoint(wall);
  const orientedWalls = extWalls.filter(w => orientWall(w) === orientation);
  let bestRoom = sortedRooms[0];
  let bestDist = Infinity;

  for (const r of sortedRooms) {
    const rOrient = getBestOrientationForRoom(r.prog as RoomProgramme, extWalls);
    if (rOrient !== orientation) continue;

    const roomCount = sortedRooms.length;
    const t = roomCount > 1 ? r.idx / (roomCount - 1) : 0.5;
    const ownWall = findWallAtProportion(wallMid, orientation, orientedWalls, t);
    if (!ownWall) continue;
    const ownMid = wallMidpoint(orientedWalls.find(w => w.id === ownWall.id) || wall);
    const d = dist(wallMid, ownMid);
    if (d < bestDist) {
      bestDist = d;
      bestRoom = r;
    }
  }
  return bestRoom;
}

export function findRoomForWall(cad: CadDocument, wallId: string): string | null {
  if (!cad.roomProgramme) return null;
  const wall = cad.walls.find(w => w.id === wallId);
  if (!wall) return null;
  const orientation = orientWall(wall);
  const sortedRooms = Object.entries(cad.roomProgramme)
    .map(([rid, prog], idx) => ({ rid, prog, idx }));
  const roomCount = sortedRooms.length;
  const wallMid = wallMidpoint(wall);
  const extWalls = cad.walls.filter(w => w.structural);

  const prefferedOnOrient = sortedRooms.filter(r => {
    const rOrient = getBestOrientationForRoom(r.prog as RoomProgramme, extWalls);
    return rOrient === orientation;
  });

  for (const r of (prefferedOnOrient.length > 0 ? prefferedOnOrient : sortedRooms)) {
    const t = roomCount > 1 ? r.idx / (roomCount - 1) : 0.5;
    const nearWall = findWallAtProportion(wallMid, orientation, extWalls, t);
    if (nearWall && nearWall.id === wallId) {
      return r.prog;
    }
  }

  const closest = findClosestRoomToWall(wall, sortedRooms, extWalls, orientation);
  return closest ? closest.prog : null;
}

function computeRoomCentroid(
  _cad: CadDocument,
  programme: string,
  extWalls: { id: string; start: Vec2; end: Vec2 }[],
): Vec2 | null {
  const roomType = roomFrontageType(programme as RoomProgramme);
  let targetOrientation: FaçadeOrientation | null = null;
  if (roomType === 'public') targetOrientation = 'front';
  else if (roomType === 'service') targetOrientation = 'rear';

  if (!targetOrientation) {
    const orientedCounts: Record<FaçadeOrientation, number> = { front: 0, rear: 0, left: 0, right: 0 };
    for (const w of extWalls) orientedCounts[orientWall(w)]++;
    targetOrientation = (Object.entries(orientedCounts) as [FaçadeOrientation, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  const orientedWalls = extWalls.filter(w => orientWall(w) === targetOrientation);
  if (orientedWalls.length === 0) return null;

  const avgX = orientedWalls.reduce((s, w) => s + (w.start.x + w.end.x) / 2, 0) / orientedWalls.length;
  const avgY = orientedWalls.reduce((s, w) => s + (w.start.y + w.end.y) / 2, 0) / orientedWalls.length;
  return { x: avgX, y: avgY };
}

function findNearestWallByCentroid(
  centroid: Vec2,
  orientation: FaçadeOrientation,
  extWalls: { id: string; start: Vec2; end: Vec2 }[],
): { id: string; start: Vec2; end: Vec2 } | null {
  const oriented = extWalls.filter(w => orientWall(w) === orientation);
  if (oriented.length === 0) return null;

  const axisCoord = orientation === 'front' || orientation === 'rear' ? centroid.x : centroid.y;
  let best = oriented[0];
  let bestDist = Infinity;

  for (const w of oriented) {
    const mid = orientation === 'front' || orientation === 'rear'
      ? (w.start.x + w.end.x) / 2
      : (w.start.y + w.end.y) / 2;
    const d = Math.abs(mid - axisCoord);
    if (d < bestDist) { bestDist = d; best = w; }
  }

  return best;
}

export function mapRoomsToFrontage(cad: CadDocument): FrontageMapping[] {
  const mappings: FrontageMapping[] = [];
  if (!cad.roomProgramme) return mappings;

  const sortedRooms = Object.entries(cad.roomProgramme)
    .map(([rid, prog]) => ({ rid, prog }));
  const extWalls = cad.walls.filter(w => w.structural);

  for (const r of sortedRooms) {
    const orientation = getBestOrientationForRoom(r.prog as RoomProgramme, extWalls);
    const centroid = computeRoomCentroid(cad, r.prog, extWalls);
    let bestWall = centroid
      ? findNearestWallByCentroid(centroid, orientation, extWalls)
      : null;

    if (!bestWall) {
      const oriented = extWalls.filter(w => orientWall(w) === orientation);
      if (oriented.length === 0) continue;
      bestWall = oriented[0];
    }

    const roomOpenings = cad.openings.filter(o => o.wallId === bestWall.id);
    mappings.push({
      roomId: r.rid,
      roomName: r.prog,
      programme: r.prog as RoomProgramme,
      façadeOrientation: orientation,
      wallSegment: { start: bestWall.start, end: bestWall.end },
      openingIds: roomOpenings.map(o => o.id),
    });
  }

  return mappings;
}

export function getEntranceOpening(cad: CadDocument): { openingId: string; x: number; floorId: string } | null {
  if (!cad.roomProgramme) return null;

  const entries = Object.entries(cad.roomProgramme);

  for (const [_roomId, programme] of entries) {
    if (!ENTRANCE_PROGRAMMES.includes(programme)) continue;
    const wall = findWallForRoomByProgramme(cad, programme);
    if (!wall) continue;
    const door = cad.openings.find(o => o.wallId === wall.id && o.kind === 'door');
    if (!door) continue;
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    if (len < 0.01) continue;
    const t = door.offset / len;
    const x = wall.start.x + (wall.end.x - wall.start.x) * t;
    return { openingId: door.id, x, floorId: wall.floorId };
  }

  for (const [_roomId, programme] of entries) {
    if (programme !== 'Living Room') continue;
    const wall = cad.walls.find(w => w.structural && orientWall(w) === 'front');
    if (!wall) continue;
    const door = cad.openings.find(o => o.wallId === wall.id && o.kind === 'door');
    if (!door) continue;
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    if (len < 0.01) continue;
    const t = door.offset / len;
    const x = wall.start.x + (wall.end.x - wall.start.x) * t;
    return { openingId: door.id, x, floorId: wall.floorId };
  }

  return null;
}

function findWallForRoomByProgramme(cad: CadDocument, programme: string): { id: string; start: Vec2; end: Vec2; floorId: string } | null {
  const extWalls = cad.walls.filter(w => w.structural);
  const frontWalls = extWalls.filter(w => orientWall(w) === 'front');

  if (programme === 'Porch' || programme === 'Lobby' || programme === 'Reception') {
    if (frontWalls.length > 0) return frontWalls[0];
  }

  if (programme === 'Hallway' || programme === 'Corridor') {
    const sideWalls = extWalls.filter(w => orientWall(w) === 'left' || orientWall(w) === 'right');
    if (sideWalls.length > 0) return sideWalls[0];
    if (frontWalls.length > 0) return frontWalls[0];
  }

  if (programme === 'Kitchen' || programme === 'Laundry' || programme === 'Utility Room') {
    const rearWalls = extWalls.filter(w => orientWall(w) === 'rear');
    if (rearWalls.length > 0) return rearWalls[0];
  }

  if (frontWalls.length > 0) return frontWalls[0];
  if (extWalls.length > 0) return extWalls[0];
  return null;
}

export function getFrontageTypeForWall(cad: CadDocument, wallId: string): 'public' | 'private' | 'service' | 'unknown' {
  const room = findRoomForWall(cad, wallId);
  if (!room) return 'unknown';
  return roomFrontageType(room as RoomProgramme);
}

export interface RoomFrontagePosition {
  roomId: string;
  roomName: string;
  programme: string;
  frontageOrientation: FaçadeOrientation;
  wallId: string;
  positionOnFacade: number;
  roomWidth: number;
  facadeWidth: number;
  overlapRatio: number;
}

export function computeRoomWidthOnFacade(
  cad: CadDocument,
  roomId: string,
): number {
  if (!cad.roomProgramme) return 0;
  const programme = cad.roomProgramme[roomId];
  if (!programme) return 0;
  const orientation = getBestOrientationForRoom(programme, cad.walls.filter(w => w.structural));
  const extWalls = cad.walls.filter(w => w.structural && orientWall(w) === orientation);
  if (extWalls.length === 0) return 0;

  const orientedWalls = extWalls;
  const roomIdx = Object.keys(cad.roomProgramme).indexOf(roomId);
  const totalRooms = Object.keys(cad.roomProgramme).length;
  const t = totalRooms > 1 ? roomIdx / (totalRooms - 1) : 0.5;

  const wallAtPosition = findWallAtProportion(
    { x: 0, y: 0 }, orientation, orientedWalls, t,
  );
  if (!wallAtPosition) return 0;

  const wall = orientedWalls.find(w => w.id === wallAtPosition.id);
  if (!wall) return 0;

  const wallLen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const roomShare = 1 / totalRooms;
  return wallLen * roomShare;
}

export function computeFrontageOverlap(
  cad: CadDocument,
): RoomFrontagePosition[] {
  const results: RoomFrontagePosition[] = [];
  if (!cad.roomProgramme) return results;

  const sortedRooms = Object.entries(cad.roomProgramme);
  const extWalls = cad.walls.filter(w => w.structural);

  for (const [roomId, programme] of sortedRooms) {
    const orientation = getBestOrientationForRoom(programme as RoomProgramme, extWalls);
    const wall = findWallForRoomByProgramme(cad, programme);
    if (!wall) continue;

    const totalRooms = sortedRooms.length;
    const roomIdx = sortedRooms.findIndex(([id]) => id === roomId);
    const t = totalRooms > 1 ? roomIdx / (totalRooms - 1) : 0.5;

    const orientedWalls = extWalls.filter(w => orientWall(w) === orientation);
    const totalOrientedLength = orientedWalls.reduce((s, w) => s + Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), 0);

    const roomWidth = computeRoomWidthOnFacade(cad, roomId);
    const overlapRatio = totalOrientedLength > 0 ? Math.min(roomWidth / totalOrientedLength, 1) : 0;

    results.push({
      roomId,
      roomName: programme,
      programme,
      frontageOrientation: orientation,
      wallId: wall.id,
      positionOnFacade: t,
      roomWidth,
      facadeWidth: totalOrientedLength,
      overlapRatio,
    });
  }

  return results;
}

export function getRoomPositionOnFacade(
  cad: CadDocument,
  roomId: string,
): number {
  if (!cad.roomProgramme) return 0.5;
  const sorted = Object.keys(cad.roomProgramme).sort();
  const idx = sorted.indexOf(roomId);
  return sorted.length > 1 ? idx / (sorted.length - 1) : 0.5;
}

export { orientWall, roomFrontageType, PUBLIC_FRONTAGE, SERVICE_FRONTAGE };
