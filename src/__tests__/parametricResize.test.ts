import { describe, it, expect } from 'vitest'
import {
  parametricResize,
  findAdjacentOnRight,
  findAdjacentOnLeft,
  findAdjacentOnBottom,
  findAdjacentOnTop,
} from '../lib/geometry/plan-transforms'
import type { PlanModel } from '../domain/plan'

function makeTwoRooms(): PlanModel {
  return {
    id: 'test',
    designOptionId: 'test',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'living', name: 'Living', x: 0, y: 0, width: 6, height: 10 },
      { id: 'kitchen', name: 'Kitchen', x: 6, y: 0, width: 6, height: 10 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:100',
  }
}

function makeVerticalRooms(): PlanModel {
  return {
    id: 'test-v',
    designOptionId: 'test-v',
    width: 10,
    height: 12,
    wallThickness: 0.23,
    rooms: [
      { id: 'top', name: 'Top', x: 0, y: 0, width: 10, height: 6 },
      { id: 'bottom', name: 'Bottom', x: 0, y: 6, width: 10, height: 6 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:100',
  }
}

function makeNoAdjacent(): PlanModel {
  return {
    id: 'test-na',
    designOptionId: 'test-na',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'alone', name: 'Solo', x: 0, y: 0, width: 6, height: 10 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:100',
  }
}

function makeThreeHorizontal(): PlanModel {
  return {
    id: 'test-3h',
    designOptionId: 'test-3h',
    width: 18,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'a', name: 'A', x: 0, y: 0, width: 6, height: 8 },
      { id: 'b', name: 'B', x: 6, y: 0, width: 6, height: 8 },
      { id: 'c', name: 'C', x: 12, y: 0, width: 6, height: 8 },
    ],
    walls: [],
    openings: [],
    scaleLabel: '1:100',
  }
}

describe('findAdjacent helpers', () => {
  const plan = makeTwoRooms()

  it('finds adjacent room on the right', () => {
    const adj = findAdjacentOnRight(plan.rooms, plan.rooms[0])
    expect(adj).not.toBeNull()
    expect(adj!.room.id).toBe('kitchen')
    expect(adj!.side).toBe('right')
  })

  it('returns null when no room on the right', () => {
    const adj = findAdjacentOnRight(plan.rooms, plan.rooms[1])
    expect(adj).toBeNull()
  })

  it('finds adjacent room on the left', () => {
    const adj = findAdjacentOnLeft(plan.rooms, plan.rooms[1])
    expect(adj).not.toBeNull()
    expect(adj!.room.id).toBe('living')
    expect(adj!.side).toBe('left')
  })

  it('returns null when no room on the left', () => {
    const adj = findAdjacentOnLeft(plan.rooms, plan.rooms[0])
    expect(adj).toBeNull()
  })

  it('finds adjacent room below', () => {
    const vplan = makeVerticalRooms()
    const adj = findAdjacentOnBottom(vplan.rooms, vplan.rooms[0])
    expect(adj).not.toBeNull()
    expect(adj!.room.id).toBe('bottom')
    expect(adj!.side).toBe('bottom')
  })

  it('finds adjacent room above', () => {
    const vplan = makeVerticalRooms()
    const adj = findAdjacentOnTop(vplan.rooms, vplan.rooms[1])
    expect(adj).not.toBeNull()
    expect(adj!.room.id).toBe('top')
    expect(adj!.side).toBe('top')
  })
})

describe('parametricResize', () => {
  describe('horizontal adjacency', () => {
    it('expand right — adjacent room shrinks and shifts', () => {
      const result = parametricResize(makeTwoRooms(), 'living', 2, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      expect(living.width).toBe(8)
      expect(kitchen.x).toBe(8)
      expect(kitchen.width).toBe(4)
    })

    it('shrink from right — adjacent room grows and shifts left', () => {
      const result = parametricResize(makeTwoRooms(), 'living', -2, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      expect(living.width).toBe(4)
      expect(kitchen.x).toBe(4)
      expect(kitchen.width).toBe(8)
    })

    it('total width preserved across both rooms', () => {
      const result = parametricResize(makeTwoRooms(), 'living', 1.5, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      const total = living.width + kitchen.width
      expect(total).toBeCloseTo(12, 5)
    })

    it('no change when dx is zero', () => {
      const result = parametricResize(makeTwoRooms(), 'living', 0, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      expect(living.width).toBe(6)
      expect(kitchen.width).toBe(6)
      expect(kitchen.x).toBe(6)
    })
  })

  describe('vertical adjacency', () => {
    it('expand down — adjacent room below shrinks and shifts', () => {
      const result = parametricResize(makeVerticalRooms(), 'top', 0, 2)
      const top = result.rooms.find(r => r.id === 'top')!
      const bottom = result.rooms.find(r => r.id === 'bottom')!
      expect(top.height).toBe(8)
      expect(bottom.y).toBe(8)
      expect(bottom.height).toBe(4)
    })

    it('shrink from bottom — adjacent room below grows and shifts up', () => {
      const result = parametricResize(makeVerticalRooms(), 'top', 0, -2)
      const top = result.rooms.find(r => r.id === 'top')!
      const bottom = result.rooms.find(r => r.id === 'bottom')!
      expect(top.height).toBe(4)
      expect(bottom.y).toBe(4)
      expect(bottom.height).toBe(8)
    })

    it('total height preserved', () => {
      const result = parametricResize(makeVerticalRooms(), 'top', 0, 1)
      const top = result.rooms.find(r => r.id === 'top')!
      const bottom = result.rooms.find(r => r.id === 'bottom')!
      expect(top.height + bottom.height).toBeCloseTo(12, 5)
    })
  })

  describe('clamping', () => {
    it('clamps expansion so adjacent room stays above 1.8m', () => {
      const plan = makeTwoRooms()
      const result = parametricResize(plan, 'living', 10, 0)
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      expect(kitchen.width).toBeGreaterThanOrEqual(1.8)
      const living = result.rooms.find(r => r.id === 'living')!
      expect(living.width + kitchen.width).toBeCloseTo(12, 5)
    })

    it('target room does not go below 1.8m', () => {
      const plan = makeTwoRooms()
      const result = parametricResize(plan, 'living', -10, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      expect(living.width).toBeGreaterThanOrEqual(1.8)
    })

    it('vertical expansion clamps to prevent adjacent collapse', () => {
      const plan = makeVerticalRooms()
      const result = parametricResize(plan, 'top', 0, 10)
      const bottom = result.rooms.find(r => r.id === 'bottom')!
      expect(bottom.height).toBeGreaterThanOrEqual(1.8)
    })
  })

  describe('no adjacent room', () => {
    it('works like normal resize when no room on the right', () => {
      const plan = makeNoAdjacent()
      const result = parametricResize(plan, 'alone', 3, 0)
      const room = result.rooms.find(r => r.id === 'alone')!
      expect(room.width).toBe(9)
    })

    it('adjacent room on left is not affected when target expands right', () => {
      const plan = makeThreeHorizontal()
      const result = parametricResize(plan, 'b', 2, 0)
      const a = result.rooms.find(r => r.id === 'a')!
      const b = result.rooms.find(r => r.id === 'b')!
      const c = result.rooms.find(r => r.id === 'c')!
      expect(a.width).toBe(6)
      expect(a.x).toBe(0)
      expect(b.width).toBe(8)
      expect(c.x).toBe(14)
      expect(c.width).toBe(4)
    })
  })

  describe('both axes', () => {
    it('handles simultaneous horizontal and vertical resize', () => {
      const plan = makeTwoRooms()
      const result = parametricResize(plan, 'living', 1, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      expect(living.width).toBe(7)
      expect(living.height).toBe(10)
      expect(kitchen.x).toBe(7)
      expect(kitchen.width).toBe(5)
      expect(kitchen.height).toBe(10)
    })
  })

  describe('non-existent room', () => {
    it('returns plan unchanged for unknown room ID', () => {
      const plan = makeTwoRooms()
      const result = parametricResize(plan, 'nonexistent', 2, 0)
      expect(result).toBe(plan)
    })
  })

  describe('boundary constraints', () => {
    it('target room width does not exceed plan width', () => {
      const plan = makeTwoRooms()
      const result = parametricResize(plan, 'living', 100, 0)
      const living = result.rooms.find(r => r.id === 'living')!
      expect(living.x + living.width).toBeLessThanOrEqual(plan.width)
    })

    it('adjacent room x stays within plan bounds', () => {
      const plan = makeTwoRooms()
      const result = parametricResize(plan, 'living', 100, 0)
      const kitchen = result.rooms.find(r => r.id === 'kitchen')!
      expect(kitchen.x).toBeGreaterThanOrEqual(0)
    })
  })
})
