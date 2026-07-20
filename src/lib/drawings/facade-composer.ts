import type { TypologyFaçadeRules, FaçadeComposition } from '@/domain/ws6-types';
import { computeFaçadeComposition, mapRoomsToFrontage, getEntranceOpening } from './frontage-mapper';

const TYPOLOGY_RULES: Record<string, TypologyFaçadeRules> = {
  'compact house': {
    typology: 'compact house', hasPlinth: true, plinthHeight: 0.3,
    parapetType: 'none', eavesDepthMm: 40, fasciaDepthMm: 30,
    balconyLikelihood: 0, entranceEmphasis: 'moderate',
    symmetryWeight: 0.6, materialZones: [], columnRhythmSpacing: null,
  },
  'family house': {
    typology: 'family house', hasPlinth: true, plinthHeight: 0.45,
    parapetType: 'none', eavesDepthMm: 50, fasciaDepthMm: 35,
    balconyLikelihood: 0.3, entranceEmphasis: 'strong',
    symmetryWeight: 0.7, materialZones: [
      { from: 0, to: 1.2, material: 'face-brick' },
    ],
    columnRhythmSpacing: 4,
  },
  'villa': {
    typology: 'villa', hasPlinth: true, plinthHeight: 0.6,
    parapetType: 'none', eavesDepthMm: 60, fasciaDepthMm: 40,
    balconyLikelihood: 0.7, entranceEmphasis: 'strong',
    symmetryWeight: 0.9, materialZones: [
      { from: 0, to: 0.6, material: 'stone-cladding' },
      { from: 0.6, to: 2.4, material: 'render' },
    ],
    columnRhythmSpacing: 3,
  },
  'duplex': {
    typology: 'duplex', hasPlinth: true, plinthHeight: 0.3,
    parapetType: 'none', eavesDepthMm: 45, fasciaDepthMm: 30,
    balconyLikelihood: 0.2, entranceEmphasis: 'moderate',
    symmetryWeight: 0.8, materialZones: [],
    columnRhythmSpacing: null,
  },
  'apartment block': {
    typology: 'apartment block', hasPlinth: true, plinthHeight: 0.3,
    parapetType: 'flat', eavesDepthMm: 30, fasciaDepthMm: 25,
    balconyLikelihood: 0.5, entranceEmphasis: 'strong',
    symmetryWeight: 0.8, materialZones: [],
    columnRhythmSpacing: 6,
  },
  'mixed-use building': {
    typology: 'mixed-use building', hasPlinth: true, plinthHeight: 0.3,
    parapetType: 'flat', eavesDepthMm: 30, fasciaDepthMm: 25,
    balconyLikelihood: 0.3, entranceEmphasis: 'strong',
    symmetryWeight: 0.6, materialZones: [
      { from: 0, to: 4.0, material: 'commercial-glazing' },
    ],
    columnRhythmSpacing: 6,
  },
  'clinic': {
    typology: 'clinic', hasPlinth: false, plinthHeight: 0,
    parapetType: 'flat', eavesDepthMm: 30, fasciaDepthMm: 25,
    balconyLikelihood: 0, entranceEmphasis: 'moderate',
    symmetryWeight: 0.7, materialZones: [],
    columnRhythmSpacing: null,
  },
  'school': {
    typology: 'school', hasPlinth: true, plinthHeight: 0.3,
    parapetType: 'flat', eavesDepthMm: 40, fasciaDepthMm: 30,
    balconyLikelihood: 0, entranceEmphasis: 'moderate',
    symmetryWeight: 0.5, materialZones: [],
    columnRhythmSpacing: 7,
  },
  'warehouse/industrial': {
    typology: 'warehouse/industrial', hasPlinth: false, plinthHeight: 0,
    parapetType: 'flat', eavesDepthMm: 20, fasciaDepthMm: 20,
    balconyLikelihood: 0, entranceEmphasis: 'moderate',
    symmetryWeight: 0.4, materialZones: [
      { from: 0, to: 1.5, material: 'blockwork' },
    ],
    columnRhythmSpacing: 6,
  },
  'worship/community hall': {
    typology: 'worship/community hall', hasPlinth: true, plinthHeight: 0.45,
    parapetType: 'stepped', eavesDepthMm: 60, fasciaDepthMm: 45,
    balconyLikelihood: 0, entranceEmphasis: 'strong',
    symmetryWeight: 1.0, materialZones: [
      { from: 0, to: 1.5, material: 'stone-cladding' },
    ],
    columnRhythmSpacing: 4,
  },
  'retail': {
    typology: 'retail', hasPlinth: true, plinthHeight: 0.15,
    parapetType: 'flat', eavesDepthMm: 20, fasciaDepthMm: 20,
    balconyLikelihood: 0, entranceEmphasis: 'strong',
    symmetryWeight: 0.5, materialZones: [
      { from: 0, to: 3.0, material: 'commercial-glazing' },
    ],
    columnRhythmSpacing: null,
  },
  'office': {
    typology: 'office', hasPlinth: true, plinthHeight: 0.3,
    parapetType: 'flat', eavesDepthMm: 30, fasciaDepthMm: 25,
    balconyLikelihood: 0, entranceEmphasis: 'moderate',
    symmetryWeight: 0.7, materialZones: [
      { from: 0, to: 1.2, material: 'stone-cladding' },
    ],
    columnRhythmSpacing: 4,
  },
};

export function getTypologyRules(typology?: string): TypologyFaçadeRules {
  if (!typology) return TYPOLOGY_RULES['family house'];
  const key = typology.toLowerCase().trim();
  return TYPOLOGY_RULES[key] ?? TYPOLOGY_RULES['family house'];
}

export { computeFaçadeComposition, mapRoomsToFrontage, getEntranceOpening };

export interface FaçadeArticulation {
  hasPlinth: boolean;
  plinthY: number;
  plinthHeight: number;
  parapetType: 'flat' | 'stepped' | 'none';
  eavesDepthPx: number;
  fasciaDepthPx: number;
  entranceX: number | null;
  syncWeight: number;
  materialZoneLabels: string[];
  typologyClass: string;
  hasBalcony: boolean;
  hasVerandah: boolean;
  hasPodium: boolean;
  hasUpperFloorSetback: boolean;
  dominantFrontageType: 'public' | 'private' | 'service' | 'mixed';
  entranceRecessed: boolean;
  sideElevationNarrow: boolean;
}

export function buildFaçadeArticulation(
  comp: FaçadeComposition,
  rules: TypologyFaçadeRules,
  sx: (coord: number) => number,
): FaçadeArticulation {
  const typ = rules.typology;
  const isVilla = typ.includes('villa');
  const isApartment = typ.includes('apartment');
  const isMixedUse = typ.includes('mixed-use');
  const isIndustrial = typ.includes('warehouse') || typ.includes('industrial');
  const isWorship = typ.includes('worship');
  const isInstitutional = typ.includes('clinic') || typ.includes('school') || typ.includes('office');
  const isHouse = typ.includes('family') || typ.includes('compact');

  const segRoles = comp.segments.flatMap(s => {
    if (s.entranceWeight >= 3) return ['entry' as const];
    const hasPublic = s.rooms.some(r => ['Living Room', 'Reception', 'Lobby', 'Family Room', 'Lounge', 'Open Plan', 'Dining Room'].includes(r));
    const hasService = s.rooms.some(r => ['Kitchen', 'Laundry', 'Bathroom', 'Store Room', 'Garage', 'Utility Room'].includes(r));
    if (hasPublic) return ['public' as const];
    if (hasService) return ['service' as const];
    return ['private' as const];
  });

  const publicCount = segRoles.filter(r => r === 'public' || r === 'entry').length;
  const serviceCount = segRoles.filter(r => r === 'service').length;
  let dominantFrontageType: FaçadeArticulation['dominantFrontageType'] = 'private';
  if (publicCount > serviceCount && publicCount > 0) dominantFrontageType = 'public';
  else if (serviceCount > publicCount && serviceCount > 0) dominantFrontageType = 'service';
  else if (publicCount === serviceCount && publicCount > 0) dominantFrontageType = 'mixed';

  return {
    hasPlinth: rules.hasPlinth,
    plinthY: rules.plinthHeight > 0 ? comp.totalHeight - rules.plinthHeight : 0,
    plinthHeight: rules.plinthHeight,
    parapetType: rules.parapetType,
    eavesDepthPx: rules.eavesDepthMm,
    fasciaDepthPx: rules.fasciaDepthMm,
    entranceX: comp.entranceX != null ? sx(comp.entranceX) : null,
    syncWeight: rules.symmetryWeight,
    materialZoneLabels: rules.materialZones.map(z => z.material),
    typologyClass: isVilla ? 'villa' : isApartment ? 'apartment' : isMixedUse ? 'mixed-use' : isIndustrial ? 'industrial' : isWorship ? 'worship' : isInstitutional ? 'institutional' : isHouse ? 'house' : 'general',
    hasBalcony: rules.balconyLikelihood > 0,
    hasVerandah: isVilla || isWorship,
    hasPodium: isApartment || isMixedUse,
    hasUpperFloorSetback: isMixedUse || isIndustrial,
    dominantFrontageType,
    entranceRecessed: !isHouse && !isWorship,
    sideElevationNarrow: comp.width < 6,
  };
}
