// ============================================================================
// Stage 43 — Load Combination Factors
// Computes dead (G) and live (Q) loads from the BIM model, then applies
// load combinations for limit-state structural design:
//   - Service (SLS):   1.0·G + 1.0·Q   (deflection / serviceability)
//   - Ultimate (ULS):  1.2·G + 1.5·Q   (strength design, e.g. AS/NZ, EC, BS)
// Loads accumulate roof → slabs → walls/columns → footings (vertical chain).
// All values are estimates for early-stage budgeting, clearly labelled.
// ============================================================================

import { BimModel, MaterialSystem } from '../domain/types';

export type LoadCombo = 'service' | 'ultimate';

export interface LoadFactors {
  dead: number;
  live: number;
  label: string;
}

export const LOAD_COMBINATIONS: Record<LoadCombo, LoadFactors> = {
  service: { dead: 1.0, live: 1.0, label: 'Service (SLS) · 1.0G + 1.0Q' },
  ultimate: { dead: 1.2, live: 1.5, label: 'Ultimate (ULS) · 1.2G + 1.5Q' },
};

// material self-weight surcharge factor on dead load (concrete heaviest)
const MAT_WEIGHT: Record<MaterialSystem, number> = { concrete: 1.0, steel: 0.55, timber: 0.4 };

// characteristic loads (kN/m²)
const SLAB_DEAD_KPA = 4.8;   // 200mm RC slab + finishes self-weight
const ROOF_DEAD_KPA = 1.2;   // lightweight roof
const FLOOR_LIVE_KPA = 1.5;  // residential imposed
const ROOF_LIVE_KPA = 0.6;   // roof access/maintenance

export interface ElementLoad {
  id: string;
  name: string;
  type: string;
  deadKn: number;
  liveKn: number;
  designKn: number; // factored per selected combination
}

export interface LoadResult {
  combo: LoadCombo;
  factors: LoadFactors;
  elements: ElementLoad[];
  totalDeadKn: number;
  totalLiveKn: number;
  totalDesignKn: number;
  foundationDesignKn: number; // total vertical load to footings
}

export function computeLoads(bim: BimModel, combo: LoadCombo): LoadResult {
  const f = LOAD_COMBINATIONS[combo];
  const matWeight = MAT_WEIGHT[(bim.elements.find((e) => e.metadata.material)?.metadata.material) ?? 'concrete'];
  const elements: ElementLoad[] = [];

  for (const el of bim.elements) {
    let deadKn = 0;
    let liveKn = 0;

    if (el.type === 'slab') {
      const area = el.area ?? 0;
      deadKn = area * SLAB_DEAD_KPA * matWeight;
      liveKn = area * FLOOR_LIVE_KPA;
    } else if (el.type === 'roof') {
      const area = el.area ?? 0;
      deadKn = area * ROOF_DEAD_KPA * matWeight;
      liveKn = area * ROOF_LIVE_KPA;
    } else if (el.type === 'wall') {
      // wall self-weight: area × ~2.4 kN/m² (200mm masonry) scaled by material
      deadKn = (el.area ?? 0) * 2.4 * matWeight;
      liveKn = 0;
    } else {
      continue;
    }

    const designKn = f.dead * deadKn + f.live * liveKn;
    elements.push({
      id: el.id, name: el.name, type: el.type,
      deadKn: round1(deadKn), liveKn: round1(liveKn), designKn: round1(designKn),
    });
  }

  const totalDeadKn = round1(elements.reduce((s, e) => s + e.deadKn, 0));
  const totalLiveKn = round1(elements.reduce((s, e) => s + e.liveKn, 0));
  const totalDesignKn = round1(elements.reduce((s, e) => s + e.designKn, 0));

  return {
    combo, factors: f, elements,
    totalDeadKn, totalLiveKn, totalDesignKn,
    foundationDesignKn: totalDesignKn, // all vertical load arrives at footings
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
