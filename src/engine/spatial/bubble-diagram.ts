/**
 * Bubble-diagram generation — the deterministic local path plus an optional
 * free-tier LLM path for turning a ParsedBrief into a BubbleDiagram.
 *
 * The local path derives a program from the brief + typology knowledge base
 * and routes it through bubbleFromProgram (topological-graph.ts), which
 * classifies rooms into groups, derives group-level adjacency edges, and
 * computes a program summary. The remote path asks a free-tier LLM for a
 * JSON bubble diagram and strictly validates the response with
 * coerceBubbleDiagram — any invalid output falls back to the local diagram.
 *
 * This module is intentionally dependency-light and browser-safe (no fs, no
 * network unless a free-tier API key is configured).
 */

import type { ParsedBrief } from '@/lib/ai/ai-types'
import { extractJson } from '@/lib/ai/brief-coercion'
import { generateFree } from '@/lib/llm/freeRouter'
import type { ProgramItem, Typology } from '../tier1-types'
import { detectTypology, getAllTypologies, getTypology } from '../typology-kb'
import {
  bubbleFromProgram,
  classifySpatialRole,
  edgesFromRules,
  genericGroupFor,
  GENERIC_ADJACENCY_RULES,
  type BubbleDiagram,
} from './topological-graph'

export const MAX_BUBBLE_NODES = 25

const DEFAULT_BEDROOM_M2 = 11
const DEFAULT_BATHROOM_M2 = 5
const DEFAULT_STAIRCASE_M2 = 2.4
const DEFAULT_CORRIDOR_M2 = 9
const DEFAULT_LIVING_M2 = 18
const DEFAULT_KITCHEN_M2 = 9
const DEFAULT_DINING_M2 = 12
const MAX_PROGRAM_ITEMS = 40
const MAX_COUNT = 20

/**
 * System prompt for the free-tier LLM bubble-diagram path. The LLM emits a
 * strictly-validated JSON bubble diagram: node indices reference nodes, and
 * role/group/adjacencies are re-derived locally.
 */
export const BUILD_BUBBLE_PROMPT = `You are an architectural space-planning assistant.
Given a building brief, produce a bubble diagram as ONLY a JSON object, no prose, no code fences.
Schema:
{"nodes":[{"name":string,"areaM2":number}],"edges":[{"from":number,"to":number,"weight":number,"must":boolean}]}
Rules:
- "from" and "to" are 0-based indices into "nodes".
- Between 3 and ${MAX_BUBBLE_NODES} nodes.
- Reproduce the exact bedroom and bathroom counts from the brief.
- Include at least one circulation node (corridor / passage / hall).
- For multi-storey briefs include a staircase node.
- areaM2 is in square metres and must be >= 1.
- Rooms that should share a wall get an edge; "must" marks a non-negotiable adjacency (e.g. kitchen to dining, bedroom to corridor).
JSON:`

export interface BubbleDiagramResult {
  diagram: BubbleDiagram
  method: 'remote' | 'local'
  fellBack: boolean
  fallbackReason?: string
}

function clampCount(n: number): number {
  return Math.min(MAX_COUNT, Math.max(0, Math.round(n)))
}

function slugify(name: string, index: number): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'room'
  return `${base}-${index}`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Resolve a typology for a brief: detected from raw text, then buildingType id/alias. */
function typologyForBrief(brief: ParsedBrief): Typology | undefined {
  const detected = detectTypology(brief.raw)
  if (detected.typology) return detected.typology
  const normalized = brief.buildingType.trim().toLowerCase()
  if (!normalized) return undefined
  const exact = getTypology(normalized)
  if (exact) return exact
  return getAllTypologies().find(
    t =>
      t.id.toLowerCase() === normalized ||
      t.aliases.some(alias => alias.toLowerCase() === normalized),
  )
}

function fallbackProgramFromBrief(brief: ParsedBrief): ProgramItem[] {
  const program: ProgramItem[] = [
    { name: 'Living Room', count: 1, areaM2: DEFAULT_LIVING_M2 },
    { name: 'Kitchen', count: 1, areaM2: DEFAULT_KITCHEN_M2 },
    { name: 'Dining Room', count: 1, areaM2: DEFAULT_DINING_M2 },
    { name: 'Corridor', count: 1, areaM2: DEFAULT_CORRIDOR_M2 },
  ]
  if (brief.bedrooms > 0) {
    program.push({ name: 'Bedroom', count: clampCount(brief.bedrooms), areaM2: DEFAULT_BEDROOM_M2 })
  }
  if (brief.bathrooms > 0) {
    program.push({ name: 'Bathroom', count: clampCount(brief.bathrooms), areaM2: DEFAULT_BATHROOM_M2 })
  }
  if (brief.floors > 1) {
    program.push({ name: 'Staircase', count: 1, areaM2: DEFAULT_STAIRCASE_M2 })
  }
  return program
}

function adjustBedroomCount(program: ProgramItem[], target: number): void {
  const t = clampCount(target)
  if (t <= 0) return
  const masterIdx = program.findIndex(item => /master/i.test(item.name))
  const plainIdx = program.findIndex(
    (item, idx) => idx !== masterIdx && genericGroupFor(item.name) === 'bedroom',
  )
  if (plainIdx >= 0) {
    program[plainIdx].count = masterIdx >= 0 ? Math.max(1, t - 1) : t
    return
  }
  if (masterIdx >= 0) {
    program[masterIdx].count = t
    return
  }
  program.push({ name: 'Bedroom', count: t, areaM2: DEFAULT_BEDROOM_M2 })
}

function adjustBathroomCount(program: ProgramItem[], target: number): void {
  const t = clampCount(target)
  if (t <= 0) return
  const idx = program.findIndex(item => genericGroupFor(item.name) === 'wc')
  if (idx >= 0) {
    program[idx].count = t
    return
  }
  program.push({ name: 'Bathroom', count: t, areaM2: DEFAULT_BATHROOM_M2 })
}

function ensureVerticalCirculation(program: ProgramItem[], floors: number): void {
  if (floors <= 1) return
  if (program.some(item => genericGroupFor(item.name) === 'stair')) return
  program.push({ name: 'Staircase', count: 1, areaM2: DEFAULT_STAIRCASE_M2 })
}

/**
 * Derive a ProgramItem[] from a brief. Uses the typology default program
 * (from detection/id/alias) when found and reconciles bedroom/bathroom counts
 * and multi-storey vertical circulation; otherwise builds a deterministic
 * fallback from the brief fields.
 */
export function programFromBrief(brief: ParsedBrief): ProgramItem[] {
  const typology = typologyForBrief(brief)
  const program: ProgramItem[] =
    typology && typology.defaultProgram.length > 0
      ? typology.defaultProgram.map(item => ({ ...item }))
      : fallbackProgramFromBrief(brief)
  adjustBedroomCount(program, brief.bedrooms)
  adjustBathroomCount(program, brief.bathrooms)
  ensureVerticalCirculation(program, brief.floors)
  return program.slice(0, MAX_PROGRAM_ITEMS)
}

function resolveEdgeRef(
  ref: unknown,
  idByIndex: Map<number, string>,
  nodeIds: Set<string>,
): string | undefined {
  if (typeof ref === 'number' && Number.isInteger(ref)) {
    return idByIndex.get(ref)
  }
  if (typeof ref === 'string' && nodeIds.has(ref)) return ref
  return undefined
}

/**
 * Strictly validate an arbitrary value (typically LLM JSON output) into a
 * BubbleDiagram. Nodes/roles/groups are derived locally; node ids are rebuilt
 * uniquely; edges referencing unknown ids are dropped (or re-derived from the
 * generic rules when none survive). Returns `fallback` unchanged when nothing
 * valid can be built.
 */
export function coerceBubbleDiagram(obj: unknown, fallback: BubbleDiagram): BubbleDiagram {
  if (!obj || typeof obj !== 'object') return fallback
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.nodes) || o.nodes.length === 0) return fallback

  const nodes: BubbleDiagram['nodes'] = []
  for (const raw of o.nodes) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : ''
    if (!name) continue
    const area = Number(r.areaM2)
    const areaM2 = Number.isFinite(area) && area > 0 ? Math.min(Math.max(area, 0.5), 5000) : 0.5
    nodes.push({
      id: slugify(name, nodes.length),
      name,
      areaM2,
      role: classifySpatialRole(name, genericGroupFor(name)),
      group: genericGroupFor(name),
    })
    if (nodes.length >= MAX_BUBBLE_NODES) break
  }
  if (nodes.length === 0) return fallback

  const idByIndex = new Map<number, string>()
  const nodeIds = new Set<string>()
  nodes.forEach((node, index) => {
    idByIndex.set(index, node.id)
    nodeIds.add(node.id)
  })

  const edges: BubbleDiagram['edges'] = []
  if (Array.isArray(o.edges)) {
    for (const raw of o.edges) {
      if (!raw || typeof raw !== 'object') continue
      const e = raw as Record<string, unknown>
      const from = resolveEdgeRef(e.from, idByIndex, nodeIds)
      const to = resolveEdgeRef(e.to, idByIndex, nodeIds)
      if (!from || !to || from === to) continue
      const weight = Number(e.weight)
      edges.push({
        from,
        to,
        type: 'door',
        must: e.must === true,
        weight: Number.isFinite(weight) ? Math.max(1, Math.min(Math.round(weight), 10)) : 1,
      })
    }
  }

  return {
    nodes,
    edges: edges.length > 0 ? edges : edgesFromRules(GENERIC_ADJACENCY_RULES, nodes),
    typologyId: typeof o.typologyId === 'string' ? o.typologyId : fallback.typologyId,
    programSummary: {
      totalAreaM2: round1(nodes.reduce((sum, node) => sum + node.areaM2, 0)),
      roomCount: nodes.length,
    },
  }
}

/** Deterministic local bubble diagram from a brief. */
export function buildBubbleDiagramLocal(brief: ParsedBrief): BubbleDiagram {
  const program = programFromBrief(brief)
  const typology = typologyForBrief(brief)
  const adjacencyRules =
    typology?.adjacencyRules && typology.adjacencyRules.length > 0
      ? typology.adjacencyRules
      : undefined
  return bubbleFromProgram(program, { typologyId: typology?.id, adjacencyRules })
}

/** Optional free-tier LLM bubble-diagram path with strict validation + local fallback. */
export async function generateBubbleDiagramRemote(
  brief: ParsedBrief,
  opts: { apiKey?: string } = {},
): Promise<BubbleDiagramResult> {
  const local = buildBubbleDiagramLocal(brief)
  const result = await generateFree(
    [
      { role: 'system', content: BUILD_BUBBLE_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          buildingType: brief.buildingType,
          bedrooms: brief.bedrooms,
          bathrooms: brief.bathrooms,
          floors: brief.floors,
          approxAreaM2: brief.approxAreaM2,
          features: brief.features,
        }),
      },
    ],
    { apiKey: opts.apiKey, maxTokens: 900 },
  )
  if (result.text == null) {
    return {
      diagram: local,
      method: 'local',
      fellBack: true,
      fallbackReason: result.error ?? 'No free-tier chat API key configured',
    }
  }
  try {
    const parsed = extractJson(result.text)
    const coerced = coerceBubbleDiagram(parsed, local)
    if (coerced === local) {
      return { diagram: local, method: 'local', fellBack: true, fallbackReason: 'LLM bubble diagram did not validate' }
    }
    return { diagram: coerced, method: 'remote', fellBack: false }
  } catch (err) {
    return {
      diagram: local,
      method: 'local',
      fellBack: true,
      fallbackReason: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Build a bubble diagram for a brief. Attempts the remote LLM path when
 * `remote !== false` (a missing key degrades to the local diagram without any
 * network call), otherwise always returns the deterministic local diagram.
 */
export async function buildBubbleDiagram(
  brief: ParsedBrief,
  opts?: { apiKey?: string; remote?: boolean },
): Promise<BubbleDiagramResult> {
  if (opts?.remote === false) {
    return { diagram: buildBubbleDiagramLocal(brief), method: 'local', fellBack: false }
  }
  return generateBubbleDiagramRemote(brief, opts)
}
