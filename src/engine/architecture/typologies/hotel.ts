import type { TypologyConstraints } from './types'

export const hotelTypologyConstraints: TypologyConstraints = {
  typologyId: 'hotel-fullservice',
  displayName: 'Hotel (Full Service)',
  functionalZoning: {
    zones: [
      {
        patterns: ['guest room', 'guest suite', 'bedroom'],
        minAreaM2: 18,
        adjacentTo: ['corridor', 'circulation'],
        minCount: 10,
      },
      {
        patterns: ['reception', 'lobby', 'front desk'],
        minAreaM2: 40,
        adjacentTo: ['entrance', 'corridor'],
        minCount: 1,
      },
      {
        patterns: ['restaurant', 'dining', 'breakfast room'],
        minAreaM2: 60,
        adjacentTo: ['kitchen', 'commercial kitchen'],
      },
      {
        patterns: ['kitchen', 'commercial kitchen'],
        minAreaM2: 30,
        adjacentTo: ['restaurant', 'dining', 'store'],
      },
      {
        patterns: ['conference', 'meeting', 'banquet'],
        minAreaM2: 50,
        adjacentTo: ['corridor', 'circulation'],
      },
      {
        patterns: ['laundry'],
        minAreaM2: 15,
        adjacentTo: ['corridor', 'service area'],
        notAdjacentTo: ['guest room', 'guest suite'],
      },
    ],
    separation: [
      ['kitchen', 'commercial kitchen'],
      ['guest room', 'guest suite'],
      ['laundry'],
      ['guest room'],
    ],
    notes: 'ZBC Part 2: hospitality. Guest rooms separated from service areas. Kitchen ventilation ducting must not pass through guest rooms.',
  },
  corePlanning: {
    minStairs: 2,
    minElevators: 1,
    minFireEscapes: 1,
    serviceShaftMinAreaM2: 2,
    coreLocation: 'central',
    notes: 'ZBC: 2 stairs for >2 storeys. Lift for guest accessibility. Fire escape for >15m. Service lift for laundry.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 12, patterns: ['admin office', 'office', 'manager office'] },
    notes: 'Hotel offices behind reception. Manager office min 12m².',
  },
  meetingRooms: {
    types: [
      { name: 'Conference', minAreaM2: 50, maxCapacity: 50, patterns: ['conference room', 'banquet', 'function room'] },
    ],
    notes: 'Conference room: 1.5m² per seated person. Acoustic separation from guest rooms.',
  },
  reception: {
    minAreaM2: 40,
    patterns: ['reception', 'lobby', 'front desk', 'concierge'],
    requiresDirectAccess: true,
    notes: 'Hotel lobby: min 40m² for full-service. Reception desk visible from entrance.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 30,
    fireRatingMinutes: 60,
    minDoorWidthM: 1.0,
    requiresFireDoors: true,
    requiresSprinklers: true,
    notes: 'ZBC Part 2: hospitality. 60-min fire doors at stair enclosures. Sprinklers in guest corridors. Emergency lighting in all corridors.',
  },
  daylighting: {
    minWindowFaceRatio: 0.15,
    minNaturalLightAreaM2: 4,
    operableWindowPct: 0.3,
    notes: 'Guest rooms: each room requires natural light. Corridors may use borrowed light.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: min 10% wheelchair-accessible rooms. Accessible lobby, restaurant, and conference rooms.',
  },
  structuralGrid: {
    preferredSpanM: 6.0,
    alternativeSpansM: [5.0, 7.2],
    maxSpanM: 7.2,
    columnSpacingM: 6.0,
    notes: 'RC frame: 6.0m grid for guest room stacking. 7.2m for conference and restaurant spaces.',
  },
  buildingServices: {
    hvac: true,
    electrical: true,
    plumbing: true,
    fireSuppression: true,
    emergencyLighting: true,
    notes: 'Individual guest room HVAC. Sprinkler system throughout. Commercial kitchen extraction. Laundry plumbing.',
  },
}
