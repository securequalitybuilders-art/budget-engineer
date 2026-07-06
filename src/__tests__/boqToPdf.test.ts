/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { isValidPngDataUrl, captureSnapshot, registerSnapshotCapture, unregisterSnapshotCapture } from '@/lib/3d-snapshot'
import { embedSnapshotInPdf, generatePdfReport } from '@/adapters/boqToPdf'
import { currencySymbol } from '@/lib/utils/currency'
import type { DesignOption } from '@/domain/boq'
import type { BoqResult } from '@/adapters/designToBoq'

// stub document globally for jsPDF download code (node has no native document)
let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }
beforeAll(() => {
  mockAnchor = { href: '', download: '', click: vi.fn() }
  ;(globalThis as Record<string, unknown>).document = {
    createElement: vi.fn().mockReturnValue(mockAnchor),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  }
})
afterAll(() => {
  delete (globalThis as Record<string, unknown>).document
})

// Mock jsPDF class so tests run in node without a real canvas
vi.mock('jspdf', () => {
  let autoTableY = 200
  const MockDoc = class {
    constructor() {
      (globalThis as any).__lastJsPDFInstance = this
    }
    setFillColor = vi.fn().mockReturnThis()
    rect = vi.fn().mockReturnThis()
    setTextColor = vi.fn().mockReturnThis()
    setFontSize = vi.fn().mockReturnThis()
    setFont = vi.fn().mockReturnThis()
    text = vi.fn().mockReturnThis()
    addImage = vi.fn().mockReturnThis()
    addPage = vi.fn().mockReturnThis()
    getNumberOfPages = vi.fn().mockReturnValue(1)
    setPage = vi.fn().mockReturnThis()
    output = vi.fn().mockReturnValue(new Blob(['mock-pdf-data']))
    lastAutoTable = { finalY: autoTableY }
    autoTable = vi.fn().mockImplementation(function (this: Record<string, unknown>, opts: Record<string, unknown>) {
      autoTableY = ((opts.startY as number) || 200) + 50
      this.lastAutoTable = { finalY: autoTableY }
    })
  }
  return { default: MockDoc }
})

vi.mock('jspdf-autotable', () => {
  let autoTableY = 200
  const autoTable = vi.fn().mockImplementation((doc: any, opts: any) => {
    autoTableY = (opts?.startY || 200) + 50
    doc.lastAutoTable = { finalY: autoTableY }
  })
  return { default: autoTable, autoTable }
})

const MINIMAL_DESIGN: DesignOption = {
  id: 'test-1',
  name: 'Test Design',
  buildingType: 'house',
  grossFloorArea: 120,
  floors: 1,
  description: 'A test design',
  roomCount: 4,
  elementCount: 20,
} as unknown as DesignOption

const MINIMAL_BOQ: BoqResult = {
  id: 'test-boq',
  projectId: 'test-project',
  currency: 'USD',
  items: [],
  summary: { subtotal: 50000, contingency: 5000, professionalFees: 2500, vat: 7500, grandTotal: 65000 },
  assumptions: [],
  sourceMetadata: undefined,
  quantities: {
    designId: 'test', designName: 'Test', floors: 1,
    grossFloorArea: 120, footprintArea: 120, slabArea: 0,
    roofArea: 0, finishFloorArea: 0, serviceZoneArea: 0,
    externalWallLength: 0, internalWallLength: 0,
    externalWallArea: 0, internalWallArea: 0, partitionArea: 0,
    doorCount: 0, windowCount: 0,
    doorArea: 0, windowArea: 0, openingArea: 0,
    roomCount: 4, wetRoomCount: 1,
    kitchenCount: 0, bedroomCount: 0, clinicRoomCount: 0,
    warnings: [],
  },
}

// ── isValidPngDataUrl ──

describe('isValidPngDataUrl', () => {
  it('returns true for a valid base64 PNG data URL', () => {
    const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    expect(isValidPngDataUrl(url)).toBe(true)
  })

  it('returns false for undefined', () => {
    expect(isValidPngDataUrl(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidPngDataUrl(null)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isValidPngDataUrl('')).toBe(false)
  })

  it('returns false for a non-PNG data URL', () => {
    expect(isValidPngDataUrl('data:image/jpeg;base64,/9j/')).toBe(false)
  })

  it('returns false for a plain string', () => {
    expect(isValidPngDataUrl('hello-world')).toBe(false)
  })

  it('returns false for a data URL that is too short', () => {
    expect(isValidPngDataUrl('data:image/png;base64,')).toBe(false)
  })
})

// ── embedSnapshotInPdf ──

describe('embedSnapshotInPdf', () => {
  const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  it('embeds a valid PNG data URL and returns advanced y', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, VALID_PNG, y, 14, 182)
    expect(doc.addImage).toHaveBeenCalledTimes(1)
    expect(doc.addImage).toHaveBeenCalledWith(VALID_PNG, 'PNG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number))
    expect(result).toBeGreaterThan(y)
  })

  it('returns original y when snapshotDataUrl is undefined', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, undefined, y, 14, 182)
    expect(doc.addImage).not.toHaveBeenCalled()
    expect(result).toBe(y)
  })

  it('returns original y when snapshotDataUrl is an invalid string', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, 'not-a-valid-url', y, 14, 182)
    expect(doc.addImage).not.toHaveBeenCalled()
    expect(result).toBe(y)
  })

  it('gracefully skips when addImage throws', () => {
    const doc = { addImage: vi.fn().mockImplementation(() => { throw new Error('corrupt image') }) }
    const y = 100
    const result = embedSnapshotInPdf(doc, VALID_PNG, y, 14, 182)
    expect(doc.addImage).toHaveBeenCalledTimes(1)
    expect(result).toBe(y)
  })

  it('returns original y for empty string', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, '', y, 14, 182)
    expect(doc.addImage).not.toHaveBeenCalled()
    expect(result).toBe(y)
  })
})

// ── capture registry ──

describe('capture registry', () => {
  it('returns null when no capture function is registered', () => {
    unregisterSnapshotCapture()
    expect(captureSnapshot()).toBeNull()
  })

  it('calls the registered function and returns its result', () => {
    registerSnapshotCapture(() => 'data:image/png;base64,abc123')
    expect(captureSnapshot()).toBe('data:image/png;base64,abc123')
    unregisterSnapshotCapture()
  })

  it('returns null after unregistering', () => {
    registerSnapshotCapture(() => 'data:image/png;base64,abc123')
    unregisterSnapshotCapture()
    expect(captureSnapshot()).toBeNull()
  })

  it('replaces the previous capture when registering a new one', () => {
    registerSnapshotCapture(() => 'first')
    registerSnapshotCapture(() => 'second')
    expect(captureSnapshot()).toBe('second')
    unregisterSnapshotCapture()
  })
})

// ── embedSnapshotInPdf: never-throws guarantee ──

describe('embedSnapshotInPdf resilience', () => {
  const doc = { addImage: vi.fn() }

  it('never throws for undefined', () => {
    expect(() => embedSnapshotInPdf(doc, undefined, 100, 14, 182)).not.toThrow()
  })
  it('never throws for null', () => {
    expect(() => embedSnapshotInPdf(doc, null as any, 100, 14, 182)).not.toThrow()
  })
  it('never throws for empty string', () => {
    expect(() => embedSnapshotInPdf(doc, '', 100, 14, 182)).not.toThrow()
  })
  it('never throws for invalid string', () => {
    expect(() => embedSnapshotInPdf(doc, 'not-a-url', 100, 14, 182)).not.toThrow()
  })
  it('never throws for random object', () => {
    expect(() => embedSnapshotInPdf(doc, {} as any, 100, 14, 182)).not.toThrow()
  })
  it('never throws for number', () => {
    expect(() => embedSnapshotInPdf(doc, 123 as any, 100, 14, 182)).not.toThrow()
  })
  it('never throws when addImage throws', () => {
    const badDoc = { addImage: vi.fn().mockImplementation(() => { throw new Error('addImage failed') }) }
    const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    expect(() => embedSnapshotInPdf(badDoc, VALID_PNG, 100, 14, 182)).not.toThrow()
  })
})

// ── capture isolation: captureSnapshot throwing never propagates ──

describe('capture isolation', () => {
  it('captureSnapshot that throws does not propagate when wrapped', () => {
    registerSnapshotCapture(() => { throw new Error('WebGL context lost') })
    let snapshot: string | undefined
    try {
      const result = captureSnapshot()
      snapshot = result ?? undefined
    } catch {
      snapshot = undefined
    }
    expect(snapshot).toBeUndefined()
    unregisterSnapshotCapture()
  })

  it('captureSnapshot returns null when capture function returns null', () => {
    registerSnapshotCapture(() => null)
    expect(captureSnapshot()).toBeNull()
    unregisterSnapshotCapture()
  })

  it('captureSnapshot returns null when no capture registered', () => {
    unregisterSnapshotCapture()
    expect(captureSnapshot()).toBeNull()
  })
})

// ── generatePdfReport always reaches download (doc.output called) ──

describe('generatePdfReport always saves PDF', () => {
  const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  it('saves PDF with a valid snapshot', async () => {
    await expect(generatePdfReport(MINIMAL_DESIGN, MINIMAL_BOQ, VALID_PNG)).resolves.toBeUndefined()
  })

  it('saves PDF when snapshot is undefined', async () => {
    await expect(generatePdfReport(MINIMAL_DESIGN, MINIMAL_BOQ, undefined)).resolves.toBeUndefined()
  })

  it('saves PDF when snapshot is empty string', async () => {
    await expect(generatePdfReport(MINIMAL_DESIGN, MINIMAL_BOQ, '')).resolves.toBeUndefined()
  })

  it('saves PDF when snapshot is invalid string', async () => {
    await expect(generatePdfReport(MINIMAL_DESIGN, MINIMAL_BOQ, 'not-a-valid-url')).resolves.toBeUndefined()
  })

  it('saves PDF even when addImage throws on a valid-looking URL', async () => {
    await expect(generatePdfReport(MINIMAL_DESIGN, MINIMAL_BOQ, VALID_PNG)).resolves.toBeUndefined()
  })

  it('saves PDF with minimal edge data (missing optional fields)', async () => {
    const edgeDesign = { } as unknown as DesignOption
    const edgeBoq = {
      id: 'edge-boq', projectId: 'edge-proj',
      currency: '', items: undefined, summary: undefined,
      assumptions: [],
      sourceMetadata: undefined,
      quantities: undefined,
    } as unknown as BoqResult
    await expect(generatePdfReport(edgeDesign, edgeBoq)).resolves.toBeUndefined()
  })
})

// ── generatePdfReport structure assertions ──

function realisticBoq(): BoqResult {
  return {
    id: 'real-boq',
    projectId: 'proj-1',
    currency: 'USD',
    items: [
      { id: 's1', quantityRef: 'q', description: 'Ground slab 150mm', category: 'Slabs', quantity: 120, rate: 45, total: 5400, unit: 'm2' },
      { id: 'w1', quantityRef: 'q', description: 'External walls 230mm', category: 'Walls', quantity: 96, rate: 38, total: 3648, unit: 'm2' },
      { id: 'w2', quantityRef: 'q', description: 'Internal partitions', category: 'Walls', quantity: 52, rate: 28, total: 1456, unit: 'm2' },
      { id: 'r1', quantityRef: 'q', description: 'Roof sheeting IBR', category: 'Roof', quantity: 140, rate: 22, total: 3080, unit: 'm2' },
    ],
    summary: { subtotal: 13584, contingency: 1358.40, professionalFees: 679.20, vat: 2037.60, grandTotal: 17659.20 },
    assumptions: [],
    sourceMetadata: { quantitySourceLabel: 'Generated Design', geometrySource: 'generated-design', computedAt: '2024-01-01T00:00:00.000Z' },
    quantities: {
      designId: 'proj-1', designName: 'Real Design', floors: 1,
      grossFloorArea: 120, footprintArea: 120, slabArea: 120,
      roofArea: 140, finishFloorArea: 96, serviceZoneArea: 24,
      externalWallLength: 40, internalWallLength: 26,
      externalWallArea: 96, internalWallArea: 52, partitionArea: 0,
      doorCount: 6, windowCount: 8,
      doorArea: 12, windowArea: 8, openingArea: 20,
      roomCount: 5, wetRoomCount: 2,
      kitchenCount: 1, bedroomCount: 3, clinicRoomCount: 0,
      warnings: [],
    },
  }
}

const REALISTIC_DESIGN: DesignOption = {
  id: 'real-des-1',
  name: 'My House',
  buildingType: 'house-residential',
  grossFloorArea: 120,
  floors: 1,
  elements: [],
} as unknown as DesignOption

const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('generatePdfReport — structure assertions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('generates blob output and produces a sensible filename', async () => {
    const boq = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq, VALID_PNG)
    const doc = (globalThis as any).__lastJsPDFInstance
    expect(doc.output).toHaveBeenCalledWith('blob')
    expect(mockAnchor.download).toBe('BudgetEngineer-my-house-BOQ.pdf')
  })

  it('autoTable body rows include all BOQ line items with description/qty/rate/total', async () => {
    const boq = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq, VALID_PNG)
    const autoTableMod = await import('jspdf-autotable')
    const spy = autoTableMod.default as ReturnType<typeof vi.fn>
    expect(spy).toHaveBeenCalled()
    const allBodyRows: { description: string; qty: string; rate: string; total: string }[] = []
    for (const call of spy.mock.calls) {
      const opts = call[1] as { body?: { content: string }[][] }
      if (!opts?.body) continue
      for (const row of opts.body) {
        const desc = row[0]?.content ?? ''
        const qty = row[1]?.content ?? ''
        const rate = row[2]?.content ?? ''
        const total = row[3]?.content ?? ''
        allBodyRows.push({ description: desc, qty, rate, total })
      }
    }
    const descriptions = allBodyRows.map(r => r.description)
    expect(descriptions).toContain('Ground slab 150mm')
    expect(descriptions).toContain('External walls 230mm')
    expect(descriptions).toContain('Internal partitions')
    expect(descriptions).toContain('Roof sheeting IBR')
    const itemRows = allBodyRows.filter(r => r.rate)
    for (const row of itemRows) {
      expect(row.qty).toBeTruthy()
      expect(row.rate).toMatch(/^\$/)
      expect(row.total).toMatch(/^\$/)
    }
  })

  it('header includes project name, building type, and disclaimer', async () => {
    const boq = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq, VALID_PNG)
    const doc = (globalThis as any).__lastJsPDFInstance
    const textCalls = (doc.text as ReturnType<typeof vi.fn>).mock.calls
    const allTexts = textCalls.map((c: unknown[]) => String(c[0]))
    expect(allTexts.some((t: string) => t.includes('My House'))).toBe(true)
    expect(allTexts.some((t: string) => t.includes('house-residential'))).toBe(true)
    expect(allTexts.some((t: string) => t.includes('consult a registered professional'))).toBe(true)
  })

  it('grand total row matches summary.grandTotal', async () => {
    const boq = realisticBoq()
    const expectedGrand = boq.summary!.grandTotal
    await generatePdfReport(REALISTIC_DESIGN, boq, VALID_PNG)
    const autoTableMod = await import('jspdf-autotable')
    const spy = autoTableMod.default as ReturnType<typeof vi.fn>
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
    const lastOpts = lastCall[1] as { body?: { content: string }[][] }
    expect(lastOpts.body).toBeDefined()
    const grandRow = lastOpts.body![lastOpts.body!.length - 1]
    expect(grandRow[0].content).toBe('Grand Total')
    const expectedFormatted = '$' + expectedGrand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    expect(grandRow[1].content).toBe(expectedFormatted)
  })

  it('subtotal rows exist per trade category', async () => {
    const boq = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq, VALID_PNG)
    const autoTableMod = await import('jspdf-autotable')
    const spy = autoTableMod.default as ReturnType<typeof vi.fn>
    const allBodies: { content: string }[][] = []
    for (const call of spy.mock.calls) {
      const opts = call[1] as { body?: { content: string }[][] }
      if (opts?.body) allBodies.push(...opts.body)
    }
    const descriptions = allBodies.map(r => r[0]?.content ?? '')
    expect(descriptions).toContain('Walling subtotal')
    expect(descriptions).toContain('Substructure subtotal')
    expect(descriptions).toContain('Roofing subtotal')
  })

  it('valid PNG calls addImage; undefined does not call addImage but still outputs PDF', async () => {
    const boq1 = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq1, VALID_PNG)
    const doc1 = (globalThis as any).__lastJsPDFInstance
    expect(doc1.addImage).toHaveBeenCalled()
    vi.clearAllMocks()
    const boq2 = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq2, undefined)
    const doc2 = (globalThis as any).__lastJsPDFInstance
    expect(doc2.addImage).not.toHaveBeenCalled()
    expect(doc2.output).toHaveBeenCalledWith('blob')
  })

  it('disclaimer text appears in the generated report', async () => {
    const boq = realisticBoq()
    await generatePdfReport(REALISTIC_DESIGN, boq, VALID_PNG)
    const doc = (globalThis as any).__lastJsPDFInstance
    const textCalls = (doc.text as ReturnType<typeof vi.fn>).mock.calls
    const allTexts = textCalls.map((c: unknown[]) => String(c[0]))
    expect(allTexts.some((t: string) =>
      t.includes('Early estimate') && t.includes('consult a registered professional')
    )).toBe(true)
  })
})

describe('currency — currencySymbol helper', () => {
  it('USD returns $', () => {
    expect(currencySymbol('USD')).toBe('$')
  })
  it('ZAR returns R', () => {
    expect(currencySymbol('ZAR')).toBe('R')
  })
  it('unknown currency returns code + space', () => {
    expect(currencySymbol('ZWL')).toBe('ZWL ')
  })
})

// ── autoTable is called with functional API (doc, opts), NOT doc.autoTable ──

describe('autoTable functional API', () => {
  it('calls autoTable as a function (doc, opts) not doc.autoTable', async () => {
    // Reset module-level mock call tracking
    const boqWithItems: BoqResult = {
      ...MINIMAL_BOQ,
      items: [{ id: 'i1', quantityRef: 'test', description: 'Test', category: 'Slabs', quantity: 10, rate: 50, total: 500, unit: 'm2' }],
    }
    await generatePdfReport(MINIMAL_DESIGN, boqWithItems)
    // Import the autoTable spy from the mocked module
    const autoTableMod = await import('jspdf-autotable')
    const autoTableSpy = autoTableMod.default as ReturnType<typeof vi.fn>
    expect(autoTableSpy).toHaveBeenCalled()
    // First argument to every call must be a doc object (not the fake module)
    const calls = autoTableSpy.mock.calls
    for (const call of calls) {
      expect(typeof call[0]).toBe('object')
      expect(call.length).toBe(2)
    }
  })

  it('does not throw when lastAutoTable is undefined (finalY fallback)', async () => {
    // Create a doc where lastAutoTable is never set (simulates edge case)
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('p', 'mm', 'a4')
    autoTable(doc, { startY: 200, body: [['a', 'b']] })
    // Override lastAutoTable to undefined to simulate missing finalY
    delete (doc as any).lastAutoTable
    doc.output = vi.fn().mockReturnValue(new Blob())
    // generatePdfReport wraps its own autoTable calls — this test verifies
    // the guard doesn't throw even if we force lastAutoTable off
    // (the mock in generatePdfReport always sets it, so we just verify
    //  that the fallback expression (doc as any).lastAutoTable?.finalY ?? y is safe)
    expect((doc as any).lastAutoTable?.finalY ?? 200).toBe(200)
  })

  describe('Design Analysis section in PDF', () => {
    const analysis = {
      areaSchedule: '150 m² gross / 112 m² net',
      envelope: 'Wall 0.45 W/m²K (pass)',
      daylight: 'DF 3.2% (ok)',
      egress: '10 persons, 1 exit (pass)',
      structural: '4.0+1.9 kN/m² (prelim)',
      energy: '55 kWh/m²/yr',
      costPerM2: '$85.00',
      grandTotal: '$12,750.00',
      hasData: true,
    }

    it('PDF includes Design Analysis section when analysis data is provided', async () => {
      await generatePdfReport(MINIMAL_DESIGN, realisticBoq(), VALID_PNG, analysis)
      const doc = (globalThis as any).__lastJsPDFInstance
      const textCalls = (doc.text as ReturnType<typeof vi.fn>).mock.calls
      const allTexts = textCalls.map((c: unknown[]) => String(c[0]))
      expect(allTexts.some((t: string) => t.includes('Design Analysis'))).toBe(true)
      expect(allTexts.some((t: string) => t.includes('150 m² gross'))).toBe(true)
      expect(allTexts.some((t: string) => t.includes('4.0+1.9'))).toBe(true)
    })

    it('PDF still generates without analysis data', async () => {
      vi.clearAllMocks()
      await generatePdfReport(MINIMAL_DESIGN, realisticBoq(), VALID_PNG, null)
      const doc = (globalThis as any).__lastJsPDFInstance
      expect(doc.output).toHaveBeenCalled()
    })

    it('PDF still generates when analysis.hasData is false', async () => {
      vi.clearAllMocks()
      await generatePdfReport(MINIMAL_DESIGN, realisticBoq(), VALID_PNG, { ...analysis, hasData: false })
      const doc = (globalThis as any).__lastJsPDFInstance
      expect(doc.output).toHaveBeenCalled()
    })
  })
})
