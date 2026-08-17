import type { TypologyConstraints } from './types'

export const townhouseTypologyConstraints: TypologyConstraints = {
  typologyId: 'townhouse',
  displayName: 'Townhouse / Terraced',
  functionalZoning: {
    zones: [
      {
        patterns: ['living', 'dining'],
        minAreaM2: 18,
        adjacentTo: ['kitchen', 'entrance'],
      },
      {
        patterns: ['bedroom', 'master bedroom'],
        minAreaM2: 11,
        adjacentTo: ['bathroom', 'bath'],
        notAdjacentTo: ['kitchen'],
      },
      {
        patterns: ['kitchen'],
        minAreaM2: 9,
        adjacentTo: ['dining', 'living'],
      },
    ],
    notes: 'Attached terraced unit. Zero side setback. Party walls on both sides. Ground: living/kitchen/WC. Upper: bedrooms/bathroom.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
  },
  workspaceLayouts: {
    private: { minAreaM2: 6, patterns: ['study', 'home office'] },
    notes: 'Optional study nook in larger units.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 4,
    patterns: ['entrance', 'porch', 'vestibule'],
    requiresDirectAccess: true,
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 25,
    fireRatingMinutes: 60,
    minDoorWidthM: 0.9,
    notes: 'Party walls: 60-min fire rating. Two exits per unit.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 3,
    operableWindowPct: 0.5,
    notes: 'Front and rear facades only for natural light (party walls block sides).',
  },
  accessibility: {
    minDoorWidthM: 0.9,
    minCorridorWidthM: 1.0,
  },
  structuralGrid: {
    preferredSpanM: 5.0,
    maxSpanM: 5.0,
    notes: 'Load-bearing masonry, 230mm party walls.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
  },
}
