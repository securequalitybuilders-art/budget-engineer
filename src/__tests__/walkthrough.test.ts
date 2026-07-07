import { describe, it, expect } from 'vitest'
import { computeWalkStart, clampToFootprint } from '@/components/bim/walkthrough'
import type { PlanModel } from '@/domain/plan'

const mockPlan: PlanModel = {
  id: 'test',
  designOptionId: 'test',
  width: 20,
  height: 15,
  wallThickness: 0.23,
  scaleLabel: '1:100',
  rooms: [
    { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 5 },
    { id: 'r2', name: 'Bedroom', x: 6, y: 0, width: 4, height: 4 },
    { id: 'r3', name: 'Kitchen', x: 0, y: 5, width: 5, height: 4 },
  ],
  walls: [],
  openings: [],
}

describe('computeWalkStart', () => {
  it('returns position inside the largest room centre at eye height', () => {
    const result = computeWalkStart(mockPlan)
    expect(result).not.toBeNull()
    // Largest room is r1 (6x5 = 30 > 25 > 20)
    expect(result!.position[0]).toBe(3)
    expect(result!.position[1]).toBe(1.6)
    expect(result!.position[2]).toBe(2.5)
  })

  it('returns null for null plan', () => {
    expect(computeWalkStart(null)).toBeNull()
  })

  it('returns null for undefined plan', () => {
    expect(computeWalkStart(undefined)).toBeNull()
  })

  it('returns null for empty plan with no rooms', () => {
    const empty: PlanModel = { ...mockPlan, rooms: [] }
    expect(computeWalkStart(empty)).toBeNull()
  })

  it('handles single-room plan', () => {
    const single: PlanModel = { ...mockPlan, rooms: [{ id: 'r1', name: 'Only', x: 1, y: 2, width: 5, height: 5 }] }
    const r = computeWalkStart(single)
    expect(r).not.toBeNull()
    expect(r!.position[0]).toBe(1 + 2.5)
    expect(r!.position[1]).toBe(1.6)
    expect(r!.position[2]).toBe(2 + 2.5)
  })

  it('eye height is always 1.6 regardless of room', () => {
    const r = computeWalkStart(mockPlan)
    expect(r!.position[1]).toBe(1.6)
  })
})

describe('clampToFootprint', () => {
  const bounds = { width: 20, depth: 15 }

  it('clamps x below 0', () => {
    const result = clampToFootprint([-5, 1.6, 5], bounds)
    expect(result[0]).toBe(0.5)
    expect(result[2]).toBe(5)
  })

  it('clamps x above width', () => {
    const result = clampToFootprint([25, 1.6, 5], bounds)
    expect(result[0]).toBe(19.5)
    expect(result[2]).toBe(5)
  })

  it('clamps z below 0', () => {
    const result = clampToFootprint([5, 1.6, -3], bounds)
    expect(result[0]).toBe(5)
    expect(result[2]).toBe(0.5)
  })

  it('clamps z above depth', () => {
    const result = clampToFootprint([5, 1.6, 20], bounds)
    expect(result[0]).toBe(5)
    expect(result[2]).toBe(14.5)
  })

  it('leaves inside position unchanged', () => {
    const pos: [number, number, number] = [5, 1.6, 5]
    const result = clampToFootprint(pos, bounds)
    expect(result).toEqual([5, 1.6, 5])
  })

  it('preserves y coordinate', () => {
    const result = clampToFootprint([-1, 2.5, -1], bounds)
    expect(result[1]).toBe(2.5)
  })

  it('uses custom margin', () => {
    const result = clampToFootprint([0, 1.6, 0], bounds, 1)
    expect(result[0]).toBe(1)
    expect(result[2]).toBe(1)
  })

  it('uses default margin 0.5', () => {
    const result = clampToFootprint([0, 1.6, 0], bounds)
    expect(result[0]).toBe(0.5)
    expect(result[2]).toBe(0.5)
  })

  it('clamps both axes simultaneously', () => {
    const result = clampToFootprint([-10, 1.6, -10], bounds)
    expect(result[0]).toBe(0.5)
    expect(result[2]).toBe(0.5)
  })

  it('clamps large positive values on both axes', () => {
    const result = clampToFootprint([100, 1.6, 100], bounds)
    expect(result[0]).toBe(19.5)
    expect(result[2]).toBe(14.5)
  })
})
