// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PipelineResultsPanel } from '@/components/dashboard/PipelineResultsPanel'

afterEach(cleanup)

function makeMockResult(overrides?: Record<string, unknown>) {
  return {
    success: true,
    brief: { typology: { id: 'house', displayName: 'House' }, typologyConfidence: 1, siteInfo: {}, program: [] },
    enhancedBrief: { spatialConstraints: [], ...(overrides?.enhancedBrief as object || {}) } as never,
    optimizerResult: {
      candidates: [
        { id: 'c1', topology: 'rectangle', seed: 42, scores: { efficiency: 0.85, wetCoreClustering: 0.7, structuralEfficiency: 0.9, circulation: 0.8, daylightAccess: 0.75 }, planModel: { rooms: [], walls: [], width: 10, height: 10 } },
      ],
      paretoFront: ['c1'],
      topByProfile: { balanced: ['c1'] },
      parameters: {},
    },
    selectedCandidate: { topology: 'rectangle', seed: 42, scores: { efficiency: 0.85, wetCoreClustering: 0.7, structuralEfficiency: 0.9, circulation: 0.8, daylightAccess: 0.75 }, planModel: { rooms: [], walls: [], width: 10, height: 10 } },
    planModel: { rooms: [], walls: [], width: 10, height: 10 },
    councilPackage: {
      sheets: [{ sheetNumber: 'A-01', sheetTitle: 'Site Plan', discipline: 'ARCH', scale: '1:100' }],
      drawingRegister: [{ sheetRef: 'A-01', drawingTitle: 'Site Plan' }],
      roomSchedule: [{ roomName: 'Bedroom 1', areaM2: 16, classification: 'habitable' }],
      boqSummary: { currency: 'ZAR', totalCost: 850000, categories: {} },
      titleBlock: { projectName: 'Test', date: '2024-01-01', revision: '0' },
    },
    complianceReport: {
      jurisdiction: 'south-africa',
      score: 72,
      passedRules: 18,
      totalRules: 25,
      passed: true,
      rules: [],
      warnings: ['Window-to-wall ratio below 15% in living room'],
      errors: [],
    },
    designOption: { id: 'pipeline-test', name: 'Pipeline Design', grossFloorArea: 120, floors: 1, buildingType: 'house', elements: [] },
    steps: [
      { name: 'Brief Parsing', status: 'passed', durationMs: 45 },
      { name: 'Brief Enhancement', status: 'passed', durationMs: 12 },
      { name: 'Multi-Objective Optimization', status: 'passed', durationMs: 320 },
      { name: 'Compliance Check', status: 'passed', durationMs: 88 },
      { name: 'Council Package Assembly', status: 'passed', durationMs: 15 },
    ],
    errors: [],
    ...overrides,
  } as never
}

describe('PipelineResultsPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<PipelineResultsPanel result={null} isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when result is null', () => {
    const { container } = render(<PipelineResultsPanel result={null} isOpen={true} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows success status when pipeline succeeded', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Pipeline Results')).toBeTruthy()
    expect(screen.getByText('Design generated successfully')).toBeTruthy()
  })

  it('shows failure status when pipeline failed', () => {
    render(<PipelineResultsPanel result={makeMockResult({ success: false, errors: ['Optimization failed'] })} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Pipeline completed with errors')).toBeTruthy()
  })

  it('displays all pipeline steps', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Brief Parsing')).toBeTruthy()
    expect(screen.getByText('Brief Enhancement')).toBeTruthy()
    expect(screen.getByText('Multi-Objective Optimization')).toBeTruthy()
    expect(screen.getByText('Compliance Check')).toBeTruthy()
    expect(screen.getByText('Council Package Assembly')).toBeTruthy()
  })

  it('shows compliance score and rule count', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('18/25 rules passed')).toBeTruthy()
  })

  it('shows compliance warnings when present', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Window-to-wall ratio below 15% in living room')).toBeTruthy()
  })

  it('shows council package info', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Sheets')).toBeTruthy()
  })

  it('shows optimization section with candidate info', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    const rectangles = screen.getAllByText('rectangle')
    expect(rectangles.length).toBeGreaterThanOrEqual(1)
  })

  it('shows download report button', () => {
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={vi.fn()} />)
    const reports = screen.getAllByText('Report')
    expect(reports.length).toBeGreaterThanOrEqual(1)
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<PipelineResultsPanel result={makeMockResult()} isOpen={true} onClose={onClose} />)
    const buttons = screen.getAllByLabelText('Close results panel')
    fireEvent.click(buttons[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows spatial constraints when present', () => {
    const result = makeMockResult({
      enhancedBrief: {
        spatialConstraints: [{ type: 'adjacency', source: 'kitchen', target: 'dining', relation: 'adjacent', weight: 0.9 }],
      },
    })
    render(<PipelineResultsPanel result={result} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('adjacency: kitchen → dining')).toBeTruthy()
  })
})
