import {
  generateResidentialFamily,
  generateResidentialVilla,
  generateDuplexLayout,
} from './typologies/residential'
import {
  generateClinicLayout,
  generateSchoolLayout,
  generateRetailLayout,
  generateMixedUseLayout,
  generateWarehouseLayout,
  generateWorshipLayout,
  generateApartmentLayout,
} from './typologies/non-residential'
import {
  generateZonedLayout,
} from '../geometry/plan-intelligence'
import { generateVariationProfile, applyVariationToZones } from './variation-engine'

export type BuildingTypology =
  | 'house'
  | 'apartment'
  | 'townhouse'
  | 'clinic'
  | 'school'
  | 'commercial'
  | 'office'
  | 'mixed-use'
  | 'duplex'
  | 'warehouse'
  | 'worship'
  | 'other'

export interface TypologyStrategy {
  id: BuildingTypology
  name: string
  generate: (
    program: { name: string; ratio: number }[],
    width: number,
    height: number,
    seed?: number,
  ) => { id: string; name: string; x: number; y: number; width: number; height: number }[]
}

function isCompactHouse(program: { name: string; ratio: number }[], area: number): boolean {
  const bedrooms = program.filter(r => r.name.includes('Bedroom')).length
  return area <= 100 || bedrooms <= 2
}

function isVillaHouse(program: { name: string; ratio: number }[], area: number): boolean {
  const bedrooms = program.filter(r => r.name.includes('Bedroom') || r.name.includes('Master')).length
  return area >= 150 || bedrooms >= 4
}

const STRATEGIES: Record<string, TypologyStrategy> = {
  'house': {
    id: 'house',
    name: 'Residential',
    generate: (program, width, height, seed = 0) => {
      const area = width * height
      if (isCompactHouse(program, area)) {
        const profile = generateVariationProfile(seed)
        const zones = applyVariationToZones(profile)
        return generateZonedLayout({
          program,
          width,
          height,
          corridorWidth: zones.corridorWidth,
        })
      }
      if (isVillaHouse(program, area)) {
        return generateResidentialVilla(program, width, height)
      }
      return generateResidentialFamily(program, width, height)
    },
  },
  'apartment': {
    id: 'apartment',
    name: 'Apartment',
    generate: (program, width, height) => generateApartmentLayout(program, width, height),
  },
  'townhouse': {
    id: 'townhouse',
    name: 'Townhouse',
    generate: (program, width, height) => generateZonedLayout({ program, width, height }),
  },
  'clinic': {
    id: 'clinic',
    name: 'Clinic',
    generate: (program, width, height) => generateClinicLayout(program, width, height),
  },
  'school': {
    id: 'school',
    name: 'School',
    generate: (program, width, height) => generateSchoolLayout(program, width, height),
  },
  'commercial': {
    id: 'commercial',
    name: 'Commercial / Retail',
    generate: (program, width, height) => generateRetailLayout(program, width, height),
  },
  'office': {
    id: 'office',
    name: 'Office',
    generate: (program, width, height) => generateRetailLayout(program, width, height),
  },
  'mixed-use': {
    id: 'mixed-use',
    name: 'Mixed-Use',
    generate: (program, width, height) => generateMixedUseLayout(program, width, height),
  },
  'duplex': {
    id: 'duplex',
    name: 'Duplex / Semi-Detached',
    generate: (program, width, height) => generateDuplexLayout(program, width, height),
  },
  'warehouse': {
    id: 'warehouse',
    name: 'Warehouse + Office',
    generate: (program, width, height) => generateWarehouseLayout(program, width, height),
  },
  'worship': {
    id: 'worship',
    name: 'Worship / Community Hall',
    generate: (program, width, height) => generateWorshipLayout(program, width, height),
  },
  'other': {
    id: 'other',
    name: 'General',
    generate: (program, width, height) => generateZonedLayout({ program, width, height }),
  },
}

export function getStrategy(buildingType: string): TypologyStrategy {
  const normalized = buildingType?.toLowerCase().trim() || 'house'
  const keys = Object.keys(STRATEGIES)
  for (const key of keys) {
    if (normalized === key) return STRATEGIES[key]
    if (normalized.includes(key) || key.includes(normalized)) return STRATEGIES[key]
  }
  return STRATEGIES['house']
}

export function generateLayoutByTypology(
  buildingType: string,
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const strategy = getStrategy(buildingType)
  return strategy.generate(program, width, height, seed)
}
