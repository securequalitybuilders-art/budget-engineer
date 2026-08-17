import type { TypologyConstraints } from './types'

export const retailTypologyConstraints: TypologyConstraints = {
  typologyId: 'retail-shop',
  displayName: 'Retail / Shop',
  functionalZoning: {
    zones: [
      {
        patterns: ['sales floor', 'shop floor', 'display area'],
        minAreaM2: 50,
        adjacentTo: ['entrance', 'counter', 'checkout'],
        minCount: 1,
      },
      {
        patterns: ['stock room', 'store', 'storage'],
        minAreaM2: 15,
        adjacentTo: ['sales floor', 'shop floor', 'loading'],
      },
      {
        patterns: ['counter', 'checkout', 'till'],
        minAreaM2: 6,
        adjacentTo: ['sales floor', 'shop floor'],
      },
      {
        patterns: ['office', 'admin'],
        minAreaM2: 8,
        adjacentTo: ['stock room', 'store'],
      },
    ],
    separation: [
      ['toilet', 'customer toilet'],
      ['sales floor', 'shop floor'],
    ],
    notes: 'ZBC Part 5: retail. Customer toilet separated from sales area. Stock room accessible from loading area.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
  },
  workspaceLayouts: {
    openPlan: { minAreaPerPersonM2: 8, patterns: ['sales floor', 'shop floor'] },
    notes: 'Sales staff: 8m² per person including stock area.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 4,
    patterns: ['entrance', 'doorway'],
    requiresDirectAccess: true,
    notes: 'Direct street access required. Display window at entrance.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 45,
    fireRatingMinutes: 30,
    minDoorWidthM: 1.0,
    notes: 'ZBC Part 5: 2 exits if >200m². Min exit width per occupant load. Grade D (30min) fire doors.',
  },
  daylighting: {
    minWindowFaceRatio: 0.2,
    minNaturalLightAreaM2: 10,
    notes: 'Shop front display window provides daylight. 20% min for sales floor.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.2,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: accessible entrance for retail. Ramp if level change >6mm.',
  },
  structuralGrid: {
    preferredSpanM: 6.0,
    alternativeSpansM: [8.0],
    maxSpanM: 8.0,
    notes: 'Masonry or steel frame. 6m for small shops, 8m for open-plan retail.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    notes: 'Customer toilet plumbing. Adequate lighting for display areas.',
  },
}
