import { describe, it, expect } from 'vitest'
import { buildBoqDossierHtml, buildBoqCsv } from '@/lib/export/boq-export'
import type { BOQ, CadDocument, ProjectRecord } from '@/domain/ws6-types'
import { buildDrawingRegister } from '@/lib/drawings/drawing-register'
import { buildInfoSheetSvg } from '@/lib/drawings/info-sheet-svg'

const cad: CadDocument = {
  id: 'CAD-1',
  projectId: 'p1',
  name: 'Test House',
  materialSystem: 'concrete',
  floors: [{ id: 'f0', name: 'Ground Floor', elevation: 0, height: 3 }],
  walls: [],
  openings: [],
  blocks: [],
}

const boq: BOQ = {
  id: 'BOQ-1',
  projectId: 'p1',
  currency: 'ZWG',
  items: [
    { id: 'i1', category: 'Walls', description: 'Cavity brick wall 220mm', unit: 'm²', quantity: 100, rate: 85, total: 8500 },
  ],
  summary: { subtotal: 8500, contingency: 850, fees: 425, vat: 1173, grandTotal: 10948 },
}

const project: ProjectRecord = { id: 'p1', name: 'Test House', createdAt: 0 }

const cadDoc = cad as unknown as import('@/domain/cad').CadDocument

describe('boq-export dossier', () => {
  it('builds a CSV from line items and summary', () => {
    const csv = buildBoqCsv(boq)
    expect(csv).toContain('Category,Description,Quantity,Unit')
    expect(csv).toContain('Cavity brick wall 220mm')
    expect(csv).toContain('Grand Total')
    expect(csv).toContain('10948.00')
  })

  it('renders every registered sheet without a "coming soon" fallback', () => {
    const register = buildDrawingRegister(cadDoc, 'A', '2026-01-05')
    const html = buildBoqDossierHtml(boq, cad, project)
    expect(register.length).toBeGreaterThan(0)
    expect(html).not.toMatch(/coming soon/i)
    for (const sheet of register) {
      expect(html).toContain(`${sheet.sheetNumber} · ${sheet.title}`)
    }
  })

  it('includes the drawing register and revision history tables', () => {
    const html = buildBoqDossierHtml(boq, cad, project)
    expect(html).toContain('<h2>Drawing Register</h2>')
    expect(html).toContain('<h2>Revision History</h2>')
    expect(html).toContain('A-100')
  })

  it('renders a plan sheet SVG inside the planbox', () => {
    const html = buildBoqDossierHtml(boq, cad, project)
    const planIndex = html.indexOf('A-101 · Floor Plan')
    expect(planIndex).toBeGreaterThan(-1)
    const slice = html.slice(planIndex, planIndex + 2000)
    expect(slice).toContain('<svg')
  })

  it('buildInfoSheetSvg renders a metadata sheet for unknown viewIds', () => {
    const register = buildDrawingRegister(cadDoc, 'A', '2026-01-05')
    const sheet = { ...register[0], viewId: 'details', title: 'Construction Details', scale: '1:5' }
    const meta = {
      project: 'Test House',
      drawing: sheet.title,
      sheet: sheet.sheetNumber,
      date: '2026-01-05',
      revision: 'A',
      drawingType: 'ARCHITECTURAL',
      provenanceSummary: 'Procedurally generated — review all data before use',
    }
    const svg = buildInfoSheetSvg(cad, meta, sheet)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Construction Details')
    expect(svg).toContain('1:5')
    expect(svg).toContain('Walls')
    expect(svg).not.toMatch(/coming soon/i)
  })

  it('wraps the full dossier in a printable HTML document', () => {
    const html = buildBoqDossierHtml(boq, cad, project)
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<div class="printbar">')
    expect(html).toContain('Bill of Quantities')
    expect(html).toContain('<table class="summary">')
  })
})
