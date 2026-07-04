/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DesignOption } from '@/domain/boq'
import type { BoqResult } from './designToBoq'
import { currencySymbol } from '@/lib/utils/currency'
import { isValidPngDataUrl } from '@/lib/3d-snapshot'
const CATEGORY_DISPLAY: Record<string, string> = {
  Walls: 'Walling',
  Slabs: 'Substructure',
  Roof: 'Roofing',
  Openings: 'Openings',
  Finishes: 'Finishes',
  MEP: 'Services',
  Objects: 'Fittings',
}
const CATEGORY_ORDER = ['Slabs', 'Walls', 'Roof', 'Openings', 'Finishes', 'MEP', 'Objects']

interface CategoryGroup {
  name: string
  items: { id: string; description: string; quantity: number; rate: number; total: number; unit?: string; category?: string }[]
  subtotal: number
}

function groupBoqItems(boq: BoqResult): CategoryGroup[] {
  const grouped = new Map<string, CategoryGroup['items']>()
  for (const item of boq.items) {
    const cat = item.category || 'Other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      total: item.total,
      unit: item.unit,
      category: item.category,
    })
  }
  const result: CategoryGroup[] = []
  for (const cat of CATEGORY_ORDER) {
    const items = grouped.get(cat)
    if (!items || items.length === 0) continue
    result.push({
      name: CATEGORY_DISPLAY[cat] ?? cat,
      items,
      subtotal: Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100,
    })
  }
  for (const [cat, items] of grouped) {
    if (!CATEGORY_ORDER.includes(cat)) {
      result.push({ name: CATEGORY_DISPLAY[cat] ?? cat, items, subtotal: Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100 })
    }
  }
  return result
}

export function embedSnapshotInPdf(doc: any, snapshotDataUrl: string | undefined, y: number, margin: number, contentW: number): number {
  if (!snapshotDataUrl || !isValidPngDataUrl(snapshotDataUrl)) return y
  try {
    const imgW = contentW * 0.7
    const imgH = imgW * 0.6
    const imgX = margin + (contentW - imgW) / 2
    doc.addImage(snapshotDataUrl, 'PNG', imgX, y, imgW, imgH)
    return y + imgH + 6
  } catch (e) {
    console.warn('Failed to embed 3D snapshot in PDF', e)
    return y
  }
}

function fmt(n: number, sym: string, dp = 2): string {
  return sym + n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export async function generatePdfReport(
  design: DesignOption,
  boq: BoqResult,
  snapshotDataUrl?: string,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const sym = currencySymbol(boq.currency)
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW = 210
  const margin = 14
  const contentW = pageW - margin * 2
  let y = margin

  const projectName = design.name
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Header bar (Deep Cobalt brand) ──
  doc.setFillColor(30, 41, 82)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Budget Engineer \u2014 Cost Report', margin, 12)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${today}`, margin, 20)

  y = 36

  // ── Project info ──
  doc.setTextColor(30, 41, 82)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Project Summary', margin, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const infoLines = [
    `Project: ${projectName}`,
    `Building Type: ${design.buildingType}`,
    `Total Area: ${design.grossFloorArea.toFixed(0)} m\u00B2`,
    `Storeys: ${design.floors}`,
    `Currency: ${boq.currency}`,
  ]
  if (boq.sourceMetadata?.quantitySourceLabel) {
    infoLines.push(`Quantity Source: ${boq.sourceMetadata.quantitySourceLabel}`)
  }
  for (const line of infoLines) {
    doc.text(line, margin + 2, y)
    y += 5
  }

  // ── 3D snapshot (if available) ──
  y += 3
  y = embedSnapshotInPdf(doc, snapshotDataUrl, y, margin, contentW)

  // ── Disclaimer ──
  y += 2
  doc.setTextColor(180, 120, 40)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.text('Early estimate \u2014 consult a registered professional for final construction.', margin, y)
  y += 6

  // ── BOQ table grouped by trade ──
  const groups = groupBoqItems(boq)
  doc.setTextColor(30, 41, 82)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill of Quantities', margin, y)
  y += 4

  interface AutoTableRow {
    description: string
    qty: string
    rate: string
    total: string
  }

  for (const group of groups) {
    if (y > 260) {
      doc.addPage()
      y = margin
    }

    const body: AutoTableRow[] = group.items.map((item) => ({
      description: item.description,
      qty: item.quantity.toLocaleString(),
      rate: fmt(item.rate, sym),
      total: fmt(item.total, sym),
    }))

    body.push({
      description: `${group.name} subtotal`,
      qty: '',
      rate: '',
      total: fmt(group.subtotal, sym),
    })

    ;(doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Item', 'Qty', 'Rate', 'Total']],
      body: body.map((row, ri) => {
        const isSubtotal = ri === body.length - 1
        return [
          { content: row.description, styles: { fontStyle: isSubtotal ? 'bold' : 'normal', textColor: isSubtotal ? 30 : 80 } },
          { content: row.qty, styles: { halign: 'right', textColor: isSubtotal ? 30 : 80, fontStyle: isSubtotal ? 'bold' : 'normal' } },
          { content: row.rate, styles: { halign: 'right', textColor: isSubtotal ? 30 : 80, fontStyle: isSubtotal ? 'bold' : 'normal' } },
          { content: row.total, styles: { halign: 'right', textColor: isSubtotal ? 30 : 80, fontStyle: isSubtotal ? 'bold' : 'normal' } },
        ]
      }),
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 82],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'head') return
        const ri = data.row.index
        const totalRows = body.length
        if (ri === totalRows - 1) {
          data.cell.styles.fillColor = [240, 240, 245]
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 4
  }

  // ── Grand total section ──
  if (y > 250) {
    doc.addPage()
    y = margin
  } else {
    y += 2
  }

  const totalsRows = [
    ['Subtotal', fmt(boq.summary.subtotal, sym)],
    ['Contingency', fmt(boq.summary.contingency, sym)],
    ['Professional Fees', fmt(boq.summary.professionalFees, sym)],
    ['VAT', fmt(boq.summary.vat, sym)],
    ['Grand Total', fmt(boq.summary.grandTotal, sym)],
  ]

  ;(doc as any).autoTable({
    startY: y,
    margin: { left: margin + contentW * 0.45, right: margin },
    tableWidth: contentW * 0.55,
    body: totalsRows.map(([label, value], ri) => {
      const isGrand = ri === totalsRows.length - 1
      return [
        { content: label, styles: { fontStyle: isGrand ? 'bold' : 'normal', textColor: isGrand ? 0 : 60, fontSize: isGrand ? 10 : 8 } },
        { content: value, styles: { halign: 'right', fontStyle: isGrand ? 'bold' : 'normal', textColor: isGrand ? [22, 163, 74] : 60, fontSize: isGrand ? 10 : 8 } },
      ]
    }),
    theme: 'plain',
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 32, halign: 'right' },
    },
    didParseCell: (data: any) => {
      const ri = data.row.index
      const totalRows = totalsRows.length
      if (ri === totalRows - 1) {
        data.cell.styles.fillColor = [220, 252, 231]
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Footer with page numbers ──
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, 292, { align: 'right' })
    doc.text('Budget Engineer \u2014 securequalitybuilders-art/budget-engineer', margin, 292)
  }

  // ── Download ──
  const slug = design.name.toLowerCase().replace(/\s+/g, '-')
  const filename = `BudgetEngineer-${slug}-BOQ.pdf`
  const pdfBlob = doc.output('blob')
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
