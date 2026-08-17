import type { TypologyConstraints } from './types'

export const churchTypologyConstraints: TypologyConstraints = {
  typologyId: 'church-worship',
  displayName: 'Church / Place of Worship',
  functionalZoning: {
    zones: [
      {
        patterns: ['main hall', 'sanctuary', 'worship', 'nave'],
        minAreaM2: 200,
        adjacentTo: ['vestibule', 'entrance', 'corridor'],
        minCount: 1,
      },
      {
        patterns: ['sunday school', 'classroom', 'education'],
        minAreaM2: 25,
        adjacentTo: ['corridor', 'circulation'],
        minCount: 1,
      },
      {
        patterns: ['kitchen'],
        minAreaM2: 15,
        adjacentTo: ['store', 'corridor'],
      },
      {
        patterns: ['toilet', 'ablution'],
        minAreaM2: 10,
        adjacentTo: ['corridor', 'vestibule'],
        minCount: 2,
      },
    ],
    separation: [
      ['toilet', 'ablution'],
      ['main hall', 'sanctuary'],
    ],
    notes: 'ZBC Part 4: assembly occupancy. Toilet blocks separated from worship space. Vestibule as acoustic buffer.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Single-storey default. Gallery access via stair for multi-storey churches.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 10, patterns: ['pastor\'s office', 'office', 'vestry'] },
  },
  meetingRooms: {
    types: [
      { name: 'Sunday School', minAreaM2: 25, maxCapacity: 20, patterns: ['sunday school', 'classroom', 'education room'] },
    ],
  },
  reception: {
    minAreaM2: 12,
    patterns: ['vestibule', 'foyer', 'entrance hall', 'lobby'],
    requiresDirectAccess: true,
    notes: 'Vestibule serves as acoustic buffer between entrance and worship space.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 18,
    fireRatingMinutes: 120,
    minDoorWidthM: 1.2,
    requiresFireDoors: true,
    notes: 'ZBC Part 4: assembly occupancy Grade A. Max travel 18m. Fire doors 120-min. Min exit width 1.2m. Doors open outward.',
  },
  daylighting: {
    minWindowFaceRatio: 0.15,
    minNaturalLightAreaM2: 20,
    operableWindowPct: 0.3,
    notes: 'Worship hall requires controlled natural light. Stained glass or clerestory windows.',
  },
  accessibility: {
    minDoorWidthM: 1.2,
    minCorridorWidthM: 1.5,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: assembly buildings must be fully accessible. Ramp to raised platform/pulpit.',
  },
  structuralGrid: {
    preferredSpanM: 15.0,
    alternativeSpansM: [12.0, 18.0],
    maxSpanM: 18.0,
    notes: 'Large clear span for worship hall. Steel or RC truss. 15m typical, up to 18m for larger congregations.',
  },
  buildingServices: {
    hvac: false,
    electrical: true,
    plumbing: true,
    fireSuppression: false,
    emergencyLighting: true,
    notes: 'Sound system wiring. Emergency lighting on exit routes. No HVAC in most Zimbabwe churches.',
  },
}
