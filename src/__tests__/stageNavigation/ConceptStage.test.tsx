// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { ConceptStage } from '@/components/dashboard/stages/ConceptStage'
import type { PipelineResult } from '@/engine/pipeline/generativeDesignPipeline'

const emptyPipelineResult = {
  success: true,
  brief: { typology: null, typologyConfidence: 0, siteInfo: {}, program: [] },
  enhancedBrief: { spatialConstraints: [] },
  optimizerResult: null,
  selectedCandidate: null,
  planModel: null,
  councilPackage: null,
  complianceReport: null,
  designOption: { id: 'pipeline-dummy', name: 'Pipeline', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] },
  steps: [],
  errors: [],
} as unknown as PipelineResult

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

describe('ConceptStage', () => {
  it('shows empty state when no design options', () => {
    render(
      <ConceptStage
        visibleDesignOptions={[]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(screen.getByText('Design Options')).toBeTruthy()
    expect(screen.getByText('Generate Design Options')).toBeTruthy()
  })

  it('shows design option cards when options exist', () => {
    const mockOptions = [
      { id: 'opt-1', name: 'Test Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] },
    ]
    render(
      <ConceptStage
        visibleDesignOptions={mockOptions}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(screen.getByText('Choose your design')).toBeTruthy()
    expect(screen.getAllByText('Test Design').length).toBeGreaterThanOrEqual(1)
  })

  it('shows edit button when design selected', () => {
    const mockDesign = { id: 'opt-1', name: 'Test', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <ConceptStage
        visibleDesignOptions={[mockDesign]}
        selectedDesignId="opt-1"
        setSelectedDesignId={vi.fn()}
        selectedDesign={mockDesign}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(screen.getByText('Edit in Canvas')).toBeTruthy()
  })

  it('shows pipeline button in empty state', () => {
    render(
      <ConceptStage
        visibleDesignOptions={[]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
      />
    )
    expect(screen.getByText('Run AI Pipeline')).toBeTruthy()
  })

  it('shows pipeline button in design-options view', () => {
    const mockDesign = { id: 'opt-1', name: 'Test', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <ConceptStage
        visibleDesignOptions={[mockDesign]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
      />
    )
    const buttons = screen.getAllByText('Run AI Pipeline')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('disables pipeline button when brief is empty', () => {
    render(
      <ConceptStage
        visibleDesignOptions={[]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
      />
    )
    const btn = screen.getByText('Run AI Pipeline')
    expect((btn.closest('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows loading spinner when pipeline is running', () => {
    render(
      <ConceptStage
        visibleDesignOptions={[]}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
        isPipelineRunning={true}
        pipelineStatus="Optimizing..."
      />
    )
    expect(screen.queryAllByText('Optimizing...').length).toBeGreaterThanOrEqual(1)
  })

  it('shows AI badge on pipeline-generated designs', () => {
    const mockOptions = [
      { id: 'pipeline-123', name: 'AI Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] },
    ]
    render(
      <ConceptStage
        visibleDesignOptions={mockOptions}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
      />
    )
    expect(screen.getByText('AI')).toBeTruthy()
  })

  it('does not show AI badge on regular designs', () => {
    const mockOptions = [
      { id: 'opt-1', name: 'Normal Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] },
    ]
    render(
      <ConceptStage
        visibleDesignOptions={mockOptions}
        selectedDesignId={null}
        setSelectedDesignId={vi.fn()}
        selectedDesign={null}
        handleGenerate={vi.fn()}
        isGenerating={false}
      />
    )
    expect(screen.queryByText('AI')).toBeNull()
  })

  it('shows View Results button when pipeline design is selected and result exists', () => {
    const mockDesign = { id: 'pipeline-123', name: 'AI Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <ConceptStage
        visibleDesignOptions={[mockDesign]}
        selectedDesignId="pipeline-123"
        setSelectedDesignId={vi.fn()}
        selectedDesign={mockDesign}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
        pipelineResult={emptyPipelineResult}
      />
    )
    expect(screen.getByText('View Results')).toBeTruthy()
  })

  it('does not show View Results button when pipeline result is null', () => {
    const mockDesign = { id: 'pipeline-123', name: 'AI Design', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <ConceptStage
        visibleDesignOptions={[mockDesign]}
        selectedDesignId="pipeline-123"
        setSelectedDesignId={vi.fn()}
        selectedDesign={mockDesign}
        handleGenerate={vi.fn()}
        isGenerating={false}
        onRunPipeline={vi.fn()}
      />
    )
    expect(screen.queryByText('View Results')).toBeNull()
  })

  it('does not show View Results button for non-pipeline designs', () => {
    const mockDesign = { id: 'opt-1', name: 'Normal', grossFloorArea: 100, floors: 1, buildingType: 'house', elements: [] }
    render(
      <ConceptStage
        visibleDesignOptions={[mockDesign]}
        selectedDesignId="opt-1"
        setSelectedDesignId={vi.fn()}
        selectedDesign={mockDesign}
        handleGenerate={vi.fn()}
        isGenerating={false}
        pipelineResult={emptyPipelineResult}
      />
    )
    expect(screen.queryByText('View Results')).toBeNull()
  })
})
