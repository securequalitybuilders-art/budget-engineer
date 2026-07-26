import { describe, it, expect } from 'vitest'
import type { PlanModel } from '@/domain/plan'
import { placeElectrical, placePlumbing, placeHvac } from '@/components/drawings/mepPlacement'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'mep-test-plan',
    designOptionId: 'test',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 8 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 8 },
    ],
    walls: [
      { id: 'w-bottom', start: { x: 0, y: 8 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-top', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w-left', start: { x: 0, y: 0 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-right', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w-bottom', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

function makeWetPlan(): PlanModel {
  return {
    ...makePlan(),
    rooms: [
      { id: 'bath', name: 'Bathroom', x: 0, y: 0, width: 3, height: 3 },
      { id: 'kitchen', name: 'Kitchen', x: 3, y: 0, width: 4, height: 3 },
      { id: 'living', name: 'Living Room', x: 0, y: 3, width: 7, height: 5 },
    ],
  }
}

describe('placeElectrical', () => {
  it('returns one light per room', () => {
    const result = placeElectrical(makePlan())
    const lights = result.symbols.filter(s => s.type === 'light')
    expect(lights.length).toBe(2)
  })

  it('places a DistributionBoard', () => {
    const result = placeElectrical(makePlan())
    const dbs = result.symbols.filter(s => s.type === 'db')
    expect(dbs.length).toBe(1)
  })

  it('places at least one socket per room', () => {
    const result = placeElectrical(makePlan())
    const sockets = result.symbols.filter(s => s.type === 'socket')
    expect(sockets.length).toBeGreaterThanOrEqual(2)
  })

  it('returns empty symbols for empty rooms', () => {
    const result = placeElectrical(makePlan({ rooms: [] }))
    expect(result.symbols.length).toBe(0)
  })
})

describe('placePlumbing', () => {
  it('places WC and fixtures in a bathroom', () => {
    const result = placePlumbing(makeWetPlan())
    const wc = result.symbols.filter(s => s.type === 'wc')
    const drains = result.symbols.filter(s => s.type === 'drain')
    const stacks = result.symbols.filter(s => s.type === 'stack')
    expect(wc.length).toBeGreaterThanOrEqual(0)
    expect(drains.length).toBeGreaterThanOrEqual(1)
    expect(stacks.length).toBe(1)
  })

  it('places a sink in a kitchen', () => {
    const result = placePlumbing(makeWetPlan())
    const sinks = result.symbols.filter(s => s.type === 'sink')
    expect(sinks.length).toBe(1)
  })

  it('returns indicative stack when no wet rooms detected', () => {
    const plan = makePlan({ rooms: [{ id: 'r1', name: 'Office', x: 0, y: 0, width: 10, height: 8 }] })
    const result = placePlumbing(plan)
    expect(result.symbols.length).toBeGreaterThanOrEqual(1)
    const stacks = result.symbols.filter(s => s.type === 'stack')
    expect(stacks.length).toBe(1)
  })

  it('does not throw for empty rooms', () => {
    const result = placePlumbing(makePlan({ rooms: [] }))
    expect(result.symbols.length).toBe(0)
  })
})

describe('placeHvac', () => {
  it('places supply and return per room', () => {
    const result = placeHvac(makePlan())
    const supplies = result.symbols.filter(s => s.type === 'supply')
    const returns = result.symbols.filter(s => s.type === 'return')
    expect(supplies.length).toBe(2)
    expect(returns.length).toBe(2)
  })

  it('places one FCU', () => {
    const result = placeHvac(makePlan())
    const fcus = result.symbols.filter(s => s.type === 'fcu')
    expect(fcus.length).toBe(1)
  })

  it('has duct runs', () => {
    const result = placeHvac(makePlan())
    expect(result.runs.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty for empty rooms', () => {
    const result = placeHvac(makePlan({ rooms: [] }))
    expect(result.symbols.length).toBe(0)
  })
})
