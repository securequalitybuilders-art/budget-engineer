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
    meta: { id: 'p1', projectId: 'p1', name: 'Test', category: 'residential' as const, description: '', createdAt: '', updatedAt: '' },
    site: null,
    levels: [{ id: 'l1', name: 'Ground', number: 0, elevation: 0, floorHeight: 3 }],
    spaces: [{ id: 'sp1', name: 'Main', programme: 'living' as const, levelId: 'l1', areaM2: 80, bbox: { minX: 0, minY: 0, maxX: 10, maxY: 8 }, boundary: { vertices: [] }, finishSpec: { wallMaterialId: null, floorMaterialId: null, ceilingMaterialId: null, wallFinish: '', floorFinish: '', ceilingFinish: '' }, fixtures: [], notes: '' }],
    walls: [
      { id: 'w1', levelId: 'l1', role: 'external' as const, start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w2', levelId: 'l1', role: 'external' as const, start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 8, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w3', levelId: 'l1', role: 'external' as const, start: { x: 10, y: 8, z: 0 }, end: { x: 0, y: 8, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
      { id: 'w4', levelId: 'l1', role: 'external' as const, start: { x: 0, y: 8, z: 0 }, end: { x: 0, y: 0, z: 0 }, thickness: 0.2, height: 3, material: 'brick', ifcClass: 'IfcWall', properties: {} },
    ],
    slabs: [],
    openings: [
      { id: 'o1', levelId: 'l1', wallId: 'w1', kind: 'window' as const, offsetRatio: 0.01, width: 1.2, height: 1.5, sillHeight: 0.9, material: 'aluminium', ifcClass: 'IfcWindow', properties: {} },
      { id: 'o2', levelId: 'l1', wallId: 'w1', kind: 'door' as const, offsetRatio: 0.5, width: 0.9, height: 2.1, sillHeight: 0, material: 'timber', ifcClass: 'IfcDoor', properties: {} },
    ],
    columns: [], beams: [], stairs: [], roof: null,
    structural: null,
    serviceZones: [],
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
