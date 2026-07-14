export type FloorRole = 'podium' | 'ground-public' | 'upper-private' | 'upper-residential' | 'repeated-unit' | 'service-roof' | 'parking' | 'mezzanine-office' | 'admin' | 'assembly' | 'learning-block'

export interface LevelProgramme {
  levelIndex: number
  floorRole: FloorRole
  label: string
  programmeTags: string[]
  roomAllocations: { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[]
  isGround: boolean
  isRoof: boolean
  isPublic: boolean
  isPrivate: boolean
  isService: boolean
  slabType: string
}

export interface ProgrammeProfile {
  typology: string
  storeyCount: number
  levels: LevelProgramme[]
}

function groundPublicRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Lounge', required: true, zone: 'public' },
    { name: 'Dining', required: true, zone: 'public' },
    { name: 'Kitchen', required: true, zone: 'service' },
    { name: 'Guest WC', required: false, zone: 'service' },
    { name: 'Entrance Hall', required: true, zone: 'circulation' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
    { name: 'Store', required: false, zone: 'service' },
  ]
}

function upperPrivateRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Master Bedroom', required: true, zone: 'private' },
    { name: 'Bedroom 2', required: true, zone: 'private' },
    { name: 'Bedroom 3', required: false, zone: 'private' },
    { name: 'Bathroom 1', required: true, zone: 'private' },
    { name: 'Bathroom 2', required: false, zone: 'private' },
    { name: 'Family Lounge', required: false, zone: 'private' },
    { name: 'Circulation', required: true, zone: 'circulation' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
  ]
}

function apartmentPodiumRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Lobby', required: true, zone: 'circulation' },
    { name: 'Mail Room', required: false, zone: 'service' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
    { name: 'Lift Lobby', required: true, zone: 'circulation' },
    { name: 'Service Core', required: true, zone: 'service' },
    { name: 'Bin Store', required: false, zone: 'service' },
  ]
}

function apartmentUnitRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Living / Dining', required: true, zone: 'public' },
    { name: 'Kitchen', required: true, zone: 'service' },
    { name: 'Bedroom 1', required: true, zone: 'private' },
    { name: 'Bedroom 2', required: false, zone: 'private' },
    { name: 'Bathroom', required: true, zone: 'private' },
    { name: 'Balcony', required: false, zone: 'public' },
  ]
}

function mixedUsePodiumRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Retail Space', required: true, zone: 'public' },
    { name: 'Retail Storage', required: false, zone: 'service' },
    { name: 'Public Lobby', required: true, zone: 'circulation' },
    { name: 'Residential Lobby', required: true, zone: 'circulation' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
    { name: 'Service Corridor', required: true, zone: 'service' },
    { name: 'Bin / Service Store', required: false, zone: 'service' },
  ]
}

function schoolAdminRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Reception', required: true, zone: 'public' },
    { name: 'Principal Office', required: true, zone: 'private' },
    { name: 'Staff Room', required: true, zone: 'service' },
    { name: 'Staff WC', required: true, zone: 'service' },
    { name: 'Hall / Assembly', required: true, zone: 'public' },
    { name: 'Store', required: false, zone: 'service' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
    { name: 'Corridor', required: true, zone: 'circulation' },
  ]
}

function schoolClassrooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Classroom 1', required: true, zone: 'public' },
    { name: 'Classroom 2', required: true, zone: 'public' },
    { name: 'Classroom 3', required: false, zone: 'public' },
    { name: 'Resource Room', required: false, zone: 'service' },
    { name: 'Student WC', required: true, zone: 'service' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
    { name: 'Corridor', required: true, zone: 'circulation' },
  ]
}

function warehouseFloorRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Warehouse Floor', required: true, zone: 'service' },
    { name: 'Loading Bay', required: true, zone: 'service' },
    { name: 'Goods In / Out', required: true, zone: 'service' },
    { name: 'Staff WC', required: true, zone: 'service' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
  ]
}

function warehouseMezzanineRooms(): { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[] {
  return [
    { name: 'Office 1', required: true, zone: 'private' },
    { name: 'Office 2', required: false, zone: 'private' },
    { name: 'Meeting Room', required: false, zone: 'public' },
    { name: 'Kitchenette', required: true, zone: 'service' },
    { name: 'Staff WC', required: true, zone: 'service' },
    { name: 'Stairwell', required: true, zone: 'circulation' },
    { name: 'Corridor', required: true, zone: 'circulation' },
  ]
}

function getSlabType(levelIndex: number, storeyCount: number, floorRole: string): string {
  if (levelIndex === 0) return 'slab-on-grade'
  if (levelIndex === storeyCount - 1 && floorRole === 'service-roof') return 'roof-slab-lightweight'
  if (levelIndex === storeyCount - 1) return 'roof-slab'
  if (floorRole === 'parking') return 'suspended-heavy'
  return 'suspended'
}

function getSlabThickness(slabType: string): number {
  switch (slabType) {
    case 'slab-on-grade': return 0.15
    case 'roof-slab-lightweight': return 0.12
    case 'roof-slab': return 0.18
    case 'suspended-heavy': return 0.25
    default: return 0.15
  }
}

export function computeLevelProgrammes(typology: string, storeyCount: number): ProgrammeProfile {
  const levels: LevelProgramme[] = []

  for (let i = 0; i < storeyCount; i++) {
    const isGround = i === 0
    const isRoof = i === storeyCount - 1
    let floorRole: FloorRole
    let label: string
    let programmeTags: string[]
    let roomAllocations: { name: string; required: boolean; zone: 'public' | 'private' | 'service' | 'circulation' }[]

    switch (typology) {
      case 'house':
      case 'villa':
      case 'residential':
        if (isGround) {
          floorRole = 'ground-public'
          label = 'Ground Floor'
          programmeTags = ['public', 'entertaining', 'service']
          roomAllocations = groundPublicRooms()
        } else if (isRoof) {
          floorRole = 'upper-private'
          label = `Floor ${i + 1} — Bedrooms`
          programmeTags = ['private', 'sleeping', 'bathrooms']
          roomAllocations = upperPrivateRooms()
        } else {
          floorRole = 'upper-private'
          label = `Floor ${i + 1} — Bedrooms`
          programmeTags = ['private', 'sleeping', 'bathrooms']
          roomAllocations = upperPrivateRooms()
        }
        if (isGround && storeyCount === 1) {
          roomAllocations = [...groundPublicRooms(), ...upperPrivateRooms().filter(r => !r.name.includes('Stairwell'))]
        }
        break

      case 'duplex':
      case 'townhouse':
        if (isGround) {
          floorRole = 'ground-public'
          label = 'Ground Floor — Living'
          programmeTags = ['public', 'living', 'kitchen', 'party-wall']
          roomAllocations = groundPublicRooms()
        } else {
          floorRole = 'upper-private'
          label = `Floor ${i + 1} — Bedrooms`
          programmeTags = ['private', 'sleeping', 'bathrooms', 'party-wall']
          roomAllocations = upperPrivateRooms()
        }
        break

      case 'apartment':
        if (isGround) {
          floorRole = 'podium'
          label = 'Ground Floor — Lobby / Core'
          programmeTags = ['circulation', 'service', 'core']
          roomAllocations = apartmentPodiumRooms()
        } else {
          floorRole = 'repeated-unit'
          label = `Floor ${i + 1} — Apartments`
          programmeTags = ['residential', 'repeated', 'core']
          roomAllocations = apartmentUnitRooms()
        }
        break

      case 'mixed-use':
        if (isGround) {
          floorRole = 'podium'
          label = 'Ground Floor — Retail / Public'
          programmeTags = ['retail', 'public', 'service', 'separated-circulation']
          roomAllocations = mixedUsePodiumRooms()
        } else {
          floorRole = 'upper-residential'
          label = `Floor ${i + 1} — Residential`
          programmeTags = ['residential', 'private', 'separated-circulation']
          roomAllocations = apartmentUnitRooms()
        }
        break

      case 'school':
      case 'institutional':
        if (isGround) {
          floorRole = 'admin'
          label = 'Ground Floor — Admin / Assembly'
          programmeTags = ['admin', 'assembly', 'circulation']
          roomAllocations = schoolAdminRooms()
        } else {
          floorRole = 'learning-block'
          label = `Floor ${i + 1} — Classrooms`
          programmeTags = ['learning', 'classrooms', 'circulation']
          roomAllocations = schoolClassrooms()
        }
        break

      case 'warehouse':
        if (isGround) {
          floorRole = 'ground-public'
          label = 'Warehouse Floor'
          programmeTags = ['storage', 'logistics', 'service']
          roomAllocations = warehouseFloorRooms()
        } else {
          floorRole = 'mezzanine-office'
          label = `Floor ${i + 1} — Office / Admin`
          programmeTags = ['office', 'admin', 'service']
          roomAllocations = warehouseMezzanineRooms()
        }
        break

      case 'clinic':
      case 'commercial':
      case 'office':
      case 'worship':
      default:
        if (isGround) {
          floorRole = 'ground-public'
          label = 'Ground Floor'
          programmeTags = ['public', 'circulation']
          roomAllocations = groundPublicRooms()
        } else {
          floorRole = 'upper-private'
          label = `Floor ${i + 1}`
          programmeTags = ['private', 'circulation']
          roomAllocations = upperPrivateRooms()
        }
        break
    }

    const slabType = getSlabType(i, storeyCount, floorRole)

    levels.push({
      levelIndex: i,
      floorRole,
      label,
      programmeTags,
      roomAllocations,
      isGround,
      isRoof,
      isPublic: programmeTags.includes('public') || programmeTags.includes('retail'),
      isPrivate: programmeTags.includes('private') || programmeTags.includes('sleeping'),
      isService: programmeTags.includes('service') || programmeTags.includes('logistics'),
      slabType,
    })
  }

  return { typology, storeyCount, levels }
}

function getRoomWeight(name: string, typology: string): number {
  // Typology-specific room weightings for more natural proportions
  if (typology === 'clinic') {
    if (name.includes('Consultation')) return 1.5
    if (name.includes('Waiting') || name.includes('Reception')) return 1.3
    if (name.includes('Treatment')) return 1.2
    if (name.includes('Circulation') || name.includes('Corridor')) return 0.6
    return 1.0
  }
  if (typology === 'school') {
    if (name.includes('Classroom')) return 1.6
    if (name.includes('Assembly') || name.includes('Hall')) return 1.8
    if (name.includes('Corridor')) return 0.5
    if (name.includes('WC') || name.includes('Toilet')) return 0.7
    return 1.0
  }
  if (typology === 'worship') {
    if (name.includes('Hall') || name.includes('Sanctuary')) return 2.5
    if (name.includes('Fellowship')) return 1.3
    if (name.includes('Kitchen')) return 1.0
    if (name.includes('Office')) return 0.8
    return 1.0
  }
  if (typology === 'warehouse') {
    if (name.includes('Warehouse')) return 3.0
    if (name.includes('Loading')) return 1.2
    return 1.0
  }
  if (typology === 'mixed-use') {
    if (name.includes('Retail')) return 1.8
    if (name.includes('Lobby')) return 0.8
    if (name.includes('Corridor')) return 0.6
    return 1.0
  }
  if (typology === 'apartment') {
    if (name.includes('Living') || name.includes('Dining')) return 1.3
    if (name.includes('Bedroom')) return 1.1
    if (name.includes('Balcony')) return 0.5
    return 1.0
  }
  // Residential defaults
  if (name.includes('Lounge') || name.includes('Living')) return 1.3
  if (name.includes('Master')) return 1.3
  if (name.includes('Bedroom')) return 1.1
  if (name.includes('Circulation') || name.includes('Corridor')) return 0.5
  if (name.includes('Store')) return 0.6
  if (name.includes('Laundry')) return 0.5
  if (name.includes('Veranda')) return 0.7
  return 1.0
}

export function getAllocationProgramme(profile: ProgrammeProfile, levelIndex: number): { name: string; ratio: number }[] {
  const level = profile.levels[levelIndex]
  if (!level) return [{ name: 'Default Room', ratio: 1 }]

  const allocations = level.roomAllocations
  if (allocations.length === 0) return [{ name: 'Default Room', ratio: 1 }]

  const weights = allocations.map(r => getRoomWeight(r.name, profile.typology))
  const weightSum = weights.reduce((s, w) => s + w, 0)

  if (weightSum <= 0) {
    return allocations.map(r => ({ name: r.name, ratio: 1 / allocations.length }))
  }

  return allocations.map((r, i) => ({
    name: r.name,
    ratio: weights[i] / weightSum,
  }))
}

export function getLevelLabel(profile: ProgrammeProfile, levelIndex: number): string {
  return profile.levels[levelIndex]?.label ?? `Level ${levelIndex + 1}`
}

export function getLevelSlabType(profile: ProgrammeProfile, levelIndex: number): string {
  return profile.levels[levelIndex]?.slabType ?? 'suspended'
}

export function getLevelSlabThickness(profile: ProgrammeProfile, levelIndex: number): number {
  return getSlabThickness(getLevelSlabType(profile, levelIndex))
}

export function getLevelFloorRole(profile: ProgrammeProfile, levelIndex: number): FloorRole {
  return profile.levels[levelIndex]?.floorRole ?? 'upper-private'
}
