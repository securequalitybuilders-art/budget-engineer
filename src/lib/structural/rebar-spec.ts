export type BarDiameter = 10 | 12 | 16;
export type BarSpacing = 150 | 200 | 250;
export type MeshLayers = 1 | 2;

export interface RebarSpec {
  diameter: BarDiameter;
  spacing: BarSpacing;
  layers: MeshLayers;
}

export const DEFAULT_REBAR_SPEC: RebarSpec = { diameter: 12, spacing: 200, layers: 2 };

const STEEL_DENSITY = 7850;

export function barMassPerMetre(diameterMm: BarDiameter): number {
  const r = diameterMm / 1000 / 2;
  const areaM2 = Math.PI * r * r;
  return STEEL_DENSITY * areaM2;
}

export function rebarKgPerM2(spec: RebarSpec): number {
  const barsPerDirection = 1000 / spec.spacing;
  const lengthPerM2 = barsPerDirection * 1 * 2;
  const massPerM2 = lengthPerM2 * barMassPerMetre(spec.diameter);
  return massPerM2 * spec.layers;
}

export function rebarTonnage(slabAreaM2: number, spec: RebarSpec): number {
  return (slabAreaM2 * rebarKgPerM2(spec)) / 1000;
}

export function describeSpec(spec: RebarSpec): string {
  const layers = spec.layers === 2 ? 'double layer' : 'single layer';
  return `Y${spec.diameter} @ ${spec.spacing} c/c (${layers})`;
}

export const BAR_DIAMETERS: BarDiameter[] = [10, 12, 16];
export const BAR_SPACINGS: BarSpacing[] = [150, 200, 250];
