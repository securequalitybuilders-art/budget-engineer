import type { TypologyConstraints } from './types'

export const mixedUseTypologyConstraints: TypologyConstraints = {
  typologyId: 'mixed-use',
  displayName: 'Mixed-Use (Commercial + Residential)',
  functionalZoning: {
    zones: [
      {
        patterns: ['shop', 'retail', 'commercial'],
        minAreaM2: 50,
        adjacentTo: ['entrance', 'street'],
        separateFloor: true,
        minCount: 1,
      },
      {
        patterns: ['apartment', 'unit', 'residential', 'flat'],
        minAreaM2: 45,
        adjacentTo: ['corridor', 'circulation', 'staircase'],
        separateFloor: true,
        minCount: 1,
      },
      {
        patterns: ['lobby', 'shared entrance'],
        minAreaM2: 10,
        adjacentTo: ['staircase', 'lift'],
      },
    ],
    separation: [
      ['shop', 'retail', 'commercial'],
      ['apartment', 'unit', 'residential'],
    ],
    notes: 'ZBC Part 5/2: mixed occupancy. Ground-floor retail, upper residential. Fire separation between commercial and residential. Separate entrances recommended.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Staircase serving upper residential. Lift if >3 storeys.',
  },
  workspaceLayouts: {
    openPlan: { minAreaPerPersonM2: 8, patterns: ['shop', 'retail', 'commercial'] },
    private: { minAreaM2: 45, patterns: ['apartment', 'unit', 'residential', 'flat'] },
    notes: 'Shop: 8m² per staff. Apartment: min 45m² per unit.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 10,
    patterns: ['lobby', 'shared entrance', 'entrance hall'],
    requiresDirectAccess: true,
    notes: 'Separate entrances for commercial and residential recommended.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 30,
    fireRatingMinutes: 60,
    minDoorWidthM: 0.9,
    requiresFireDoors: true,
    notes: 'ZBC Part 5/2: 60-min fire separation between occupancies. Each occupancy requires its own exit route.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 5,
    operableWindowPct: 0.3,
    notes: 'Each occupancy requires natural light. Commercial ground floor may use display windows.',
  },
  accessibility: {
    minDoorWidthM: 0.9,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    notes: 'SANS 10400 Part S: commercial floor accessible. Upper residential min 10% accessible.',
  },
  structuralGrid: {
    preferredSpanM: 6.0,
    alternativeSpansM: [5.0, 7.2],
    maxSpanM: 7.2,
    columnSpacingM: 6.0,
    notes: 'RC frame: 6.0m grid for unit stacking above commercial ground floor.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    fireSuppression: true,
    emergencyLighting: true,
    notes: 'Separate plumbing stacks for commercial and residential. Fire suppression in commercial. Emergency lighting on common exits.',
  },
}
