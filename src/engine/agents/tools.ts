// Tool registry for the agent orchestrator. Every tool declares which node(s)
// may invoke it — the graph refuses tool calls outside that scope.

import type { AgentNode, AgentContext } from './types'
import { calculateBricks } from '@/engine/estimation/brickCalculator'
import { calculateConcrete } from '@/engine/estimation/concreteCalculator'
import { calculateTco, type TcoInput } from '@/engine/ecosystem/tco'
import { calculateP4pCertificate, type P4pLineItem, type P4pCertificateOptions } from '@/engine/payment/paymentCalculators'
import { lookupArchitect, validatePlanAgainstRegistry, gateP4pBid } from '@/engine/compliance/architectRegistry'

export interface ToolDefinition {
  id: string
  name: string
  description: string
  nodes: AgentNode[]
  inputSchema: Record<string, 'string' | 'number' | 'boolean' | 'string[]' | 'object'>
  run: (args: Record<string, unknown>, ctx: AgentContext) => Promise<string> | string
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'search-codes',
    name: 'search-codes',
    description: 'Search the building-code RAG index for the given query, scoped to a jurisdiction and optional document.',
    nodes: ['researcher'],
    inputSchema: { query: 'string', jurisdiction: 'string', k: 'number' },
    run: (args, ctx) => {
      const index = ctx.ragIndex
      if (!index) throw new Error('RAG index is not available in this context')
      const results = index.search(String(args.query ?? ''), { k: Number(args.k ?? 5) })
      if (results.length === 0) return 'No code sections matched.'
      return results
        .map((r, i) => `${i + 1}. [${r.chapter ?? '?'}] ${r.heading} (${r.docTitle ?? r.docId}, score ${r.score.toFixed(3)})\n   ${r.text.slice(0, 220)}`)
        .join('\n')
    },
  },
  {
    id: 'get-code-section',
    name: 'get-code-section',
    description: 'Fetch the full text of a specific retrieved code section by chunk id.',
    nodes: ['researcher'],
    inputSchema: { chunkId: 'string' },
    run: (args, ctx) => {
      const index = ctx.ragIndex
      if (!index) throw new Error('RAG index is not available in this context')
      const chunk = index.getChunk(String(args.chunkId ?? ''))
      if (!chunk) return 'Section not found.'
      return `[${chunk.docId} ${chunk.sectionId}] ${chunk.heading}\n${chunk.text}`
    },
  },
  {
    id: 'calculate-bricks',
    name: 'calculate-bricks',
    description: 'Estimate brick/block quantity for a masonry wall (length m, height m, thickness mm). Enforces minimum wall thickness.',
    nodes: ['calculator'],
    inputSchema: { lengthM: 'number', heightM: 'number', wallThicknessMm: 'number', purpose: 'string', wastagePct: 'number' },
    run: (args) => {
      const result = calculateBricks({
        lengthM: Number(args.lengthM),
        heightM: Number(args.heightM),
        wallThicknessMm: Number(args.wallThicknessMm),
        purpose: args.purpose === 'internal' ? 'internal' : 'boundary',
        wastagePct: args.wastagePct === undefined ? undefined : Number(args.wastagePct),
      })
      if (!result.valid) return `Error: ${result.error}`
      return [
        `quantity=${result.quantity} bricks`,
        `area=${result.areaM2.toFixed(2)} m2`,
        `bricksPerM2=${result.bricksPerM2.toFixed(2)}`,
        `citation=${result.citation}`,
        ...(result.constructionNote ? [`note=${result.constructionNote}`] : []),
      ].join('\n')
    },
  },
  {
    id: 'calculate-concrete',
    name: 'calculate-concrete',
    description: 'Estimate concrete volume and 1:2:4 materials (cement bags, sand, aggregate) for a slab/footing (L x W x thickness m).',
    nodes: ['calculator'],
    inputSchema: { lengthM: 'number', widthM: 'number', thicknessM: 'number', wastagePct: 'number' },
    run: (args) => {
      const result = calculateConcrete({
        lengthM: Number(args.lengthM),
        widthM: Number(args.widthM),
        thicknessM: Number(args.thicknessM),
        wastagePct: args.wastagePct === undefined ? undefined : Number(args.wastagePct),
      })
      if (!result.valid) return `Error: ${result.error}`
      return `volume=${result.volumeM3.toFixed(2)} m3\ncementBags=${result.cementBags}\nsand=${result.sandM3.toFixed(2)} m3\naggregate=${result.aggregateM3.toFixed(2)} m3\ncitation=${result.citation}`
    },
  },
  {
    id: 'compute-tco',
    name: 'compute-tco',
    description: 'Total Cost of Ownership for a supplier/procurement option (price, freight, on-time %, defect %, downtime cost/day).',
    nodes: ['calculator'],
    inputSchema: {
      priceCents: 'number',
      freightCents: 'number',
      onTimeDeliveryPct: 'number',
      defectRatePct: 'number',
      laborDowntimeCostCentsPerDay: 'number',
      leadDays: 'number',
      typicalLeadDays: 'number',
    },
    run: (args) => {
      const input: TcoInput = {
        priceCents: Number(args.priceCents),
        freightCents: Number(args.freightCents),
        onTimeDeliveryPct: Number(args.onTimeDeliveryPct),
        defectRatePct: Number(args.defectRatePct),
        laborDowntimeCostCentsPerDay: Number(args.laborDowntimeCostCentsPerDay),
        leadDays: Number(args.leadDays),
        typicalLeadDays: Number(args.typicalLeadDays),
      }
      const r = calculateTco(input)
      return `totalCostCents=${r.totalCostCents}\npriceDeltaCents=${r.priceDeltaCents}\ndowntimeCostCents=${r.downtimeCostCents}\ndefectCostCents=${r.defectCostCents}`
    },
  },
  {
    id: 'p4p-certificate',
    name: 'p4p-certificate',
    description: 'Compute an interim P4P (Payment for Progress) certificate from work-package line items and progress %.',
    nodes: ['calculator'],
    inputSchema: { lineItems: 'object', retentionPct: 'number', previousPayments: 'number', practicalCompletionReached: 'boolean' },
    run: (args) => {
      const lineItems = (args.lineItems ?? []) as Array<Record<string, unknown>>
      const items: P4pLineItem[] = lineItems.map((l, i) => ({
        id: String(l.id ?? `item-${i}`),
        name: String(l.name ?? `Item ${i + 1}`),
        contractValue: Number(l.contractValue ?? 0),
        progressPct: Number(l.progressPct ?? 0),
      }))
      const opts: P4pCertificateOptions = {
        retentionPct: args.retentionPct === undefined ? undefined : Number(args.retentionPct),
        previousPayments: args.previousPayments === undefined ? undefined : Number(args.previousPayments),
        practicalCompletionReached: args.practicalCompletionReached === undefined ? undefined : Boolean(args.practicalCompletionReached),
      }
      const cert = calculateP4pCertificate(items, opts)
      return `grossEarned=${cert.grossEarned}\nretentionWithheld=${cert.retentionWithheld}\nnetCertificateValue=${cert.netCertificateValue}\namountDue=${cert.amountDue}`
    },
  },
  {
    id: 'validate-plan-si56',
    name: 'validate-plan-si56',
    description: 'Check a plan/architect against the ACZ Architect Registry under SI 56/2025 and gate a P4P bid.',
    nodes: ['validator'],
    inputSchema: { planId: 'string', architectRegistrationNumber: 'string', contractValueCents: 'number' },
    run: (args, ctx) => {
      const reg = String(args.architectRegistrationNumber ?? ctx.architectRegistrationNumber ?? '')
      const architect = lookupArchitect(reg)
      if (!architect) return `Architect not found in ACZ registry: "${reg}"`
      const validation = validatePlanAgainstRegistry(String(args.planId ?? ctx.planId ?? 'plan'), architect)
      if (!validation) return `Architect is not SI 56/2025 accredited.`
      const gate = gateP4pBid({ validation, contractValueCents: Number(args.contractValueCents ?? ctx.contractValueCents ?? 0) })
      return `validation=${validation.reference}\nallowed=${gate.allowed}\nreason=${gate.reason}`
    },
  },
  {
    id: 'gono-go-decision',
    name: 'gono-go-decision',
    description: 'Compare an estimated cost against a historical baseline and produce a GO / NO-GO recommendation with deviation %.',
    nodes: ['supervisor'],
    inputSchema: { estimateCents: 'number', baselineCents: 'number', deviationThresholdPct: 'number' },
    run: (args, ctx) => {
      const estimate = Number(args.estimateCents ?? 0)
      const baseline = Number(args.baselineCents ?? ctx.historicalBaseline?.avgCostCents ?? 0)
      if (estimate <= 0) return 'No estimate supplied to compare.'
      if (baseline <= 0) return `GO (no historical baseline available; estimate=${estimate})`
      const threshold = Number(args.deviationThresholdPct ?? ctx.deviationThresholdPct ?? 10)
      const deviationPct = ((estimate - baseline) / baseline) * 100
      const within = Math.abs(deviationPct) <= threshold
      return `estimateCents=${estimate}\nbaselineCents=${baseline}\ndeviationPct=${deviationPct.toFixed(2)}\nthresholdPct=${threshold}\nrecommendation=${within ? 'GO' : 'NO-GO'}`
    },
  },
]

export function toolsFor(node: AgentNode): ToolDefinition[] {
  return TOOLS.filter((t) => t.nodes.includes(node))
}

export function findTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function validateToolArgs(tool: ToolDefinition, args: Record<string, unknown>): string[] {
  const errors: string[] = []
  for (const [key, type] of Object.entries(tool.inputSchema)) {
    const value = args[key]
    if (value === undefined) continue
    if (type === 'number' && typeof value !== 'number') errors.push(`${key} must be a number`)
    if (type === 'string' && typeof value !== 'string') errors.push(`${key} must be a string`)
    if (type === 'boolean' && typeof value !== 'boolean') errors.push(`${key} must be a boolean`)
  }
  return errors
}
