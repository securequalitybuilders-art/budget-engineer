import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/llm/freeRouter', () => ({
  generateFree: vi.fn(),
}))

import { generateFree } from '@/lib/llm/freeRouter'
import type { ParsedBrief } from '@/lib/ai/ai-types'
import { genericGroupFor } from '@/engine/spatial/topological-graph'
import {
  BUILD_BUBBLE_PROMPT,
  buildBubbleDiagram,
  buildBubbleDiagramLocal,
  coerceBubbleDiagram,
  generateBubbleDiagramRemote,
  programFromBrief,
} from '@/engine/spatial/bubble-diagram'

const mockGenerateFree = vi.mocked(generateFree)

const houseBrief: ParsedBrief = {
  buildingType: 'house',
  bedrooms: 3,
  bathrooms: 2,
  floors: 1,
  approxAreaM2: 120,
  features: ['open plan'],
  raw: '3 bedroom house with garden',
}

const officeBrief: ParsedBrief = {
  buildingType: 'office',
  bedrooms: 0,
  bathrooms: 1,
  floors: 2,
  approxAreaM2: 420,
  features: [],
  raw: 'four storey office block in town',
}

const customBrief: ParsedBrief = {
  buildingType: 'custom-cabin',
  bedrooms: 2,
  bathrooms: 1,
  floors: 2,
  approxAreaM2: 60,
  features: [],
  raw: 'custom cabin project, two levels',
}

function validDiagramJson(): string {
  return JSON.stringify({
    nodes: [
      { name: 'Entry Lounge', areaM2: 20 },
      { name: 'Kitchen', areaM2: 10 },
      { name: 'Corridor', areaM2: 8 },
      { name: 'Bedroom', areaM2: 12 },
    ],
    edges: [
      { from: 0, to: 2, weight: 2, must: false },
      { from: 1, to: 2, weight: 3, must: true },
    ],
  })
}

describe('programFromBrief', () => {
  it('uses the detected typology default program', () => {
    const program = programFromBrief(houseBrief)
    const groups = program.map(item => genericGroupFor(item.name))
    expect(groups.some(g => g === 'living')).toBe(true)
    expect(groups.some(g => g === 'kitchen')).toBe(true)
    expect(groups.some(g => g === 'wc')).toBe(true)
  })

  it('reconciles bedroom count around the master bedroom', () => {
    const program = programFromBrief(houseBrief)
    const master = program.find(item => /master/i.test(item.name))
    const plain = program.find(
      item => !/master/i.test(item.name) && genericGroupFor(item.name) === 'bedroom',
    )
    expect(master?.count).toBe(1)
    expect(plain?.count).toBe(houseBrief.bedrooms - 1)
  })

  it('pushes bedrooms when the typology program has none', () => {
    const program = programFromBrief({ ...officeBrief, bedrooms: 3 })
    const bedroom = program.find(item => genericGroupFor(item.name) === 'bedroom')
    expect(bedroom?.name).toBe('Bedroom')
    expect(bedroom?.count).toBe(3)
  })

  it('reconciles bathroom count onto a wc-group item', () => {
    const program = programFromBrief(houseBrief)
    const wc = program.find(item => genericGroupFor(item.name) === 'wc')
    expect(wc?.count).toBe(houseBrief.bathrooms)
  })

  it('builds a deterministic fallback program for unknown building types', () => {
    const program = programFromBrief(customBrief)
    const bedroom = program.find(item => genericGroupFor(item.name) === 'bedroom')
    const bathroom = program.find(item => genericGroupFor(item.name) === 'wc')
    expect(bedroom?.count).toBe(2)
    expect(bathroom?.count).toBe(1)
    expect(genericGroupFor(program[0]!.name)).toBe('living')
    expect(program.some(item => genericGroupFor(item.name) === 'stair')).toBe(true)
  })

  it('omits the staircase for single-storey fallback programs', () => {
    const program = programFromBrief({ ...customBrief, floors: 1 })
    expect(program.some(item => genericGroupFor(item.name) === 'stair')).toBe(false)
  })

  it('clamps oversized counts', () => {
    const program = programFromBrief({ ...customBrief, bedrooms: 50, bathrooms: 30 })
    const bedroom = program.find(item => genericGroupFor(item.name) === 'bedroom')
    const bathroom = program.find(item => genericGroupFor(item.name) === 'wc')
    expect(bedroom?.count).toBe(20)
    expect(bathroom?.count).toBe(20)
  })
})

describe('buildBubbleDiagramLocal', () => {
  it('expands every program item into a node', () => {
    const program = programFromBrief(houseBrief)
    const expected = program.reduce((sum, item) => sum + Math.max(1, Math.round(item.count)), 0)
    const diagram = buildBubbleDiagramLocal(houseBrief)
    expect(diagram.nodes.length).toBe(expected)
  })

  it('produces edges that reference known node ids', () => {
    const diagram = buildBubbleDiagramLocal(houseBrief)
    const ids = new Set(diagram.nodes.map(node => node.id))
    expect(diagram.edges.length).toBeGreaterThan(0)
    for (const edge of diagram.edges) {
      expect(ids.has(edge.from)).toBe(true)
      expect(ids.has(edge.to)).toBe(true)
    }
  })

  it('stamps the typology id and program summary', () => {
    const diagram = buildBubbleDiagramLocal(houseBrief)
    expect(diagram.typologyId).toBe('house-residential')
    expect(diagram.programSummary?.roomCount).toBe(diagram.nodes.length)
    const sum = diagram.nodes.reduce((total, node) => total + node.areaM2, 0)
    expect(diagram.programSummary?.totalAreaM2).toBeCloseTo(sum, 2)
  })

  it('routes an office brief through the office adjacency rules', () => {
    const diagram = buildBubbleDiagramLocal(officeBrief)
    expect(diagram.typologyId).toBe('office-commercial')
    expect(diagram.edges.length).toBeGreaterThan(0)
    expect(diagram.programSummary?.roomCount).toBe(diagram.nodes.length)
  })
})

describe('coerceBubbleDiagram', () => {
  it('rebuilds a valid index-edge diagram with locally derived roles/groups', () => {
    const fallback = buildBubbleDiagramLocal(houseBrief)
    const diagram = coerceBubbleDiagram(JSON.parse(validDiagramJson()), fallback)
    expect(diagram.nodes.length).toBe(4)
    const kitchen = diagram.nodes.find(node => node.name === 'Kitchen')
    expect(kitchen?.group).toBe('kitchen')
    expect(kitchen?.role).toBe('service')
    expect(diagram.edges).toContainEqual(
      expect.objectContaining({ to: 'corridor-2', must: true, weight: 3 }),
    )
    expect(diagram.programSummary?.roomCount).toBe(4)
  })

  it('accepts string-id edges when they match rebuilt node ids', () => {
    const fallback = buildBubbleDiagramLocal(houseBrief)
    const diagram = coerceBubbleDiagram(
      {
        nodes: [
          { name: 'Kitchen', areaM2: 10 },
          { name: 'Dining Room', areaM2: 12 },
        ],
        edges: [{ from: 'kitchen-0', to: 'dining-room-1' }],
      },
      fallback,
    )
    expect(diagram.edges).toContainEqual(expect.objectContaining({ from: 'kitchen-0', to: 'dining-room-1' }))
  })

  it('returns the fallback reference for non-object input', () => {
    const fallback = buildBubbleDiagramLocal(houseBrief)
    expect(coerceBubbleDiagram(null, fallback)).toBe(fallback)
    expect(coerceBubbleDiagram('nope', fallback)).toBe(fallback)
  })

  it('returns the fallback when no valid nodes survive', () => {
    const fallback = buildBubbleDiagramLocal(houseBrief)
    const diagram = coerceBubbleDiagram({ nodes: [{ name: '  ' }, { name: '' }] }, fallback)
    expect(diagram).toBe(fallback)
  })

  it('drops edges with unknown references and re-derives from generic rules', () => {
    const fallback = buildBubbleDiagramLocal(houseBrief)
    const diagram = coerceBubbleDiagram(
      {
        nodes: [{ name: 'Kitchen', areaM2: 10 }, { name: 'Bedroom', areaM2: 12 }],
        edges: [
          { from: 0, to: 99 },
          { from: 99, to: 1 },
          { from: 0, to: 1 },
        ],
      },
      fallback,
    )
    const ids = new Set(diagram.nodes.map(node => node.id))
    expect(diagram.edges.length).toBeGreaterThan(0)
    for (const edge of diagram.edges) {
      expect(ids.has(edge.from)).toBe(true)
      expect(ids.has(edge.to)).toBe(true)
    }
  })
})

describe('BUILD_BUBBLE_PROMPT', () => {
  it('describes the strict JSON schema', () => {
    expect(BUILD_BUBBLE_PROMPT).toContain('"nodes"')
    expect(BUILD_BUBBLE_PROMPT).toContain('"edges"')
    expect(BUILD_BUBBLE_PROMPT).toContain('"areaM2"')
    expect(BUILD_BUBBLE_PROMPT).toContain('0-based indices')
  })
})

describe('generateBubbleDiagramRemote', () => {
  beforeEach(() => {
    mockGenerateFree.mockReset()
  })

  it('falls back to the local diagram when no key is configured', async () => {
    mockGenerateFree.mockResolvedValue({ text: null, error: 'No free-tier chat API key configured' })
    const result = await generateBubbleDiagramRemote(houseBrief)
    expect(result.method).toBe('local')
    expect(result.fellBack).toBe(true)
    expect(result.fallbackReason).toContain('No free-tier')
  })

  it('accepts valid LLM JSON as a remote diagram', async () => {
    mockGenerateFree.mockResolvedValue({ text: validDiagramJson() })
    const result = await generateBubbleDiagramRemote(houseBrief)
    expect(result.method).toBe('remote')
    expect(result.fellBack).toBe(false)
    expect(result.diagram.nodes.some(node => node.name === 'Entry Lounge')).toBe(true)
  })

  it('falls back when the LLM output is not parseable JSON', async () => {
    mockGenerateFree.mockResolvedValue({ text: 'sure, here is the bubble diagram' })
    const result = await generateBubbleDiagramRemote(houseBrief)
    expect(result.method).toBe('local')
    expect(result.fellBack).toBe(true)
  })

  it('falls back when the LLM JSON has no valid nodes', async () => {
    mockGenerateFree.mockResolvedValue({ text: JSON.stringify({ nodes: [] }) })
    const result = await generateBubbleDiagramRemote(houseBrief)
    expect(result.method).toBe('local')
    expect(result.fellBack).toBe(true)
    expect(result.fallbackReason).toContain('did not validate')
  })
})

describe('buildBubbleDiagram', () => {
  beforeEach(() => {
    mockGenerateFree.mockReset()
  })

  it('returns the deterministic local diagram when remote is disabled', async () => {
    const result = await buildBubbleDiagram(houseBrief, { remote: false })
    expect(result.method).toBe('local')
    expect(result.fellBack).toBe(false)
    expect(mockGenerateFree).not.toHaveBeenCalled()
  })

  it('degrades to local when the default path finds no key', async () => {
    mockGenerateFree.mockResolvedValue({ text: null, error: 'no key' })
    const result = await buildBubbleDiagram(houseBrief)
    expect(result.method).toBe('local')
    expect(result.fellBack).toBe(true)
  })

  it('prefers the remote diagram when valid JSON is returned', async () => {
    mockGenerateFree.mockResolvedValue({ text: validDiagramJson() })
    const result = await buildBubbleDiagram(houseBrief)
    expect(result.method).toBe('remote')
    expect(result.fellBack).toBe(false)
  })
})
