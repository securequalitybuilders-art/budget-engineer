// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StructuralGeneratorPanel } from '../components/structural/StructuralGeneratorPanel'
import { MaterialSwitchPanel } from '../components/structural/MaterialSwitchPanel'
import { ClashHealerPanel } from '../components/structural/ClashHealerPanel'
import type { BuildingGraph } from '../domain/building'

afterEach(cleanup)

function sampleGraph(): BuildingGraph {
  return {
    meta: { projectId: 'p1', projectName: 'Test', projectType: 'residential', clientName: '', createdAt: '', updatedAt: '', version: '1.0', units: 'metric', coordinates: { lat: 0, lng: 0 }, description: '' },
    dimensions: { length: 10, width: 8, height: 6, area: 80, levels: 1, maxHeight: 6 },
    walls: [
      { id: 'w1', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, length: 10, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
      { id: 'w2', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 8, z: 0 }, length: 8, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
      { id: 'w3', start: { x: 10, y: 8, z: 0 }, end: { x: 0, y: 8, z: 0 }, length: 10, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
      { id: 'w4', start: { x: 0, y: 8, z: 0 }, end: { x: 0, y: 0, z: 0 }, length: 8, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
    ],
    slabs: [],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'window', width: 1.2, height: 1.5, sillHeight: 0.9, xPosition: 0.1 },
      { id: 'o2', wallId: 'w1', kind: 'door', width: 0.9, height: 2.1, sillHeight: 0, xPosition: 5 },
    ],
    spaces: [{ id: 'sp1', name: 'Main', programme: 'living', levelId: 'l1', areaM2: 80, bbox: { minX: 0, minY: 0, maxX: 10, maxY: 8 } }],
    levels: [{ id: 'l1', name: 'Ground', elevation: 0, height: 3, order: 0 }],
    columns: [], beams: [], stairs: [], roof: null, materials: [],
    structural: { foundation: 'strip', framing: 'timber', roofType: 'pitched' },
    mechanical: { coolingLoad: 10, heatingLoad: 12, ventilationRate: 1.5 },
  }
}

describe('StructuralGeneratorPanel', () => {
  it('shows empty state when graph is null', () => {
    const { container } = render(<StructuralGeneratorPanel graph={null} />)
    expect(container.textContent).toMatch(/no design selected/i)
  })

  it('shows column/beam/footing counts when graph is provided', () => {
    render(<StructuralGeneratorPanel graph={sampleGraph()} />)
    expect(screen.getByText('Columns')).toBeTruthy()
    expect(screen.getByText('Beams')).toBeTruthy()
    expect(screen.getByText('Footings')).toBeTruthy()
  })

  it('shows design summary with wall/space/floor counts', () => {
    render(<StructuralGeneratorPanel graph={sampleGraph()} />)
    expect(screen.getByText(/Walls:/)).toBeTruthy()
    expect(screen.getByText(/Spaces:/)).toBeTruthy()
    expect(screen.getByText(/Floors:/)).toBeTruthy()
  })

  it('shows column positions', () => {
    render(<StructuralGeneratorPanel graph={sampleGraph()} />)
    expect(screen.getByText(/C1:/)).toBeTruthy()
    expect(screen.getByText('Column Positions')).toBeTruthy()
  })

  it('shows footing placements', () => {
    render(<StructuralGeneratorPanel graph={sampleGraph()} />)
    expect(screen.getByText(/F1:/)).toBeTruthy()
    expect(screen.getByText('Footing Placements')).toBeTruthy()
  })
})

describe('MaterialSwitchPanel', () => {
  it('renders material selection buttons', () => {
    render(<MaterialSwitchPanel slabAreaM2={100} />)
    expect(screen.getByText('Concrete')).toBeTruthy()
    expect(screen.getByText('Steel')).toBeTruthy()
    expect(screen.getByText('Timber')).toBeTruthy()
  })

  it('shows rate table', () => {
    render(<MaterialSwitchPanel slabAreaM2={100} />)
    expect(screen.getByText(/Rate Table/i)).toBeTruthy()
    expect(screen.getAllByText(/Wall/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows cost estimate', () => {
    render(<MaterialSwitchPanel slabAreaM2={100} />)
    expect(screen.getByText(/Rebar required/)).toBeTruthy()
    expect(screen.getByText(/Estimated structural total/)).toBeTruthy()
  })

  it('shows IFC classification', () => {
    render(<MaterialSwitchPanel slabAreaM2={100} />)
    expect(screen.getByText(/IFC Classification/i)).toBeTruthy()
    expect(screen.getByText('IfcColumn')).toBeTruthy()
  })

  it('shows slab area input', () => {
    render(<MaterialSwitchPanel slabAreaM2={50} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
    expect((inputs[0] as HTMLInputElement).value).toBe('50')
  })
})

describe('ClashHealerPanel', () => {
  it('shows empty state when graph is null', () => {
    const { container } = render(<ClashHealerPanel graph={null} />)
    expect(container.textContent).toMatch(/no design selected/i)
  })

  it('shows wall and opening counts', () => {
    const { container } = render(<ClashHealerPanel graph={sampleGraph()} />)
    expect(container.textContent).toMatch(/Walls/)
    expect(container.textContent).toMatch(/Openings/)
  })

  it('shows run clash detection button', () => {
    render(<ClashHealerPanel graph={sampleGraph()} />)
    expect(screen.getByRole('button', { name: /run clash detection/i })).toBeTruthy()
  })

  it('shows potential clash warning', () => {
    render(<ClashHealerPanel graph={sampleGraph()} />)
    expect(screen.getByText(/Potential clashes detected/i)).toBeTruthy()
  })
})
