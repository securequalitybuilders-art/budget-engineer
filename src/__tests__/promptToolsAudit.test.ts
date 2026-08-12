import { describe, it, expect } from 'vitest'
import {
  ziqsSmmSystem,
  GRADE_FIRE_RESISTANCE,
  citeByLaws,
  CITATION_NOT_FOUND_JSON,
} from '@/lib/ai/prompts/ziqs_smm_prompt'
import {
  budgetEngineerSystem,
  BRAND_VOICE,
  MILESTONE_SPLIT_TEXT,
  PAYMENT_MILESTONES,
} from '@/lib/ai/prompts/budget_engineer_system'
import { BRIEF_PROMPT } from '@/lib/ai/brief-coercion'
import { COMPLIANCE_PROMPT } from '@/engine/rag/analysis'
import {
  TOOL_SCHEMAS,
  TOOLS,
  READ_TOOLS,
  WRITE_TOOLS,
  AGENT_TOOL_SCOPES,
  parseToolArgs,
  isValidToolArgs,
  canCallTool,
  assertAgentToolScope,
} from '@/engine/tools/definitions'
import { TOOL_SCHEMAS as SCHEMA_TOOL_SCHEMAS } from '@/ai/schema'

describe('PHASE 1 audit — prompt engineering grounding', () => {
  it('ziqsSmmSystem references ZIQS SMM', () => {
    expect(ziqsSmmSystem()).toContain('ZIQS SMM')
  })
  it('ziqsSmmSystem references Model Building By-Laws 1977 Ch.2 and Ch.4', () => {
    const sys = ziqsSmmSystem()
    expect(sys).toContain('Model Building By-Laws 1977')
    expect(sys).toContain('Ch.2')
    expect(sys).toContain('Ch.4')
  })
  it('encodes the Grade A–D fire-resistance ladder', () => {
    expect(GRADE_FIRE_RESISTANCE.A).toBe('4 hours')
    expect(GRADE_FIRE_RESISTANCE.B).toBe('2 hours')
    expect(GRADE_FIRE_RESISTANCE.C).toBe('1 hour')
    expect(GRADE_FIRE_RESISTANCE.D).toBe('0.5 hour')
    expect(ziqsSmmSystem()).toContain('Grade A — 4 hours')
    expect(ziqsSmmSystem()).toContain('Grade C')
  })
  it('references SAZ 7 MPa brick and 400×200×200 block', () => {
    const sys = ziqsSmmSystem()
    expect(sys).toContain('SAZ')
    expect(sys).toContain('7 MPa')
    expect(sys).toContain('400 mm × 200 mm × 200 mm')
  })
  it('references ZIQS SMM measurement rules and the SI 56/2025 gate', () => {
    const sys = ziqsSmmSystem().toLowerCase()
    expect(sys).toContain('excavation')
    expect(sys).toContain('scaffolding')
    expect(sys).toContain('random rubble masonry')
    expect(sys).toContain('si 56/2025')
    expect(sys).toContain('p4p')
  })
  it('enforces the By-Laws citation format and low-confidence fallback', () => {
    const sys = ziqsSmmSystem()
    expect(sys).toContain('[Model Building By-Laws 1977 Ch.4 Cl.12(a) Grade A 2hrs]')
    expect(sys).toContain(CITATION_NOT_FOUND_JSON)
    expect(sys).toContain('below 0.7')
  })
  it('citeByLaws renders the mandated bracket format', () => {
    expect(citeByLaws({ chapter: '4', clause: '12(a)', grade: 'A', rating: '2hrs' })).toBe('[Model Building By-Laws 1977 Ch.4 Cl.12(a) Grade A 2hrs]')
    expect(citeByLaws({ clause: '9' })).toBe('[Model Building By-Laws 1977 Cl.9]')
  })
  it('supports en/sn/nd languages', () => {
    expect(ziqsSmmSystem('en')).toContain('English')
    expect(ziqsSmmSystem('sn')).toContain('Shona')
    expect(ziqsSmmSystem('nd')).toContain('Ndebele')
  })
})

describe('PHASE 1 audit — Budget Engineer system prompt', () => {
  it('wraps the ZIQS grounding', () => {
    expect(budgetEngineerSystem()).toContain('ZIQS SMM')
    expect(budgetEngineerSystem()).toContain('Model Building By-Laws 1977')
  })
  it('carries the Guardian/Engineer brand voice', () => {
    expect(BRAND_VOICE).toContain('Guardian')
    expect(BRAND_VOICE).toContain('Authoritative')
    expect(BRAND_VOICE).toContain('Fearless')
    expect(BRAND_VOICE).toContain('Empowering')
  })
  it('enforces tabular-nums money formatting', () => {
    expect(BRAND_VOICE).toContain('tabular-nums')
    expect(BRAND_VOICE).toContain('JetBrains Mono')
  })
  it('encodes the three milestones 35/40/25', () => {
    const pcts = PAYMENT_MILESTONES.map((m) => m.pct)
    expect(pcts).toEqual([35, 40, 25])
    expect(MILESTONE_SPLIT_TEXT).toBe('Foundation & Bones — 35%, Wall Plate Shell — 40%, Finishes & Keys — 25%')
  })
})

describe('PHASE 1 audit — brief + compliance prompts carry the grounding', () => {
  it('BRIEF_PROMPT references ZIQS SMM and By-Laws 1977', () => {
    const prompt = BRIEF_PROMPT('Build a 3-bedroom house with a party wall')
    expect(prompt).toContain('ZIQS SMM')
    expect(prompt).toContain('Model Building By-Laws 1977')
  })
  it('BRIEF_PROMPT enforces the citation format and regulatoryNotes schema', () => {
    const prompt = BRIEF_PROMPT('x')
    expect(prompt).toContain('[Model Building By-Laws 1977 Ch.4 Cl.12(a) Grade A 2hrs]')
    expect(prompt).toContain('regulatoryNotes')
  })
  it('COMPLIANCE_PROMPT is regulatory-grounded', () => {
    const prompt = COMPLIANCE_PROMPT({ query: 'party wall fire resistance', sources: [] })
    expect(prompt).toContain('Model Building By-Laws 1977')
    expect(prompt).toContain('ZIQS SMM')
    expect(prompt).toContain('SAZ')
  })
})

describe('PHASE 1 audit — tool schemas (LLM tools layer)', () => {
  it('registers all twelve tools with read/write/decision split', () => {
    expect(TOOLS).toHaveLength(12)
    expect(READ_TOOLS).toEqual(['query_blaws', 'query_saz', 'query_ziqs', 'query_si56', 'query_market_index', 'search_codes'])
    expect(WRITE_TOOLS).toEqual(['calculate_brick_quantity', 'calculate_concrete_volume', 'calculate_tco', 'p4p_calculator', 'wipaa_calculator'])
  })
  it('strict schemas reject unknown keys (string injection guard)', () => {
    expect(() => parseToolArgs('query_blaws', { query: 'party wall', chapter: '4', injected: 'DROP TABLE' })).toThrow()
    expect(() => parseToolArgs('calculate_brick_quantity', { length_m: 5, height_m: 3, evil: 'yes' })).toThrow()
  })
  it('positive-number validation rejects negatives and strings', () => {
    expect(() => parseToolArgs('calculate_concrete_volume', { length_m: -1, width_m: 2, depth_m: 0.5 })).toThrow()
    expect(() => parseToolArgs('calculate_brick_quantity', { length_m: '10', height_m: 3 })).toThrow()
    expect(() => parseToolArgs('p4p_calculator', { direct_costs: '1000' })).toThrow()
  })
  it('applies defaults for brick quantity', () => {
    const args = parseToolArgs('calculate_brick_quantity', { length_m: 10, height_m: 2.4 })
    expect(args).toEqual({ length_m: 10, height_m: 2.4, thickness_units: 1, bond_type: 'stretcher', wastage_pct: 5 })
  })
  it('enforces enums and ranges', () => {
    expect(() => parseToolArgs('query_blaws', { query: 'a', chapter: '2' })).toThrow()
    expect(() => parseToolArgs('query_blaws', { query: 'wall', chapter: '9' })).toThrow()
    expect(() => parseToolArgs('calculate_brick_quantity', { length_m: 5, height_m: 3, wastage_pct: 25 })).toThrow()
    expect(() => parseToolArgs('wipaa_calculator', { project_id: 'p1', month: '2026/08', work_certified: 0, cash_requested: 0 })).toThrow()
  })
  it('validates the WIPAA month format', () => {
    const args = parseToolArgs('wipaa_calculator', { project_id: 'p1', month: '2026-08', work_certified: 50000, cash_requested: 60000 })
    expect(args.month).toBe('2026-08')
  })
  it('isValidToolArgs reports parse success/failure without throwing', () => {
    expect(isValidToolArgs('calculate_concrete_volume', { length_m: 5, width_m: 2, depth_m: 0.5 })).toBe(true)
    expect(isValidToolArgs('calculate_concrete_volume', { length_m: 5 })).toBe(false)
  })
  it('agent scoping: researcher reads only, calculator writes only, supervisor the decision pen', () => {
    expect(AGENT_TOOL_SCOPES.researcher).toEqual(READ_TOOLS)
    expect(AGENT_TOOL_SCOPES.calculator).toEqual(WRITE_TOOLS)
    expect(AGENT_TOOL_SCOPES.supervisor).toEqual(['gono_go_decision'])
    expect(canCallTool('researcher', 'query_blaws')).toBe(true)
    expect(canCallTool('researcher', 'calculate_brick_quantity')).toBe(false)
    expect(canCallTool('calculator', 'calculate_tco')).toBe(true)
    expect(canCallTool('calculator', 'query_ziqs')).toBe(false)
    expect(canCallTool('supervisor', 'gono_go_decision')).toBe(true)
    expect(canCallTool('supervisor', 'query_blaws')).toBe(false)
    expect(() => assertAgentToolScope('researcher', 'calculate_concrete_volume')).toThrow()
    expect(() => assertAgentToolScope('calculator', 'query_saz')).toThrow()
  })
  it('tool schemas are exported from @/ai/schema', () => {
    expect(SCHEMA_TOOL_SCHEMAS.calculate_brick_quantity).toBe(TOOL_SCHEMAS.calculate_brick_quantity)
    expect(READ_TOOLS.length).toBeGreaterThan(0)
  })
})
