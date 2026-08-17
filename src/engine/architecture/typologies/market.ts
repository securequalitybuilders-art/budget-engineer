import type { TypologyConstraints } from './types'

export const marketTypologyConstraints: TypologyConstraints = {
  typologyId: 'market',
  displayName: 'Market / Informal Trading',
  functionalZoning: {
    zones: [
      {
        patterns: ['sales floor', 'trading area', 'market floor'],
        minAreaM2: 200,
        adjacentTo: ['aisle', 'corridor', 'entrance'],
        minCount: 1,
      },
      {
        patterns: ['stall', 'vendor stall', 'kiosk'],
        minAreaM2: 6,
        adjacentTo: ['aisle', 'corridor'],
        minCount: 10,
      },
      {
        patterns: ['aisle', 'circulation', 'walkway'],
        minAreaM2: 40,
        adjacentTo: ['stall', 'vendor stall', 'sales floor'],
      },
      {
        patterns: ['storage', 'store'],
        minAreaM2: 15,
        adjacentTo: ['sales floor', 'trading area'],
      },
      {
        patterns: ['toilet', 'ablution', 'latrine'],
        minAreaM2: 10,
        adjacentTo: ['entrance', 'corridor'],
        minCount: 2,
      },
    ],
    separation: [
      ['toilet', 'ablution', 'latrine'],
      ['sales floor', 'trading area'],
    ],
    notes: 'ZBC Part 5: market. Toilet blocks must be separated from food trading areas. Covered walkways required.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
  },
  workspaceLayouts: {
    openPlan: { minAreaPerPersonM2: 6, patterns: ['stall', 'vendor stall', 'kiosk'] },
    notes: 'Vendor stall: min 6m² (2m × 3m). Aisle min 3m wide for trolley access.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 10,
    patterns: ['entrance', 'gate', 'access'],
    requiresDirectAccess: true,
    notes: 'Multiple entrances for pedestrian flow.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 45,
    fireRatingMinutes: 30,
    minDoorWidthM: 1.2,
    notes: 'ZBC Part 5: min 2 exits. Min exit width 1.2m for high occupancy. Fire extinguishers at key points.',
  },
  daylighting: {
    minWindowFaceRatio: 0.05,
    minNaturalLightAreaM2: 20,
    notes: 'Open-sided or semi-open market: natural light from perimeter. Roof lights for deep markets.',
  },
  accessibility: {
    minDoorWidthM: 1.2,
    minCorridorWidthM: 3.0,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: accessible stalls and aisles. Min 3m aisles for wheelchair access. Ramp at all level changes.',
  },
  structuralGrid: {
    preferredSpanM: 10.0,
    alternativeSpansM: [15.0],
    maxSpanM: 15.0,
    notes: 'Steel frame or covered structure. Wide spans for flexible stall layout.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    notes: 'Water points throughout market. Waste bins. Covered walkways. No HVAC.',
  },
}
