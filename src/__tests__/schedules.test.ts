import { describe, it, expect } from 'vitest'
import { buildScheduleCsv, type ScheduleSet, type DoorScheduleRow, type WindowScheduleRow } from '@/lib/boq/schedules'

function makeSampleSchedule(overrides: Partial<ScheduleSet> = {}): ScheduleSet {
  return {
    doors: [
      { mark: 'D01', type: 'External', widthMm: 1200, heightMm: 2100, qty: 2, material: 'Steel', finish: 'Powder coated', ironmongery: 'Lock, closer', notes: '' },
      { mark: 'D02', type: 'Internal', widthMm: 900, heightMm: 2100, qty: 4, material: 'Timber', finish: 'Painted', ironmongery: 'Latch', notes: '' },
    ],
    windows: [
      { mark: 'W01', type: 'Sliding', widthMm: 1500, heightMm: 1200, qty: 3, frame: 'Aluminium', glazing: '6mm clear', opening: 'Side hung', notes: '' },
      { mark: 'W02', type: 'Casement', widthMm: 900, heightMm: 1200, qty: 2, frame: 'Aluminium', glazing: '6mm clear', opening: 'Top hung', notes: '' },
    ],
    roomFinishes: [
      { room: 'Living', floorAreaM2: 36, floorFinish: 'Vinyl', wallFinish: 'Painted', ceilingFinish: 'Suspended', skirting: 'Timber', waterproofing: 'No', notes: '' },
      { room: 'Kitchen', floorAreaM2: 12, floorFinish: 'Tiles', wallFinish: 'Tiled splashback', ceilingFinish: 'Suspended', skirting: 'PVC', waterproofing: 'Yes', notes: '' },
    ],
    sanitary: [
      { fixture: 'WC Pan', type: 'Close coupled', qty: 2, cold: true, hot: false, waste: true, notes: '' },
      { fixture: 'Basin', type: 'Wall hung', qty: 2, cold: true, hot: true, waste: true, notes: '' },
    ],
    electricalPoints: [
      { point: 'Lighting', type: 'LED downlight', qty: 8, circuit: 'L1', ratingA: 6, notes: '' },
      { point: 'Socket', type: '13A switched', qty: 6, circuit: 'S1', ratingA: 13, notes: '' },
    ],
    hvac: [
      { unit: 'AC-01', type: 'Split unit', capacityKw: 3.5, qty: 2, area: 'Bedroom 1', refrigerant: 'R32', notes: '' },
    ],
    roof: [
      { section: 'Main roof', areaM2: 80, pitchDeg: 25, covering: 'CGI 0.6mm', insulation: '50mm fibreglass', structure: 'Timber trusses', notes: '' },
    ],
    materialTakeoff: [
      { material: 'Concrete', unit: 'm³', quantity: 12.5, wastePct: 10, totalQuantity: 13.8, notes: 'C25/30' },
      { material: 'Steel', unit: 'tonne', quantity: 1.2, wastePct: 8, totalQuantity: 1.3, notes: 'Y10-Y16' },
    ],
    generatedAt: new Date().toISOString(),
    designId: 'test-schedule-1',
    ...overrides,
  }
}

describe('buildScheduleCsv', () => {
  it('returns a CSV string', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(typeof csv).toBe('string')
    expect(csv.length).toBeGreaterThan(0)
  })

  it('contains all section headers', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('DOOR SCHEDULE')
    expect(csv).toContain('WINDOW SCHEDULE')
    expect(csv).toContain('ROOM FINISH SCHEDULE')
    expect(csv).toContain('SANITARY SCHEDULE')
    expect(csv).toContain('ELECTRICAL POINT SCHEDULE')
    expect(csv).toContain('HVAC SCHEDULE')
    expect(csv).toContain('ROOF SCHEDULE')
    expect(csv).toContain('MATERIAL TAKEOFF')
  })

  it('contains header columns for doors', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('Mark,Type,Width (mm),Height (mm),Qty,Material,Finish,Ironmongery,Notes')
  })

  it('contains header columns for windows', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('Mark,Type,Width (mm),Height (mm),Qty,Frame,Glazing,Opening,Notes')
  })

  it('contains door data rows', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('D01')
    expect(csv).toContain('D02')
    expect(csv).toContain('Steel')
    expect(csv).toContain('Timber')
  })

  it('contains window data rows', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('W01')
    expect(csv).toContain('W02')
    expect(csv).toContain('Sliding')
  })

  it('contains sanitary fixtures with Yes/No booleans', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('WC Pan')
    expect(csv).toContain('Basin')
    expect(csv).toContain('Yes')
    expect(csv).toContain('No')
  })

  it('contains electrical data', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('LED downlight')
    expect(csv).toContain('13A switched')
    expect(csv).toContain('Rating (A)')
  })

  it('contains HVAC data', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('AC-01')
    expect(csv).toContain('Split unit')
    expect(csv).toContain('R32')
  })

  it('contains roof schedule data', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('Main roof')
    expect(csv).toContain('CGI 0.6mm')
  })

  it('contains material takeoff data', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('Concrete')
    expect(csv).toContain('Steel')
    expect(csv).toContain('m³')
    expect(csv).toContain('Waste %')
  })

  it('omits sections with no rows', () => {
    const s = makeSampleSchedule({ doors: [] })
    const csv = buildScheduleCsv(s)
    expect(csv).not.toContain('DOOR SCHEDULE')
    expect(csv).toContain('WINDOW SCHEDULE')
  })

  it('handles commas in notes via CSV escaping', () => {
    const s = makeSampleSchedule({
      doors: [{ mark: 'D01', type: 'External', widthMm: 900, heightMm: 2100, qty: 1, material: 'Steel', finish: 'Powder', ironmongery: 'Lock, handle, closer', notes: 'Special, order' }],
    })
    const csv = buildScheduleCsv(s)
    expect(csv).toContain('"Lock, handle, closer"')
    expect(csv).toContain('"Special, order"')
  })

  it('does not generate extra sections for empty arrays', () => {
    const s = makeSampleSchedule({ doors: [], windows: [], roomFinishes: [], sanitary: [], electricalPoints: [], hvac: [], roof: [], materialTakeoff: [] })
    const csv = buildScheduleCsv(s)
    expect(csv).toBe('')
  })

  it('generatedAt and designId do not appear in CSV output', () => {
    const s = makeSampleSchedule()
    const csv = buildScheduleCsv(s)
    expect(csv).not.toContain(s.generatedAt)
    expect(csv).not.toContain(s.designId)
  })
})
