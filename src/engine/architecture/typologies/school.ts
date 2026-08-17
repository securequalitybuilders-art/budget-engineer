import type { TypologyConstraints } from './types'

export const schoolTypologyConstraints: TypologyConstraints = {
  typologyId: 'school-classroom',
  displayName: 'School / Classroom Block',
  functionalZoning: {
    zones: [
      {
        patterns: ['classroom'],
        minAreaM2: 42,
        adjacentTo: ['corridor', 'circulation'],
        minCount: 4,
      },
      {
        patterns: ['staff room', 'staff office'],
        minAreaM2: 20,
        adjacentTo: ['corridor', 'circulation'],
      },
      {
        patterns: ['library', 'resource centre'],
        minAreaM2: 40,
        adjacentTo: ['corridor', 'circulation'],
      },
      {
        patterns: ['toilet', 'ablution', 'latrine'],
        minAreaM2: 8,
        adjacentTo: ['corridor'],
        minCount: 2,
      },
    ],
    separation: [
      ['toilet', 'ablution', 'latrine'],
      ['classroom'],
    ],
    notes: 'ZBC Part 3: min 1.1m² per learner. Classrooms require natural light from left-hand side. Toilet blocks separated from teaching areas.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Single-storey default. Staircase for 2-storey blocks. No lift in schools.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 20, patterns: ['staff room', 'head\'s office', 'office'] },
    notes: 'Staff room min 20m². Head\'s office min 12m².',
  },
  meetingRooms: {
    types: [
      { name: 'Staff Meeting', minAreaM2: 20, maxCapacity: 15, patterns: ['staff room'] },
    ],
  },
  reception: {
    minAreaM2: 15,
    patterns: ['office', 'head\'s office', 'admin', 'reception'],
    requiresDirectAccess: true,
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 45,
    fireRatingMinutes: 60,
    minDoorWidthM: 1.0,
    notes: 'ZBC Part 3: assembly occupancy. Min 2 exits from each classroom block. Doors open outward.',
  },
  daylighting: {
    minWindowFaceRatio: 0.2,
    minNaturalLightAreaM2: 8,
    operableWindowPct: 0.5,
    notes: 'ZBC Part 3: min 20% window-to-floor for classrooms. Windows on left-hand side of desks. Cross-ventilation.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: accessible entrance and toilet for disabled learners. Corridors ≥1.5m.',
  },
  structuralGrid: {
    preferredSpanM: 7.5,
    alternativeSpansM: [6.0],
    maxSpanM: 7.5,
    notes: 'Masonry or RC frame: 7.5m span for classroom width. Standard classroom 7m × 6m.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    notes: 'Water tanks for rural schools. Solar backup recommended. Emergency lighting not required.',
  },
}
