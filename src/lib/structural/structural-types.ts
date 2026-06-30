// Source: WS5
// Purpose: Type definitions for structural engineering algorithms (rebar, material, columns/beams/footings)
// Status: Staged for future integration — not wired into any store or UI

export type BarSize = 'Y10' | 'Y12' | 'Y16';
export type BarSpacing = 150 | 200 | 250;
export type BarLayers = 1 | 2;

export interface RebarSpec {
  barSize: BarSize;
  spacing: BarSpacing;
  layers: BarLayers;
}

export type StructuralMaterial = 'concrete' | 'steel' | 'timber';

export interface MaterialRates {
  wall_m2: number;
  slab_m2: number;
  roof_m2: number;
  opening_each: number;
  object_each: number;
  column_each: number;
  beam_m: number;
  footing_m3: number;
  mep_elec: number;
  mep_plumb: number;
  rebar_tonne: number;
}

export interface SimpleWall {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  structural?: boolean;
}

export interface SimpleBlock {
  id: string;
  position: { x: number; y: number };
  kind: string;
}

export interface ColumnPlacement {
  position: { x: number; y: number };
  material: StructuralMaterial;
}

export interface BeamConnection {
  start: { x: number; y: number };
  end: { x: number; y: number };
  material: StructuralMaterial;
}

export interface FootingPlacement {
  position: { x: number; y: number };
  width: number;
  depth: number;
  material: StructuralMaterial;
}
