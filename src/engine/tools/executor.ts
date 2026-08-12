/**
 * Tool executor — the runtime half of the PHASE 1 LLM-tools layer.
 *
 * `executeTool` validates arguments against the strict Zod schemas, enforces
 * agent-scope boundaries (researcher/validator read-only, calculator write-only,
 * supervisor GO/NO-GO decision) and routes each tool to its real engine:
 *
 *   read       query_* / search_codes → RAG hybrid search / ACZ registry / market index
 *   write      calculate_*            → brick / concrete / TCO engines + deterministic
 *                                       P4P & WIPAA mark-up formulas
 *   decision   gono_go_decision       → estimate-vs-baseline GO / NO-GO (supervisor)
 *
 * Every failure (bad args, out-of-scope, non-compliant spec, missing corpus) is
 * returned as a structured `{ ok: false, error }` so a single-shot prompt→JSON
 * caller can surface a refusal instead of crashing.
 */

import { z } from 'zod';
import {
  assertAgentToolScope,
  parseToolArgs,
  TOOL_SCHEMAS,
  queryBlawsSchema,
  querySazSchema,
  queryZiqsSchema,
  querySi56Schema,
  queryMarketIndexSchema,
  searchCodesSchema,
  calculateBrickQuantitySchema,
  calculateConcreteVolumeSchema,
  calculateTcoSchema,
  p4pCalculatorSchema,
  wipaaCalculatorSchema,
  gonoGoDecisionSchema,
  type AgentRole,
  type ToolName,
} from './definitions';
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus';
import { hybridSearch } from '@/engine/rag/hybrid';
import type { RagIndex } from '@/engine/rag/ragIndex';
import { calculateBricks } from '@/engine/estimation/brickCalculator';
import { calculateConcrete } from '@/engine/estimation/concreteCalculator';
import { calculateTco } from '@/engine/ecosystem/tco';
import { buildMarketIndex, FX_USD_TO_ZWG, type MarketRateLike } from '@/engine/ecosystem/priceIndex';
import { gateP4pBid, lookupArchitect, validatePlanAgainstRegistry } from '@/engine/compliance/architectRegistry';
import { logToolCall } from '@/lib/observability/telemetry';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Default SADC market-rate table (USD) used when no rates are supplied. */
export const DEFAULT_MARKET_RATES: MarketRateLike[] = [
  { code: 'CEMENT', description: 'Cement 50kg (Portland)', unit: 'bag', baseRateCents: 1350, year: 2026 },
  { code: 'STEEL-Y12', description: 'Steel rebar Y12', unit: 'm', baseRateCents: 820, year: 2026 },
  { code: 'BRICK-SAZ7', description: 'Common brick (SAZ 7 MPa)', unit: 'each', baseRateCents: 29, year: 2026 },
  { code: 'SAND', description: 'River sand', unit: 'm3', baseRateCents: 4200, year: 2026 },
  { code: 'AGGREGATE-19', description: '19mm aggregate', unit: 'm3', baseRateCents: 4600, year: 2026 },
];

export interface ToolExecutionContext {
  role?: AgentRole;
  /** RAG index to search; defaults to the in-app embedded corpus. */
  index?: RagIndex;
  /** Market-rate table for `query_market_index`; defaults to DEFAULT_MARKET_RATES. */
  rates?: MarketRateLike[];
  currency?: 'USD' | 'ZWG';
}

export type ToolExecutionResult =
  | { ok: true; tool: ToolName; data: unknown }
  | { ok: false; tool: ToolName; error: string };

interface RagHit {
  docId: string;
  sectionId: string;
  heading: string;
  text: string;
  score: number;
  chapter: string | null;
  citation: string | null;
}

function ragHits(index: RagIndex, query: string, docId?: string, chapter?: string, k = 5): RagHit[] {
  return hybridSearch(index, query, { k, minScore: 0.01, docId })
    .filter((r) => !chapter || chapter === 'all' || r.chapter === chapter)
    .map((r) => ({
      docId: r.docId,
      sectionId: r.sectionId,
      heading: r.heading,
      text: r.text,
      score: r.score,
      chapter: r.chapter ?? null,
      citation: r.citation ?? null,
    }));
}

function queryZiqs(index: RagIndex, query: string, section: string | undefined) {
  if (!index.hasDocument('ziqs-smm')) {
    return {
      found: false,
      note: 'ZIQS SMM corpus is not embedded in the in-app index. Search the on-disk corpus or supply an index containing doc "ziqs-smm".',
      canonicalRules: [
        'Excavation: measured as net volume (m³) — ZIQS SMM',
        'Scaffolding: measured by area (m²) of the vertical face supported — ZIQS SMM',
        'Masonry: brickwork/blockwork measured per 115mm skin (m²) — ZIQS SMM',
      ],
    };
  }
  const hits = ragHits(index, query, 'ziqs-smm').filter(
    (r) => !section || section === 'all' || r.text.toLowerCase().includes(section.replace('-', ' ')),
  );
  return { found: hits.length > 0, hits };
}

function querySi56(planId: string, registrationNumber: string | undefined) {
  const architect = registrationNumber ? lookupArchitect(registrationNumber) : null;
  const validation = architect ? validatePlanAgainstRegistry(planId, architect) : null;
  const gate = gateP4pBid({ validation, contractValueCents: 0 });
  return {
    planId,
    architectRegistrationNumber: registrationNumber ?? null,
    architectName: architect?.name ?? null,
    validation: validation
      ? {
          planId: validation.planId,
          architectRegistrationNumber: validation.architectRegistrationNumber,
          architectName: validation.architectName,
          validatedAt: validation.validatedAt,
          reference: validation.reference,
        }
      : null,
    gate,
  };
}

function route(name: ToolName, args: unknown, ctx: ToolExecutionContext): unknown {
  const index = ctx.index ?? buildDefaultRagIndex();

  switch (name) {
    case 'query_blaws': {
      const a = args as z.infer<typeof queryBlawsSchema>;
      return { found: true, hits: ragHits(index, a.query, 'by-laws-1977', a.chapter) };
    }
    case 'query_saz': {
      const a = args as z.infer<typeof querySazSchema>;
      const hits = ragHits(index, a.query, 'saz-catalogue');
      return {
        found: hits.length > 0,
        hits: a.standard ? hits.filter((h) => h.text.toLowerCase().includes(a.standard!.toLowerCase())) : hits,
      };
    }
    case 'query_ziqs': {
      const a = args as z.infer<typeof queryZiqsSchema>;
      return queryZiqs(index, a.query, a.section);
    }
    case 'query_si56': {
      const a = args as z.infer<typeof querySi56Schema>;
      return querySi56(a.planId, a.architectRegistrationNumber);
    }
    case 'query_market_index': {
      const a = args as z.infer<typeof queryMarketIndexSchema>;
      const currency = ctx.currency ?? a.currency ?? 'USD';
      const fx = currency === 'ZWG' ? FX_USD_TO_ZWG : 1;
      const quotes = buildMarketIndex(ctx.rates ?? DEFAULT_MARKET_RATES, FX_USD_TO_ZWG, currency, 30)
        .filter((q) => !a.symbol || q.symbol.toLowerCase() === a.symbol.toLowerCase())
        .map((q) => ({
          symbol: q.symbol,
          label: q.label,
          unit: q.unit,
          baseCents: q.baseCents,
          currentCents: q.currentCents,
          changePct: q.changePct,
        }));
      return { currency, fx, quotes };
    }
    case 'search_codes': {
      const a = args as z.infer<typeof searchCodesSchema>;
      // south-africa → SANS 10400 doc; zimbabwe/any → the whole embedded corpus.
      const docId = a.docId ?? (a.jurisdiction === 'south-africa' ? 'sans10400' : undefined);
      const hits = ragHits(index, a.query, docId, undefined, a.k);
      return {
        found: hits.length > 0,
        jurisdiction: a.jurisdiction,
        k: a.k,
        docId: docId ?? null,
        hits: docId && !index.hasDocument(docId) ? [] : hits,
      };
    }
    case 'calculate_brick_quantity': {
      const a = args as z.infer<typeof calculateBrickQuantitySchema>;
      // `thickness_units` = number of 230mm masonry skins (By-Laws Ch.4). A
      // fractional skin is left as-is so the brick engine flags non-compliance.
      const wallThicknessMm = a.thickness_units * 230;
      const result = calculateBricks({
        lengthM: a.length_m,
        heightM: a.height_m,
        wallThicknessMm,
        wastagePct: a.wastage_pct,
      });
      if (!result.valid) return { nonCompliant: result.nonCompliant ?? false, error: result.error, reasons: result.reasons };
      return { bond_type: a.bond_type, ...result };
    }
    case 'calculate_concrete_volume': {
      const a = args as z.infer<typeof calculateConcreteVolumeSchema>;
      const result = calculateConcrete({ lengthM: a.length_m, widthM: a.width_m, thicknessM: a.depth_m });
      if (!result.valid) return { error: result.error, reasons: result.reasons };
      return { volume_m3: result.volumeM3, dry_volume_m3: result.dryVolumeM3, cement_bags: result.cementBags, mix_ratio: result.mixRatio };
    }
    case 'calculate_tco': {
      const a = args as z.infer<typeof calculateTcoSchema>;
      const priceCents = Math.round(a.price_cents * a.quantity);
      const result = calculateTco({
        priceCents,
        freightCents: a.freight_cents,
        onTimeDeliveryPct: 100 - a.late_probability_pct,
        defectRatePct: a.defect_probability_pct,
        laborDowntimeCostCentsPerDay: 0,
        leadDays: 0,
        typicalLeadDays: 0,
      });
      return {
        price_cents: result.priceCents,
        freight_cents: result.freightCents,
        defect_cost_cents: result.defectCostCents,
        downtime_cost_cents: result.downtimeCostCents,
        total_cost_cents: result.totalCostCents,
        price_delta_cents: result.priceDeltaCents,
      };
    }
    case 'p4p_calculator': {
      const a = args as z.infer<typeof p4pCalculatorSchema>;
      const withOverhead = a.direct_costs * (1 + a.overhead_pct / 100);
      const total = round2(withOverhead * (1 + a.desired_margin_pct / 100));
      return {
        direct_costs: a.direct_costs,
        overhead_pct: a.overhead_pct,
        desired_margin_pct: a.desired_margin_pct,
        total,
        currency: 'USD',
      };
    }
    case 'wipaa_calculator': {
      const a = args as z.infer<typeof wipaaCalculatorSchema>;
      const overUnderBilled = round2(a.work_certified - a.cash_requested);
      const tolerance = 1;
      const billingStatus = overUnderBilled > tolerance ? 'over-billed' : overUnderBilled < -tolerance ? 'under-billed' : 'on-track';
      return { project_id: a.project_id, month: a.month, work_certified: a.work_certified, cash_requested: a.cash_requested, over_under_billed: overUnderBilled, billing_status: billingStatus };
    }
    case 'gono_go_decision': {
      const a = args as z.infer<typeof gonoGoDecisionSchema>;
      if (a.estimate_cents <= 0) return { recommendation: 'GO', deviation_pct: 0, note: 'no estimate supplied' };
      if (a.baseline_cents <= 0) return { recommendation: 'GO', deviation_pct: 0, note: 'no baseline available' };
      const deviationPct = ((a.estimate_cents - a.baseline_cents) / a.baseline_cents) * 100;
      const within = Math.abs(deviationPct) <= a.deviation_threshold_pct;
      return {
        estimate_cents: a.estimate_cents,
        baseline_cents: a.baseline_cents,
        deviation_pct: round2(deviationPct),
        deviation_threshold_pct: a.deviation_threshold_pct,
        recommendation: within ? 'GO' : 'NO-GO',
      };
    }
  }
}

export function executeTool(name: ToolName, args: unknown, ctx: ToolExecutionContext = {}): ToolExecutionResult {
  const startedAt = Date.now();
  const finish = (result: ToolExecutionResult): ToolExecutionResult => {
    void logToolCall({
      tool: name,
      node: ctx.role,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
      latencyMs: Date.now() - startedAt,
      args: args && typeof args === 'object' ? (args as Record<string, unknown>) : undefined,
    }).catch(() => {});
    return result;
  };
  if (ctx.role) {
    try {
      assertAgentToolScope(ctx.role, name);
    } catch (e) {
      return finish({ ok: false, tool: name, error: (e as Error).message });
    }
  }
  let parsed: unknown;
  try {
    parsed = parseToolArgs(name, args);
  } catch (e) {
    return finish({ ok: false, tool: name, error: `Invalid arguments for "${name}": ${(e as Error).message}` });
  }
  try {
    return finish({ ok: true, tool: name, data: route(name, parsed, ctx) });
  } catch (e) {
    return finish({ ok: false, tool: name, error: (e as Error).message });
  }
}

export { TOOL_SCHEMAS };
