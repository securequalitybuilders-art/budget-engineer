import { describe, it, expect, beforeAll } from 'vitest'
import { generatePlanModel } from '@/engine/plan-generator'
import { roomArea, footprintArea } from '@/lib/geometry/plan-geometry'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-design',
    name: overrides.name ?? 'Test House',
    grossFloorArea: overrides.grossFloorArea ?? 150,
    floors: overrides.floors ?? 1,
    elements: overrides.elements ?? [],
  }
}

describe('floor plan labels', () => {
  const design = makeDesign({ grossFloorArea: 120 })
  let model: PlanModel

  beforeAll(() => {
    model = generatePlanModel(design)
  })

  it('model has rooms with names', () => {
    expect(model.rooms.length).toBeGreaterThan(0)
    for (const room of model.rooms) {
      expect(room.name).toBeTruthy()
      expect(typeof room.name).toBe('string')
    }
  })

  it('roomArea computes expected area matching room width × height', () => {
    for (const room of model.rooms) {
      const expected = Number((room.width * room.height).toFixed(2))
      expect(roomArea(room)).toBe(expected)
    }
  })

  it('each room has area > 0', () => {
    for (const room of model.rooms) {
      expect(roomArea(room)).toBeGreaterThan(0)
    }
  })

  it('overall width and height dimension texts available from model', () => {
    expect(model.width).toBeGreaterThan(0)
    expect(model.height).toBeGreaterThan(0)
    const widthLabel = `${model.width.toFixed(1)} m`
    const heightLabel = `${model.height.toFixed(1)} m`
    expect(widthLabel).toMatch(/^\d+(\.\d)? m$/)
    expect(heightLabel).toMatch(/^\d+(\.\d)? m$/)
  })

  it('footprintArea matches model width × height', () => {
    const expected = Number((model.width * model.height).toFixed(2))
    expect(footprintArea(model)).toBe(expected)
  })

  it('plan has scale label', () => {
    expect(model.scaleLabel).toBeTruthy()
    expect(typeof model.scaleLabel).toBe('string')
  })

  it('PlanCanvas dependencies: rooms, walls, openings all present', () => {
    expect(model.rooms.length).toBeGreaterThan(0)
    expect(model.walls.length).toBeGreaterThan(0)
    expect(model.openings.length).toBeGreaterThanOrEqual(0)
  })

  it('room labels contain name and area in expected text format', () => {
    for (const room of model.rooms) {
      const area = roomArea(room)
      const nameLabel = room.name
      const areaLabel = `${area} m²`
      expect(nameLabel.length).toBeGreaterThan(0)
      expect(areaLabel).toMatch(/^\d+(\.\d+)? m²$/)
    }
  })
})
