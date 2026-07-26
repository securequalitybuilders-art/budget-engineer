import { describe, it, expect } from 'vitest'
import { computeRoomFocus } from '@/components/bim/roomFocus'
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
  ],
  walls: [],
  openings: [],
}

describe('computeRoomFocus', () => {
  it('returns target at room centre with eye height for storey 0', () => {
    const r = computeRoomFocus(mockPlan, 'r1', 0)
    expect(r).not.toBeNull()
    expect(r!.target[0]).toBe(3)
    expect(r!.target[1]).toBe(1.5)
    expect(r!.target[2]).toBe(2.5)
  })

  it('returns cameraPos offset from target', () => {
    const r = computeRoomFocus(mockPlan, 'r1', 0)
    expect(r).not.toBeNull()
    const [tx, ty, tz] = r!.target
    const [cx, cy, cz] = r!.cameraPos
    expect(cx).not.toBe(tx)
    expect(cz).not.toBe(tz)
    expect(cy).toBeGreaterThan(ty)
  })

  it('accounts for storeyIndex in eye height', () => {
    const r = computeRoomFocus(mockPlan, 'r1', 2)
    expect(r).not.toBeNull()
    expect(r!.target[1]).toBe(2 * 3 + 1.5)
  })

  it('defaults storeyIndex to 0', () => {
    const r = computeRoomFocus(mockPlan, 'r1')
    expect(r).not.toBeNull()
    expect(r!.target[1]).toBe(1.5)
  })

  it('camera distance grows with room size', () => {
    const small = computeRoomFocus(mockPlan, 'r2', 0)
    const large = computeRoomFocus(mockPlan, 'r1', 0)
    const smallDist = Math.hypot(
      small!.cameraPos[0] - small!.target[0],
      small!.cameraPos[1] - small!.target[1],
      small!.cameraPos[2] - small!.target[2],
    )
    const largeDist = Math.hypot(
      large!.cameraPos[0] - large!.target[0],
      large!.cameraPos[1] - large!.target[1],
      large!.cameraPos[2] - large!.target[2],
    )
    expect(largeDist).toBeGreaterThan(smallDist)
  })

  it('returns null for null plan', () => {
    expect(computeRoomFocus(null, 'r1')).toBeNull()
  })

  it('returns null for undefined plan', () => {
    expect(computeRoomFocus(undefined, 'r1')).toBeNull()
  })

  it('returns null for null roomId', () => {
    expect(computeRoomFocus(mockPlan, null)).toBeNull()
  })

  it('returns null for undefined roomId', () => {
    expect(computeRoomFocus(mockPlan, undefined)).toBeNull()
  })

  it('returns null for unknown roomId', () => {
    expect(computeRoomFocus(mockPlan, 'unknown')).toBeNull()
  })

  it('returns null for empty plan (no rooms)', () => {
    const empty: PlanModel = { ...mockPlan, rooms: [] }
    expect(computeRoomFocus(empty, 'r1')).toBeNull()
  })

  it('cameraPos y is above eye height (offset upward)', () => {
    const r = computeRoomFocus(mockPlan, 'r1', 0)
    expect(r).not.toBeNull()
    expect(r!.cameraPos[1]).toBeGreaterThan(r!.target[1])
  })

  it('cameraPos x and z differ from target (offset diagonally)', () => {
    const r = computeRoomFocus(mockPlan, 'r1', 0)
    expect(r).not.toBeNull()
    const dx = Math.abs(r!.cameraPos[0] - r!.target[0])
    const dz = Math.abs(r!.cameraPos[2] - r!.target[2])
    expect(dx).toBeGreaterThan(0)
    expect(dz).toBeGreaterThan(0)
  })
})
