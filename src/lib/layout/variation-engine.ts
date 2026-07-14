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
