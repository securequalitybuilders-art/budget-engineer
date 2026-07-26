import { describe, it, expect } from 'vitest'
import { computeCashflow, buildCashflowCsv } from '@/lib/planning/cashflow'
import { dayToDate } from '@/lib/planning/gantt'
import type { WbsTask } from '@/lib/planning/gantt'

function makeSimpleTasks(count = 3): WbsTask[] {
  const tasks: WbsTask[] = []
  let day = 0
  for (let i = 0; i < count; i++) {
    const dur = 10 + i * 2
    tasks.push({
      code: `T${String(i + 1).padStart(2, '0')}`,
      name: `Task ${i + 1}`,
      trade: 'General',
      durationDays: dur,
      predecessors: i > 0 ? [tasks[i - 1].code] : [],
      labourCost: 1000,
      materialCost: 2000,
      equipmentCost: 500,
      totalCost: 3500,
      startDay: day,
      finishDay: day + dur - 1,
      isCritical: true,
    })
    day += dur
  }
  return tasks
}

describe('computeCashflow', () => {
  it('returns weekly and monthly arrays', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    expect(result.weekly.length).toBeGreaterThan(0)
    expect(result.monthly.length).toBeGreaterThan(0)
  })

  it('includes startDate defaulting to today', () => {
    const result = computeCashflow(makeSimpleTasks(3), 40)
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('accepts custom startDate parameter', () => {
    const result = computeCashflow(makeSimpleTasks(3), 40, '2026-04-15')
    expect(result.startDate).toBe('2026-04-15')
  })

  it('populates startDate and endDate on each period', () => {
    const result = computeCashflow(makeSimpleTasks(3), 40, '2026-01-01')
    for (const w of result.weekly) {
      expect(w.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(w.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const expectedStart = dayToDate('2026-01-01', w.weekStart)
      const expectedEnd = dayToDate('2026-01-01', w.weekEnd)
      expect(w.startDate).toBe(expectedStart)
      expect(w.endDate).toBe(expectedEnd)
    }
  })

  it('monthly periods inherit startDate/endDate from first/last week', () => {
    const result = computeCashflow(makeSimpleTasks(3), 40, '2026-01-01')
    for (const m of result.monthly) {
      expect(m.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(m.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('cumulative cost grows monotonically', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    for (let i = 1; i < result.weekly.length; i++) {
      expect(result.weekly[i].cumulativeCost).toBeGreaterThanOrEqual(result.weekly[i - 1].cumulativeCost)
    }
  })

  it('final cumulative cost equals totalCost', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    const finalCumulative = result.weekly[result.weekly.length - 1].cumulativeCost
    expect(finalCumulative).toBe(result.totalCost)
  })

  it('peak cost is the maximum weekly period cost', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    const maxWeekly = Math.max(...result.weekly.map((w) => w.periodCost))
    expect(result.peakCost).toBe(maxWeekly)
  })

  it('avg weekly cost is total / weeks', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    const expectedAvg = Math.round((result.totalCost / result.weekly.length) * 100) / 100
    expect(result.avgWeeklyCost).toBe(expectedAvg)
  })

  it('monthly groups of 4 weeks', () => {
    const tasks = makeSimpleTasks(10)
    const result = computeCashflow(tasks, 80)
    expect(result.monthly.length).toBe(Math.ceil(result.weekly.length / 4))
  })

  it('period costs are non-negative', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    for (const w of result.weekly) {
      expect(w.periodCost).toBeGreaterThanOrEqual(0)
      expect(w.labourCost).toBeGreaterThanOrEqual(0)
      expect(w.materialCost).toBeGreaterThanOrEqual(0)
      expect(w.equipmentCost).toBeGreaterThanOrEqual(0)
    }
  })

  it('spreads task costs across overlapping weeks', () => {
    const tasks: WbsTask[] = [{
      code: 'T01',
      name: 'Single task',
      trade: 'General',
      durationDays: 21,
      predecessors: [],
      labourCost: 3000,
      materialCost: 6000,
      equipmentCost: 1500,
      totalCost: 10500,
      startDay: 0,
      finishDay: 20,
      isCritical: true,
    }]
    const result = computeCashflow(tasks, 21)
    expect(result.weekly.length).toBeGreaterThanOrEqual(3)
    const weekCosts = result.weekly.map((w) => w.periodCost)
    const allCost = weekCosts.reduce((s, c) => s + c, 0)
    expect(Math.round(allCost)).toBe(10500)
  })

  it('handles single-week duration', () => {
    const tasks: WbsTask[] = [{
      code: 'T01',
      name: 'Quick',
      trade: 'General',
      durationDays: 3,
      predecessors: [],
      labourCost: 500,
      materialCost: 1000,
      equipmentCost: 200,
      totalCost: 1700,
      startDay: 0,
      finishDay: 2,
      isCritical: true,
    }]
    const result = computeCashflow(tasks, 3)
    expect(result.weekly.length).toBe(1)
    expect(result.weekly[0].periodCost).toBe(1700)
  })

  it('monthly cumulative matches final weekly cumulative', () => {
    const tasks = makeSimpleTasks(3)
    const result = computeCashflow(tasks, 40)
    if (result.monthly.length > 0) {
      expect(result.monthly[result.monthly.length - 1].cumulativeCost).toBe(result.totalCost)
    }
  })
})

describe('buildCashflowCsv', () => {
  it('returns a CSV string with headers', () => {
    const tasks = makeSimpleTasks(3)
    const cf = computeCashflow(tasks, 40)
    const csv = buildCashflowCsv(cf, 'USD')
    expect(csv).toContain('WEEKLY CASHFLOW')
    expect(csv).toContain('MONTHLY CASHFLOW')
    expect(csv).toContain('Week')
    expect(csv).toContain('Month')
  })

  it('includes total cost, peak, and avg summary', () => {
    const tasks = makeSimpleTasks(3)
    const cf = computeCashflow(tasks, 40)
    const csv = buildCashflowCsv(cf, 'USD')
    expect(csv).toContain('Total Cost')
    expect(csv).toContain('Peak Cost')
    expect(csv).toContain('Avg Weekly Cost')
    expect(csv).toContain(cf.totalCost.toFixed(2))
  })

  it('includes all weekly rows with dates', () => {
    const tasks = makeSimpleTasks(3)
    const cf = computeCashflow(tasks, 40)
    const csv = buildCashflowCsv(cf, 'USD')
    for (let i = 0; i < cf.weekly.length; i++) {
      expect(csv).toContain(`Week ${i + 1}`)
      expect(csv).toContain(cf.weekly[i].startDate)
      expect(csv).toContain(cf.weekly[i].endDate)
    }
  })

  it('includes all monthly rows with dates', () => {
    const tasks = makeSimpleTasks(3)
    const cf = computeCashflow(tasks, 40)
    const csv = buildCashflowCsv(cf, 'USD')
    for (let i = 0; i < cf.monthly.length; i++) {
      expect(csv).toContain(`Month ${i + 1}`)
      expect(csv).toContain(cf.monthly[i].startDate)
      expect(csv).toContain(cf.monthly[i].endDate)
    }
  })

  it('handles special characters in labels', () => {
    const tasks = makeSimpleTasks(3)
    const cf = computeCashflow(tasks, 40)
    const csv = buildCashflowCsv(cf, 'USD')
    expect(csv).not.toThrow
  })

  it('CSV header uses Start Date / End Date columns', () => {
    const tasks = makeSimpleTasks(3)
    const cf = computeCashflow(tasks, 40)
    const csv = buildCashflowCsv(cf, 'USD')
    expect(csv).toContain('Start Date')
    expect(csv).toContain('End Date')
  })
})
