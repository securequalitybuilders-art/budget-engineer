import type { TypologyConstraints } from './types'

export const apartmentTypologyConstraints: TypologyConstraints = {
  typologyId: 'apartment-multi',
  displayName: 'Apartment / Multi-Unit Residential',
  functionalZoning: {
    zones: [
      {
        patterns: ['unit', 'apartment', 'flat', 'condo'],
        minAreaM2: 30,
        adjacentTo: ['corridor', 'circulation'],
        notAdjacentTo: ['garage'],
      },
      {
        patterns: ['corridor', 'common corridor', 'lobby'],
        minAreaM2: 20,
        adjacentTo: ['staircase', 'lift', 'lift core'],
      },
      {
        patterns: ['bin store', 'refuse', 'rubbish'],
        minAreaM2: 4,
        adjacentTo: ['corridor', 'lift'],
      },
    ],
    separation: [
      ['garage', 'parking'],
      ['bin store', 'refuse'],
    ],
    notes: 'ZBC Part 2: units must not share internal walls with garbage rooms. Wet walls stacked vertically.',
  },
  corePlanning: {
    minStairs: 2,
    minElevators: 1,
    minFireEscapes: 1,
    serviceShaftMinAreaM2: 2,
    coreLocation: 'central',
    notes: 'ZBC: lift required if >3 storeys. 2 stairs for >6 units per floor. Fire escape for >15m height.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 6, patterns: ['study nook', 'home office'] },
    notes: 'Optional study space in larger units.',
  },
  meetingRooms: {
    types: [],
    notes: 'Residential — no meeting room requirement.',
  },
  reception: {
    minAreaM2: 12,
    patterns: ['lobby', 'entrance lobby', 'reception'],
    requiresDirectAccess: true,
    notes: 'Common entrance lobby required for multi-unit buildings.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 25,
    fireRatingMinutes: 60,
    minDoorWidthM: 0.9,
    requiresFireDoors: true,
    notes: 'ZBC Part 2: 60-min fire-rated corridors. Fire doors at stair enclosures. Two stairs from each floor.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 4,
    operableWindowPct: 0.3,
    notes: 'Each habitable room requires natural light. Common corridors may use borrowed light.',
  },
  accessibility: {
    minDoorWidthM: 0.9,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    notes: 'SANS 10400 Part S: min 5% of units wheelchair-accessible. Common areas fully accessible.',
  },
  structuralGrid: {
    preferredSpanM: 6.0,
    alternativeSpansM: [5.0, 7.2],
    maxSpanM: 7.2,
    columnSpacingM: 6.0,
    notes: 'RC frame: 6.0m grid for efficient unit stacking. 7.2m for larger units.',
  },
  buildingServices: {
    hvac: false,
    plumbing: true,
    electrical: true,
    fireSuppression: true,
    emergencyLighting: true,
    notes: 'Individual unit plumbing. Common area emergency lighting. Fire suppression in corridors.',
  },
}
