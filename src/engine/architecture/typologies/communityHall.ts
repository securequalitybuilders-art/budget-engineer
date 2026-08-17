import type { TypologyConstraints } from './types'

export const communityHallTypologyConstraints: TypologyConstraints = {
  typologyId: 'community-hall',
  displayName: 'Community Hall',
  functionalZoning: {
    zones: [
      {
        patterns: ['main hall', 'assembly hall'],
        minAreaM2: 120,
        adjacentTo: ['stage', 'platform', 'entrance', 'corridor'],
        minCount: 1,
      },
      {
        patterns: ['stage', 'platform'],
        minAreaM2: 20,
        adjacentTo: ['main hall', 'assembly hall'],
      },
      {
        patterns: ['kitchen', 'catering'],
        minAreaM2: 12,
        adjacentTo: ['main hall', 'store'],
      },
      {
        patterns: ['toilet', 'ablution'],
        minAreaM2: 10,
        adjacentTo: ['corridor', 'entrance'],
        minCount: 2,
      },
    ],
    separation: [
      ['toilet', 'ablution'],
      ['main hall'],
    ],
    notes: 'ZBC Part 4: assembly occupancy. Kitchen separated from hall by fire-resistant partition. Toilet blocks external or buffered.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
  },
  workspaceLayouts: {
    private: { minAreaM2: 8, patterns: ['office', 'admin'] },
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 10,
    patterns: ['foyer', 'entrance', 'lobby', 'vestibule'],
    requiresDirectAccess: true,
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 30,
    fireRatingMinutes: 60,
    minDoorWidthM: 1.2,
    notes: 'ZBC Part 4: assembly. Min 2 exits. Exit width per occupant load. Doors open outward.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 10,
    operableWindowPct: 0.3,
  },
  accessibility: {
    minDoorWidthM: 1.2,
    minCorridorWidthM: 1.5,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: assembly buildings fully accessible. Stage access ramp.',
  },
  structuralGrid: {
    preferredSpanM: 8.0,
    alternativeSpansM: [10.0, 12.0],
    maxSpanM: 12.0,
    notes: 'Clear span hall. Steel truss or RC beam. 8m minimum for multi-purpose use.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    emergencyLighting: true,
    notes: 'Sound system provisions. Emergency lighting on exits. No HVAC required.',
  },
}
