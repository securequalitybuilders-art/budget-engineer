// Deterministic ZIQS SMM measurement extraction for the calculator node.
//
// The calculator only runs write tools from the strict layer; this module
// turns a free-text query (+ optional project context) into tool args using
// the ZIQS Standard Method of Measurement intent vocabulary. Extraction is
// deliberately conservative — if the query does not clearly carry the numbers
// a measurement tool needs, it returns `null` and the calculator records
// nothing (no fabricated take-offs).

import type { AgentContext } from './types'

export type MeasurementTool =
  | 'calculate_brick_quantity'
  | 'calculate_concrete_volume'
  | 'calculate_tco'
  | 'p4p_calculator'
  | 'wipaa_calculator'

export interface MeasurementRef {
  tool: MeasurementTool
  args: Record<string, unknown>
  summary: string
  /** Human label for the calculation record (tool name + headline dims). */
  label: string
}

const MONEY_RE = /\$([\d,]+(?:\.\d+)?)/g
const PAIR_RE = /([\d.]+)\s*m(?:et(?:er|re)s?)?\s*[x×*]\s*([\d.]+)\s*m(?:et(?:er|re)s?)?/i
const TRIPLE_RE = /([\d.]+)\s*m(?:et(?:er|re)s?)?\s*[x×*]\s*([\d.]+)\s*m(?:et(?:er|re)s?)?\s*[x×*]\s*([\d.]+)\s*m(?:et(?:er|re)s?)?/i
const NAMED_LENGTH_RE = /(?:length|long)\s+(?:of\s+)?([\d.]+)\s*m(?:et(?:er|re)s?)?/i
const NAMED_HEIGHT_RE = /(?:height|high)\s+(?:of\s+)?([\d.]+)\s*m(?:et(?:er|re)s?)?/i
const NAMED_DEPTH_RE = /(?:depth|deep|thick(?:ness)?)\s+(?:of\s+)?([\d.]+)\s*m(?:et(?:er|re)s?)?/i
const MONTH_RE = /(\d{4})-(\d{2})/

function firstNumber(re: RegExp, text: string): number | undefined {
  const m = text.match(re)
  if (!m) return undefined
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Extract the first $-denominated amount in a string, as integer cents. */
function firstMoneyCents(text: string): number | undefined {
  const amounts: number[] = []
  for (const m of text.matchAll(MONEY_RE)) {
    const n = Number(m[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) amounts.push(Math.round(n * 100))
  }
  return amounts[0]
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthOf(text: string): string {
  const m = text.match(MONTH_RE)
  return m ? `${m[1]}-${m[2]}` : currentMonth()
}

export function inferMeasurement(query: string, ctx: AgentContext = {}): MeasurementRef | null {
  const q = query.trim()
  if (!q) return null
  const lower = q.toLowerCase()

  // WIPAA — revenue recognition: work certified vs cash requested.
  if (/wipaa|revenue recognition|cost[- ]to[- ]cost|under-?bill|over-?bill/.test(lower)) {
    const amounts = [...q.matchAll(MONEY_RE)].map((m) => Math.round(Number(m[1].replace(/,/g, '')) * 100))
    if (amounts.length < 2) return null
    return {
      tool: 'wipaa_calculator',
      args: {
        project_id: ctx.projectId ?? 'project',
        month: monthOf(q),
        work_certified: amounts[0],
        cash_requested: amounts[1],
      },
      summary: `WIPAA ${monthOf(q)}: work certified ${amounts[0]} cents vs cash requested ${amounts[1]} cents`,
      label: `WIPAA ${monthOf(q)}`,
    }
  }

  // P4P — payment for progress certificate.
  if (/p4p|payment for progress|interim (payment|certificate)/.test(lower)) {
    const direct = firstMoneyCents(q) ?? (ctx.contractValueCents && ctx.contractValueCents > 0 ? ctx.contractValueCents : undefined)
    if (direct === undefined) return null
    return {
      tool: 'p4p_calculator',
      args: { direct_costs: direct, overhead_pct: 0, desired_margin_pct: 0 },
      summary: `P4P certificate on direct costs ${direct} cents`,
      label: 'P4P certificate',
    }
  }

  // TCO — total cost of ownership.
  if (/tco|total cost of ownership|lifecycle cost|cost of ownership/.test(lower)) {
    const price = firstMoneyCents(q)
    if (price === undefined) return null
    return {
      tool: 'calculate_tco',
      args: { price_cents: price, quantity: 1, freight_cents: 0, late_probability_pct: 0, defect_probability_pct: 0 },
      summary: `TCO on unit price ${price} cents`,
      label: `TCO $${(price / 100).toFixed(2)}`,
    }
  }

  // Concrete / footings / slabs.
  if (/concrete|footing|foundation|slab|blinding/.test(lower)) {
    const triple = q.match(TRIPLE_RE)
    if (triple) {
      const [l, w, d] = [Number(triple[1]), Number(triple[2]), Number(triple[3])]
      return {
        tool: 'calculate_concrete_volume',
        args: { length_m: l, width_m: w, depth_m: d },
        summary: `concrete volume ${l} x ${w} x ${d} m`,
        label: `Concrete ${l}×${w}×${d} m`,
      }
    }
    const pair = q.match(PAIR_RE)
    if (pair) {
      const [l, w] = [Number(pair[1]), Number(pair[2])]
      return {
        tool: 'calculate_concrete_volume',
        args: { length_m: l, width_m: w, depth_m: 0.15 },
        summary: `concrete volume ${l} x ${w} m (default 0.15 m slab)`,
        label: `Concrete ${l}×${w} m`,
      }
    }
    const l = firstNumber(NAMED_LENGTH_RE, q)
    const w = firstNumber(/width\s+(?:of\s+)?([\d.]+)\s*m(?:et(?:er|re)s?)?/i, q)
    const d = firstNumber(NAMED_DEPTH_RE, q)
    if (l !== undefined && w !== undefined) {
      return {
        tool: 'calculate_concrete_volume',
        args: { length_m: l, width_m: w, depth_m: d ?? 0.15 },
        summary: `concrete volume ${l} x ${w} m${d !== undefined ? ` x ${d} m` : ' (default 0.15 m slab)'}`,
        label: `Concrete ${l}×${w} m`,
      }
    }
    return null
  }

  // Brickwork / blockwork.
  if (/brick|masonry|blockwork|wall/.test(lower)) {
    const pair = q.match(PAIR_RE)
    const l = firstNumber(NAMED_LENGTH_RE, q)
    const h = firstNumber(NAMED_HEIGHT_RE, q)
    const length = pair ? Number(pair[1]) : l
    const height = pair ? Number(pair[2]) : h
    if (length === undefined || height === undefined) return null
    // Single 230mm masonry skin — By-Laws Ch.4 standard construction. (A
    // "double-skin" wall would be two 230mm skins = 2 thickness units.)
    const thickness = 1
    return {
      tool: 'calculate_brick_quantity',
      args: { length_m: length, height_m: height, thickness_units: thickness, bond_type: 'stretcher', wastage_pct: 5 },
      summary: `brick take-off ${length} x ${height} m at ${thickness} x 230 mm skin`,
      label: `Bricks ${length}×${height} m`,
    }
  }

  return null
}
