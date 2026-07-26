// Source: WS5 (engine/boqGenerator.ts — materialRates, store/appStore.ts — IFC class mapping)
// Purpose: Material-variant rate tables and IFC class mappings for structural systems
// Status: Staged for future integration — not wired into any store or UI

import type { MaterialRates, StructuralMaterial } from './structural-types';

/**
 * Rate tables per structural material system.
 * Keys are material types; rates cover all BOQ categories.
 */
export const materialRateTable: Record<StructuralMaterial, MaterialRates> = {
  concrete: {
    wall_m2: 85, slab_m2: 110, roof_m2: 75,
    opening_each: 250, object_each: 120,
    column_each: 450, beam_m: 220, footing_m3: 380,
    mep_elec: 65, mep_plumb: 180, rebar_tonne: 1200,
  },
  steel: {
    wall_m2: 120, slab_m2: 140, roof_m2: 95,
    opening_each: 250, object_each: 120,
    column_each: 680, beam_m: 350, footing_m3: 280,
    mep_elec: 65, mep_plumb: 180, rebar_tonne: 1200,
  },
  timber: {
    wall_m2: 65, slab_m2: 85, roof_m2: 55,
    opening_each: 250, object_each: 120,
    column_each: 320, beam_m: 180, footing_m3: 450,
    mep_elec: 65, mep_plumb: 180, rebar_tonne: 1200,
  },
};

/**
 * Get material rates for a given material, falling back to concrete.
 */
export function getMaterialRates(material: StructuralMaterial | string): MaterialRates {
  return materialRateTable[material as StructuralMaterial] ?? materialRateTable.concrete;
}

/**
 * IFC class mapping per structural material for each element type.
 */
export const ifcClassMaterialMap: Record<StructuralMaterial, { wall: string; beam: string; column: string; footing: string }> = {
  concrete: { wall: 'IfcWallStandardCase', beam: 'IfcBeam', column: 'IfcColumn', footing: 'IfcFooting' },
  steel: { wall: 'IfcWallStandardCase', beam: 'IfcBeam', column: 'IfcColumn', footing: 'IfcFooting' },
  timber: { wall: 'IfcWallStandardCase', beam: 'IfcBeam', column: 'IfcColumn', footing: 'IfcFooting' },
};

/**
 * Get IFC class for a given material and element type.
 */
export function getIfcClass(material: StructuralMaterial, elementType: 'wall' | 'beam' | 'column' | 'footing'): string {
  return ifcClassMaterialMap[material]?.[elementType] ?? 'IfcBuildingElementProxy';
}
