import type { RoomRect } from '@/domain/plan'

export type { RoomRect } from '@/domain/plan'

export type ConstraintSeverity = 'error' | 'warning' | 'info'
export type ConstraintDomain =
  | 'functionalZoning'
  | 'corePlanning'
  | 'workspaceLayouts'
  | 'meetingRooms'
  | 'reception'
  | 'emergencyExits'
  | 'daylighting'
  | 'accessibility'
  | 'structuralGrid'
  | 'buildingServices'

export interface ZoneRequirement {
  patterns: string[]
  minCount?: number
  minAreaM2?: number
  maxAreaM2?: number
  minAreaPerUnitM2?: number
  adjacentTo?: string[]
  notAdjacentTo?: string[]
  separateFloor?: boolean
}

export interface FunctionalZoningConstraint {
  zones: ZoneRequirement[]
  separation?: string[][]
  notes?: string
}

export interface CorePlanningConstraint {
  minStairs: number
  minElevators: number
  minFireEscapes?: number
  serviceShaftMinAreaM2?: number
  coreLocation?: 'central' | 'side' | 'dual' | 'any'
  notes?: string
}

export interface WorkspaceLayoutConstraint {
  openPlan?: { minAreaPerPersonM2: number; patterns: string[] }
  private?: { minAreaM2: number; patterns: string[] }
  hybrid?: { openRatio: number; privateRatio: number; sharedRatio: number }
  workstationMinWidthM?: number
  notes?: string
}

export interface MeetingRoomConstraint {
  types: Array<{
    name: string
    minAreaM2: number
    maxCapacity?: number
    patterns: string[]
  }>
  notes?: string
}

export interface ReceptionConstraint {
  minAreaM2?: number
  patterns: string[]
  requiresDirectAccess?: boolean
  notes?: string
}

export interface EmergencyExitConstraint {
  minExits: number
  maxTravelDistanceM: number
  fireRatingMinutes: number
  minDoorWidthM: number
  requiresFireDoors?: boolean
  requiresSprinklers?: boolean
  notes?: string
}

export interface DaylightingConstraint {
  minWindowFaceRatio: number
  minNaturalLightAreaM2?: number
  operableWindowPct?: number
  notes?: string
}

export interface AccessibilityConstraint {
  minDoorWidthM: number
  minCorridorWidthM: number
  wheelchairTurningDiameterM?: number
  accessibleWc?: boolean
  rampRequired?: boolean
  notes?: string
}

export interface StructuralGridConstraint {
  preferredSpanM: number
  alternativeSpansM?: number[]
  maxSpanM: number
  columnSpacingM?: number
  notes?: string
}

export interface BuildingServicesConstraint {
  hvac?: boolean
  electrical?: boolean
  plumbing?: boolean
  fireSuppression?: boolean
  emergencyLighting?: boolean
  notes?: string
}

export interface TypologyConstraints {
  typologyId: string
  displayName: string
  functionalZoning: FunctionalZoningConstraint
  corePlanning: CorePlanningConstraint
  workspaceLayouts: WorkspaceLayoutConstraint
  meetingRooms: MeetingRoomConstraint
  reception: ReceptionConstraint
  emergencyExits: EmergencyExitConstraint
  daylighting: DaylightingConstraint
  accessibility: AccessibilityConstraint
  structuralGrid: StructuralGridConstraint
  buildingServices: BuildingServicesConstraint
}

export interface ConstraintFinding {
  domain: ConstraintDomain
  severity: ConstraintSeverity
  rule: string
  message: string
  roomIds?: string[]
  actual?: number
  expected?: number | string
}

export interface ConstraintEvaluation {
  typologyId: string
  passed: boolean
  score: number
  findings: ConstraintFinding[]
  summary: {
    totalRules: number
    errors: number
    warnings: number
    info: number
    passed: number
  }
}

export interface ConstraintEvaluatorInput {
  rooms: RoomRect[]
  totalWidth: number
  totalHeight: number
  buildingType?: string
}
