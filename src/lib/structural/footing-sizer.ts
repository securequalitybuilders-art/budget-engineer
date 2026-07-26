import { BimModel, MaterialSystem } from '@/domain/ws6-types';
import { computeLoads, LoadCombo } from './load-engine';
import { RebarSpec, rebarKgPerM2 } from './rebar-spec';

export type SoilClass = 'soft' | 'medium' | 'firm' | 'rock';

export interface SoilType {
  id: SoilClass;
  label: string;
  bearingKpa: number;
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
  utilisation: number;
}

export interface FootingSchedule {
  soil: SoilType;
  combo: LoadCombo;
  columnCount: number;
  perColumnLoadKn: number;
  footings: SizedFooting[];
  totalVolumeM3: number;
}

function moduleUp(m: number): number {
  return Math.ceil(m / 0.05) * 0.05;
}

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
  const columnCount = Math.max(columns.length, 4);

  const perColumnLoadKn = loads.foundationDesignKn / columnCount;

  const footings: SizedFooting[] = [];
  for (let i = 0; i < columnCount; i++) {
    const N = perColumnLoadKn;
    const requiredAreaM2 = N / soil.bearingKpa;
    const side = Math.max(moduleUp(Math.sqrt(requiredAreaM2)), 0.6);
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

export function footingExcavationFormwork(schedule: FootingSchedule): { excavationM3: number; formworkM2: number } {
  let excavationM3 = 0;
  let formworkM2 = 0;
  const MARGIN = 0.3;
  const DEPTH_EXTRA = 0.15;
  for (const f of schedule.footings) {
    const pitSide = f.sideM + MARGIN * 2;
    const pitDepth = f.thicknessM + DEPTH_EXTRA;
    excavationM3 += pitSide * pitSide * pitDepth;
    formworkM2 += 4 * f.sideM * f.thicknessM;
  }
  return { excavationM3: round2(excavationM3), formworkM2: round2(formworkM2) };
}

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
