// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { RoomScheduleView, buildRoomScheduleRows } from '@/components/drawings/RoomScheduleView'
import type { PlanModel } from '@/domain/plan'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan',
    designOptionId: 'test-opt',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'r2', name: 'Bedroom', x: 5, y: 0, width: 5, height: 4 },
      { id: 'r3', name: 'Bathroom', x: 0, y: 4, width: 3, height: 4 },
      { id: 'r4', name: 'Kitchen', x: 3, y: 4, width: 4, height: 4 },
    ],
    walls: [],
    openings: [],
    ...overrides,
  }
}

describe('RoomScheduleView', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders table when plan is provided', () => {
    render(<RoomScheduleView activePlan={makePlan()} />)
    expect(screen.getByText('NO.')).toBeTruthy()
    expect(screen.getByText('ROOM NAME')).toBeTruthy()
    expect(screen.getByText('ZONE')).toBeTruthy()
    expect(screen.getByText('DIMS (mm)')).toBeTruthy()
    expect(screen.getByText('AREA (m²)')).toBeTruthy()
  })

  it('shows room names from the plan', () => {
    render(<RoomScheduleView activePlan={makePlan()} />)
    expect(screen.getByText('Living Room')).toBeTruthy()
    expect(screen.getByText('Bedroom')).toBeTruthy()
    expect(screen.getByText('Bathroom')).toBeTruthy()
    expect(screen.getByText('Kitchen')).toBeTruthy()
  })

  it('shows empty state when plan is null', () => {
    render(<RoomScheduleView activePlan={null} />)
    expect(screen.getByText('No rooms in the current plan.')).toBeTruthy()
  })

  it('shows empty state when plan has no rooms', () => {
    const plan = makePlan()
    plan.rooms = []
    render(<RoomScheduleView activePlan={plan} />)
    expect(screen.getByText('No rooms in the current plan.')).toBeTruthy()
  })

  it('assigns zone classification correctly', () => {
    const plan = makePlan()
    const rows = buildRoomScheduleRows(plan)
    const living = rows.find((r) => r.name === 'Living Room')
    expect(living?.zone).toBe('Public')
    const bedroom = rows.find((r) => r.name === 'Bedroom')
    expect(bedroom?.zone).toBe('Private')
    const bathroom = rows.find((r) => r.name === 'Bathroom')
    expect(bathroom?.zone).toBe('Service')
  })

  it('marks wet cores correctly', () => {
    const rows = buildRoomScheduleRows(makePlan())
    const bathroom = rows.find((r) => r.name === 'Bathroom')
    expect(bathroom?.wetCore).toBe(true)
    const kitchen = rows.find((r) => r.name === 'Kitchen')
    expect(kitchen?.wetCore).toBe(true)
    const living = rows.find((r) => r.name === 'Living Room')
    expect(living?.wetCore).toBe(false)
  })

  it('computes area correctly', () => {
    const rows = buildRoomScheduleRows(makePlan())
    const living = rows.find((r) => r.name === 'Living Room')
    expect(living?.areaM2).toBe(20)
  })

  it('checks SADC compliance', () => {
    const plan = makePlan()
    const rows = buildRoomScheduleRows(plan)
    const living = rows.find((r) => r.name === 'Living Room')
    expect(living?.minSadcM2).toBe(20)
    expect(living?.compliant).toBe(true)
  })

  it('shows compliance check icons', () => {
    render(<RoomScheduleView activePlan={makePlan()} />)
    const checks = screen.getAllByText('✓')
    expect(checks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders sequential room numbers', () => {
    const rows = buildRoomScheduleRows(makePlan())
    expect(rows[0].number).toBe(1)
    expect(rows[1].number).toBe(2)
  })

  it('shows total area in footer', () => {
    render(<RoomScheduleView activePlan={makePlan()} />)
    const plan = makePlan()
    const total = plan.rooms.reduce((s, r) => s + r.width * r.height, 0)
    expect(screen.getByText(`${total.toFixed(2)} m²`)).toBeTruthy()
  })

  it('shows compliant count in footer', () => {
    render(<RoomScheduleView activePlan={makePlan()} />)
    expect(screen.getByText('4/4')).toBeTruthy()
  })
})
