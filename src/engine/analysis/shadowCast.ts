import type { Point2D, SunPosition, ShadowPolygon } from '@/domain/site';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

interface BuildingFootprint {
  vertices: Point2D[];
  height: number;
}

function computeShadowVertex(
  vertex: Point2D,
  sunAzimuth: number,
  sunElevation: number,
  height: number
): Point2D {
  const shadowLength = sunElevation > 0
    ? height / Math.tan(toRad(sunElevation))
    : 10000;
  const shadowDx = -shadowLength * Math.sin(toRad(sunAzimuth));
  const shadowDy = -shadowLength * Math.cos(toRad(sunAzimuth));
  return {
    x: vertex.x + shadowDx,
    y: vertex.y + shadowDy,
  };
}

export function computeShadowPolygon(
  building: BuildingFootprint,
  sun: SunPosition,
  time: Date
): ShadowPolygon {
  const shadowVertices = building.vertices.map((v) =>
    computeShadowVertex(v, sun.azimuth, sun.elevation, building.height)
  );

  const allVertices = [...shadowVertices, ...building.vertices];

  const cx = allVertices.reduce((s, v) => s + v.x, 0) / allVertices.length;
  const cy = allVertices.reduce((s, v) => s + v.y, 0) / allVertices.length;

  const sorted = allVertices.sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  const elevation = sun.elevation;
  const opacity = elevation > 0
    ? Math.round(Math.max(0.05, Math.min(0.3, 0.3 - elevation / 300)) * 100) / 100
    : 0;

  return {
    vertices: sorted,
    color: '#1a1a2e',
    opacity,
    time,
  };
}

export function computeDailyShadowStudy(
  building: BuildingFootprint,
  _lat: number,
  _lng: number,
  _date: Date,
  sunPositions: SunPosition[]
): ShadowPolygon[] {
  return sunPositions
    .filter((s) => s.elevation > 0)
    .map((s) => computeShadowPolygon(building, s, s.time));
}

export function computeBuildingHeightFromFloors(floors: number, floorHeight: number = 3): number {
  return floors * floorHeight;
}
