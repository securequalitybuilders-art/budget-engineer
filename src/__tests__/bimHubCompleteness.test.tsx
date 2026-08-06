// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act } from 'react'
import { SiteAnalysisStage } from '@/components/dashboard/stages/SiteAnalysisStage'
import { EnhancedBriefPanel } from '@/components/ai/EnhancedBriefPanel'
import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { useGlbExport } from '@/hooks/useGlbExport'
import { loadSiteContext, persistSiteContext } from '@/lib/site/siteContextReader'
import { createDefaultSiteContext } from '@/engine/analysis/siteAnalysisEngine'
import { ROUGH_IN_PHASE } from '@/engine/construction/constructionPhases'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

const design: DesignOption = {
  id: 'd1',
  name: 'Test Design',
  grossFloorArea: 80,
  floors: 1,
  buildingType: 'house',
  elements: [],
}

function renderSiteStage(projectId = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/project/${projectId}`]}>
      <Routes>
        <Route path="/project/:id" element={<SiteAnalysisStage selectedDesign={design} activePlan={null} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BIM hub completeness — Site Analysis', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('shows an empty state with quick setup when no site context exists', () => {
    renderSiteStage()
    expect(screen.getByText('Site Analysis')).toBeTruthy()
    expect(screen.getByText(/No site data available/)).toBeTruthy()
    expect(screen.getByText('Quick Setup (Default Site)')).toBeTruthy()
  })

  it('Quick Setup persists a default site context to localStorage', () => {
    renderSiteStage('p2')
    fireEvent.click(screen.getByText('Quick Setup (Default Site)'))
    const site = loadSiteContext('p2')
    expect(site).not.toBeNull()
    expect(screen.queryByText('Quick Setup (Default Site)')).toBeNull()
  })

  it('renders all six analysis diagrams from the real engine when toggled', () => {
    persistSiteContext('p3', createDefaultSiteContext('p3'))
    renderSiteStage('p3')
    fireEvent.click(screen.getByText('Show Analysis Diagrams'))
    expect(screen.queryByText('No site analysis diagrams available. Configure the site context first.')).toBeNull()
    const labels = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent)
    expect(labels).toContain('Sun & Wind Path')
    expect(labels).toContain('Access & Noise')
    expect(labels).toContain('Figure-Ground')
    expect(labels).toContain('Natural Features')
    expect(labels).toContain('Permeability & Transport')
    expect(labels).toContain('Concept & Urban Context')
  })
})

describe('BIM hub completeness — Brief to site context persistence', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('Generate persists the site context keyed by project when a city is chosen', () => {
    render(<EnhancedBriefPanel projectId="p4" />)
    const citySelect = screen.getByRole('combobox')
    fireEvent.change(citySelect, { target: { value: 'Harare, Zimbabwe' } })
    fireEvent.click(screen.getByText('Generate 3 Design Concepts →'))
    const site = loadSiteContext('p4')
    expect(site).not.toBeNull()
    expect(site?.lat).toBeCloseTo(-17.825, 2)
    expect(site?.lng).toBeCloseTo(31.033, 2)
  })
})

describe('BIM hub completeness — Construction phase status persistence', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('toggling a work item persists its status and restores it on a fresh mount', () => {
    const { unmount } = render(<ConstructionPhaseView phase={ROUGH_IN_PHASE} projectId="p5" />)
    expect(screen.getByText('7 pending')).toBeTruthy()
    fireEvent.click(screen.getByText('Water supply pipework'))
    expect(screen.getByText('1 in progress')).toBeTruthy()
    const persisted = JSON.parse(localStorage.getItem('construction-phase-p5-rough-in') as string)
    expect(persisted['ri-water-supply']).toBe('in-progress')

    unmount()
    render(<ConstructionPhaseView phase={ROUGH_IN_PHASE} projectId="p5" />)
    expect(screen.getByText('1 in progress')).toBeTruthy()
    expect(screen.queryByText('7 pending')).toBeNull()
  })

  it('does not write to localStorage without a projectId', () => {
    render(<ConstructionPhaseView phase={ROUGH_IN_PHASE} />)
    fireEvent.click(screen.getByText('Water supply pipework'))
    expect(localStorage.getItem('construction-phase-undefined-rough-in')).toBeNull()
  })
})

describe('BIM hub completeness — GLB generation guards', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('generate returns a clear error instead of a blank viewer when the plan has no geometry', async () => {
    const emptyPlan: PlanModel = {
      id: 'empty',
      designOptionId: 'd1',
      width: 10,
      height: 8,
      wallThickness: 0.22,
      scaleLabel: '1:100',
      rooms: [{ id: 'r1', name: 'Room 1', x: 0, y: 0, width: 10, height: 8 }],
      walls: [],
      openings: [],
    }
    function Harness() {
      const { error, generate } = useGlbExport()
      return (
        <div>
          <button onClick={() => generate(emptyPlan, design)}>run</button>
          <span data-testid="result">{error ?? ''}</span>
        </div>
      )
    }
    render(<Harness />)
    await act(async () => {
      fireEvent.click(screen.getByText('run'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(screen.getByTestId('result').textContent).toMatch(/no walls or slabs/i)
  })
})
