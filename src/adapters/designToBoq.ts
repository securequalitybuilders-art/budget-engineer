import type { DesignOption } from '@/domain/boq'
import type { BOQ, BOQLineItem } from '@/lib/boq/boq-types'
import { buildDesignGeometry } from './designGeometryAdapter'
import { designOptionToBimModel } from './designToBim'
import { generateBoqFromBim } from '@/engine/boq-generator'
import { RATE_CARDS } from '@/lib/rates/rate-card'

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

export function buildBoqFromDesignOption(design: DesignOption | null, region = 'zimbabwe'): BOQ | null {
  if (!design || design.grossFloorArea <= 0) return null

  const bim = designOptionToBimModel(design)
  if (!bim) return null

  const baseBoq = safe(() => generateBoqFromBim(bim), null)
  if (!baseBoq) return null

  const geo = buildDesignGeometry(design)
  const doorCount = geo.openings.filter((o) => o.type === 'door').length
  const windowCount = geo.openings.filter((o) => o.type === 'window').length
  const internalWallCount = geo.walls.filter((w) => w.kind === 'internal').length
  const area = design.grossFloorArea

  const card = RATE_CARDS[region] ?? RATE_CARDS.zimbabwe

  const extraItems: BOQLineItem[] = []

  if (doorCount > 0) {
    extraItems.push({
      id: `boq-extra-doors`,
      quantityRef: 'doors',
      category: 'Openings',
      description: `Internal doors (${doorCount} nr)`,
      unit: 'each',
      quantity: doorCount,
      rate: 180,
      total: doorCount * 180,
    })
  }

  if (windowCount > 0) {
    extraItems.push({
      id: `boq-extra-windows`,
      quantityRef: 'windows',
      category: 'Openings',
      description: `Windows with glazing (${windowCount} nr)`,
      unit: 'each',
      quantity: windowCount,
      rate: 320,
      total: windowCount * 320,
    })
  }

  if (internalWallCount > 0) {
    extraItems.push({
      id: `boq-extra-partitions`,
      quantityRef: 'partitions',
      category: 'Walls',
      description: `Internal partition walls (${internalWallCount} walls)`,
      unit: 'm²',
      quantity: internalWallCount * 8,
      rate: 65,
      total: internalWallCount * 8 * 65,
    })
  }

  if (area > 0) {
    extraItems.push({
      id: `boq-extra-finishes`,
      quantityRef: 'finishes',
      category: 'Finishes',
      description: 'Floor, wall & ceiling finishes allowance',
      unit: 'm²',
      quantity: area,
      rate: 35,
      total: area * 35,
    })
    extraItems.push({
      id: `boq-extra-services`,
      quantityRef: 'services',
      category: 'MEP',
      description: 'Electrical, plumbing & drainage allowance',
      unit: 'm²',
      quantity: area,
      rate: 45,
      total: area * 45,
    })
  }

  const allItems = [...baseBoq.items, ...extraItems]
  const subtotal = Math.round(allItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100
  const contingency = Math.round(subtotal * 0.05 * 100) / 100
  const professionalFees = Math.round(subtotal * 0.07 * 100) / 100
  const vat = Math.round((subtotal + contingency + professionalFees) * 0.15 * 100) / 100
  const grandTotal = Math.round((subtotal + contingency + professionalFees + vat) * 100) / 100

  return {
    ...baseBoq,
    currency: card.currency,
    items: allItems,
    summary: { subtotal, contingency, professionalFees, vat, grandTotal },
  }
}

export function getCostPerM2(boq: BOQ, areaM2: number): number {
  if (areaM2 <= 0 || boq.summary.grandTotal <= 0) return 0
  return Math.round((boq.summary.grandTotal / areaM2) * 100) / 100
}

export function buildExportCsv(boq: BOQ): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = []
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

export function buildExportHtml(designName: string, boq: BOQ, areaM2: number, floors: number): string {
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
  .summary { margin-top: 14px; margin-left: auto; width: 320px; }
  .summary tr td { border: none; padding: 5px 9px; }
  .summary tr.total td { border-top: 2px solid #1a365d; font-weight: 700; font-size: 15px; color: #1a365d; }
  .totals { background: #0f172a; color: #fff; padding: 16px 20px; border-radius: 10px; margin-top: 18px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #334155; }
  .totals .grand { display: flex; justify-content: space-between; padding-top: 10px; font-size: 18px; font-weight: 800; color: #22c55e; border-top: 2px solid #22c55e; }
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
      <div><b>${costPerM2.toFixed(2)}</b>Cost per m² (${boq.currency})</div>
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
    <div class="footer">
      Generated by Budget Engineer Studio. Quantities derived from parametric BIM model;
      rates are early-stage estimates. This document is a budgeting aid, not a tendered contract sum.
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
