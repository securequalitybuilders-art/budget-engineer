import { describe, test, expect } from 'vitest'
import {
  getFacadeStyle,
  getFacadeOrientation,
  detectVerandah,
  getVerandahDepth,
  detectPortico,
  getPorticoWidth,
} from '@/adapters/facadeStyle'

describe('getFacadeStyle', () => {
  test('returns house style for house', () => {
    const style = getFacadeStyle('house')
    expect(style.typology).toBe('house')
    expect(style.hasVerandah).toBe(true)
    expect(style.hasPortico).toBe(true)
    expect(style.hasParapet).toBe(false)
  })

  test('returns villa style for villa', () => {
    const style = getFacadeStyle('villa')
    expect(style.typology).toBe('villa')
    expect(style.hasQuoins).toBe(true)
    expect(style.verandahDepth).toBe(3.0)
  })

  test('returns apartment style for apartment', () => {
    const style = getFacadeStyle('apartment block')
    expect(style.typology).toBe('apartment-block')
    expect(style.hasParapet).toBe(true)
    expect(style.hasVerandah).toBe(false)
  })

  test('returns clinic style for clinic', () => {
    const style = getFacadeStyle('clinic')
    expect(style.typology).toBe('clinic')
    expect(style.plinthFill).toBe('#bbf7d0')
  })

  test('returns school style for school', () => {
    const style = getFacadeStyle('school')
    expect(style.typology).toBe('school')
    expect(style.verandahDepth).toBe(2.4)
  })

  test('returns hotel style for hotel', () => {
    const style = getFacadeStyle('hotel')
    expect(style.typology).toBe('hotel')
    expect(style.hasQuoins).toBe(true)
    expect(style.porticoWidth).toBe(3.0)
  })

  test('returns office style for office', () => {
    const style = getFacadeStyle('office')
    expect(style.typology).toBe('office')
    expect(style.hasParapet).toBe(true)
  })

  test('returns shop style for shop', () => {
    const style = getFacadeStyle('shop')
    expect(style.typology).toBe('shop')
    expect(style.hasParapet).toBe(true)
    expect(style.hasVerandah).toBe(true)
  })

  test('returns church style for church', () => {
    const style = getFacadeStyle('church')
    expect(style.typology).toBe('church')
    expect(style.hasQuoins).toBe(true)
    expect(style.porticoWidth).toBe(3.0)
  })

  test('returns warehouse style for warehouse', () => {
    const style = getFacadeStyle('warehouse')
    expect(style.typology).toBe('warehouse')
    expect(style.hasParapet).toBe(true)
    expect(style.accentBandCount).toBe(0)
  })

  test('returns community style for community hall', () => {
    const style = getFacadeStyle('community hall')
    expect(style.typology).toBe('community-hall')
    expect(style.hasVerandah).toBe(true)
  })

  test('returns mixed-use style for mixed-use', () => {
    const style = getFacadeStyle('mixed-use')
    expect(style.typology).toBe('mixed-use')
    expect(style.hasParapet).toBe(true)
    expect(style.accentBandCount).toBe(2)
  })

  test('returns traditional style for traditional house', () => {
    const style = getFacadeStyle('traditional house')
    expect(style.typology).toBe('traditional-house')
    expect(style.hasQuoins).toBe(true)
    expect(style.verandahDepth).toBe(2.4)
  })

  test('returns duplex style for duplex', () => {
    const style = getFacadeStyle('duplex')
    expect(style.typology).toBe('duplex')
    expect(style.verandahDepth).toBe(1.5)
  })

  test('returns unknown for unrecognised type', () => {
    const style = getFacadeStyle('unknown-type')
    expect(style.typology).toBe('unknown')
  })

  test('is case insensitive', () => {
    const style = getFacadeStyle('VILLA')
    expect(style.typology).toBe('villa')
  })

  test('matches partial building type names', () => {
    const style = getFacadeStyle('apartment building 3-storey')
    expect(style.typology).toBe('apartment-block')
  })
})

describe('getFacadeOrientation', () => {
  test('returns front for wider than deep plan', () => {
    expect(getFacadeOrientation(12, 8)).toBe('front')
  })

  test('returns side for deeper than wide plan', () => {
    expect(getFacadeOrientation(6, 10)).toBe('side')
  })
})

describe('detectVerandah', () => {
  test('returns true for house', () => {
    expect(detectVerandah('house')).toBe(true)
  })

  test('returns true for clinic', () => {
    expect(detectVerandah('clinic')).toBe(true)
  })

  test('returns false for apartment', () => {
    expect(detectVerandah('apartment block')).toBe(false)
  })

  test('returns false for office', () => {
    expect(detectVerandah('office')).toBe(false)
  })
})

describe('getVerandahDepth', () => {
  test('returns correct depths by typology', () => {
    expect(getVerandahDepth('house')).toBe(1.8)
    expect(getVerandahDepth('villa')).toBe(3.0)
    expect(getVerandahDepth('clinic')).toBe(2.0)
    expect(getVerandahDepth('duplex')).toBe(1.5)
    expect(getVerandahDepth('office')).toBe(0)
  })
})

describe('detectPortico', () => {
  test('returns true for house', () => {
    expect(detectPortico('house')).toBe(true)
  })

  test('returns false for apartment', () => {
    expect(detectPortico('apartment block')).toBe(false)
  })
})

describe('getPorticoWidth', () => {
  test('returns correct widths by typology', () => {
    expect(getPorticoWidth('church')).toBe(3.0)
    expect(getPorticoWidth('hotel')).toBe(3.0)
    expect(getPorticoWidth('house')).toBe(1.8)
    expect(getPorticoWidth('duplex')).toBe(1.6)
    expect(getPorticoWidth('apartment block')).toBe(0)
  })
})
