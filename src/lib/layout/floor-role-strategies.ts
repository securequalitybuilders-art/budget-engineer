import type { LevelProgramme } from './level-programme'

export interface RoomPlacementRule {
  name: string
  preferredZone: 'front' | 'back' | 'left' | 'right' | 'core-adjacent' | 'any'
  minWidth: number
  minDepth: number
  idealAspect: number
  wetCore: boolean
  mustStack: boolean
  exteriorAccess: boolean
}

export interface FloorRoleStrategy {
  floorRole: string
  description: string
  roomRules: RoomPlacementRule[]
  corridorPosition: 'front' | 'centre' | 'rear' | 'none'
  preferredTopology: string[]
  allowTerrace: boolean
  groundEntrance: boolean
  coreRequired: boolean
}

const COMMON_CORE_RULES: RoomPlacementRule[] = [
  { name: 'Stairwell', preferredZone: 'core-adjacent', minWidth: 2.5, minDepth: 3.5, idealAspect: 0.7, wetCore: false, mustStack: true, exteriorAccess: false },
]

function groundPublicRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Lounge', preferredZone: 'front', minWidth: 3.5, minDepth: 4.0, idealAspect: 0.8, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Dining', preferredZone: 'front', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.9, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Kitchen', preferredZone: 'back', minWidth: 2.5, minDepth: 3.0, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Guest WC', preferredZone: 'core-adjacent', minWidth: 1.2, minDepth: 1.5, idealAspect: 0.8, wetCore: true, mustStack: false, exteriorAccess: false },
    { name: 'Entrance Hall', preferredZone: 'front', minWidth: 2.0, minDepth: 2.0, idealAspect: 1.0, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Store', preferredZone: 'back', minWidth: 1.5, minDepth: 1.5, idealAspect: 1.0, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Garage', preferredZone: 'left', minWidth: 3.0, minDepth: 6.0, idealAspect: 0.5, wetCore: false, mustStack: false, exteriorAccess: true },
  ]
}

function upperPrivateRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Master Bedroom', preferredZone: 'front', minWidth: 3.5, minDepth: 4.0, idealAspect: 0.8, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Bedroom 2', preferredZone: 'right', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Bedroom 3', preferredZone: 'left', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Bathroom 1', preferredZone: 'core-adjacent', minWidth: 1.8, minDepth: 2.2, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Bathroom 2', preferredZone: 'core-adjacent', minWidth: 1.8, minDepth: 2.0, idealAspect: 0.9, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Family Lounge', preferredZone: 'back', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Circulation', preferredZone: 'any', minWidth: 1.0, minDepth: 1.0, idealAspect: 0.1, wetCore: false, mustStack: false, exteriorAccess: false },
  ]
}

function podiumRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Lobby', preferredZone: 'front', minWidth: 3.0, minDepth: 4.0, idealAspect: 0.75, wetCore: false, mustStack: true, exteriorAccess: true },
    { name: 'Mail Room', preferredZone: 'core-adjacent', minWidth: 2.0, minDepth: 2.0, idealAspect: 1.0, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Lift Lobby', preferredZone: 'core-adjacent', minWidth: 2.0, minDepth: 2.5, idealAspect: 0.8, wetCore: false, mustStack: true, exteriorAccess: false },
    { name: 'Service Core', preferredZone: 'back', minWidth: 2.0, minDepth: 2.0, idealAspect: 1.0, wetCore: false, mustStack: true, exteriorAccess: false },
    { name: 'Bin Store', preferredZone: 'back', minWidth: 2.0, minDepth: 2.0, idealAspect: 1.0, wetCore: false, mustStack: false, exteriorAccess: true },
  ]
}

function repeatedUnitRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Living / Dining', preferredZone: 'front', minWidth: 4.0, minDepth: 4.5, idealAspect: 0.9, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Kitchen', preferredZone: 'back', minWidth: 2.5, minDepth: 3.0, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Bedroom 1', preferredZone: 'right', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Bedroom 2', preferredZone: 'left', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Bathroom', preferredZone: 'core-adjacent', minWidth: 1.8, minDepth: 2.2, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Balcony', preferredZone: 'front', minWidth: 1.5, minDepth: 3.0, idealAspect: 0.5, wetCore: false, mustStack: false, exteriorAccess: true },
  ]
}

function adminRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Reception', preferredZone: 'front', minWidth: 3.0, minDepth: 4.0, idealAspect: 0.75, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Principal Office', preferredZone: 'right', minWidth: 3.5, minDepth: 4.0, idealAspect: 0.9, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Staff Room', preferredZone: 'back', minWidth: 4.0, minDepth: 4.5, idealAspect: 0.9, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Staff WC', preferredZone: 'core-adjacent', minWidth: 1.5, minDepth: 2.0, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Hall / Assembly', preferredZone: 'front', minWidth: 6.0, minDepth: 8.0, idealAspect: 0.75, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Store', preferredZone: 'back', minWidth: 2.0, minDepth: 2.0, idealAspect: 1.0, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Corridor', preferredZone: 'any', minWidth: 1.5, minDepth: 1.0, idealAspect: 0.1, wetCore: false, mustStack: false, exteriorAccess: false },
  ]
}

function learningBlockRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Classroom 1', preferredZone: 'front', minWidth: 6.0, minDepth: 7.5, idealAspect: 0.8, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Classroom 2', preferredZone: 'right', minWidth: 6.0, minDepth: 7.5, idealAspect: 0.8, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Classroom 3', preferredZone: 'left', minWidth: 6.0, minDepth: 7.5, idealAspect: 0.8, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Resource Room', preferredZone: 'core-adjacent', minWidth: 3.0, minDepth: 4.0, idealAspect: 0.75, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Student WC', preferredZone: 'core-adjacent', minWidth: 2.0, minDepth: 3.0, idealAspect: 0.7, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Corridor', preferredZone: 'any', minWidth: 2.0, minDepth: 1.0, idealAspect: 0.1, wetCore: false, mustStack: false, exteriorAccess: false },
  ]
}

function warehouseRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Warehouse Floor', preferredZone: 'front', minWidth: 10.0, minDepth: 15.0, idealAspect: 0.7, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Loading Bay', preferredZone: 'front', minWidth: 4.0, minDepth: 6.0, idealAspect: 0.7, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Goods In / Out', preferredZone: 'front', minWidth: 3.0, minDepth: 4.0, idealAspect: 0.75, wetCore: false, mustStack: false, exteriorAccess: true },
    { name: 'Staff WC', preferredZone: 'core-adjacent', minWidth: 1.5, minDepth: 2.0, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
  ]
}

function warehouseMezzRules(): RoomPlacementRule[] {
  return [
    ...COMMON_CORE_RULES,
    { name: 'Office 1', preferredZone: 'front', minWidth: 3.5, minDepth: 4.0, idealAspect: 0.9, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Office 2', preferredZone: 'right', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Meeting Room', preferredZone: 'back', minWidth: 3.0, minDepth: 3.5, idealAspect: 0.85, wetCore: false, mustStack: false, exteriorAccess: false },
    { name: 'Kitchenette', preferredZone: 'core-adjacent', minWidth: 2.0, minDepth: 2.5, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Staff WC', preferredZone: 'core-adjacent', minWidth: 1.5, minDepth: 2.0, idealAspect: 0.8, wetCore: true, mustStack: true, exteriorAccess: false },
    { name: 'Corridor', preferredZone: 'any', minWidth: 1.2, minDepth: 1.0, idealAspect: 0.1, wetCore: false, mustStack: false, exteriorAccess: false },
  ]
}

const STRATEGIES: Record<string, FloorRoleStrategy> = {
  'ground-public': {
    floorRole: 'ground-public',
    description: 'Ground floor with public entertaining rooms, service core, and entrance',
    roomRules: groundPublicRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle', 'l-shape', 'split-wing'],
    allowTerrace: true,
    groundEntrance: true,
    coreRequired: true,
  },
  'upper-private': {
    floorRole: 'upper-private',
    description: 'Upper bedroom floor with private bathrooms and family lounge',
    roomRules: upperPrivateRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle', 'l-shape'],
    allowTerrace: true,
    groundEntrance: false,
    coreRequired: true,
  },
  'upper-residential': {
    floorRole: 'upper-residential',
    description: 'Upper private residential floor with separated circulation',
    roomRules: repeatedUnitRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle'],
    allowTerrace: true,
    groundEntrance: false,
    coreRequired: true,
  },
  'podium': {
    floorRole: 'podium',
    description: 'Podium floor with lobby, core, and service spaces',
    roomRules: podiumRules(),
    corridorPosition: 'rear',
    preferredTopology: ['rectangle', 'courtyard'],
    allowTerrace: false,
    groundEntrance: true,
    coreRequired: true,
  },
  'repeated-unit': {
    floorRole: 'repeated-unit',
    description: 'Repeated apartment floor with units around core',
    roomRules: repeatedUnitRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle'],
    allowTerrace: true,
    groundEntrance: false,
    coreRequired: true,
  },
  'admin': {
    floorRole: 'admin',
    description: 'Administrative floor with offices, reception, and assembly',
    roomRules: adminRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle', 'courtyard'],
    allowTerrace: false,
    groundEntrance: true,
    coreRequired: true,
  },
  'learning-block': {
    floorRole: 'learning-block',
    description: 'Classroom floor with multiple learning spaces',
    roomRules: learningBlockRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle', 'split-wing'],
    allowTerrace: false,
    groundEntrance: false,
    coreRequired: true,
  },
  'ground-public-warehouse': {
    floorRole: 'ground-public',
    description: 'Warehouse / logistics floor',
    roomRules: warehouseRules(),
    corridorPosition: 'rear',
    preferredTopology: ['rectangle'],
    allowTerrace: false,
    groundEntrance: true,
    coreRequired: true,
  },
  'mezzanine-office': {
    floorRole: 'mezzanine-office',
    description: 'Office / admin mezzanine above warehouse',
    roomRules: warehouseMezzRules(),
    corridorPosition: 'centre',
    preferredTopology: ['rectangle'],
    allowTerrace: false,
    groundEntrance: false,
    coreRequired: true,
  },
}

export function getFloorRoleStrategy(programme: LevelProgramme): FloorRoleStrategy {
  const key = programme.floorRole
  if (key === 'ground-public' && programme.programmeTags.includes('logistics')) {
    return STRATEGIES['ground-public-warehouse']
  }
  return STRATEGIES[key] ?? STRATEGIES['ground-public']
}

export function getRoomPlacementRules(programme: LevelProgramme): RoomPlacementRule[] {
  const strategy = getFloorRoleStrategy(programme)
  return strategy.roomRules
}

export function getPreferredTopology(programme: LevelProgramme): string[] {
  const strategy = getFloorRoleStrategy(programme)
  return strategy.preferredTopology
}
