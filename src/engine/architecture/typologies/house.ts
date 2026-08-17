import type { TypologyConstraints } from './types'

export const houseTypologyConstraints: TypologyConstraints = {
  typologyId: 'house-residential',
  displayName: 'House / Residential',
  functionalZoning: {
    zones: [
      {
        patterns: ['bedroom', 'master bedroom'],
        minAreaM2: 12,
        adjacentTo: ['bathroom', 'toilet'],
        notAdjacentTo: ['kitchen', 'garage'],
      },
      {
        patterns: ['kitchen'],
        minAreaM2: 9,
        adjacentTo: ['dining', 'dining room', 'living'],
      },
      {
        patterns: ['living', 'lounge', 'sitting room'],
        minAreaM2: 18,
        adjacentTo: ['dining', 'dining room', 'verandah', 'entrance'],
      },
      {
        patterns: ['bathroom'],
        minAreaM2: 5,
        adjacentTo: ['bedroom', 'corridor'],
        notAdjacentTo: ['kitchen'],
      },
    ],
    separation: [
      ['garage'],
      ['kitchen', 'living', 'lounge'],
    ],
    notes: 'ZBC Part 1: wet areas (bathroom, kitchen, laundry) must be grouped for plumbing efficiency. Garage separated from living by fire-resistant wall.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Single-storey default. Staircase required for double-storey variants.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 8, patterns: ['study', 'home office', 'office'] },
    notes: 'Home office optional. Study min 8m² per ZBC.',
  },
  meetingRooms: {
    types: [],
    notes: 'Residential — no meeting room requirement.',
  },
  reception: {
    minAreaM2: 4,
    patterns: ['entrance', 'foyer', 'porch', 'verandah'],
    requiresDirectAccess: true,
    notes: 'Entrance hall or verandah serves as reception.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 25,
    fireRatingMinutes: 30,
    minDoorWidthM: 0.9,
    notes: 'ZBC Part 1: min 2 exits for storeys >1 or floor area >60m². Grade D (30min) fire doors. Travel distance 25m.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 5,
    operableWindowPct: 0.5,
    notes: 'ZBC: habitable rooms require natural light. Min 10% window-to-floor. 50% operable windows.',
  },
  accessibility: {
    minDoorWidthM: 0.9,
    minCorridorWidthM: 1.0,
    notes: 'By-Laws Ch4: min door 900mm. Corridor min 1.0m (residential relaxed).',
  },
  structuralGrid: {
    preferredSpanM: 4.5,
    alternativeSpansM: [3.5, 5.0],
    maxSpanM: 5.0,
    notes: 'Load-bearing masonry: max span 5.0m. Standard 4.5m for economy.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    notes: 'Standard residential services. Rainwater harvesting recommended.',
  },
}
