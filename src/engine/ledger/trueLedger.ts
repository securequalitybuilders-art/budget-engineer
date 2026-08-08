import type {
  LedgerEntry,
  LedgerSource,
  LedgerSummary,
  WbsCategory,
  WbsCode,
  WbsCodingResult,
} from '@/domain/ledger'
import type { PurchaseOrder } from '@/domain/procurement'

export const UNALLOCATED_CODE = '99.00.00'

const code = (
  c: string,
  level: 1 | 2 | 3,
  name: string,
  category: WbsCategory,
  restockable: boolean,
  keywords: string[],
  unit?: string
): WbsCode => ({ code: c, level, name, category, keywords, restockable, unit })

// ---------------------------------------------------------------------------
// WBS cost-code registry — SADC residential/commercial construction breakdown.
// `restockable` marks line items that can be re-ordered / held in stock so the
// True Ledger can separate committed restockable cover from one-time costs.
// ---------------------------------------------------------------------------
export const WBS_REGISTRY: WbsCode[] = [
  // 01 — Substructure
  code('01.01.01', 3, 'Excavation & earthworks', 'subcontract', false, ['excavation', 'excavate', 'bulk earthworks', 'bulk earth', 'digging', 'trench']),
  code('01.01.02', 3, 'Backfill & compacted fill', 'material', true, ['backfill', 'compacted fill', 'topsoil import', 'hardcore']),
  code('01.02.01', 3, 'Concrete supply', 'material', true, ['concrete', 'ready mix', 'concrete mix', 'readymix'], 'm3'),
  code('01.02.02', 3, 'Reinforcement steel', 'material', true, ['reinforcement', 'rebar', 'high tensile', 'steel mesh', 'reinforcing', 'bars'], 'kg'),
  code('01.02.03', 3, 'Formwork', 'material', true, ['formwork', 'shutter', 'shuttering', 'boxing']),
  code('01.02.04', 3, 'Damp proofing & tanking', 'material', true, ['damp proof', 'dpc', 'membrane', 'tanking', 'waterproofing', 'waterproof']),

  // 02 — Superstructure
  code('02.01.01', 3, 'Masonry units', 'material', true, ['brick', 'block', 'common brick', 'cement block', 'interlocking', 'masonry'], 'each'),
  code('02.01.02', 3, 'Mortar materials', 'material', true, ['mortar', 'cement', 'building sand', 'lime'], 'bag'),
  code('02.02.01', 3, 'Structural steel', 'material', true, ['structural steel', 'steel section', 'i-beam', 'steel column', 'steel truss'], 'm'),
  code('02.03.01', 3, 'Roof covering', 'material', true, ['roofing', 'roof sheet', 'roofing sheet', 'corrugated iron', 'roof tile', 'galvanised'], 'm2'),
  code('02.03.02', 3, 'Roof timber & trusses', 'material', true, ['purlin', 'roof timber', 'truss', 'rafter', 'roof pole'], 'm'),
  code('02.04.01', 3, 'Windows, doors & frames', 'material', true, ['window', 'door', 'frame', 'aluminium window', 'timber door', 'glazing', 'glass'], 'each'),
  code('02.04.02', 3, 'Ironmongery', 'material', true, ['hinge', 'lock', 'door handle', 'bolt', 'latch'], 'each'),

  // 03 — Finishes
  code('03.01.01', 3, 'Plaster & screed', 'material', true, ['plaster', 'screed', 'render', 'cement plaster'], 'm2'),
  code('03.02.01', 3, 'Paint & coatings', 'material', true, ['paint', 'emulsion', 'primer', 'undercoat', 'varnish', 'sealer', 'matt'], 'l'),
  code('03.03.01', 3, 'Floor & wall tiles', 'material', true, ['tile', 'tiling', 'ceramic tile', 'porcelain', 'granite', 'quartz', 'adhesive'], 'm2'),
  code('03.04.01', 3, 'Ceiling finishes', 'material', true, ['ceiling', 'gypsum', 'plasterboard', 'cornice', 'ceiling board'], 'm2'),
  code('03.05.01', 3, 'Kitchen & joinery', 'material', true, ['kitchen', 'joinery', 'cupboard', 'benchtop', 'bench top', 'wardrobe'], 'each'),
  code('03.06.01', 3, 'Sanitaryware', 'material', true, ['wc', 'basin', 'bath', 'shower', 'sanitary', 'sanitaryware', 'mixer tap', 'cistern'], 'each'),

  // 04 — Services (MEP)
  code('04.01.01', 3, 'Electrical cabling & conduits', 'material', true, ['cable', 'wiring', 'wire', 'conduit', 'trunking', 'electrical cable'], 'm'),
  code('04.01.02', 3, 'Electrical accessories', 'material', true, ['socket', 'switch', 'light fitting', 'isolator', 'breaker', 'db board', 'distribution board', 'luminaire'], 'each'),
  code('04.02.01', 3, 'Water supply pipes', 'material', true, ['pvc pipe', 'copper pipe', 'hdpe', 'water supply pipe', 'supply pipe'], 'm'),
  code('04.02.02', 3, 'Drainage & soil waste', 'material', true, ['drainage', 'sewer', 'soil pipe', 'waste pipe', 'gully', 'trap', 'pvc drain'], 'm'),
  code('04.02.03', 3, 'Plumbing fittings', 'material', true, ['tap', 'valve', 'stopcock', 'plumbing fitting', 'bath mixer', 'ball valve'], 'each'),
  code('04.03.01', 3, 'HVAC ducting', 'material', true, ['duct', 'hvac', 'air conditioning', 'extract fan', 'ducting'], 'm'),
  code('04.03.02', 3, 'HVAC & mechanical equipment', 'material', true, ['ac unit', 'aircon', 'chiller', 'heat pump', 'fan unit', 'ventilation unit'], 'each'),
  code('04.04.01', 3, 'Fire protection', 'material', true, ['fire extinguisher', 'hose reel', 'sprinkler', 'smoke detector', 'fire rated'], 'each'),
  code('04.05.01', 3, 'Security & access', 'material', true, ['cctv', 'security', 'intercom', 'alarm', 'gate motor', 'electric gate', 'access control'], 'each'),

  // 05 — External works
  code('05.01.01', 3, 'External drainage', 'material', true, ['stormwater', 'storm water', 'soakaway', 'surface water', 'external drain'], 'm'),
  code('05.02.01', 3, 'Paving', 'material', true, ['paving', 'pavers', 'paving brick', 'driveway', 'interlock pavers'], 'm2'),
  code('05.03.01', 3, 'Fencing & boundary', 'material', true, ['fence', 'fencing', 'boundary wall', 'palisade', 'gate', 'wall gate'], 'm'),
  code('05.04.01', 3, 'Landscaping', 'material', true, ['landscaping', 'lawn', 'topsoil', 'grass', 'planting', 'tree'], 'm2'),

  // 06 — Preliminaries & plant
  code('06.01.01', 3, 'Site establishment', 'service', false, ['site establishment', 'temporary works', 'scaffolding', 'hoarding', 'site office']),
  code('06.02.01', 3, 'Labour', 'labour', false, ['labour', 'bricklayer', 'carpenter', 'artisan', 'mason', 'painter', 'plumber', 'electrician', 'tradesman'], 'hr'),
  code('06.02.02', 3, 'Plant & equipment hire', 'equipment', false, ['plant hire', 'equipment hire', 'mixer', 'excavator', 'crane', 'concrete mixer', 'compactor'], 'day'),
  code('06.03.01', 3, 'Transport & haulage', 'service', false, ['transport', 'delivery', 'haulage', 'cartage', 'freight', 'truck'], 'trip'),

  // 07 — Professional fees & statutory
  code('07.01.01', 3, 'Professional fees', 'service', false, ['professional fee', 'architect', 'engineer', 'quantity surveyor', 'qs fees', 'consultant']),
  code('07.01.02', 3, 'Permits & levies', 'overhead', false, ['permit', 'levy', 'council fee', 'registration', 'insurance', 'development levy']),

  // 99 — Unallocated (auto-coding fallback)
  code(UNALLOCATED_CODE, 3, 'Unallocated / uncoded', 'service', false, []),
]

export const WBS_BY_CODE = new Map(WBS_REGISTRY.map((w) => [w.code, w]))

// ---------------------------------------------------------------------------
// Auto-coding — match a line description against the registry.
// ---------------------------------------------------------------------------

function keywordMatches(description: string, keyword: string): boolean {
  const norm = keyword.toLowerCase()
  return norm.includes(' ') ? description.includes(norm) : new RegExp(`\\b${norm}\\b`).test(description)
}

export function findWbsCode(description: string): WbsCodingResult {
  const lowered = description.toLowerCase()
  let best: WbsCode | null = null
  let bestScore = 0
  const bestKeywords: string[] = []

  for (const wbs of WBS_REGISTRY) {
    let score = 0
    const matched: string[] = []
    for (const kw of wbs.keywords) {
      if (keywordMatches(lowered, kw)) {
        matched.push(kw)
        score += kw.split(' ').length
      }
    }
    if (score > bestScore) {
      best = wbs
      bestScore = score
      bestKeywords.splice(0, bestKeywords.length, ...matched)
    }
  }

  if (!best || bestScore === 0) {
    return {
      wbs: WBS_BY_CODE.get(UNALLOCATED_CODE) ?? WBS_REGISTRY[0],
      method: 'auto-fallback',
      confidence: 0,
      matchedKeywords: [],
    }
  }
  const confidence = Math.min(0.95, 0.4 + bestKeywords.reduce((s, k) => s + k.length, 0) / 40)
  return {
    wbs: best,
    method: 'auto',
    confidence,
    matchedKeywords: bestKeywords,
  }
}

export function codeLine(input: {
  projectId: string
  source: LedgerSource
  sourceId: string
  sourceLineItemId: string
  description: string
  quantity: number
  unit: string
  unitPriceCents: number
  amountCents: number
  codedBy?: string
}): LedgerEntry {
  const { wbs, method, confidence } = findWbsCode(input.description)
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    source: input.source,
    sourceId: input.sourceId,
    sourceLineItemId: input.sourceLineItemId,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    unitPriceCents: input.unitPriceCents,
    amountCents: input.amountCents,
    wbsCode: wbs.code,
    wbsName: wbs.name,
    wbsCategory: wbs.category,
    restockable: wbs.restockable,
    codingMethod: method,
    confidence,
    codedAt: new Date().toISOString(),
    codedBy: input.codedBy ?? 'auto',
  }
}

export function codePurchaseOrderLines(po: PurchaseOrder): LedgerEntry[] {
  return po.lineItems.map((line) =>
    codeLine({
      projectId: po.projectId,
      source: 'purchase-order',
      sourceId: po.id,
      sourceLineItemId: line.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      amountCents: line.totalCents,
      codedBy: 'auto',
    })
  )
}

// ---------------------------------------------------------------------------
// Ledger summaries — committed cost by WBS/category, restockable cover.
// ---------------------------------------------------------------------------

const CATEGORIES: WbsCategory[] = ['material', 'labour', 'equipment', 'subcontract', 'service', 'overhead']

export function summarizeLedger(entries: LedgerEntry[]): LedgerSummary {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<WbsCategory, number>
  const codeTotals = new Map<string, LedgerSummary['byCode'][number]>()

  let totalCents = 0
  let restockableCents = 0
  let unallocatedCents = 0
  let unallocatedCount = 0

  for (const e of entries) {
    totalCents += e.amountCents
    byCategory[e.wbsCategory] = (byCategory[e.wbsCategory] ?? 0) + e.amountCents
    if (e.restockable) restockableCents += e.amountCents

    if (e.wbsCode === UNALLOCATED_CODE) {
      unallocatedCents += e.amountCents
      unallocatedCount += 1
    }

    const existing = codeTotals.get(e.wbsCode)
    if (existing) {
      existing.amountCents += e.amountCents
      existing.count += 1
    } else {
      codeTotals.set(e.wbsCode, {
        code: e.wbsCode,
        name: e.wbsName,
        category: e.wbsCategory,
        amountCents: e.amountCents,
        count: 1,
        restockable: e.restockable,
      })
    }
  }

  const byCode = [...codeTotals.values()].sort((a, b) => b.amountCents - a.amountCents)

  return {
    totalCents,
    entryCount: entries.length,
    byCategory,
    restockableCents,
    oneTimeCents: totalCents - restockableCents,
    unallocatedCents,
    unallocatedCount,
    byCode,
  }
}

export function restockableCover(entries: LedgerEntry[], wbsCode: string): number {
  return entries
    .filter((e) => e.wbsCode === wbsCode && e.restockable)
    .reduce((sum, e) => sum + e.amountCents, 0)
}

export function committedForCode(entries: LedgerEntry[], wbsCode: string): number {
  return entries.filter((e) => e.wbsCode === wbsCode).reduce((sum, e) => sum + e.amountCents, 0)
}
