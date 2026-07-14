import type { BuildingChassis } from '../layout/vertical-chassis'

export type SlabType = 'slab-on-grade' | 'suspended' | 'suspended-heavy' | 'roof-slab' | 'roof-slab-lightweight'
export type SlabMaterial = 'reinforced-concrete' | 'post-tensioned-concrete' | 'composite-deck' | 'timber-joist' | 'hollowcore'
export type FloorFinish = 'tile' | 'polished-concrete' | 'timber' | 'vinyl' | 'carpet' | 'industrial-seal' | 'green-roof'

export interface SlabSpec {
  slabType: SlabType
  thickness: number
  material: SlabMaterial
  finish: FloorFinish
  reinforcement: string
  insulation: boolean
  waterproofing: boolean
  spanning: 'one-way' | 'two-way' | 'flat-plate'
  maxSpan: number
  loadingClass: 'domestic' | 'commercial' | 'industrial' | 'parking' | 'roof'
  uValue: number
}

export interface LevelSlabAssignment {
  levelIndex: number
  slabSpec: SlabSpec
  isGround: boolean
  isRoof: boolean
  label: string
}

const SLAB_SPECS: Record<SlabType, (storeyCount: number) => SlabSpec> = {
  'slab-on-grade': (_sc) => ({
    slabType: 'slab-on-grade',
    thickness: 0.15,
    material: 'reinforced-concrete',
    finish: 'polished-concrete',
    reinforcement: 'A142 mesh',
    insulation: false,
    waterproofing: true,
    spanning: 'two-way',
    maxSpan: 4.0,
    loadingClass: 'domestic',
    uValue: 0.25,
  }),
  'suspended': (sc) => ({
    slabType: 'suspended',
    thickness: sc > 4 ? 0.18 : 0.15,
    material: sc > 4 ? 'post-tensioned-concrete' : 'reinforced-concrete',
    finish: 'tile',
    reinforcement: sc > 4 ? 'T12@150 B1' : 'A193 mesh',
    insulation: true,
    waterproofing: false,
    spanning: sc > 4 ? 'flat-plate' : 'two-way',
    maxSpan: sc > 4 ? 8.0 : 6.0,
    loadingClass: 'domestic',
    uValue: 0.30,
  }),
  'suspended-heavy': (_sc) => ({
    slabType: 'suspended-heavy',
    thickness: 0.25,
    material: 'reinforced-concrete',
    finish: 'industrial-seal',
    reinforcement: 'T16@150 B2',
    insulation: false,
    waterproofing: false,
    spanning: 'one-way',
    maxSpan: 6.0,
    loadingClass: 'industrial',
    uValue: 0.40,
  }),
  'roof-slab': (_sc) => ({
    slabType: 'roof-slab',
    thickness: 0.18,
    material: 'reinforced-concrete',
    finish: 'polished-concrete',
    reinforcement: 'A193 mesh',
    insulation: true,
    waterproofing: true,
    spanning: 'two-way',
    maxSpan: 5.0,
    loadingClass: 'roof',
    uValue: 0.20,
  }),
  'roof-slab-lightweight': (_sc) => ({
    slabType: 'roof-slab-lightweight',
    thickness: 0.12,
    material: 'composite-deck',
    finish: 'polished-concrete',
    reinforcement: 'A142 mesh',
    insulation: true,
    waterproofing: true,
    spanning: 'one-way',
    maxSpan: 3.5,
    loadingClass: 'roof',
    uValue: 0.18,
  }),
}

export function getSlabSpec(slabType: string, storeyCount: number): SlabSpec {
  const spec = SLAB_SPECS[slabType as SlabType]
  if (!spec) return SLAB_SPECS['suspended'](storeyCount)
  return spec(storeyCount)
}

export function determineLevelSlab(
  levelIndex: number,
  storeyCount: number,
  chassis: BuildingChassis,
): SlabSpec {
  if (levelIndex === 0) {
    return getSlabSpec('slab-on-grade', storeyCount)
  }
  if (levelIndex === storeyCount - 1) {
    if (chassis.floorSystem === 'timber-joist') {
      return getSlabSpec('roof-slab-lightweight', storeyCount)
    }
    return getSlabSpec('roof-slab', storeyCount)
  }

  const floorSystem = chassis.floorSystem
  switch (floorSystem) {
    case 'two-way-slab':
    case 'flat-plate':
      return getSlabSpec('suspended', storeyCount)
    case 'ribbed':
    case 'one-way-slab':
      return getSlabSpec('suspended-heavy', storeyCount)
    case 'timber-joist':
      return getSlabSpec('suspended', storeyCount)
    default:
      return getSlabSpec('suspended', storeyCount)
  }
}

export function assignLevelSlabs(chassis: BuildingChassis): LevelSlabAssignment[] {
  const assignments: LevelSlabAssignment[] = []
  for (let i = 0; i < chassis.storeyCount; i++) {
    const slabSpec = determineLevelSlab(i, chassis.storeyCount, chassis)
    const level = chassis.levels[i]
    assignments.push({
      levelIndex: i,
      slabSpec,
      isGround: level?.isGround ?? i === 0,
      isRoof: level?.isRoof ?? i === chassis.storeyCount - 1,
      label: level?.isGround ? 'Ground Slab' : level?.isRoof ? 'Roof Slab' : `Floor ${i + 1} Slab`,
    })
  }
  return assignments
}
