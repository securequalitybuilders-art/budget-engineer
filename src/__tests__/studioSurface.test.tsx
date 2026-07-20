import { describe, it, expect } from 'vitest'
import { generateDxf, downloadDxf } from '@/lib/export/dxfWriter'

describe('DXF export wiring', () => {
  it('imports generateDxf and downloadDxf without error', () => {
    expect(typeof generateDxf).toBe('function')
    expect(typeof downloadDxf).toBe('function')
  })
})
