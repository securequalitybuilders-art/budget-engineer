// ============================================================================
// Stage 45 — Footing Sizing from Design Load
// Sizes RC pad footings from the ULS design load (Stage 43) and the soil's
// allowable bearing capacity:
//     required area A = N* / q_allow      (N* in kN, q in kPa = kN/m²)
//     side  L = ceil(sqrt(A)) rounded up to a practical 50 mm module
// Thickness is taken as a fraction of the side (simple punching-shear proxy),
// floored at 0.30 m. These are early-stage budgeting sizes, clearly labelled.
// ============================================================================

import { BimModel, MaterialSystem } from '../domain/types';
import { computeLoads, LoadCombo } from './loadEngine';
import { RebarSpec, rebarKgPerM2 } from './rebarSpec';

export type SoilClass = 'soft' | 'medium' | 'firm' | 'rock';

export interface SoilType {
  id: SoilClass;
  label: string;
  bearingKpa: number; // allowable bearing pressure (kPa)
}

export const SOIL_TYPES: Record<SoilClass, SoilType> = {
  soft: { id: 'soft', label: 'Soft clay', bearingKpa: 75 },
  medium: { id: 'medium', label: 'Medium clay / loose sand', bearingKpa: 150 },
  firm: { id: 'firm', label: 'Firm / dense sand', bearingKpa: 300 },
  rock: { id: 'rock', label: 'Weathered rock', bearingKpa: 600 },
};

export const DEFAULT_SOIL: SoilClass = 'medium';

export interface SizedFooting {
  index: number;
  loadKn: number;
  requiredAreaM2: number;
  sideM: number;
  thicknessM: number;
  volumeM3: number;
  utilisation: number; // applied pressure / allowable
}

export interface FootingSchedule {
  soil: SoilType;
  combo: LoadCombo;
  columnCount: number;
  perColumnLoadKn: number;
  footings: SizedFooting[];
  totalVolumeM3: number;
}

/** Round a metre value up to the next 50 mm module. */
function moduleUp(m: number): number {
  return Math.ceil(m / 0.05) * 0.05;
}

/**
 * Build a footing schedule. The total ULS vertical load is shared equally over
 * the columns present in the model (or 4 perimeter corners if none yet).
 */
export function sizeFootings(
  bim: BimModel,
  combo: LoadCombo,
  soilId: SoilClass,
): FootingSchedule {
  const soil = SOIL_TYPES[soilId];
  const loads = computeLoads(bim, combo);

  const columns = bim.elements.filter(
    (e) => e.type === 'block' && (e.metadata.ifcClass === 'IfcColumn' || e.cadId.startsWith('col-')),
  );
  const columnCount = Math.max(columns.length, 4); // assume 4 corner pads if none modelled

  const perColumnLoadKn = loads.foundationDesignKn / columnCount;

  const footings: SizedFooting[] = [];
  for (let i = 0; i < columnCount; i++) {
    const N = perColumnLoadKn;
    const requiredAreaM2 = N / soil.bearingKpa;
    const side = Math.max(moduleUp(Math.sqrt(requiredAreaM2)), 0.6); // min 600mm pad
    const thickness = Math.max(moduleUp(side / 3), 0.3);
    const provided = side * side;
    const applied = N / provided;
    footings.push({
      index: i + 1,
      loadKn: round1(N),
      requiredAreaM2: round2(requiredAreaM2),
      sideM: round2(side),
      thicknessM: round2(thickness),
      volumeM3: round2(side * side * thickness),
      utilisation: round2(applied / soil.bearingKpa),
    });
  }

  return {
    soil,
    combo,
    columnCount,
    perColumnLoadKn: round1(perColumnLoadKn),
    footings,
    totalVolumeM3: round2(footings.reduce((s, f) => s + f.volumeM3, 0)),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Foundation excavation & formwork takeoff from the sized schedule.
 *  - Excavation: each pit is the pad plan area enlarged by a 0.30 m working
 *    margin each side, taken to founding depth = pad thickness + 0.15 m blinding/
 *    working allowance.
 *  - Formwork: the four vertical sides of each pad = perimeter × thickness.
 */
export function footingExcavationFormwork(schedule: FootingSchedule): { excavationM3: number; formworkM2: number } {
  let excavationM3 = 0;
  let formworkM2 = 0;
  const MARGIN = 0.3;  // working space each side (m)
  const DEPTH_EXTRA = 0.15; // blinding / working allowance below pad (m)
  for (const f of schedule.footings) {
    const pitSide = f.sideM + MARGIN * 2;
    const pitDepth = f.thicknessM + DEPTH_EXTRA;
    excavationM3 += pitSide * pitSide * pitDepth;
    formworkM2 += 4 * f.sideM * f.thicknessM; // four vertical faces
  }
  return { excavationM3: round2(excavationM3), formworkM2: round2(formworkM2) };
}

/**
 * Reinforcement tonnage for the footing pads. Each pad has a two-way bottom mat
 * sized by the same parametric spec used for slabs (kg/m² of plan area), summed
 * over the schedule. Returns tonnes.
 */
export function footingRebarTonnage(schedule: FootingSchedule, spec: RebarSpec): number {
  const kgPerM2 = rebarKgPerM2(spec);
  const totalPlanArea = schedule.footings.reduce((s, f) => s + f.sideM * f.sideM, 0);
  return round2((totalPlanArea * kgPerM2) / 1000);
}

export const MAT_NOTE: Record<MaterialSystem, string> = {
  concrete: 'RC pad footing (30 MPa)',
  steel: 'RC pad footing under steel base plate',
  timber: 'RC pad footing under timber post base',
};
