import type { CadDocument, FaçadeOrientation, RoomProgramme, Vec2 } from '@/domain/ws6-types';
import { roomFrontageType, orientWall } from './frontage-mapper';

export interface FaçadeSegmentInfo {
  id: string;
  orientation: FaçadeOrientation;
  length: number;
  attachedRooms: string[];
  roomProgrammes: RoomProgramme[];
  openingCount: number;
  entranceWeight: number;
  hierarchyRole: 'public' | 'private' | 'service' | 'entry';
  wallId: string;
  floorId: string;
  startX: number;
  endX: number;
}

export interface FaçadeSegmentCollection {
  orientation: FaçadeOrientation;
  segments: FaçadeSegmentInfo[];
  totalLength: number;
  dominantRole: 'public' | 'private' | 'service' | 'entry';
  primaryProgrammes: RoomProgramme[];
}

function computeRoomCentroid(
  cad: CadDocument,
  roomProgramme: string,
): Vec2 | null {
  const programmeRooms = Object.entries(cad.roomProgramme ?? {})
    .filter(([, p]) => p === roomProgramme);
  if (programmeRooms.length === 0) return null;

  const extWalls = cad.walls.filter(w => w.structural);
  if (extWalls.length === 0) return null;

  const orientedCounts: Record<FaçadeOrientation, number> = {
    front: 0, rear: 0, left: 0, right: 0,
  };

  for (const wall of extWalls) {
    const o = orientWall(wall);
    orientedCounts[o]++;
  }

  const primaryOrientation = (Object.entries(orientedCounts) as [FaçadeOrientation, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const roomType = roomFrontageType(roomProgramme as RoomProgramme);
  let targetOrientation: FaçadeOrientation = primaryOrientation;

  if (roomType === 'public') targetOrientation = 'front';
  else if (roomType === 'service') targetOrientation = 'rear';

  const orientedWalls = extWalls.filter(w => orientWall(w) === targetOrientation);
  if (orientedWalls.length === 0) {
    const allWalls = extWalls.filter(w => orientWall(w) === primaryOrientation);
    if (allWalls.length === 0) return null;
    const avgX = allWalls.reduce((s, w) => s + (w.start.x + w.end.x) / 2, 0) / allWalls.length;
    const avgY = allWalls.reduce((s, w) => s + (w.start.y + w.end.y) / 2, 0) / allWalls.length;
    return { x: avgX, y: avgY };
  }

  const avgX = orientedWalls.reduce((s, w) => s + (w.start.x + w.end.x) / 2, 0) / orientedWalls.length;
  const avgY = orientedWalls.reduce((s, w) => s + (w.start.y + w.end.y) / 2, 0) / orientedWalls.length;
  return { x: avgX, y: avgY };
}

function findWallSegmentForRoomCentroid(
  centroid: Vec2,
  orientation: FaçadeOrientation,
  orientedWalls: { id: string; start: Vec2; end: Vec2 }[],
  allWalls: { id: string; start: Vec2; end: Vec2 }[],
  programme?: string,
): { id: string } | null {
  if (orientedWalls.length === 0) return null;

  const naturalOrient = getNaturalOrientationForProgramme(programme);

  if (naturalOrient && naturalOrient !== orientation) {
    const naturalWalls = allWalls.filter(w => orientWall(w) === naturalOrient);
    if (naturalWalls.length > 0) return null;
  }

  const sorted = [...orientedWalls].sort((a, b) => {
    const ma = (a.start.x + a.end.x) / 2;
    const mb = (b.start.x + b.end.x) / 2;
    return ma - mb;
  });

  const axisCoord = orientation === 'front' || orientation === 'rear' ? centroid.x : centroid.y;
  let best = sorted[0];
  let bestDist = Infinity;

  for (const w of sorted) {
    const mid = (w.start.x + w.end.x) / 2;
    const d = Math.abs(mid - axisCoord);
    if (d < bestDist) { bestDist = d; best = w; }
  }

  return best;
}

function getNaturalOrientationForProgramme(programme?: string): FaçadeOrientation | null {
  if (!programme) return null;
  const publicProgrammes = ['Living Room', 'Reception', 'Lobby', 'Porch', 'Hallway', 'Family Room', 'Lounge', 'Open Plan', 'Dining Room', 'Dining Area', 'Meeting Room'];
  const serviceProgrammes = ['Kitchen', 'Laundry', 'Utility Room', 'Store Room', 'Plant Room', 'Pantry', 'Bathroom', 'W/C', 'Ensuite', 'Garage', 'Commercial Kitchen', 'Stock Room', 'Storage'];
  if (publicProgrammes.includes(programme)) return 'front';
  if (serviceProgrammes.includes(programme)) return 'rear';
  return null;
}

export function collectFaçadeSegments(
  cad: CadDocument,
  orientation: FaçadeOrientation,
): FaçadeSegmentCollection {
  const extWalls = cad.walls.filter(w => w.structural);
  const orientedWalls = extWalls.filter(w => orientWall(w) === orientation);

  const segments: FaçadeSegmentInfo[] = orientedWalls.map(w => {
    const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
    const wallOpenings = cad.openings.filter(o => o.wallId === w.id);
    const rooms: string[] = [];
    const programmes: RoomProgramme[] = [];

    if (cad.roomProgramme) {
      for (const [rid, prog] of Object.entries(cad.roomProgramme)) {
        const centroid = computeRoomCentroid(cad, prog);
        if (!centroid) continue;
        const bestWall = findWallSegmentForRoomCentroid(centroid, orientation, orientedWalls, extWalls, prog);
        if (bestWall && bestWall.id === w.id) {
          rooms.push(rid);
          programmes.push(prog as RoomProgramme);
        }
      }
    }

    const hasEntryRoom = programmes.some(p => {
      return ['Living Room', 'Reception', 'Lobby', 'Porch', 'Hallway'].includes(p);
    });
    const entranceWeight = wallOpenings.some(o => o.kind === 'door' && hasEntryRoom) ? 3
      : wallOpenings.length > 0 ? 1 : 0;

    const roles = programmes.map(p => roomFrontageType(p));
    let hierarchyRole: FaçadeSegmentInfo['hierarchyRole'] = 'private';
    if (entranceWeight >= 3) hierarchyRole = 'entry';
    else if (roles.includes('public')) hierarchyRole = 'public';
    else if (roles.includes('service')) hierarchyRole = 'service';

    return {
      id: w.id,
      orientation,
      length: len,
      attachedRooms: rooms,
      roomProgrammes: programmes,
      openingCount: wallOpenings.length,
      entranceWeight,
      hierarchyRole,
      wallId: w.id,
      floorId: w.floorId,
      startX: orientation === 'front' || orientation === 'rear' ? Math.min(w.start.x, w.end.x) : Math.min(w.start.y, w.end.y),
      endX: orientation === 'front' || orientation === 'rear' ? Math.max(w.start.x, w.end.x) : Math.max(w.start.y, w.end.y),
    };
  });

  const totalLength = segments.reduce((s, seg) => s + seg.length, 0);
  const roleCounts: Record<string, number> = {};
  const progSet = new Set<RoomProgramme>();
  for (const seg of segments) {
    roleCounts[seg.hierarchyRole] = (roleCounts[seg.hierarchyRole] || 0) + 1;
    for (const p of seg.roomProgrammes) progSet.add(p);
  }

  const sortedRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  const dominantRole = (sortedRoles.length > 0 ? sortedRoles[0][0] : 'private') as FaçadeSegmentCollection['dominantRole'];

  return {
    orientation,
    segments,
    totalLength,
    dominantRole,
    primaryProgrammes: [...progSet],
  };
}
