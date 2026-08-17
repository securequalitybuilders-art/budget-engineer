import type { TypologyConstraints } from './types'

export const duplexTypologyConstraints: TypologyConstraints = {
  typologyId: 'duplex',
  displayName: 'Duplex / Semi-Detached',
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
        notAdjacentTo: ['bedroom'],
      },
    ],
    separation: [
      ['garage'],
    ],
    notes: 'Two mirror-image units. Ground floor: living/kitchen/WC. Upper: bedrooms/bathroom. Party wall between units.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Staircase per unit. No lift for 2-storey residential.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 6, patterns: ['study', 'home office'] },
    notes: 'Optional study nook.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 4,
    patterns: ['entrance', 'porch', 'verandah'],
    requiresDirectAccess: true,
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 25,
    fireRatingMinutes: 60,
    minDoorWidthM: 0.9,
    notes: 'Party wall: 60-min fire rating. Two exits per unit.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 4,
    operableWindowPct: 0.5,
  },
  accessibility: {
    minDoorWidthM: 0.9,
    minCorridorWidthM: 1.0,
    notes: 'By-Laws Ch4: min door 900mm. Residential corridor min 1.0m.',
  },
  structuralGrid: {
    preferredSpanM: 5.0,
    maxSpanM: 5.0,
    notes: 'Load-bearing masonry with 230mm party wall.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    notes: 'Mirrored plumbing stacks per unit.',
  },
}
