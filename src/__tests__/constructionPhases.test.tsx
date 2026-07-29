// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

afterEach(cleanup)
import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { ROUGH_IN_PHASE, SUBSTRATES_PHASE, MILLWORK_PHASE, FINISHES_PHASE, APPLIANCES_PHASE, PHASES } from '@/engine/construction/constructionPhases'
import type { ConstructionPhase, WorkItem, MaterialSpec, PhaseBomEntry } from '@/domain/construction'

describe('ConstructionPhase domain types', () => {
  it('defines all 5 phases in PHASES registry', () => {
    expect(Object.keys(PHASES)).toEqual(['rough-in', 'substrates', 'millwork', 'finishes', 'appliances'])
  })

  it.each([
    ['rough-in', ROUGH_IN_PHASE],
    ['substrates', SUBSTRATES_PHASE],
    ['millwork', MILLWORK_PHASE],
    ['finishes', FINISHES_PHASE],
    ['appliances', APPLIANCES_PHASE],
  ])('%s has required fields', (_id, phase: ConstructionPhase) => {
    expect(phase.title).toBeTruthy()
    expect(phase.description).toBeTruthy()
    expect(phase.trade).toBeTruthy()
    expect(phase.estimatedDays).toBeGreaterThan(0)
    expect(phase.workItems.length).toBeGreaterThanOrEqual(5)
    expect(phase.materials.length).toBeGreaterThanOrEqual(2)
    expect(phase.bom.length).toBeGreaterThanOrEqual(2)
  })

  it.each([
    ['workItems', ROUGH_IN_PHASE.workItems],
    ['workItems', SUBSTRATES_PHASE.workItems],
    ['workItems', MILLWORK_PHASE.workItems],
    ['workItems', FINISHES_PHASE.workItems],
    ['workItems', APPLIANCES_PHASE.workItems],
  ])('%s all have required fields', (_label, items: WorkItem[]) => {
    for (const w of items) {
      expect(w.id).toBeTruthy()
      expect(w.label).toBeTruthy()
      expect(w.description).toBeTruthy()
      expect(w.unit).toBeTruthy()
      expect(w.quantity).toBeGreaterThan(0)
      expect(w.material).toBeTruthy()
      expect(w.spec).toBeTruthy()
      expect(['pending', 'in-progress', 'completed']).toContain(w.status)
    }
  })

  it.each([
    ['materials', ROUGH_IN_PHASE.materials],
    ['materials', SUBSTRATES_PHASE.materials],
    ['materials', MILLWORK_PHASE.materials],
    ['materials', FINISHES_PHASE.materials],
    ['materials', APPLIANCES_PHASE.materials],
  ])('%s all have required fields', (_label, items: MaterialSpec[]) => {
    for (const m of items) {
      expect(m.name).toBeTruthy()
      expect(m.spec).toBeTruthy()
      expect(m.application).toBeTruthy()
    }
  })

  it.each([
    ['bom', ROUGH_IN_PHASE.bom],
    ['bom', SUBSTRATES_PHASE.bom],
    ['bom', MILLWORK_PHASE.bom],
    ['bom', FINISHES_PHASE.bom],
    ['bom', APPLIANCES_PHASE.bom],
  ])('%s all have required fields', (_label, items: PhaseBomEntry[]) => {
    for (const b of items) {
      expect(b.item).toBeTruthy()
      expect(b.spec).toBeTruthy()
      expect(b.unit).toBeTruthy()
      expect(b.qty).toBeGreaterThan(0)
    }
  })
})

describe('ConstructionPhaseView', () => {
  it('renders phase title', () => {
    render(<ConstructionPhaseView phase={ROUGH_IN_PHASE} />)
    expect(screen.getByText('Rough-in & Infrastructure')).toBeTruthy()
  })

  it('renders phase description', () => {
    const { container } = render(<ConstructionPhaseView phase={SUBSTRATES_PHASE} />)
    expect(container.textContent).toContain('Wall plastering')
  })

  it('renders trade and estimated days', () => {
    const { container } = render(<ConstructionPhaseView phase={MILLWORK_PHASE} />)
    expect(container.textContent).toContain('Trade:')
    expect(container.textContent).toContain('Est.')
  })

  it('renders work items with clickable status toggle', () => {
    render(<ConstructionPhaseView phase={FINISHES_PHASE} />)
    expect(screen.getByText('Floor tiling (wet areas)')).toBeTruthy()
    expect(screen.getByText('Wooden floor laying')).toBeTruthy()
    expect(screen.getByText('Wall and ceiling painting')).toBeTruthy()
  })

  it('renders materials tab content', () => {
    const { container } = render(<ConstructionPhaseView phase={APPLIANCES_PHASE} />)
    fireEvent.click(container.querySelector('[data-testid="tab-materials"]')!)
    expect(container.textContent).toContain('Built-in electric oven')
    expect(container.textContent).toContain('Gas hob 4-burner')
  })

  it('renders BOQ tab content', () => {
    const { container } = render(<ConstructionPhaseView phase={ROUGH_IN_PHASE} />)
    fireEvent.click(container.querySelector('[data-testid="tab-bom"]')!)
    expect(container.textContent).toContain('Copper pipe 15mm')
    expect(container.textContent).toContain('PVC-U pipe 110mm')
  })

  it('shows progress bar with 0% initially', () => {
    const { container } = render(<ConstructionPhaseView phase={ROUGH_IN_PHASE} />)
    expect(container.textContent).toContain('0%')
  })
})
