import type { BOQ, BOQLineItem, BOQSummary } from './boq-types'
import type { BuildingGraph } from '../../domain/building'
import { buildBoqFromBuildingGraph, type GraphBoqResult } from '../../adapters/canonical/building-to-boq'
import { getRegionRateCard } from '../../adapters/rateCardAdapter'
import { uuid } from '../utils'

export interface EscalationConfig {
  rate: number
  label: string
  applyToCategories?: string[]
}

export interface TradeBreakdown {
  trade: string
  total: number
  pct: number
  itemCount: number
}

export interface EnterpriseBoqMetadata {
  generatedAt: string
  canonicalGraphId: string
  projectName: string
  rateCardRegion: string
  rateCardCurrency: string
  escalationApplied: boolean
  escalationRate: number
}

export interface EnterpriseBoqResult {
  baseBoq: GraphBoqResult
  itemsWithEscalation: BOQLineItem[]
  tradeBreakdown: TradeBreakdown[]
  summary: BOQSummary
  metadata: EnterpriseBoqMetadata
  csv: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function buildEnterpriseBoq(
  graph: BuildingGraph,
  region = 'zimbabwe',
  roofType: 'concrete-slab' | 'cgi-truss' = 'concrete-slab',
  escalation?: EscalationConfig,
): EnterpriseBoqResult | null {
  const base = buildBoqFromBuildingGraph(graph, region, roofType)
  if (!base) return null

  const card = getRegionRateCard(region)
  const escRate = escalation?.rate ?? 0
  const applyTo = escalation?.applyToCategories
  const escApplied = escRate > 0

  const itemsWithEscalation = base.items.map((item) => {
    if (escApplied && (!applyTo || applyTo.includes(item.category))) {
      const escFactor = 1 + escRate / 100
      return { ...item, total: round2(item.total * escFactor) }
    }
    return item
  })

  const tradeMap = new Map<string, { total: number; count: number }>()
  for (const item of itemsWithEscalation) {
    const existing = tradeMap.get(item.category) ?? { total: 0, count: 0 }
    existing.total += item.total
    existing.count += 1
    tradeMap.set(item.category, existing)
  }
  const grandTotal = itemsWithEscalation.reduce((s, i) => s + i.total, 0)

  const tradeBreakdown: TradeBreakdown[] = Array.from(tradeMap.entries())
    .map(([trade, data]) => ({
      trade,
      total: round2(data.total),
      pct: grandTotal > 0 ? round2((data.total / grandTotal) * 100) : 0,
      itemCount: data.count,
    }))
    .sort((a, b) => b.total - a.total)

  const contingencyRate = (base.summary.contingency && grandTotal > 0)
    ? round2((base.summary.contingency / grandTotal) * 100)
    : 0.1
  const feesRate = 0.12
  const vatRate = 0.15

  const subTotal = round2(itemsWithEscalation.reduce((s, i) => s + i.total, 0))
  const contingency = round2(subTotal * contingencyRate)
  const fees = round2((subTotal + contingency) * feesRate)
  const vat = round2((subTotal + contingency + fees) * vatRate)
  const grand = round2(subTotal + contingency + fees + vat)

  const summary: BOQSummary = { subtotal: subTotal, contingency, professionalFees: fees, vat, grandTotal: grand }

  const metadata: EnterpriseBoqMetadata = {
    generatedAt: new Date().toISOString(),
    canonicalGraphId: graph.meta.id,
    projectName: graph.meta.name,
    rateCardRegion: region,
    rateCardCurrency: card.currency,
    escalationApplied: escApplied,
    escalationRate: escRate,
  }

  const csvHeader = 'Ref,Category,Description,Unit,Quantity,Rate,Total'
  const csvRows = itemsWithEscalation.map((i) =>
    `"${i.quantityRef}","${i.category}","${i.description}","${i.unit}",${i.quantity},${i.rate},${i.total}`
  )
  const csvTradeSummary = tradeBreakdown.map((t) => `"${t.trade}",${t.total},${t.pct}%`)
  const csv = [csvHeader, ...csvRows, '', 'Trade,Total,%', ...csvTradeSummary].join('\n')

  return { baseBoq: base, itemsWithEscalation, tradeBreakdown, summary, metadata, csv }
}

export function buildEnterpriseBoqCsv(result: EnterpriseBoqResult): string {
  return result.csv
}

export function buildEnterpriseBoqHtml(result: EnterpriseBoqResult): string {
  const itemsHtml = result.itemsWithEscalation.map((i) =>
    `<tr><td>${i.quantityRef}</td><td>${i.category}</td><td>${i.description}</td><td>${i.unit}</td><td class="num">${i.quantity}</td><td class="num">${i.rate.toFixed(2)}</td><td class="num">${i.total.toFixed(2)}</td></tr>`
  ).join('\n')

  const tradeHtml = result.tradeBreakdown.map((t) =>
    `<tr><td>${t.trade}</td><td class="num">${t.total.toFixed(2)}</td><td class="num">${t.pct}%</td><td class="num">${t.itemCount}</td></tr>`
  ).join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Enterprise BOQ — ${result.metadata.projectName}</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#1a1a2e}
h1{color:#2c3e50;border-bottom:2px solid #2c3e50;padding-bottom:8px}
.meta{color:#64748b;font-size:0.9em;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0}
th{background:#f1f5f9;font-weight:600}
.num{text-align:right}
.summary td{border-top:2px solid #2c3e50;font-weight:600}
.escalation{background:#fffbeb;border:1px solid #fbbf24;padding:12px;border-radius:6px;margin:16px 0}
.trade-pct{display:inline-block;height:12px;border-radius:6px;margin-right:8px}
</style></head><body>
<h1>Enterprise Bill of Quantities</h1>
<div class="meta">
<p><strong>Project:</strong> ${result.metadata.projectName}</p>
<p><strong>Generated:</strong> ${result.metadata.generatedAt}</p>
<p><strong>Rate Card:</strong> ${result.metadata.rateCardRegion} (${result.metadata.rateCardCurrency})</p>
<p><strong>Canonical Graph:</strong> ${result.metadata.canonicalGraphId}</p>
</div>
${result.metadata.escalationApplied ? `<div class="escalation"><strong>Escalation:</strong> ${result.metadata.escalationRate}% applied to items</div>` : ''}
<h2>Itemised BOQ</h2>
<table>
<thead><tr><th>Ref</th><th>Trade</th><th>Description</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Total</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<h2>Trade Breakdown</h2>
<table>
<thead><tr><th>Trade</th><th class="num">Total</th><th class="num">%</th><th class="num">Items</th></tr></thead>
<tbody>${tradeHtml}</tbody>
</table>
<h2>Summary</h2>
<table class="summary">
<tr><td>Subtotal</td><td class="num">${result.summary.subtotal.toFixed(2)}</td></tr>
<tr><td>Contingency (${(result.summary.contingency > 0 ? (result.summary.contingency / result.summary.subtotal * 100).toFixed(1) : '10.0')}%)</td><td class="num">${result.summary.contingency.toFixed(2)}</td></tr>
<tr><td>Professional Fees (12.0%)</td><td class="num">${result.summary.professionalFees.toFixed(2)}</td></tr>
<tr><td>VAT (15.0%)</td><td class="num">${result.summary.vat.toFixed(2)}</td></tr>
<tr style="font-size:1.2em"><td><strong>Grand Total</strong></td><td class="num"><strong>${result.summary.grandTotal.toFixed(2)}</strong></td></tr>
</table>
</body></html>`
}
