import { describe, it, expect } from 'vitest'
import { routeImportFile, formatGuidanceNote } from '@/lib/import/importRouter'
import { calibrateScale, pixelsToMetres, metresToPixels, computeScaleCalibration } from '@/lib/import/backdropUtils'

function makeFile(name: string, type: string): File {
  return new File([''], name, { type })
}

describe('importRouter', () => {
  it('routes .dxf files to dxf type', () => {
    const result = routeImportFile(makeFile('plan.dxf', 'application/dxf'))
    expect(result.type).toBe('dxf')
  })

  it('routes .DXF (uppercase) to dxf type', () => {
    const result = routeImportFile(makeFile('PLAN.DXF', 'application/dxf'))
    expect(result.type).toBe('dxf')
  })

  it('routes .png files to image type', () => {
    const result = routeImportFile(makeFile('sketch.png', 'image/png'))
    expect(result.type).toBe('image')
  })

  it('routes .jpg files to image type', () => {
    const result = routeImportFile(makeFile('photo.jpg', 'image/jpeg'))
    expect(result.type).toBe('image')
  })

  it('routes .jpeg files to image type', () => {
    const result = routeImportFile(makeFile('photo.jpeg', 'image/jpeg'))
    expect(result.type).toBe('image')
  })

  it('routes .webp files to image type', () => {
    const result = routeImportFile(makeFile('img.webp', 'image/webp'))
    expect(result.type).toBe('image')
  })

  it('routes .pdf files to pdf type', () => {
    const result = routeImportFile(makeFile('drawing.pdf', 'application/pdf'))
    expect(result.type).toBe('pdf')
  })

  it('routes .dwg files to unsupported with DWG guidance', () => {
    const result = routeImportFile(makeFile('plan.dwg', 'application/acad'))
    expect(result.type).toBe('unsupported')
    if (result.type === 'unsupported') {
      expect(result.format).toBe('DWG')
      expect(result.message).toContain('AutoCAD')
      expect(result.message).toContain('DXF')
    }
  })

  it('routes .pln files to unsupported with PLN guidance', () => {
    const result = routeImportFile(makeFile('project.pln', 'application/octet-stream'))
    expect(result.type).toBe('unsupported')
    if (result.type === 'unsupported') {
      expect(result.format).toBe('PLN')
      expect(result.message).toContain('ArchiCAD')
      expect(result.message).toContain('DXF')
    }
  })

  it('routes unknown extensions to unsupported', () => {
    const result = routeImportFile(makeFile('file.xyz', 'application/octet-stream'))
    expect(result.type).toBe('unsupported')
    if (result.type === 'unsupported') {
      expect(result.format).toBe('XYZ')
    }
  })

  it('routes files with no extension to unsupported', () => {
    const result = routeImportFile(makeFile('README', 'text/plain'))
    expect(result.type).toBe('unsupported')
  })

  it('formatGuidanceNote returns the supported formats string', () => {
    const note = formatGuidanceNote()
    expect(note).toContain('DXF')
    expect(note).toContain('AutoCAD')
  })
})

describe('backdropUtils', () => {
  describe('calibrateScale', () => {
    it('returns 20 px/m for 100px reference of 5m', () => {
      expect(calibrateScale(100, 5)).toBe(20)
    })

    it('returns 0 for zero metres', () => {
      expect(calibrateScale(100, 0)).toBe(0)
    })

    it('returns 0 for negative metres', () => {
      expect(calibrateScale(100, -1)).toBe(0)
    })
  })

  describe('pixelsToMetres', () => {
    it('converts 60px at 20 px/m to 3m', () => {
      expect(pixelsToMetres(60, 20)).toBe(3)
    })

    it('returns 0 for zero pxPerMetre', () => {
      expect(pixelsToMetres(60, 0)).toBe(0)
    })
  })

  describe('metresToPixels', () => {
    it('converts 3m at 20 px/m to 60px', () => {
      expect(metresToPixels(3, 20)).toBe(60)
    })

    it('returns 0 for zero pxPerMetre', () => {
      expect(metresToPixels(3, 0)).toBe(0)
    })
  })

  describe('computeScaleCalibration', () => {
    it('computes pxPerMetre from known dimensions', () => {
      const result = computeScaleCalibration(2000, 1000, 10, 5)
      expect(result).not.toBeNull()
      expect(result!.pxPerMetre).toBe(200)
      expect(result!.referenceMetres).toBe(7.5)
      expect(result!.referencePx).toBe(1500)
    })

    it('returns null for zero image dimensions', () => {
      expect(computeScaleCalibration(0, 1000, 10, 5)).toBeNull()
    })

    it('returns null for zero known dimensions', () => {
      expect(computeScaleCalibration(2000, 1000, 0, 5)).toBeNull()
    })
  })
})
