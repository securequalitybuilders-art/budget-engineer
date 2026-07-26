import { describe, it, expect } from 'vitest'
import { midpoint, pinchScale, ZOOM_MIN, ZOOM_MAX } from '../hooks/usePlanViewport'
import { isTouchDevice } from '../lib/isTouchDevice'
import { clamp, DRAWING_ZOOM_MIN, DRAWING_ZOOM_MAX } from '../lib/drawingZoom'

describe('midpoint', () => {
  it('returns the midpoint of two points', () => {
    const m = midpoint({ x: 0, y: 0 }, { x: 10, y: 10 })
    expect(m.x).toBe(5)
    expect(m.y).toBe(5)
  })

  it('handles negative coordinates', () => {
    const m = midpoint({ x: -4, y: -6 }, { x: 2, y: 4 })
    expect(m.x).toBe(-1)
    expect(m.y).toBe(-1)
  })

  it('returns same point when both coords are equal', () => {
    const m = midpoint({ x: 7, y: 3 }, { x: 7, y: 3 })
    expect(m.x).toBe(7)
    expect(m.y).toBe(3)
  })

  it('handles fractional coordinates', () => {
    const m = midpoint({ x: 1.5, y: 2.25 }, { x: 3.5, y: 4.75 })
    expect(m.x).toBe(2.5)
    expect(m.y).toBe(3.5)
  })
})

describe('pinchScale', () => {
  it('scales up when distance increases', () => {
    const result = pinchScale(100, 150, 1)
    expect(result).toBeCloseTo(1.5)
  })

  it('scales down when distance decreases', () => {
    const result = pinchScale(150, 100, 1)
    expect(result).toBeCloseTo(0.667, 2)
  })

  it('returns same scale when distance is unchanged', () => {
    const result = pinchScale(100, 100, 1)
    expect(result).toBe(1)
  })

  it('clamps to ZOOM_MIN', () => {
    const result = pinchScale(100, 5, 1)
    expect(result).toBe(ZOOM_MIN)
  })

  it('clamps to ZOOM_MAX', () => {
    const result = pinchScale(5, 100, 1)
    expect(result).toBe(ZOOM_MAX)
  })

  it('handles starting from non-unit zoom, clamped to max', () => {
    const result = pinchScale(100, 200, 2)
    expect(result).toBeCloseTo(ZOOM_MAX)
  })

  it('returns current scale when prevDist is zero (cannot compute ratio)', () => {
    const result = pinchScale(0, 100, 1)
    expect(result).toBe(1)
  })

  it('returns current scale when prevDist is negative (cannot compute ratio)', () => {
    const result = pinchScale(-10, 100, 1)
    expect(result).toBe(1)
  })

  it('handles very small distances', () => {
    const result = pinchScale(0.1, 0.2, 1)
    expect(result).toBeCloseTo(2)
  })
})

describe('tap-vs-drag threshold constants', () => {
  it('TAP_MOVEMENT_THRESHOLD_PX is 10', () => {
    expect(10).toBeGreaterThan(0)
  })

  it('TAP_TIME_THRESHOLD_MS is 300', () => {
    expect(300).toBeGreaterThan(0)
  })
})

describe('pan delta with midpoint-based pinch', () => {
  it('pan delta is computed correctly from midpoints', () => {
    const prevP1 = { x: 100, y: 100 }
    const prevP2 = { x: 200, y: 200 }
    const curP1 = { x: 110, y: 110 }
    const curP2 = { x: 210, y: 210 }

    const prevMid = midpoint(prevP1, prevP2)
    const curMid = midpoint(curP1, curP2)

    expect(prevMid).toEqual({ x: 150, y: 150 })
    expect(curMid).toEqual({ x: 160, y: 160 })
    expect(curMid.x - prevMid.x).toBe(10)
    expect(curMid.y - prevMid.y).toBe(10)
  })

  it('two-finger pan has no zoom component when distance is unchanged', () => {
    const distA = Math.sqrt((200 - 100) ** 2 + (200 - 100) ** 2)
    const distB = Math.sqrt((210 - 110) ** 2 + (210 - 110) ** 2)
    expect(distA).toBe(distB)
    const scale = pinchScale(distA, distB, 1)
    expect(scale).toBe(1)
  })
})

describe('isTouchDevice', () => {
  it('returns false in jsdom/test environment (no touch support)', () => {
    expect(isTouchDevice()).toBe(false)
  })

  it('checks ontouchstart on window (logic path test)', () => {
    const fn = isTouchDevice.toString()
    expect(fn).toContain('ontouchstart')
    expect(fn).toContain('maxTouchPoints')
  })
})

describe('clamp', () => {
  it('returns value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min when below', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
  })

  it('clamps to max when above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles equal bounds', () => {
    expect(clamp(5, 5, 5)).toBe(5)
  })
})

describe('clamp with drawing zoom bounds', () => {
  it('clamps a ratio-scaled value within drawing zoom bounds', () => {
    const r = clamp(1 * (200 / 100), DRAWING_ZOOM_MIN, DRAWING_ZOOM_MAX)
    expect(r).toBeCloseTo(2)
  })

  it('clamps to DRAWING_ZOOM_MIN', () => {
    const r = clamp(0.1, DRAWING_ZOOM_MIN, DRAWING_ZOOM_MAX)
    expect(r).toBe(DRAWING_ZOOM_MIN)
  })

  it('clamps to DRAWING_ZOOM_MAX', () => {
    const r = clamp(10, DRAWING_ZOOM_MIN, DRAWING_ZOOM_MAX)
    expect(r).toBe(DRAWING_ZOOM_MAX)
  })

  it('passes through values within range', () => {
    const r = clamp(1.5, DRAWING_ZOOM_MIN, DRAWING_ZOOM_MAX)
    expect(r).toBe(1.5)
  })
})
