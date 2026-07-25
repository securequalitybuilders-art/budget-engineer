import { describe, it, expect } from 'vitest'
import {
  CATALOG, getDoors, getWindows, getSanitary, getStairs,
  findDoorByCode, findClosestDoor, findClosestWindow,
  getDoorCount, getWindowCount, getSanitaryCount, getStairCount, getTotalComponentCount,
} from '@/engine/parametric/componentRegistry'
import type { DoorSpec, WindowSpec } from '@/engine/parametric/componentRegistry'
import {
  ISO_PAPER_SIZES, VIEWPORT_SCALES, MARGIN_MM, TITLE_BLOCK_HEIGHT_MM,
  getPaperDimensions, getUsableArea,
  createViewport, layoutViewports, createPaperSpaceLayout,
  modelToPaper, paperToModel,
  getScaleLabel, getRecommendedScale,
  listIsoSizes, listScales,
} from '@/engine/parametric/paperSpaceModel'
import type { IsoPaperSize, ViewportScale, PaperSpaceLayout, Viewport } from '@/engine/parametric/paperSpaceModel'

describe('ComponentRegistry', () => {
  describe('catalog completeness', () => {
    it('has at least 35 total components', () => {
      expect(getTotalComponentCount()).toBeGreaterThanOrEqual(35)
    })

    it('has at least 20 doors', () => {
      expect(getDoorCount()).toBeGreaterThanOrEqual(20)
    })

    it('has at least 20 windows', () => {
      expect(getWindowCount()).toBeGreaterThanOrEqual(20)
    })

    it('has at least 10 sanitary fixtures', () => {
      expect(getSanitaryCount()).toBeGreaterThanOrEqual(10)
    })

    it('has at least 5 stair types', () => {
      expect(getStairCount()).toBeGreaterThanOrEqual(5)
    })
  })

  describe('CATALOG structure', () => {
    it('exports doors, windows, sanitary, stairs arrays', () => {
      expect(Array.isArray(CATALOG.doors)).toBe(true)
      expect(Array.isArray(CATALOG.windows)).toBe(true)
      expect(Array.isArray(CATALOG.sanitary)).toBe(true)
      expect(Array.isArray(CATALOG.stairs)).toBe(true)
    })

    it('every door has all required fields', () => {
      for (const d of CATALOG.doors as DoorSpec[]) {
        expect(d.type).toBeTruthy()
        expect(d.widthMm).toBeGreaterThan(0)
        expect(d.heightMm).toBeGreaterThan(0)
        expect(d.core).toBeTruthy()
        expect(d.label).toBeTruthy()
        expect(d.code).toMatch(/^D-/)
        expect(d.minClearWidthMm).toBeGreaterThan(0)
        expect(d.leafCount).toBeGreaterThanOrEqual(1)
      }
    })

    it('every window has all required fields', () => {
      for (const w of CATALOG.windows as WindowSpec[]) {
        expect(w.type).toBeTruthy()
        expect(w.widthMm).toBeGreaterThan(0)
        expect(w.heightMm).toBeGreaterThan(0)
        expect(w.sillHeightMm).toBeGreaterThanOrEqual(0)
        expect(w.label).toBeTruthy()
        expect(w.code).toMatch(/^W-/)
        expect(w.liteCount).toBeGreaterThanOrEqual(1)
      }
    })

    it('every sanitary fixture has all required fields', () => {
      for (const s of CATALOG.sanitary) {
        expect(s.type).toBeTruthy()
        expect(s.widthMm).toBeGreaterThan(0)
        expect(s.depthMm).toBeGreaterThan(0)
        expect(s.label).toBeTruthy()
        expect(s.clearanceFrontMm).toBeGreaterThan(0)
      }
    })

    it('every stair has all required fields', () => {
      for (const s of CATALOG.stairs) {
        expect(s.type).toBeTruthy()
        expect(s.minWidthMm).toBeGreaterThan(0)
        expect(s.maxRiseMm).toBeGreaterThan(0)
        expect(s.minGoingMm).toBeGreaterThan(0)
        expect(s.minHeadroomMm).toBeGreaterThan(0)
      }
    })
  })

  describe('door variants', () => {
    it('includes single-swing, double-swing, sliding, bi-fold, pocket', () => {
      const types = new Set(CATALOG.doors.map(d => d.type))
      expect(types.has('single-swing')).toBe(true)
      expect(types.has('double-swing')).toBe(true)
      expect(types.has('sliding')).toBe(true)
      expect(types.has('bi-fold')).toBe(true)
      expect(types.has('pocket')).toBe(true)
    })

    it('includes solid, hollow-core, fire-rated, glazed, flush cores', () => {
      const cores = new Set(CATALOG.doors.map(d => d.core))
      expect(cores.has('solid')).toBe(true)
      expect(cores.has('hollow-core')).toBe(true)
      expect(cores.has('fire-rated')).toBe(true)
      expect(cores.has('glazed')).toBe(true)
      expect(cores.has('flush')).toBe(true)
    })

    it('includes FD30 and FD60 fire-rated doors', () => {
      const fd30 = CATALOG.doors.find(d => d.fireRatingMinHr === 0.5)
      const fd60 = CATALOG.doors.find(d => d.fireRatingMinHr === 1)
      expect(fd30).toBeDefined()
      expect(fd60).toBeDefined()
    })
  })

  describe('window variants', () => {
    it('includes casement, sliding, awning, fixed, louver', () => {
      const types = new Set(CATALOG.windows.map(w => w.type))
      expect(types.has('casement')).toBe(true)
      expect(types.has('sliding')).toBe(true)
      expect(types.has('awning')).toBe(true)
      expect(types.has('fixed')).toBe(true)
      expect(types.has('louver')).toBe(true)
    })

    it('includes bathroom windows with low sill (300mm)', () => {
      const bathWindows = CATALOG.windows.filter(w => w.sillHeightMm === 300)
      expect(bathWindows.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('sanitary variants', () => {
    it('includes wc, basin, shower, bath, kitchen-sink, urinal, bidet', () => {
      const types = new Set(CATALOG.sanitary.map(s => s.type))
      expect(types.has('wc')).toBe(true)
      expect(types.has('basin')).toBe(true)
      expect(types.has('shower')).toBe(true)
      expect(types.has('bath')).toBe(true)
      expect(types.has('kitchen-sink')).toBe(true)
      expect(types.has('urinal')).toBe(true)
      expect(types.has('bidet')).toBe(true)
    })
  })

  describe('getDoors filter', () => {
    it('returns all doors without filter', () => {
      expect(getDoors().length).toBe(getDoorCount())
    })

    it('filters by type', () => {
      const sliders = getDoors({ type: 'sliding' })
      expect(sliders.every(d => d.type === 'sliding')).toBe(true)
    })

    it('filters by minWidthMm', () => {
      const wide = getDoors({ minWidthMm: 2000 })
      expect(wide.every(d => d.widthMm >= 2000)).toBe(true)
    })

    it('filters by maxWidthMm', () => {
      const narrow = getDoors({ maxWidthMm: 1000 })
      expect(narrow.every(d => d.widthMm <= 1000)).toBe(true)
    })
  })

  describe('getWindows filter', () => {
    it('filters by type', () => {
      const casements = getWindows({ type: 'casement' })
      expect(casements.every(w => w.type === 'casement')).toBe(true)
    })

    it('filters by minWidthMm', () => {
      const large = getWindows({ minWidthMm: 2000 })
      expect(large.every(w => w.widthMm >= 2000)).toBe(true)
    })
  })

  describe('getSanitary filter', () => {
    it('filters by type', () => {
      const wcs = getSanitary({ type: 'wc' })
      expect(wcs.every(s => s.type === 'wc')).toBe(true)
    })

    it('returns all without filter', () => {
      expect(getSanitary().length).toBe(getSanitaryCount())
    })
  })

  describe('getStairs filter', () => {
    it('filters by type', () => {
      const spirals = getStairs({ type: 'spiral' })
      expect(spirals.every(s => s.type === 'spiral')).toBe(true)
    })
  })

  describe('findDoorByCode', () => {
    it('finds standard 813 door', () => {
      const door = findDoorByCode('D-813')
      expect(door).toBeDefined()
      expect(door!.widthMm).toBe(813)
    })

    it('finds sliding door', () => {
      const door = findDoorByCode('D-SL-2400')
      expect(door).toBeDefined()
      expect(door!.type).toBe('sliding')
    })

    it('returns undefined for unknown code', () => {
      expect(findDoorByCode('D-FAKE')).toBeUndefined()
    })
  })

  describe('findClosestDoor', () => {
    it('finds closest to 800mm → 813', () => {
      expect(findClosestDoor(800).widthMm).toBe(813)
    })

    it('finds closest to 900mm → 926', () => {
      expect(findClosestDoor(900).widthMm).toBe(926)
    })

    it('finds closest to 2400mm → sliding 2400', () => {
      expect(findClosestDoor(2400).widthMm).toBe(2400)
    })
  })

  describe('findClosestWindow', () => {
    it('finds closest to 800mm → 900', () => {
      expect(findClosestWindow(800).widthMm).toBe(900)
    })

    it('finds closest to 1000mm → 900 or 1200', () => {
      const result = findClosestWindow(1000)
      expect([900, 1200]).toContain(result.widthMm)
    })
  })

  describe('getTotalComponentCount', () => {
    it('sums all categories', () => {
      const total = getDoorCount() + getWindowCount() + getSanitaryCount() + getStairCount()
      expect(getTotalComponentCount()).toBe(total)
    })
  })
})

describe('PaperSpaceModel', () => {
  describe('ISO_PAPER_SIZES', () => {
    it('has A0 through A4', () => {
      expect(ISO_PAPER_SIZES.A0).toBeDefined()
      expect(ISO_PAPER_SIZES.A1).toBeDefined()
      expect(ISO_PAPER_SIZES.A2).toBeDefined()
      expect(ISO_PAPER_SIZES.A3).toBeDefined()
      expect(ISO_PAPER_SIZES.A4).toBeDefined()
    })

    it('A0 is 841×1189 mm', () => {
      expect(ISO_PAPER_SIZES.A0.widthMm).toBe(841)
      expect(ISO_PAPER_SIZES.A0.heightMm).toBe(1189)
    })

    it('A4 is 210×297 mm', () => {
      expect(ISO_PAPER_SIZES.A4.widthMm).toBe(210)
      expect(ISO_PAPER_SIZES.A4.heightMm).toBe(297)
    })

    it('A-series halves area each step', () => {
      const a0area = ISO_PAPER_SIZES.A0.widthMm * ISO_PAPER_SIZES.A0.heightMm
      const a1area = ISO_PAPER_SIZES.A1.widthMm * ISO_PAPER_SIZES.A1.heightMm
      const ratio = a1area / (a0area / 2)
      expect(ratio).toBeGreaterThan(0.98)
      expect(ratio).toBeLessThan(1.02)
    })
  })

  describe('VIEWPORT_SCALES', () => {
    it('has architectural scales 1:50, 1:100, 1:200', () => {
      expect(VIEWPORT_SCALES['1:50']).toBeCloseTo(0.02, 5)
      expect(VIEWPORT_SCALES['1:100']).toBeCloseTo(0.01, 5)
      expect(VIEWPORT_SCALES['1:200']).toBeCloseTo(0.005, 5)
    })

    it('1:1 is scale factor 1', () => {
      expect(VIEWPORT_SCALES['1:1']).toBe(1)
    })

    it('1:1000 is scale factor 0.001', () => {
      expect(VIEWPORT_SCALES['1:1000']).toBe(0.001)
    })
  })

  describe('getPaperDimensions', () => {
    it('returns landscape dimensions for A1', () => {
      const dims = getPaperDimensions('A1', 'landscape')
      expect(dims.widthMm).toBe(841)
      expect(dims.heightMm).toBe(594)
    })

    it('returns portrait dimensions for A1 (width < height)', () => {
      const dims = getPaperDimensions('A1', 'portrait')
      expect(dims.widthMm).toBe(594)
      expect(dims.heightMm).toBe(841)
    })

    it('returns landscape for A4 (wider than tall)', () => {
      const dims = getPaperDimensions('A4', 'landscape')
      expect(dims.widthMm).toBeGreaterThan(dims.heightMm)
    })
  })

  describe('getUsableArea', () => {
    it('subtracts margins and title block from A1 landscape', () => {
      const usable = getUsableArea('A1', 'landscape')
      expect(usable.usableWidthMm).toBeCloseTo(841 - 15 * 2, 1)
      expect(usable.usableHeightMm).toBeCloseTo(594 - 15 * 2 - 70, 1)
    })

    it('accepts custom margin and title block', () => {
      const usable = getUsableArea('A3', 'portrait', 10, 50)
      const a3p = getPaperDimensions('A3', 'portrait')
      expect(usable.usableWidthMm).toBe(a3p.widthMm - 20)
      expect(usable.usableHeightMm).toBe(a3p.heightMm - 20 - 50)
    })
  })

  describe('createViewport', () => {
    it('creates viewport with correct paper dimensions at 1:50', () => {
      const vp = createViewport('vp-1', 'Floor Plan', { modelWidth: 20, modelHeight: 15, scale: '1:50' }, 20, 20)
      expect(vp.id).toBe('vp-1')
      expect(vp.paperWidth).toBeCloseTo(20 * 0.02 * 1000, 1)
      expect(vp.paperHeight).toBeCloseTo(15 * 0.02 * 1000, 1)
    })

    it('creates viewport at 1:100', () => {
      const vp = createViewport('vp-2', 'Site Plan', { modelWidth: 100, modelHeight: 80, scale: '1:100' }, 30, 30)
      expect(vp.paperWidth).toBeCloseTo(100 * 0.01 * 1000, 1)
      expect(vp.paperHeight).toBeCloseTo(80 * 0.01 * 1000, 1)
    })
  })

  describe('layoutViewports', () => {
    it('lays out single viewport', () => {
      const vps = layoutViewports(400, 300, [{ modelWidth: 10, modelHeight: 8, scale: '1:50' }])
      expect(vps.length).toBe(1)
      expect(vps[0].paperX).toBe(0)
      expect(vps[0].paperY).toBe(0)
    })

    it('lays out two viewports horizontally', () => {
      const vps = layoutViewports(400, 300, [
        { modelWidth: 5, modelHeight: 4, scale: '1:50' },
        { modelWidth: 5, modelHeight: 4, scale: '1:50' },
      ])
      expect(vps.length).toBe(2)
      expect(vps[0].paperX).toBe(0)
      expect(vps[1].paperX).toBeGreaterThan(0)
    })

    it('wraps to next row when viewport exceeds paper width', () => {
      const vps = layoutViewports(250, 350, [
        { modelWidth: 10, modelHeight: 8, scale: '1:50' },
        { modelWidth: 10, modelHeight: 8, scale: '1:50' },
      ])
      expect(vps.length).toBe(2)
      expect(vps[0].paperY).toBe(0)
      expect(vps[1].paperY).toBeGreaterThan(0)
    })

    it('stops when out of paper height', () => {
      const vps = layoutViewports(100, 30, [
        { modelWidth: 5, modelHeight: 4, scale: '1:10' },
        { modelWidth: 5, modelHeight: 4, scale: '1:10' },
      ])
      expect(vps.length).toBeLessThanOrEqual(1)
    })
  })

  describe('modelToPaper / paperToModel roundtrip', () => {
    it('converts model coordinates to paper and back', () => {
      const vp = createViewport('vp-1', 'Test', { modelWidth: 20, modelHeight: 15, scale: '1:50' }, 20, 20)
      const modelPt = { modelX: 10, modelY: 7.5 }
      const paperPt = modelToPaper(vp, modelPt.modelX, modelPt.modelY)
      const backPt = paperToModel(vp, paperPt.paperX, paperPt.paperY)
      expect(backPt.modelX).toBeCloseTo(modelPt.modelX, 3)
      expect(backPt.modelY).toBeCloseTo(modelPt.modelY, 3)
    })

    it('converts at 1:100 scale', () => {
      const vp = createViewport('vp-2', 'Site', { modelWidth: 50, modelHeight: 40, scale: '1:100' }, 0, 0)
      const paperPt = modelToPaper(vp, 25, 20)
      expect(paperPt.paperX).toBeCloseTo(25 * 0.01 * 1000, 1)
      expect(paperPt.paperY).toBeCloseTo(20 * 0.01 * 1000, 1)
    })
  })

  describe('createPaperSpaceLayout', () => {
    it('creates layout for A1 landscape with one viewport', () => {
      const layout = createPaperSpaceLayout('A1', 'landscape', [
        { modelWidth: 20, modelHeight: 15, scale: '1:50' },
      ])
      expect(layout.sheetSize).toBe('A1')
      expect(layout.orientation).toBe('landscape')
      expect(layout.viewports.length).toBe(1)
      expect(layout.viewports[0].paperWidth).toBeGreaterThan(0)
    })

    it('creates layout for A3 portrait with two viewports', () => {
      const layout = createPaperSpaceLayout('A3', 'portrait', [
        { modelWidth: 10, modelHeight: 8, scale: '1:100' },
        { modelWidth: 10, modelHeight: 8, scale: '1:100' },
      ])
      expect(layout.sheetSize).toBe('A3')
      expect(layout.viewports.length).toBe(2)
    })

    it('layout has correct paper dimensions', () => {
      const layout = createPaperSpaceLayout('A2', 'landscape', [])
      const a2 = getPaperDimensions('A2', 'landscape')
      expect(layout.paperWidthMm).toBe(a2.widthMm)
      expect(layout.paperHeightMm).toBe(a2.heightMm)
    })

    it('layout uses default margin and title block', () => {
      const layout = createPaperSpaceLayout('A1', 'landscape', [])
      expect(layout.marginMm).toBe(MARGIN_MM)
      expect(layout.titleBlockHeightMm).toBe(TITLE_BLOCK_HEIGHT_MM)
    })

    it('accepts custom margin and title block', () => {
      const layout = createPaperSpaceLayout('A4', 'portrait', [], 20, 50)
      expect(layout.marginMm).toBe(20)
      expect(layout.titleBlockHeightMm).toBe(50)
    })
  })

  describe('getScaleLabel', () => {
    it('returns 1:50 for factor 0.02', () => {
      expect(getScaleLabel(0.02)).toBe('1:50')
    })

    it('returns 1:100 for factor 0.01', () => {
      expect(getScaleLabel(0.01)).toBe('1:100')
    })

    it('returns null for unknown factor', () => {
      expect(getScaleLabel(0.075)).toBeNull()
    })
  })

  describe('getRecommendedScale', () => {
    it('recommends appropriate scale for a 50×40m building on A1 landscape', () => {
      const scale = getRecommendedScale(50, 40, 841, 594)
      expect(['1:75', '1:100']).toContain(scale)
    })

    it('recommends 1:50 for a 10×8m plan on A3', () => {
      const a3w = getPaperDimensions('A3', 'landscape').widthMm
      const a3h = getPaperDimensions('A3', 'landscape').heightMm
      const scale = getRecommendedScale(10, 8, a3w, a3h)
      expect(scale).toBe('1:50')
    })

    it('recommends 1:200 for a large 100×80m site on A1', () => {
      const scale = getRecommendedScale(100, 80, 841, 594)
      expect(scale).toBe('1:200')
    })

    it('returns 1:100 fallback for tiny paper', () => {
      const scale = getRecommendedScale(100, 80, 50, 50)
      expect(scale).toBe('1:100')
    })
  })

  describe('listIsoSizes', () => {
    it('returns all 5 ISO sizes', () => {
      const sizes = listIsoSizes()
      expect(sizes).toContain('A0')
      expect(sizes).toContain('A1')
      expect(sizes).toContain('A2')
      expect(sizes).toContain('A3')
      expect(sizes).toContain('A4')
      expect(sizes.length).toBe(5)
    })
  })

  describe('listScales', () => {
    it('returns all 12 viewport scales', () => {
      const scales = listScales()
      expect(scales.length).toBe(12)
      expect(scales).toContain('1:1')
      expect(scales).toContain('1:50')
      expect(scales).toContain('1:100')
    })
  })
})
