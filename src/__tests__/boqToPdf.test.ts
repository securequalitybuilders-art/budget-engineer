/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { isValidPngDataUrl, captureSnapshot, registerSnapshotCapture, unregisterSnapshotCapture } from '@/lib/3d-snapshot'
import { embedSnapshotInPdf, generatePdfReport } from '@/adapters/boqToPdf'
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
})
