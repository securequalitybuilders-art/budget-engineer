/**
 * Tool / function-calling layer — PHASE 1 audit fix.
 *
 * Strict Zod schemas (positive numbers, enums, `.strict()` object shape) so a
 * single-shot prompt→JSON call can never inject strings into arithmetic or
 * reach a read-only regulation tool with a write intent. Tools are classified
 * read (regulation/material/measurement retrieval) or write (math/payment).
 *
 * Agent scoping is enforced at the graph boundary:
 *   Researcher → READ_TOOLS only
 *   Calculator → WRITE_TOOLS only
 *   Supervisor → gono_go_decision only (the orchestrator's GO / NO-GO pen)
 *
 * This registry is the single authority for both the deterministic KPI2
 * orchestrator (via the `agents/tools.ts` adapter) and the LLM
 * function-calling layer.
 */

import { z } from 'zod';

// ————————————————————— schemas —————————————————————

export const queryBlawsSchema = z
  .object({
    query: z.string().min(5, 'query must be at least 5 characters'),
    chapter: z.enum(['2', '4', 'all']).optional(),
  })
  .strict();

export const querySazSchema = z
  .object({
    query: z.string().min(5, 'query must be at least 5 characters'),
    standard: z.string().optional(),
  })
  .strict();

export const queryZiqsSchema = z
  .object({
    query: z.string().min(5, 'query must be at least 5 characters'),
    section: z.enum(['excavation', 'site-preparation', 'scaffolding', 'concrete', 'masonry', 'roofing', 'all']).optional(),
  })
  .strict();

export const querySi56Schema = z
  .object({
    planId: z.string().min(1, 'planId is required'),
    architectRegistrationNumber: z.string().optional(),
  })
  .strict();

export const queryMarketIndexSchema = z
  .object({
    symbol: z.string().min(1).optional(),
    currency: z.enum(['USD', 'ZWG']).optional(),
  })
  .strict();

export const searchCodesSchema = z
  .object({
    query: z.string().min(3, 'query must be at least 3 characters'),
    jurisdiction: z.enum(['zimbabwe', 'south-africa', 'any']).optional().default('any'),
    k: z.number().int().positive().max(20).optional().default(5),
    docId: z.string().optional(),
  })
  .strict();

export const calculateBrickQuantitySchema = z
  .object({
    length_m: z.number().positive('length_m must be a positive number'),
    height_m: z.number().positive('height_m must be a positive number'),
    thickness_units: z.number().positive().default(1),
    bond_type: z.enum(['stretcher', 'header', 'English', 'Flemish']).default('stretcher'),
    wastage_pct: z.number().min(0).max(20).default(5),
  })
  .strict();

export const calculateConcreteVolumeSchema = z
  .object({
    length_m: z.number().positive(),
    width_m: z.number().positive(),
    depth_m: z.number().positive(),
  })
  .strict();

export const calculateTcoSchema = z
  .object({
    price_cents: z.number().nonnegative(),
    quantity: z.number().positive().default(1),
    freight_cents: z.number().nonnegative().default(0),
    late_probability_pct: z.number().min(0).max(100).default(0),
    defect_probability_pct: z.number().min(0).max(100).default(0),
  })
  .strict();

export const p4pCalculatorSchema = z
  .object({
    direct_costs: z.number().positive('direct_costs must be a positive number'),
    overhead_pct: z.number().min(0).max(100).default(0),
    desired_margin_pct: z.number().min(0).max(100).default(0),
  })
  .strict();

export const wipaaCalculatorSchema = z
  .object({
    project_id: z.string().min(1, 'project_id is required'),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
    work_certified: z.number().nonnegative(),
    cash_requested: z.number().nonnegative(),
  })
  .strict();

export const gonoGoDecisionSchema = z
  .object({
    estimate_cents: z.number().nonnegative(),
    baseline_cents: z.number().nonnegative(),
    deviation_threshold_pct: z.number().positive().max(100).default(10),
  })
  .strict();

/** Registry of every tool name → its input schema. */
export const TOOL_SCHEMAS = {
  query_blaws: queryBlawsSchema,
  query_saz: querySazSchema,
  query_ziqs: queryZiqsSchema,
  query_si56: querySi56Schema,
  query_market_index: queryMarketIndexSchema,
  search_codes: searchCodesSchema,
  calculate_brick_quantity: calculateBrickQuantitySchema,
  calculate_concrete_volume: calculateConcreteVolumeSchema,
  calculate_tco: calculateTcoSchema,
  p4p_calculator: p4pCalculatorSchema,
  wipaa_calculator: wipaaCalculatorSchema,
  gono_go_decision: gonoGoDecisionSchema,
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

export type ToolKind = 'read' | 'write' | 'decision';
export type ToolCategory = 'regulation' | 'material' | 'measurement' | 'math' | 'payment';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  type: ToolKind;
  category: ToolCategory;
  schema: z.ZodType;
}

// ————————————————————— registry —————————————————————

export const TOOLS: ToolDefinition[] = [
  { name: 'query_blaws', description: 'Query Zimbabwe Model Building By-Laws 1977 (Ch.2, Ch.4, or all). Read-only.', type: 'read', category: 'regulation', schema: queryBlawsSchema },
  { name: 'query_saz', description: 'Query SAZ material specifications (brick MPa, block sizes, tolerances). Read-only.', type: 'read', category: 'material', schema: querySazSchema },
  { name: 'query_ziqs', description: 'Query ZIQS Standard Method of Measurement rules (excavation, scaffolding, masonry, concrete). Read-only.', type: 'read', category: 'measurement', schema: queryZiqsSchema },
  { name: 'query_si56', description: 'SI 56/2025 ACZ-registration gate — check whether a plan is validated by a registered professional. Read-only.', type: 'read', category: 'regulation', schema: querySi56Schema },
  { name: 'query_market_index', description: 'Query the SADC market price index (cement, steel, brick) in USD or ZWG. Read-only.', type: 'read', category: 'material', schema: queryMarketIndexSchema },
  { name: 'search_codes', description: 'General hybrid search over the building-code RAG index (any jurisdiction, optional doc filter). Read-only.', type: 'read', category: 'regulation', schema: searchCodesSchema },
  { name: 'calculate_brick_quantity', description: 'Math only — brick count from length, height, thickness units, bond type and wastage.', type: 'write', category: 'math', schema: calculateBrickQuantitySchema },
  { name: 'calculate_concrete_volume', description: 'Math only — concrete volume (m³) from length, width and depth.', type: 'write', category: 'math', schema: calculateConcreteVolumeSchema },
  { name: 'calculate_tco', description: 'Math only — total cost of ownership incl. freight and risk-weighted defect cost.', type: 'write', category: 'math', schema: calculateTcoSchema },
  { name: 'p4p_calculator', description: 'Math only — payment-for-progress certificate from direct costs, overhead % and desired margin %.', type: 'write', category: 'payment', schema: p4pCalculatorSchema },
  { name: 'wipaa_calculator', description: 'Math only — WIPAA revenue recognition for a project/month from work certified vs cash requested.', type: 'write', category: 'payment', schema: wipaaCalculatorSchema },
  { name: 'gono_go_decision', description: 'Orchestrator decision — compare an estimate against a historical baseline and produce a GO / NO-GO recommendation with deviation %. Supervisor-only.', type: 'decision', category: 'math', schema: gonoGoDecisionSchema },
];

export const READ_TOOLS: ToolName[] = TOOLS.filter((t) => t.type === 'read').map((t) => t.name);
export const WRITE_TOOLS: ToolName[] = TOOLS.filter((t) => t.type === 'write').map((t) => t.name);
export const DECISION_TOOLS: ToolName[] = TOOLS.filter((t) => t.type === 'decision').map((t) => t.name);

// ————————————————————— agent scoping —————————————————————

export type AgentRole = 'researcher' | 'calculator' | 'validator' | 'supervisor';

/** Read-only agents may read; the calculator may only run write/math; the supervisor holds the pen. */
export const AGENT_TOOL_SCOPES: Record<AgentRole, readonly ToolName[]> = {
  researcher: READ_TOOLS,
  validator: READ_TOOLS,
  calculator: WRITE_TOOLS,
  supervisor: DECISION_TOOLS,
};

export function toolsForRole(role: AgentRole): readonly ToolName[] {
  return AGENT_TOOL_SCOPES[role];
}

export function canCallTool(role: AgentRole, tool: ToolName): boolean {
  return AGENT_TOOL_SCOPES[role].includes(tool);
}

/** Throws when an agent calls a tool outside its scope. Enforced at the graph boundary. */
export function assertAgentToolScope(role: AgentRole, tool: ToolName): void {
  if (!canCallTool(role, tool)) {
    throw new Error(`Agent role "${role}" is not permitted to call tool "${tool}"`);
  }
}

// ————————————————————— parse helpers —————————————————————

/** Strictly parse and validate arguments for a tool. Rejects string injection. */
export function parseToolArgs<T extends ToolName>(tool: T, args: unknown): z.infer<(typeof TOOL_SCHEMAS)[T]> {
  return TOOL_SCHEMAS[tool].parse(args);
}

/** True when the raw object parses cleanly against the tool schema. */
export function isValidToolArgs<T extends ToolName>(tool: T, args: unknown): boolean {
  return TOOL_SCHEMAS[tool].safeParse(args).success;
}
