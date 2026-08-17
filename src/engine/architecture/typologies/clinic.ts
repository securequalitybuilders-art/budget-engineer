import type { TypologyConstraints } from './types'

export const clinicTypologyConstraints: TypologyConstraints = {
  typologyId: 'clinic-health',
  displayName: 'Clinic / Health Centre',
  functionalZoning: {
    zones: [
      {
        patterns: ['reception', 'waiting'],
        minAreaM2: 20,
        adjacentTo: ['entrance', 'corridor'],
        minCount: 1,
      },
      {
        patterns: ['consultation', 'consulting'],
        minAreaM2: 12,
        adjacentTo: ['corridor', 'circulation'],
        minCount: 2,
      },
      {
        patterns: ['treatment', 'procedure'],
        minAreaM2: 15,
        adjacentTo: ['corridor', 'circulation'],
      },
      {
        patterns: ['pharmacy', 'dispensary'],
        minAreaM2: 10,
        adjacentTo: ['consultation', 'consulting'],
        notAdjacentTo: ['toilet', 'bathroom'],
      },
      {
        patterns: ['store', 'supply'],
        minAreaM2: 6,
        adjacentTo: ['pharmacy', 'dispensary', 'corridor'],
      },
    ],
    separation: [
      ['pharmacy', 'dispensary'],
      ['toilet', 'bathroom'],
    ],
    notes: 'ZBC Part 4: public health facilities require separated public/private circulation. Pharmacy must not adjoin wet areas.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    serviceShaftMinAreaM2: 2,
    notes: 'Single-storey default. Medical gas shafts for multi-storey clinics.',
  },
  workspaceLayouts: {
    private: { minAreaM2: 12, patterns: ['consultation', 'consulting', 'treatment'] },
    notes: 'Consultation rooms: min 12m². Treatment rooms: min 15m². All require natural light.',
  },
  meetingRooms: {
    types: [
      { name: 'Staff Meeting', minAreaM2: 15, maxCapacity: 10, patterns: ['staff room', 'meeting room'] },
    ],
  },
  reception: {
    minAreaM2: 20,
    patterns: ['reception', 'waiting', 'waiting area', 'waiting room'],
    requiresDirectAccess: true,
    notes: 'Public waiting area: min 1.5m² per seat. Separate public and staff circulation.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 30,
    fireRatingMinutes: 60,
    minDoorWidthM: 1.0,
    requiresFireDoors: true,
    notes: 'ZBC Part 4: assembly occupancy. 60-min fire doors. Corridors ≥1.5m for stretcher access. Emergency exit signs.',
  },
  daylighting: {
    minWindowFaceRatio: 0.15,
    minNaturalLightAreaM2: 8,
    operableWindowPct: 0.3,
    notes: 'SANS 10400 Part O: all consultation and treatment rooms require natural light.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.5,
    wheelchairTurningDiameterM: 1.5,
    accessibleWc: true,
    rampRequired: true,
    notes: 'SANS 10400 Part S: healthcare facilities must be fully wheelchair-accessible. Stretcher-width corridors.',
  },
  structuralGrid: {
    preferredSpanM: 7.2,
    alternativeSpansM: [6.0],
    maxSpanM: 7.2,
    columnSpacingM: 7.2,
    notes: 'RC frame 7.2m grid: matches consultation room depth.',
  },
  buildingServices: {
    hvac: true,
    plumbing: true,
    electrical: true,
    fireSuppression: true,
    emergencyLighting: true,
    notes: 'Medical gas plumbing. Hand-wash basins in every consultation room. Emergency lighting on all exit routes.',
  },
}
