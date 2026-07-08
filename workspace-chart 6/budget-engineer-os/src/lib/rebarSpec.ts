// ============================================================================
// Stage 42 — Rebar Spec Override
// Genuine reinforcement steel-mass computation from bar diameter + spacing,
// replacing the fixed 18 kg/m² assumption with a parametric schedule.
// ============================================================================

export type BarDiameter = 10 | 12 | 16;       // Y10 / Y12 / Y16 (mm)
export type BarSpacing = 150 | 200 | 250;     // c/c (mm)
export type MeshLayers = 1 | 2;               // single or double layer

export interface RebarSpec {
  diameter: BarDiameter;
  spacing: BarSpacing;
  layers: MeshLayers;
}

export const DEFAULT_REBAR_SPEC: RebarSpec = { diameter: 12, spacing: 200, layers: 2 };

// Steel density 7850 kg/m³. Unit mass per metre of bar = ρ × cross-sectional area.
const STEEL_DENSITY = 7850; // kg/m³

/** Mass per metre (kg/m) for a given bar diameter. e.g. Y12 ≈ 0.888 kg/m */
export function barMassPerMetre(diameterMm: BarDiameter): number {
  const r = diameterMm / 1000 / 2;          // radius in metres
  const areaM2 = Math.PI * r * r;           // cross-section m²
  return STEEL_DENSITY * areaM2;            // kg per metre
}

/**
 * Reinforcement mass per square metre of slab for a two-way mesh.
 * Bars run in BOTH directions. For one square metre, the number of bars in
 * one direction = 1000 / spacing(mm); each is ~1 m long. Two directions, then
 * multiplied by the number of layers.
 */
export function rebarKgPerM2(spec: RebarSpec): number {
  const barsPerDirection = 1000 / spec.spacing;     // bars across 1 m
  const lengthPerM2 = barsPerDirection * 1 * 2;     // both directions, ~1 m each
  const massPerM2 = lengthPerM2 * barMassPerMetre(spec.diameter);
  return massPerM2 * spec.layers;
}

/** Total reinforcement tonnage for a slab area. */
export function rebarTonnage(slabAreaM2: number, spec: RebarSpec): number {
  return (slabAreaM2 * rebarKgPerM2(spec)) / 1000;
}

export function describeSpec(spec: RebarSpec): string {
  const layers = spec.layers === 2 ? 'double layer' : 'single layer';
  return `Y${spec.diameter} @ ${spec.spacing} c/c (${layers})`;
}

export const BAR_DIAMETERS: BarDiameter[] = [10, 12, 16];
export const BAR_SPACINGS: BarSpacing[] = [150, 200, 250];
