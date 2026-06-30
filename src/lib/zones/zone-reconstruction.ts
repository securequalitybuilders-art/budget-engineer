import type { CadDocument } from '../../domain/cad';
import type { BimRoomZone } from '../../domain/bim';

export function reconstructRoomZones(cad: CadDocument): BimRoomZone[] {
  const zones: BimRoomZone[] = [];

  for (const floor of cad.floors) {
    const floorWalls = cad.walls.filter((w) => w.floorId === floor.id);
    const verticals = floorWalls.filter((w) => almostEqual(w.start.x, w.end.x));
    const horizontals = floorWalls.filter((w) => almostEqual(w.start.y, w.end.y));

    const xs = uniqueSorted(verticals.map((w) => w.start.x));
    const ys = uniqueSorted(horizontals.map((w) => w.start.y));

    if (xs.length >= 2 && ys.length >= 2) {
      for (let ix = 0; ix < xs.length - 1; ix++) {
        for (let iy = 0; iy < ys.length - 1; iy++) {
          const x1 = xs[ix];
          const x2 = xs[ix + 1];
          const y1 = ys[iy];
          const y2 = ys[iy + 1];
          const width = x2 - x1;
          const depth = y2 - y1;
          if (width < 1 || depth < 1) continue;
          zones.push({
            id: `zone-${floor.id}-${ix}-${iy}`,
            projectId: cad.projectId,
            floorId: floor.id,
            name: `Room ${ix + 1}.${iy + 1}`,
            ifcClass: 'IfcSpace',
            material: 'zone',
            properties: {
              purpose: 'reconstructed-room-zone',
              area: Number((width * depth).toFixed(2)),
              width: Number(width.toFixed(2)),
              depth: Number(depth.toFixed(2)),
            },
            type: 'roomZone',
            origin: { x: x1 + 0.12, y: floor.elevation, z: y1 + 0.12 },
            width: Math.max(0.3, width - 0.24),
            depth: Math.max(0.3, depth - 0.24),
            height: 2.8,
            quantityRefs: [`QTO-ZONE-${floor.id}-${ix}-${iy}`],
          });
        }
      }
    }
  }

  return zones;
}

function uniqueSorted(values: number[]) {
  return Array.from(new Set(values.map((v) => Number(v.toFixed(4))))).sort((a, b) => a - b);
}
function almostEqual(a: number, b: number, eps = 0.0001) {
  return Math.abs(a - b) < eps;
}
