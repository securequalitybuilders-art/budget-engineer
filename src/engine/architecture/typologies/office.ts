import type { TypologyConstraints } from './types'

export const officeTypologyConstraints: TypologyConstraints = {
  typologyId: 'office-commercial',
  displayName: 'Office / Commercial',
  functionalZoning: {
    zones: [
      {
        patterns: ['open-plan', 'open plan', 'open-plan office', 'bullpen'],
        minAreaPerUnitM2: 10,
        adjacentTo: ['corridor', 'circulation'],
        notAdjacentTo: ['server', 'server room'],
      },
      {
        patterns: ['private office', 'executive', 'director', 'manager'],
        minAreaM2: 12,
        adjacentTo: ['corridor', 'circulation'],
      },
      {
        patterns: ['reception', 'lobby', 'waiting'],
        minAreaM2: 15,
        adjacentTo: ['corridor', 'circulation', 'staircase'],
        minCount: 1,
      },
      {
        patterns: ['server', 'server room', 'it room', 'data room'],
        minAreaM2: 5,
        notAdjacentTo: ['open-plan', 'bathroom', 'toilet', 'kitchen'],
      },
      {
        patterns: ['kitchenette', 'pantry', 'tea room', 'break room'],
        minAreaM2: 6,
        adjacentTo: ['corridor', 'circulation'],
      },
    ],
    separation: [
      ['server', 'server room'],
      ['open-plan', 'open-plan office'],
    ],
    notes: 'SANS 10400 Part O: offices require natural ventilation or mechanical extract. Server room must be climate-controlled.',
  },
  corePlanning: {
    minStairs: 2,
    minElevators: 1,
    minFireEscapes: 1,
    serviceShaftMinAreaM2: 2,
    coreLocation: 'central',
    notes: 'ZBC: multi-storey offices require 2 stairs + 1 lift. Fire escape if >15m above ground. Service shafts ≥2m² (ZIQS SMM).',
  },
  workspaceLayouts: {
    openPlan: { minAreaPerPersonM2: 10, patterns: ['open-plan', 'open plan', 'open-plan office'] },
    private: { minAreaM2: 12, patterns: ['private office', 'executive', 'director', 'manager'] },
    hybrid: { openRatio: 0.6, privateRatio: 0.3, sharedRatio: 0.1 },
    workstationMinWidthM: 1.5,
    notes: 'SANS 10400 Part N: min 10m² per workstation open-plan, 12m² private. Natural light from ≤8m depth from window wall.',
  },
  meetingRooms: {
    types: [
      { name: 'Small Meeting', minAreaM2: 8, maxCapacity: 4, patterns: ['meeting room', 'huddle', 'focus room'] },
      { name: 'Medium Meeting', minAreaM2: 20, maxCapacity: 12, patterns: ['conference room', 'meeting'] },
      { name: 'Large Meeting', minAreaM2: 40, maxCapacity: 25, patterns: ['boardroom', 'auditorium', 'training room'] },
    ],
    notes: 'SANS 10400: min 1.5m² per seated person. Meeting rooms require acoustic separation from open-plan.',
  },
  reception: {
    minAreaM2: 15,
    patterns: ['reception', 'lobby', 'waiting', 'front desk'],
    requiresDirectAccess: true,
    notes: 'Reception must have direct access to main entrance and visible from entry point.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 45,
    fireRatingMinutes: 120,
    minDoorWidthM: 0.9,
    requiresFireDoors: true,
    requiresSprinklers: true,
    notes: 'SANS 10400-W: fire extinguishers 1/200m², hose reels 1/1000m². Grade A fire doors for stair enclosures. Sprinklers for >2000m² or >30m above ground.',
  },
  daylighting: {
    minWindowFaceRatio: 0.15,
    minNaturalLightAreaM2: 10,
    operableWindowPct: 0.3,
    notes: 'SANS 10400 Part O: min 15% window-to-floor ratio for offices. 30% operable for natural ventilation.',
  },
  accessibility: {
    minDoorWidthM: 0.9,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: accessible entrance, corridors ≥1.2m, wheelchair turning circles ≥1.5m. By-Laws Ch4: min door 900mm.',
  },
  structuralGrid: {
    preferredSpanM: 7.2,
    alternativeSpansM: [6.0, 7.5, 8.0],
    maxSpanM: 8.0,
    columnSpacingM: 7.2,
    notes: 'RC frame: 7.2m grid preferred for open-plan flexibility. 6.0m for cellular offices. 8.0m max for standard RC.',
  },
  buildingServices: {
    hvac: true,
    electrical: true,
    plumbing: true,
    fireSuppression: true,
    emergencyLighting: true,
    notes: 'Server room requires dedicated HVAC. Emergency lighting on all exit routes. UPS for server room.',
  },
}
