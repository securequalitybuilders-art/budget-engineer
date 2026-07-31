// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StrictMode, useEffect, useState } from 'react'
import { act } from 'react'
import { useGlbExport } from '@/hooks/useGlbExport'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

const mockPlan: PlanModel = {
  id: 'plan-1',
  designOptionId: 'opt-1',
  width: 10,
  height: 8,
  wallThickness: 0.23,
  rooms: [{ id: 'r1', x: 0, y: 0, width: 10, height: 8, name: 'Room 1' }],
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, type: 'external', thickness: 0.23 },
    { id: 'w2', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, type: 'external', thickness: 0.23 },
    { id: 'w3', start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, type: 'external', thickness: 0.23 },
    { id: 'w4', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, type: 'external', thickness: 0.23 },
  ],
  openings: [],
  scaleLabel: '1:100',
}

const mockDesign: DesignOption = {
  id: 'opt-1',
  name: 'Test Design',
  grossFloorArea: 80,
  floors: 1,
  buildingType: 'house',
  elements: [],
}

function Harness() {
  const { glbUrl, error, generate } = useGlbExport()
  const [done, setDone] = useState(false)
  useEffect(() => {
    generate(mockPlan, mockDesign).then(() => setDone(true))
  }, [generate])
  return (
    <div>
      <span data-testid="status">{done ? (glbUrl ? 'url-set' : 'no-url') : 'pending'}</span>
      <span data-testid="error">{error ?? ''}</span>
    </div>
  )
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100))
  })
}

describe('useGlbExport under React StrictMode', () => {
  beforeAll(() => {
    URL.createObjectURL = () => 'blob:mock-url'
    URL.revokeObjectURL = () => {}
  })

  afterEach(() => {
    cleanup()
  })

  it('sets glbUrl after generate resolves (regression: mountedRef stuck false after StrictMode remount)', async () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    )
    await flush()
    expect(screen.getByTestId('status').textContent).toBe('url-set')
    expect(screen.getByTestId('error').textContent).toBe('')
  })
})
