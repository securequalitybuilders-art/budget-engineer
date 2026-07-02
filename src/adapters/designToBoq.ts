import type { DesignOption } from '@/domain/boq'
import type { BOQ, BOQLineItem } from '@/lib/boq/boq-types'
import { designOptionToBimModel } from './designToBim'
import { generateBoqFromBim } from '@/engine/boq-generator'
import { resolveBoqRate, getContingencyRate, getFeesRate, getVatRate } from './rateCardAdapter'
import { getRegionRateCard } from './rateCardAdapter'
import type { RateAssumption } from './rateCardAdapter'
import { extractGeometryQuantities, type GeometryQuantities } from './geometryQuantitiesAdapter'
import type { CadQuantities } from './cadQuantitiesAdapter'

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

export type GeometrySource = 'generated-design' | 'persisted-cad' | 'fallback-generated' | 'unknown'

export interface BoqSourceMetadata {
  geometrySource: GeometrySource
  quantitySourceLabel: string
  sourceWarnings?: string[]
  computedAt: string
  designId?: string
  projectId?: string
  cadDocumentId?: string
}

export interface BoqResult extends BOQ {
  assumptions: RateAssumption[]
  quantities?: GeometryQuantities
  sourceMetadata?: BoqSourceMetadata
}

const QTY_SOURCE_GENERATED = 'generated geometry'
const QTY_SOURCE_EDITED_CAD = 'edited CAD'

function applyCadQuantityOverrides(qty: GeometryQuantities, cadQuantities: CadQuantities | null): { qty: GeometryQuantities; sourceLabel: string } {
  if (!cadQuantities) return { qty, sourceLabel: QTY_SOURCE_GENERATED }
  const overrides: Partial<GeometryQuantities> = {}
  if (cadQuantities.externalWallLength > 0) overrides.externalWallLength = cadQuantities.externalWallLength
  if (cadQuantities.internalWallLength > 0) overrides.internalWallLength = cadQuantities.internalWallLength
  if (cadQuantities.externalWallArea > 0) overrides.externalWallArea = cadQuantities.externalWallArea
  if (cadQuantities.internalWallArea > 0) {
    overrides.internalWallArea = cadQuantities.internalWallArea
    overrides.partitionArea = cadQuantities.internalWallArea
  }
  if (cadQuantities.doorCount > 0) overrides.doorCount = cadQuantities.doorCount
  if (cadQuantities.windowCount > 0) overrides.windowCount = cadQuantities.windowCount
  if (cadQuantities.openingArea > 0) overrides.openingArea = cadQuantities.openingArea
  return { qty: { ...qty, ...overrides }, sourceLabel: QTY_SOURCE_EDITED_CAD }
}

export function buildBoqFromDesignOption(
  design: DesignOption | null,
  region = 'zimbabwe',
  sourceMetadata?: BoqSourceMetadata,
  cadQuantities?: CadQuantities | null,
): BoqResult | null {
  if (!design || design.grossFloorArea <= 0) return null

  const baseQty = extractGeometryQuantities(design)
  const { qty: qty, sourceLabel: qtySourceLabel } = applyCadQuantityOverrides(baseQty, cadQuantities ?? null)

  const bim = designOptionToBimModel(design)
  if (!bim) return null

  const baseBoq = safe(() => generateBoqFromBim(bim), null)
  if (!baseBoq) return null

  const card = getRegionRateCard(region)

  const isCad = qtySourceLabel === QTY_SOURCE_EDITED_CAD
  const wallLabel = isCad ? `External walls (${qty.externalWallArea.toFixed(0)} m² from ${qtySourceLabel})` : `External walls (${qty.externalWallArea.toFixed(0)} m² from generated geometry)`
  const partitionLabel = isCad ? `Internal partitions (${qty.partitionArea.toFixed(0)} m² from ${qtySourceLabel})` : `Internal partitions (${qty.partitionArea.toFixed(0)} m² from generated geometry)`
  const doorLabel = isCad ? `Doors (${qty.doorCount} nr from ${qtySourceLabel})` : `Doors (${qty.doorCount} nr from generated openings)`
  const windowLabel = isCad ? `Windows (${qty.windowCount} nr from ${qtySourceLabel})` : `Windows (${qty.windowCount} nr from generated openings)`

  const assumptions: RateAssumption[] = [
    { ...resolveBoqRate(region, 'wall', 85), itemKey: 'wall', label: wallLabel },
    { ...resolveBoqRate(region, 'slab', 110), itemKey: 'slab', label: 'Floor slabs' },
    { ...resolveBoqRate(region, 'roof', 75), itemKey: 'roof', label: 'Roof' },
    { ...resolveBoqRate(region, 'partition', 65), itemKey: 'partition', label: partitionLabel },
    { ...resolveBoqRate(region, 'door', 180), itemKey: 'door', label: doorLabel },
    { ...resolveBoqRate(region, 'window', 320), itemKey: 'window', label: windowLabel },
    { ...resolveBoqRate(region, 'opening', 250), itemKey: 'opening', label: 'Generic openings' },
    { itemKey: 'finishes', label: `Finishes allowance (${qty.finishFloorArea.toFixed(0)} m² from generated rooms)`, rate: 35, currency: card.currency, source: 'fallback' as const, warning: 'Finishes rate is a fixed estimate, not from rate card' },
    { itemKey: 'services', label: `Services allowance (${qty.serviceZoneArea.toFixed(0)} m² from generated zones)`, rate: 45, currency: card.currency, source: 'fallback' as const, warning: 'Services rate is a fixed estimate, not from rate card' },
  ]

  if (qty.warnings.length > 0) {
    for (const w of qty.warnings) {
      assumptions.push({ itemKey: 'warning', label: w, rate: 0, currency: card.currency, source: 'fallback' as const, warning: w })
    }
  }

  // Post-process base BOQ items to use rate card rates
  const baseItems: BOQLineItem[] = baseBoq.items.map((item) => {
    let itemKey: string | null = null
    if (item.category === 'Walls') itemKey = 'wall'
    else if (item.category === 'Slabs') itemKey = 'slab'
    else if (item.category === 'Roof') itemKey = 'roof'
    else if (item.category === 'Openings') {
      const desc = item.description.toLowerCase()
      if (desc.includes('door')) itemKey = 'door'
      else if (desc.includes('window') || desc.includes('glazing')) itemKey = 'window'
      else itemKey = 'opening'
    }
    else if (item.category === 'Objects') itemKey = 'object'

    if (itemKey) {
      const resolved = resolveBoqRate(region, itemKey, item.rate)
      const newTotal = Math.round(item.quantity * resolved.rate * 100) / 100
      return { ...item, rate: resolved.rate, total: newTotal }
    }
    return item
  })

  const extraItems: BOQLineItem[] = []

  if (qty.doorCount > 0) {
    const r = resolveBoqRate(region, 'door', 180)
    extraItems.push({
      id: 'boq-extra-doors',
      quantityRef: 'doors',
      category: 'Openings',
      description: `Internal doors (${qty.doorCount} nr) — from ${qtySourceLabel}`,
      unit: 'each',
      quantity: qty.doorCount,
      rate: r.rate,
      total: Math.round(qty.doorCount * r.rate * 100) / 100,
    })
  }

  if (qty.windowCount > 0) {
    const r = resolveBoqRate(region, 'window', 320)
    extraItems.push({
      id: 'boq-extra-windows',
      quantityRef: 'windows',
      category: 'Openings',
      description: `Windows with glazing (${qty.windowCount} nr) — from ${qtySourceLabel}`,
      unit: 'each',
      quantity: qty.windowCount,
      rate: r.rate,
      total: Math.round(qty.windowCount * r.rate * 100) / 100,
    })
  }

  if (qty.partitionArea > 0) {
    const r = resolveBoqRate(region, 'partition', 65)
    extraItems.push({
      id: 'boq-extra-partitions',
      quantityRef: 'partitions',
      category: 'Walls',
      description: `Internal partitions (${qty.partitionArea.toFixed(0)} m²) — from ${qtySourceLabel}`,
      unit: 'm²',
      quantity: Math.round(qty.partitionArea * 100) / 100,
      rate: r.rate,
      total: Math.round(qty.partitionArea * r.rate * 100) / 100,
    })
  }

  if (qty.externalWallArea > 0) {
    const r = resolveBoqRate(region, 'wall', 85)
    extraItems.push({
      id: 'boq-extra-ext-walls',
      quantityRef: 'external-walls',
      category: 'Walls',
      description: `External wall area (${qty.externalWallArea.toFixed(0)} m²) — from ${qtySourceLabel}`,
      unit: 'm²',
      quantity: Math.round(qty.externalWallArea * 100) / 100,
      rate: r.rate,
      total: Math.round(qty.externalWallArea * r.rate * 100) / 100,
    })
  }

  if (qty.finishFloorArea > 0) {
    extraItems.push({
      id: 'boq-extra-finishes',
      quantityRef: 'finishes',
      category: 'Finishes',
      description: `Floor, wall & ceiling finishes (${qty.finishFloorArea.toFixed(0)} m²) — from generated rooms`,
      unit: 'm²',
      quantity: Math.round(qty.finishFloorArea * 100) / 100,
      rate: 35,
      total: Math.round(qty.finishFloorArea * 35 * 100) / 100,
    })
  }

  if (qty.serviceZoneArea > 0) {
    extraItems.push({
      id: 'boq-extra-services',
      quantityRef: 'services',
      category: 'MEP',
      description: `Electrical, plumbing & drainage (${qty.serviceZoneArea.toFixed(0)} m² from ${qty.roomCount} rooms, ${qty.wetRoomCount} wet rooms)`,
      unit: 'm²',
      quantity: Math.round(qty.serviceZoneArea * 100) / 100,
      rate: 45,
      total: Math.round(qty.serviceZoneArea * 45 * 100) / 100,
    })
  }

  const allItems = [...baseItems, ...extraItems]
  const subtotal = Math.round(allItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100
  const contingencyPct = getContingencyRate(region)
  const feesPct = getFeesRate(region)
  const vatPct = getVatRate(region)
  const contingency = Math.round(subtotal * contingencyPct * 100) / 100
  const professionalFees = Math.round(subtotal * feesPct * 100) / 100
  const vat = Math.round((subtotal + contingency + professionalFees) * vatPct * 100) / 100
  const grandTotal = Math.round((subtotal + contingency + professionalFees + vat) * 100) / 100

  const result: BoqResult = {
    ...baseBoq,
    currency: card.currency,
    items: allItems,
    summary: { subtotal, contingency, professionalFees, vat, grandTotal },
    assumptions,
    quantities: qty,
  }

  if (sourceMetadata) {
    result.sourceMetadata = sourceMetadata
  }

  return result
}

export function getCostPerM2(boq: BOQ, areaM2: number): number {
  if (areaM2 <= 0 || boq.summary.grandTotal <= 0) return 0
  return Math.round((boq.summary.grandTotal / areaM2) * 100) / 100
}

export function buildExportCsv(
  boq: BOQ,
  regionName?: string,
  quantities?: GeometryQuantities,
  sourceMetadata?: BoqSourceMetadata,
): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = []
  if (regionName) {
    lines.push(esc(`Region: ${regionName}`))
  }
  lines.push(esc(`Currency: ${boq.currency}`))
  if (sourceMetadata) {
    lines.push(esc(`Geometry source: ${sourceMetadata.geometrySource}`))
    lines.push(esc(`Quantity source: ${sourceMetadata.quantitySourceLabel}`))
    if (sourceMetadata.sourceWarnings && sourceMetadata.sourceWarnings.length > 0) {
      for (const w of sourceMetadata.sourceWarnings) {
        lines.push(esc(`Warning: ${w}`))
      }
    }
    lines.push(esc(`Computed at: ${sourceMetadata.computedAt}`))
  }
  if (quantities) {
    lines.push(esc(`Gross floor area: ${quantities.grossFloorArea.toFixed(0)} m²`))
    lines.push(esc(`External walls: ${quantities.externalWallArea.toFixed(0)} m²`))
    lines.push(esc(`Internal partitions: ${quantities.partitionArea.toFixed(0)} m²`))
    lines.push(esc(`Doors: ${quantities.doorCount} nr`))
    lines.push(esc(`Windows: ${quantities.windowCount} nr`))
    lines.push(esc(`Finish area: ${quantities.finishFloorArea.toFixed(0)} m²`))
    lines.push(esc(`Rooms: ${quantities.roomCount} (${quantities.wetRoomCount} wet rooms)`))
  }
  lines.push(['Category', 'Description', 'Quantity', 'Unit', `Rate (${boq.currency})`, `Total (${boq.currency})`].map(esc).join(','))
  for (const it of boq.items) {
    lines.push([it.category, it.description, it.quantity, it.unit, it.rate.toFixed(2), it.total.toFixed(2)].map(esc).join(','))
  }
  lines.push('')
  lines.push(['', '', '', '', 'Subtotal', boq.summary.subtotal.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'Contingency', boq.summary.contingency.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'Professional Fees', boq.summary.professionalFees.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'VAT', boq.summary.vat.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', 'Grand Total', boq.summary.grandTotal.toFixed(2)].map(esc).join(','))
  return lines.join('\n')
}

export function buildExportHtml(
  designName: string,
  boq: BOQ,
  areaM2: number,
  floors: number,
  regionName?: string,
  assumptions?: RateAssumption[],
  sourceMetadata?: BoqSourceMetadata,
): string {
  const sym = boq.currency === 'USD' ? '$' : boq.currency === 'ZAR' ? 'R' : boq.currency === 'KES' ? 'KSh' : '$'
  const money = (n: number) => `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const costPerM2 = getCostPerM2(boq, areaM2)
  const now = new Date().toLocaleString()

  const rows = boq.items.map((it) => `
    <tr>
      <td><span class="tag">${it.category}</span></td>
      <td>${it.description}</td>
      <td class="num">${it.quantity.toLocaleString()}</td>
      <td>${it.unit}</td>
      <td class="num">${money(it.rate)}</td>
      <td class="num">${money(it.total)}</td>
    </tr>`).join('')

  const assumptionRows = (assumptions ?? []).map((a) => `
    <tr>
      <td>${a.label}</td>
      <td class="num">${money(a.rate)}</td>
      <td><span class="tag ${a.source === 'rate-card' ? 'tag-ok' : 'tag-warn'}">${a.source === 'rate-card' ? 'Rate card' : 'Estimate'}</span></td>
      <td style="font-size:10px;color:#94a3b8">${a.warning ?? '—'}</td>
    </tr>`).join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>BOQ — ${designName}</title>
<style>
  @page { size: A4 portrait; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 0; }
  .cover { background: linear-gradient(135deg, #1a365d, #d4a574); color: #fff; padding: 28px 24px; border-radius: 12px; }
  .cover h1 { font-family: 'Space Grotesk', Arial, sans-serif; margin: 0 0 6px; font-size: 26px; }
  .cover p { margin: 2px 0; opacity: .92; font-size: 13px; }
  .meta { display: flex; gap: 24px; margin: 18px 0; flex-wrap: wrap; }
  .meta div { font-size: 12px; color: #475569; }
  .meta b { display: block; color: #0f172a; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
  th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .tag { font-size: 10px; padding: 2px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; }
  .tag-ok { background: #dcfce7; color: #166534; }
  .tag-warn { background: #fef9c3; color: #854d0e; }
  .summary { margin-top: 14px; margin-left: auto; width: 320px; }
  .summary tr td { border: none; padding: 5px 9px; }
  .summary tr.total td { border-top: 2px solid #1a365d; font-weight: 700; font-size: 15px; color: #1a365d; }
  .totals { background: #0f172a; color: #fff; padding: 16px 20px; border-radius: 10px; margin-top: 18px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #334155; }
  .totals .grand { display: flex; justify-content: space-between; padding-top: 10px; font-size: 18px; font-weight: 800; color: #22c55e; border-top: 2px solid #22c55e; }
  .assumptions { margin-top: 20px; }
  .assumptions h3 { font-size: 14px; color: #1a365d; margin: 0 0 8px; }
  .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .printbar { position: sticky; top: 0; background: #0b1220; padding: 10px; text-align: center; }
  .printbar button { background: #06b6d4; color: #04202a; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
  @media print { .printbar { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="printbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div style="padding: 18mm;">
    <div class="cover">
      <h1>Bill of Quantities</h1>
      <p>${designName}</p>
      <p>Budget Engineer Studio — DZENHARE OS</p>
    </div>
    <div class="meta">
      <div><b>${designName}</b>Design Option</div>
      <div><b>${areaM2.toFixed(0)} m²</b>Gross Floor Area</div>
      <div><b>${floors}</b>Floor${floors > 1 ? 's' : ''}</div>
      <div><b>${regionName ?? '—'}</b>Region</div>
      <div><b>${boq.currency}</b>Currency</div>
      ${sourceMetadata ? `<div><b>${sourceMetadata.geometrySource}</b>Geometry Source</div><div><b>${sourceMetadata.quantitySourceLabel}</b>Quantity Source</div>` : ''}
      <div><b>${costPerM2.toFixed(2)}</b>Cost per m²</div>
      <div><b>${boq.items.length}</b>Line items</div>
      <div><b>${now}</b>Generated</div>
    </div>
    <h2>Bill of Quantities</h2>
    <table>
      <thead><tr>
        <th>Category</th><th>Description</th><th class="num">Qty</th><th>Unit</th>
        <th class="num">Rate</th><th class="num">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${money(boq.summary.subtotal)}</span></div>
      <div class="row"><span>Contingency (${boq.summary.subtotal > 0 ? Math.round((boq.summary.contingency / boq.summary.subtotal) * 100) : 0}%)</span><span>${money(boq.summary.contingency)}</span></div>
      <div class="row"><span>Professional Fees (${boq.summary.subtotal > 0 ? Math.round((boq.summary.professionalFees / boq.summary.subtotal) * 100) : 0}%)</span><span>${money(boq.summary.professionalFees)}</span></div>
      <div class="row"><span>VAT (${boq.summary.grandTotal > 0 ? Math.round((boq.summary.vat / (boq.summary.grandTotal - boq.summary.vat)) * 100) : 0}%)</span><span>${money(boq.summary.vat)}</span></div>
      <div class="grand"><span>Grand Total</span><span>${money(boq.summary.grandTotal)}</span></div>
    </div>
    ${assumptionRows.length > 0 ? `
    <div class="assumptions">
      <h3>Rate Assumptions</h3>
      <table>
        <thead><tr><th>Item</th><th class="num">Rate</th><th>Source</th><th>Notes</th></tr></thead>
        <tbody>${assumptionRows}</tbody>
      </table>
    </div>` : ''}
    <div class="footer">
      ${sourceMetadata?.sourceWarnings?.length ? sourceMetadata.sourceWarnings.map((w) => `<p style="color:#b91c1c;font-size:10px">⚠ ${w}</p>`).join('') : ''}
      Generated by Budget Engineer Studio. Quantities derived from parametric BIM model;
      rates are early-stage estimates from regional rate cards. This document is a budgeting aid, not a tendered contract sum.
    </div>
  </div>
</body></html>`
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000)
}
