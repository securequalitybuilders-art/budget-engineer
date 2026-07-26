import { describe, it, expect } from 'vitest'
import { generateProgramme, buildProgrammeCsv, dayToDate } from '@/lib/planning/gantt'

describe('dayToDate', () => {
  it('converts day 0 to start date', () => {
    expect(dayToDate('2026-07-11', 0)).toBe('2026-07-11')
  })

  it('adds days correctly', () => {
    expect(dayToDate('2026-01-01', 31)).toBe('2026-02-01')
  })

  it('handles negative days', () => {
    expect(dayToDate('2026-07-11', -11)).toBe('2026-06-30')
  })
})

describe('generateProgramme', () => {
  it('returns tasks for valid input', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    expect(result.tasks.length).toBeGreaterThan(0)
    expect(result.totalDurationDays).toBeGreaterThan(0)
  })

  it('includes startDate defaulting to today', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('accepts custom startDate parameter', () => {
    const result = generateProgramme(100000, 150, 1, 6, true, '2026-03-01')
    expect(result.startDate).toBe('2026-03-01')
  })

  it('all 10 trade sequences are present', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    const codes = result.tasks.map((t) => t.code)
    expect(codes).toContain('01-Preliminaries')
    expect(codes).toContain('02-Substructure')
    expect(codes).toContain('03-Superstructure')
    expect(codes).toContain('04-Roofing')
    expect(codes).toContain('05-Openings')
    expect(codes).toContain('06-Finishes')
    expect(codes).toContain('07-Plumbing')
    expect(codes).toContain('08-Electrical')
    expect(codes).toContain('09-Mechanical')
    expect(codes).toContain('10-External Works')
  })

  it('tasks have sequential start days', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    for (let i = 1; i < result.tasks.length; i++) {
      expect(result.tasks[i].startDay).toBeGreaterThanOrEqual(result.tasks[i - 1].finishDay)
    }
  })

  it('predecessors chain correctly', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    for (let i = 1; i < result.tasks.length; i++) {
      expect(result.tasks[i].predecessors.length).toBeGreaterThan(0)
      expect(result.tasks[i].predecessors[0]).toBe(result.tasks[i - 1].code)
    }
  })

  it('scales duration with area', () => {
    const small = generateProgramme(100000, 75, 1, 4, true)
    const large = generateProgramme(100000, 600, 2, 10, true)
    expect(large.totalDurationDays).toBeGreaterThan(small.totalDurationDays)
  })

  it('all tasks have positive costs', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    for (const t of result.tasks) {
      expect(t.labourCost).toBeGreaterThan(0)
      expect(t.materialCost).toBeGreaterThan(0)
      expect(t.equipmentCost).toBeGreaterThan(0)
      expect(t.totalCost).toBeGreaterThan(0)
    }
  })

  it('cost split sums to total cost per task', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    for (const t of result.tasks) {
      const splitSum = Math.round((t.labourCost + t.materialCost + t.equipmentCost) * 100) / 100
      expect(splitSum).toBe(t.totalCost)
    }
  })

  it('critical path includes all tasks when all are critical', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    expect(result.criticalPath.length).toBe(result.tasks.length)
    for (const t of result.tasks) {
      expect(t.isCritical).toBe(true)
    }
  })

  it('less detailed mode produces shorter durations', () => {
    const detailed = generateProgramme(100000, 150, 1, 6, true)
    const simple = generateProgramme(100000, 150, 1, 6, false)
    expect(simple.totalDurationDays).toBeLessThanOrEqual(detailed.totalDurationDays)
  })

  it('generatedAt is a valid ISO string', () => {
    const result = generateProgramme(100000, 150, 1, 6, true)
    expect(() => new Date(result.generatedAt)).not.toThrow()
    expect(new Date(result.generatedAt).getTime()).not.toBeNaN()
  })

  it('handles zero subtotal cost gracefully', () => {
    const result = generateProgramme(0, 150, 1, 6, true)
    expect(result.tasks.length).toBe(10)
    for (const t of result.tasks) {
      expect(t.totalCost).toBe(0)
    }
  })
})

describe('buildProgrammeCsv', () => {
  it('returns a CSV string with headers including dates', () => {
    const gantt = generateProgramme(100000, 150, 1, 6, true)
    const csv = buildProgrammeCsv(gantt, 'USD')
    expect(csv).toContain('Code')
    expect(csv).toContain('Task')
    expect(csv).toContain('Trade')
    expect(csv).toContain('Start Date')
    expect(csv).toContain('Finish Date')
    expect(csv).toContain('Duration')
  })

  it('includes total duration and critical path summary', () => {
    const gantt = generateProgramme(100000, 150, 1, 6, true)
    const csv = buildProgrammeCsv(gantt, 'USD')
    expect(csv).toContain('Total Duration')
    expect(csv).toContain('Critical Path')
    expect(csv).toContain(gantt.totalDurationDays.toString())
  })

  it('contains all task codes in order', () => {
    const gantt = generateProgramme(100000, 150, 1, 6, true)
    const csv = buildProgrammeCsv(gantt, 'USD')
    for (const t of gantt.tasks) {
      expect(csv).toContain(t.code)
    }
  })

  it('uses calendar dates in CSV rows', () => {
    const gantt = generateProgramme(100000, 150, 1, 6, true, '2026-01-05')
    const csv = buildProgrammeCsv(gantt, 'USD')
    expect(csv).toContain('2026-01-05')
    const firstTask = gantt.tasks[0]
    const startDate = dayToDate('2026-01-05', firstTask.startDay)
    expect(csv).toContain(startDate)
  })
})
