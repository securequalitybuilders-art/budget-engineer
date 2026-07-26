export type CirculationType = 'central-hall' | 'side-corridor' | 'front-to-back' | 'open-plan'
export type LivingArrangement = 'front-living' | 'rear-living' | 'split-living' | 'open-great-room'
export type KitchenType = 'front-kitchen' | 'rear-kitchen' | 'central-kitchen' | 'open-kitchen'
export type PrivateArrangement = 'cluster-rear' | 'split-wing' | 'upper-floor' | 'side-wing'
export type MassingType = 'rectangle' | 'l-shape' | 't-shape' | 'courtyard' | 'split-wing'
export type VerandaType = 'front-veranda' | 'wrap-veranda' | 'rear-patio' | 'no-veranda'

export interface VariationProfile {
  circulationType: CirculationType
  livingArrangement: LivingArrangement
  kitchenType: KitchenType
  privateArrangement: PrivateArrangement
  massingType: MassingType
  verandaType: VerandaType
  rotationSeed: number
}

const ALL_CIRCULATION: CirculationType[] = ['central-hall', 'side-corridor', 'front-to-back', 'open-plan']
const ALL_LIVING: LivingArrangement[] = ['front-living', 'rear-living', 'split-living', 'open-great-room']
const ALL_KITCHEN: KitchenType[] = ['front-kitchen', 'rear-kitchen', 'central-kitchen', 'open-kitchen']
const ALL_PRIVATE: PrivateArrangement[] = ['cluster-rear', 'split-wing', 'upper-floor', 'side-wing']
const ALL_MASSING: MassingType[] = ['rectangle', 'l-shape', 't-shape', 'courtyard', 'split-wing']
const ALL_VERANDA: VerandaType[] = ['front-veranda', 'wrap-veranda', 'rear-patio', 'no-veranda']

export function generateVariationProfile(seed: number): VariationProfile {
  const rng = createRng(seed)
  return {
    circulationType: ALL_CIRCULATION[rng() % ALL_CIRCULATION.length],
    livingArrangement: ALL_LIVING[rng() % ALL_LIVING.length],
    kitchenType: ALL_KITCHEN[rng() % ALL_KITCHEN.length],
    privateArrangement: ALL_PRIVATE[rng() % ALL_PRIVATE.length],
    massingType: ALL_MASSING[rng() % ALL_MASSING.length],
    verandaType: ALL_VERANDA[rng() % ALL_VERANDA.length],
    rotationSeed: rng(),
  }
}

function createRng(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return s
  }
}

export function generateProfiles(count: number, baseSeed: number): VariationProfile[] {
  const profiles: VariationProfile[] = []
  const used = new Set<string>()

  for (let i = 0; i < count * 3; i++) {
    if (profiles.length >= count) break
    const profile = generateVariationProfile(baseSeed + i)
    const key = `${profile.circulationType}-${profile.livingArrangement}-${profile.massingType}`
    if (!used.has(key)) {
      used.add(key)
      profiles.push(profile)
    }
  }

  return profiles
}

export function applyVariationToZones(profile: VariationProfile): {
  frontRatio: number
  corridorRatio: number
  rearRatio: number
  corridorWidth: number
} {
  let frontRatio = 0.36
  let corridorRatio = 0.15
  const rearRatio = 0.49
  let corridorWidth = 1.5

  switch (profile.circulationType) {
    case 'central-hall':
      corridorRatio = 0.15
      corridorWidth = 1.5
      break
    case 'side-corridor':
      frontRatio = 0.45
      corridorRatio = 0.10
      corridorWidth = 1.2
      break
    case 'front-to-back':
      frontRatio = 0.10
      corridorRatio = 0.20
      corridorWidth = 1.8
      break
    case 'open-plan':
      corridorRatio = 0.08
      corridorWidth = 1.0
      break
  }

  return { frontRatio, corridorRatio, rearRatio, corridorWidth }
}

// ── Non-Residential Variation ───────────────────────

export type ClinicLayoutType = 'standard-flow' | 'radial-clinic' | 'split-clinic' | 'compact-clinic'
export type SchoolLayoutType = 'linear-classrooms' | 'split-wing-school' | 'courtyard-school' | 'cluster-school'
export type WorshipLayoutType = 'axial-hall' | 'cross-hall' | 'fellowship-hub' | 'multi-purpose'
export type WarehouseLayoutType = 'standard-warehouse' | 'split-warehouse' | 'mezzanine-dominant' | 'linear-warehouse'
export type MixedUseLayoutType = 'podium-tower' | 'street-front' | 'corner-block' | 'linear-commercial'

export interface NonResVariationProfile {
  frontRatio: number
  corridorRatio: number
  rearRatio: number
  useMultiRow: boolean
  clusterWet: boolean
  circulationType: 'centre' | 'side' | 'front'
}

const CLINIC_TYPES: ClinicLayoutType[] = ['standard-flow', 'split-clinic', 'compact-clinic']
const SCHOOL_TYPES: SchoolLayoutType[] = ['linear-classrooms', 'split-wing-school', 'cluster-school']
const WORSHIP_TYPES: WorshipLayoutType[] = ['axial-hall', 'cross-hall', 'fellowship-hub']
const WAREHOUSE_TYPES: WarehouseLayoutType[] = ['standard-warehouse', 'split-warehouse', 'linear-warehouse']
const MIXED_USE_TYPES: MixedUseLayoutType[] = ['podium-tower', 'street-front', 'corner-block']

export function generateNonResVariationProfile(seed: number, typology: string): NonResVariationProfile {
  const rng = createRng(seed + 100)
  const base = { useMultiRow: false, clusterWet: true, circulationType: 'centre' as const }

  switch (typology) {
    case 'clinic': {
      const type = CLINIC_TYPES[rng() % CLINIC_TYPES.length]
      switch (type) {
        case 'standard-flow': return { ...base, frontRatio: 0.30, corridorRatio: 0.12, rearRatio: 0.58 }
        case 'split-clinic': return { ...base, frontRatio: 0.25, corridorRatio: 0.10, rearRatio: 0.65, useMultiRow: true }
        case 'compact-clinic': return { ...base, frontRatio: 0.35, corridorRatio: 0.08, rearRatio: 0.57 }
        default: return { ...base, frontRatio: 0.30, corridorRatio: 0.12, rearRatio: 0.58 }
      }
    }
    case 'school': {
      const type = SCHOOL_TYPES[rng() % SCHOOL_TYPES.length]
      switch (type) {
        case 'linear-classrooms': return { ...base, frontRatio: 0.35, corridorRatio: 0.10, rearRatio: 0.55, circulationType: 'centre' }
        case 'split-wing-school': return { ...base, frontRatio: 0.28, corridorRatio: 0.12, rearRatio: 0.60, circulationType: 'side' }
        case 'cluster-school': return { ...base, frontRatio: 0.40, corridorRatio: 0.08, rearRatio: 0.52, useMultiRow: true }
        default: return { ...base, frontRatio: 0.35, corridorRatio: 0.10, rearRatio: 0.55 }
      }
    }
    case 'worship': {
      const type = WORSHIP_TYPES[rng() % WORSHIP_TYPES.length]
      switch (type) {
        case 'axial-hall': return { ...base, frontRatio: 0.55, corridorRatio: 0.10, rearRatio: 0.35 }
        case 'cross-hall': return { ...base, frontRatio: 0.50, corridorRatio: 0.08, rearRatio: 0.42 }
        case 'fellowship-hub': return { ...base, frontRatio: 0.45, corridorRatio: 0.10, rearRatio: 0.45, clusterWet: false }
        default: return { ...base, frontRatio: 0.50, corridorRatio: 0.10, rearRatio: 0.40 }
      }
    }
    case 'warehouse': {
      const type = WAREHOUSE_TYPES[rng() % WAREHOUSE_TYPES.length]
      switch (type) {
        case 'standard-warehouse': return { ...base, frontRatio: 0.65, corridorRatio: 0.05, rearRatio: 0.30 }
        case 'split-warehouse': return { ...base, frontRatio: 0.50, corridorRatio: 0.10, rearRatio: 0.40, useMultiRow: true }
        case 'linear-warehouse': return { ...base, frontRatio: 0.70, corridorRatio: 0.05, rearRatio: 0.25 }
        default: return { ...base, frontRatio: 0.65, corridorRatio: 0.05, rearRatio: 0.30 }
      }
    }
    case 'mixed-use': {
      const type = MIXED_USE_TYPES[rng() % MIXED_USE_TYPES.length]
      switch (type) {
        case 'podium-tower': return { ...base, frontRatio: 0.40, corridorRatio: 0.10, rearRatio: 0.50, circulationType: 'centre' }
        case 'street-front': return { ...base, frontRatio: 0.50, corridorRatio: 0.08, rearRatio: 0.42, circulationType: 'front' }
        case 'corner-block': return { ...base, frontRatio: 0.45, corridorRatio: 0.10, rearRatio: 0.45, circulationType: 'side' }
        default: return { ...base, frontRatio: 0.45, corridorRatio: 0.10, rearRatio: 0.45 }
      }
    }
    default:
      return { ...base, frontRatio: 0.40, corridorRatio: 0.10, rearRatio: 0.50 }
  }
}
