import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { PlanModel } from '@/domain/plan'
import { exportPlanToPdf, _setSvgToPngUrl } from '@/lib/export/sheetPdfExport'

// Replace DOM-dependent SVG→PNG converter with a mock for node environment
beforeAll(() => {
  _setSvgToPngUrl(async () => 'data:image/png;base64,mockPngData')
})

afterAll(() => {
  _setSvgToPngUrl(null as unknown as (svg: string, w: number, h: number) => Promise<string>)
})

const mockDoc = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  addImage: vi.fn(),
  output: vi.fn().mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' })),
}
function JsPDFMock() { return mockDoc }

vi.mock('jspdf', () => ({
  default: JsPDFMock,
  jsPDF: JsPDFMock,
}))

function makeMockPlan(overrides: Partial<PlanModel> = {}): PlanModel {
  return {
    id: 'test-plan-1',
    designOptionId: 'design-1',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', x: 0, y: 0, width: 6, height: 5, name: 'Living Room' },
      { id: 'r2', x: 6, y: 0, width: 4, height: 5, name: 'Bedroom' },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', offset: 0.3, width: 0.9, kind: 'door' },
      { id: 'o2', wallId: 'w2', offset: 0.5, width: 1.2, kind: 'window' },
    ],
    scaleLabel: '1:100 @ A3',
    planSource: 'unknown',
    ...overrides,
  }
}

describe('exportPlanToPdf', () => {
  it('returns a Blob', async () => {
    const blob = await exportPlanToPdf(makeMockPlan())
    expect(blob).toBeInstanceOf(Blob)
  })

  it('accepts custom format and orientation', async () => {
    await expect(
      exportPlanToPdf(makeMockPlan(), { format: 'a3', orientation: 'portrait' }),
    ).resolves.toBeInstanceOf(Blob)
  })

  it('accepts title and project name options', async () => {
    await expect(
      exportPlanToPdf(makeMockPlan(), { title: 'TEST', projectName: 'My Project', sheetNumber: 1, totalSheets: 3 }),
    ).resolves.toBeInstanceOf(Blob)
  })

  it('handles plan with no rooms', async () => {
    await expect(
      exportPlanToPdf(makeMockPlan({ rooms: [], openings: [] })),
    ).resolves.toBeInstanceOf(Blob)
  })

  it('handles plan with no walls', async () => {
    await expect(
      exportPlanToPdf(makeMockPlan({ walls: [], openings: [] })),
    ).resolves.toBeInstanceOf(Blob)
  })

  it('defaults to A4 landscape', async () => {
    const blob = await exportPlanToPdf(makeMockPlan())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })
})
