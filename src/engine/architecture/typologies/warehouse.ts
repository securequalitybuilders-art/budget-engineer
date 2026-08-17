import type { TypologyConstraints } from './types'

export const warehouseTypologyConstraints: TypologyConstraints = {
  typologyId: 'warehouse-industrial',
  displayName: 'Warehouse / Industrial',
  functionalZoning: {
    zones: [
      {
        patterns: ['warehouse floor', 'storage floor', 'factory floor', 'manufacturing'],
        minAreaM2: 200,
        adjacentTo: ['loading bay', 'loading dock'],
        minCount: 1,
      },
      {
        patterns: ['loading bay', 'loading dock', 'loading'],
        minAreaM2: 40,
        adjacentTo: ['warehouse floor', 'storage floor'],
      },
      {
        patterns: ['office', 'admin'],
        minAreaM2: 20,
        adjacentTo: ['entrance', 'corridor'],
      },
      {
        patterns: ['staff room', 'canteen'],
        minAreaM2: 12,
        adjacentTo: ['office', 'corridor'],
      },
      {
        patterns: ['toilet', 'ablution'],
        minAreaM2: 5,
        adjacentTo: ['corridor', 'office'],
        minCount: 2,
      },
    ],
    separation: [
      ['office', 'admin'],
      ['warehouse floor', 'storage floor'],
    ],
    notes: 'ZBC Part 6: industrial. Office separated from warehouse by fire-resistant wall. Loading bay at perimeter for truck access.',
  },
  corePlanning: {
    minStairs: 1,
    minElevators: 0,
    notes: 'Single-storey default. Mezzanine office accessed by stair.',
  },
  workspaceLayouts: {
    openPlan: { minAreaPerPersonM2: 15, patterns: ['warehouse floor', 'storage floor', 'factory floor'] },
    private: { minAreaM2: 20, patterns: ['office', 'admin', 'manager office'] },
    notes: 'Warehouse: 15m² per worker. Office: 12m² per person.',
  },
  meetingRooms: { types: [] },
  reception: {
    minAreaM2: 8,
    patterns: ['entrance', 'office', 'reception'],
    requiresDirectAccess: true,
    notes: 'Separate pedestrian entrance from truck loading area.',
  },
  emergencyExits: {
    minExits: 2,
    maxTravelDistanceM: 45,
    fireRatingMinutes: 60,
    minDoorWidthM: 1.0,
    requiresFireDoors: true,
    notes: 'ZBC Part 6: industrial. Min 2 exits. 60-min fire doors between warehouse and office. Emergency lighting.',
  },
  daylighting: {
    minWindowFaceRatio: 0.1,
    minNaturalLightAreaM2: 20,
    operableWindowPct: 0.2,
    notes: 'SANS 10400 Part O: warehouse min 10% glazing. Industrial lighting for floor areas.',
  },
  accessibility: {
    minDoorWidthM: 1.0,
    minCorridorWidthM: 1.2,
    notes: 'Loading bay: no accessibility requirement. Office and toilet areas accessible.',
  },
  structuralGrid: {
    preferredSpanM: 15.0,
    alternativeSpansM: [12.0, 18.0, 20.0],
    maxSpanM: 20.0,
    columnSpacingM: 6.0,
    notes: 'Steel frame: 15–20m clear span for warehouse floor. 6m column spacing for mezzanine.',
  },
  buildingServices: {
    plumbing: true,
    electrical: true,
    fireSuppression: true,
    emergencyLighting: true,
    notes: 'High-bay industrial lighting. Fire hydrants per ZBC Part 6. Compressed air for tools.',
  },
}
