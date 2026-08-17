import type { TypologyConstraints } from './types'

export const restaurantTypologyConstraints: TypologyConstraints = {
  typologyId: 'restaurant',
  displayName: 'Restaurant / Eatery',
  functionalZoning: {
    zones: [
      {
        patterns: ['dining', 'dining area', 'eating area'],
        minAreaM2: 50,
        adjacentTo: ['entrance', 'corridor'],
        minCount: 1,
      },
      {
        patterns: ['kitchen', 'commercial kitchen'],
        minAreaM2: 25,
        adjacentTo: ['dining', 'dining area', 'store', 'pantry'],
        minCount: 1,
      },
      {
        patterns: ['store', 'pantry', 'dry store'],
        minAreaM2: 6,
        adjacentTo: ['kitchen', 'commercial kitchen'],
      },
      {
        patterns: ['toilet', 'customer toilet', 'ablution'],
        minAreaM2: 4,
        adjacentTo: ['corridor', 'entrance'],
        minCount: 2,
      },
    ],
    separation: [
      ['kitchen', 'commercial kitchen'],
      ['dining'],
      ['toilet', 'customer toilet'],
      ['dining'],
    ],
    notes: 'ZBC Part 5: food handling. Kitchen separated from dining by fire-resistant partition with service hatch. Grease trap required.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
  },
  workspaceLayouts: {
    openPlan: { minAreaPerPersonM2: 1.5, patterns: ['dining', 'dining area'] },
    private: { minAreaM2: 6, patterns: ['office', 'manager office'] },
    notes: 'Dining: 1.5m² per seated person (ZBC). Kitchen: 1.5m² per kitchen staff.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 8,
    patterns: ['entrance', 'foyer', 'waiting area'],
    requiresDirectAccess: true,
    notes: 'Entrance foyer with waiting area for peak periods.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 30,
    fireRatingMinutes: 60,
    minDoorWidthM: 1.0,
    requiresFireDoors: true,
    notes: 'ZBC Part 5: 2 exits min. Kitchen requires fire extinguisher and fire blanket. Grease trap for drainage.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 10,
    operableWindowPct: 0.3,
    notes: 'Dining area requires natural light. Kitchen requires ventilation openings.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: accessible dining and toilet. Ramp if raised entrance.',
  },
  structuralGrid: {
    preferredSpanM: 6.0,
    alternativeSpansM: [5.0, 8.0],
    maxSpanM: 8.0,
    notes: 'Masonry or steel frame. 6m for small restaurants, 8m for large dining halls.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    fireSuppression: true,
    notes: 'Grease trap for kitchen drainage. Fire extinguisher and blanket in kitchen. Hood extraction system. Emergency lighting.',
  },
}
