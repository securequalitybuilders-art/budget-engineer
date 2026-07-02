import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'

export function createSampleDesignOption(overrides?: Partial<DesignOption>): DesignOption {
  return {
    id: 'fixture-design-1',
    name: 'Fixture House',
    grossFloorArea: 150,
    floors: 1,
    buildingType: 'house',
    elements: [
      { id: 'el-wall', type: 'wall', category: 'wall', name: 'External wall', unit: 'm2', quantity: 96 },
      { id: 'el-slab', type: 'slab', category: 'slab', name: 'Floor slab', unit: 'm2', quantity: 150 },
    ],
    ...overrides,
  }
}

export function createSamplePlanModel(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'fixture-plan-1',
    designOptionId: 'fixture-design-1',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'room-1', name: 'Living Room', x: 0, y: 0, width: 6, height: 5 },
      { id: 'room-2', name: 'Kitchen', x: 6, y: 0, width: 6, height: 5 },
    ],
    walls: [
      { id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'wall-2', start: { x: 6, y: 0 }, end: { x: 6, y: 5 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [
      { id: 'opening-1', wallId: 'wall-1', kind: 'door', offset: 2, width: 1 },
      { id: 'opening-2', wallId: 'wall-2', kind: 'window', offset: 1, width: 1.5 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

export function createAlternatePlanModel(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'fixture-plan-alt',
    designOptionId: 'fixture-design-alt',
    width: 20,
    height: 15,
    wallThickness: 0.3,
    rooms: [
      { id: 'alt-room-1', name: 'Office', x: 0, y: 0, width: 10, height: 8 },
    ],
    walls: [
      { id: 'alt-wall-1', start: { x: 0, y: 0 }, end: { x: 20, y: 0 }, thickness: 0.3, type: 'external' },
    ],
    openings: [],
    scaleLabel: '1:200',
    ...overrides,
  }
}
