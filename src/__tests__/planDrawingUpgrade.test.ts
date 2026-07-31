import { describe, it, expect } from 'vitest'
import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { renderFloorPlanSheet } from '@/lib/drawings/planSheetRenderer'
import { DoorSwing, WindowGlazing, OpeningTag } from '@/components/drawings/openingSymbols'
import { renderRoomFixtures } from '@/components/drawings/roomFixtures'
import { RoomTag, FloorLevelTag, LeaderLine } from '@/components/drawings/annotationTags'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'upgrade-test-plan',
    designOptionId: 'test',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 8 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 8 },
      { id: 'r3', name: 'Bathroom', x: 2, y: 2, width: 2.5, height: 2.5 },
    ],
    walls: [
      { id: 'w-bottom', start: { x: 0, y: 8 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-top', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w-left', start: { x: 0, y: 0 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-right', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-partition', start: { x: 6, y: 0 }, end: { x: 6, y: 8 }, thickness: 0.115, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w-bottom', kind: 'door', offset: 0.5, width: 0.9 },
      { id: 'o2', wallId: 'w-bottom', kind: 'window', offset: 0.2, width: 1.2 },
      { id: 'o3', wallId: 'w-right', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

function countElements(sheet: { sheetW: number; sheetH: number; elements: ReactNode }, prefix: string): number {
  const arr = Array.isArray(sheet.elements) ? sheet.elements : [sheet.elements]
  return arr.filter((el): boolean => {
    if (!el || typeof el !== 'object') return false
    const key = (el as ReactElement).key
    return typeof key === 'string' && key.startsWith(prefix)
  }).length
}

describe('renderFloorPlanSheet — professional upgrade', () => {
  it('returns non-null for valid plan', () => {
    const sheet = renderFloorPlanSheet(makePlan())
    expect(sheet).not.toBeNull()
  })

  it('returns null for null plan', () => {
    expect(renderFloorPlanSheet(null as unknown as PlanModel)).toBeNull()
  })

  it('returns null for zero-width plan', () => {
    expect(renderFloorPlanSheet(makePlan({ width: 0 }))).toBeNull()
  })

  it('contains background rect', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'bg')).toBe(1)
  })

  it('renders external wall poché with fill', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'wall-ext-')).toBeGreaterThanOrEqual(4)
  })

  it('renders internal walls as hollow', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'wall-int-')).toBeGreaterThanOrEqual(1)
  })

  it('renders room annotation tags', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'room-tag-')).toBe(3)
  })

  it('renders overall horizontal dimension', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'dim-overall-w')).toBe(1)
  })

  it('renders overall vertical dimension', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'dim-overall-h')).toBe(1)
  })

  it('renders north arrow', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'north-arrow')).toBe(1)
  })

  it('renders level marker', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'level-marker')).toBe(1)
  })

  it('renders title block', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'title-block')).toBe(1)
  })

  it('renders floor plan caption', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'caption')).toBe(1)
  })

  it('renders scale label', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'scale-label')).toBe(1)
  })

  it('renders hatch defs', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'hatch-defs')).toBe(1)
  })

  it('renders scale bar', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'scale-bar-seg-')).toBe(4)
  })

  it('renders grid bubbles', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'grid-bubble-')).toBeGreaterThanOrEqual(1)
  })

  it('renders room fixtures for bathroom', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'fixture-')).toBeGreaterThanOrEqual(1)
  })

  it('renders opening symbols for doors and windows', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'opening-')).toBe(3)
  })

  it('renders bay dimensions', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(countElements(sheet, 'dim-bay-')).toBeGreaterThanOrEqual(2)
  })

  it('sheet dimensions are positive', () => {
    const sheet = renderFloorPlanSheet(makePlan())!
    expect(sheet.sheetW).toBeGreaterThan(0)
    expect(sheet.sheetH).toBeGreaterThan(0)
  })
})

describe('DoorSwing component', () => {
  it('renders without crashing', () => {
    const el = React.createElement(DoorSwing, {
      hingeX: 100, hingeY: 100,
      swingEndX: 110, swingEndY: 90,
      openDirection: 'ccw',
    })
    expect(el).not.toBeNull()
  })

  it('accepts cw direction', () => {
    const el = React.createElement(DoorSwing, {
      hingeX: 100, hingeY: 100,
      swingEndX: 110, swingEndY: 90,
      openDirection: 'cw',
    })
    expect(el).not.toBeNull()
  })
})

describe('WindowGlazing component', () => {
  it('renders without crashing', () => {
    const el = React.createElement(WindowGlazing, {
      x: 100, y: 100, width: 1.2, angle: 0,
    })
    expect(el).not.toBeNull()
  })

  it('creates glazing bars based on width', () => {
    const el = React.createElement(WindowGlazing, {
      x: 100, y: 100, width: 2.4, angle: 0, scale: 1,
    })
    expect(el).not.toBeNull()
  })
})

describe('OpeningTag component', () => {
  it('renders label text', () => {
    const el = React.createElement(OpeningTag, { x: 100, y: 100, label: 'D01' })
    expect(el).not.toBeNull()
  })
})

describe('renderRoomFixtures', () => {
  it('returns fixtures for bathroom', () => {
    const room = { id: 'r1', name: 'Bathroom', x: 0, y: 0, width: 2.5, height: 2.5 }
    const fixtures = renderRoomFixtures(room, 50, 0, 200)
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it('returns no fixtures for non-wet room', () => {
    const room = { id: 'r2', name: 'Living', x: 0, y: 0, width: 6, height: 8 }
    const fixtures = renderRoomFixtures(room, 50, 0, 200)
    expect(fixtures.length).toBe(0)
  })

  it('returns fixtures for WC', () => {
    const room = { id: 'r3', name: 'WC', x: 0, y: 0, width: 1.5, height: 1.5 }
    const fixtures = renderRoomFixtures(room, 50, 0, 200)
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it('returns fixtures for kitchen', () => {
    const room = { id: 'r4', name: 'Kitchen', x: 0, y: 0, width: 4, height: 3 }
    const fixtures = renderRoomFixtures(room, 50, 0, 200)
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it('returns fixtures for shower room', () => {
    const room = { id: 'r5', name: 'Shower', x: 0, y: 0, width: 1.5, height: 1.5 }
    const fixtures = renderRoomFixtures(room, 50, 0, 200)
    expect(fixtures.length).toBeGreaterThan(0)
  })
})

describe('RoomTag', () => {
  it('renders room number and name', () => {
    const room = { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 8 }
    const el = RoomTag({ room, index: 0, cx: 50, cy: 100, scale: 10 })
    expect(el).not.toBeNull()
  })

  it('increments room number with index', () => {
    const room = { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 8 }
    const el = RoomTag({ room, index: 1, cx: 80, cy: 100, scale: 10 })
    expect(el).not.toBeNull()
  })
})

describe('FloorLevelTag', () => {
  it('renders level label', () => {
    const el = FloorLevelTag({ x: 50, y: 100, label: 'F.F.L. +0.000', scale: 10 })
    expect(el).not.toBeNull()
  })
})

describe('LeaderLine', () => {
  it('renders line between two points', () => {
    const el = LeaderLine({ x1: 10, y1: 10, x2: 50, y2: 50 })
    expect(el).not.toBeNull()
  })

  it('renders with label', () => {
    const el = LeaderLine({ x1: 10, y1: 10, x2: 50, y2: 50, label: 'Note A' })
    expect(el).not.toBeNull()
  })

  it('returns null for zero-length line', () => {
    const el = LeaderLine({ x1: 10, y1: 10, x2: 10, y2: 10 })
    expect(el).toBeNull()
  })
})
