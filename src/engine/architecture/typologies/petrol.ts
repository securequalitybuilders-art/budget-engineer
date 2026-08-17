import type { TypologyConstraints } from './types'

export const petrolTypologyConstraints: TypologyConstraints = {
  typologyId: 'petrol-station',
  displayName: 'Petrol Station / Filling Station',
  functionalZoning: {
    zones: [
      {
        patterns: ['fuel bay', 'canopy', 'forecourt'],
        minAreaM2: 60,
        adjacentTo: ['pump island', 'pump'],
        minCount: 1,
      },
      {
        patterns: ['shop', 'convenience store', 'mini-mart'],
        minAreaM2: 25,
        adjacentTo: ['entrance', 'office'],
      },
      {
        patterns: ['office'],
        minAreaM2: 8,
        adjacentTo: ['shop', 'convenience store'],
      },
      {
        patterns: ['car wash'],
        minAreaM2: 40,
        adjacentTo: ['fuel bay', 'forecourt'],
        notAdjacentTo: ['shop', 'convenience store'],
      },
      {
        patterns: ['store', 'chemical store'],
        minAreaM2: 8,
        adjacentTo: ['office', 'car wash'],
        notAdjacentTo: ['shop', 'convenience store'],
      },
    ],
    separation: [
      ['fuel bay', 'canopy', 'forecourt'],
      ['shop', 'convenience store'],
      ['car wash'],
      ['shop'],
    ],
    notes: 'ZBC Part 6: fuel storage. Minimum 10m setback from road. Fuel bay separated from shop by fire-resistant wall. Car wash drainage separated from fuel drainage.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Single-storey only. No lift required.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 8, patterns: ['office', 'manager office'] },
    notes: 'Staff office behind shop counter.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 4,
    patterns: ['shop entrance', 'entrance'],
    requiresDirectAccess: true,
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 25,
    fireRatingMinutes: 120,
    minDoorWidthM: 1.0,
    requiresFireDoors: true,
    requiresSprinklers: true,
    notes: 'ZBC Part 6: J3 high hazard. 120-min fire doors. Fire suppression in fuel bay. Emergency lighting. Extinguishers at fuel pumps.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 5,
    notes: 'Shop requires natural light. Fuel bay is open-sided.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    notes: 'SANS 10400 Part S: accessible shop and toilet. Fuel bay no accessibility requirement.',
  },
  structuralGrid: {
    preferredSpanM: 6.0,
    alternativeSpansM: [8.0],
    maxSpanM: 8.0,
    notes: 'Steel frame canopy. Shop as masonry or steel.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    fireSuppression: true,
    notes: 'Fuel storage compliance per ZBC. Fire suppression system. Grease trap for car wash. Emergency lighting.',
  },
}
