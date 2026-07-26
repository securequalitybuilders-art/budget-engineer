import type { WbsTask } from './gantt'
import { dayToDate } from './gantt'

export interface CashflowPeriod {
  period: number
  weekStart: number
  weekEnd: number
  startDate: string
  endDate: string
  labourCost: number
  materialCost: number
  equipmentCost: number
  periodCost: number
  cumulativeCost: number
}

export interface CashflowResult {
  weekly: CashflowPeriod[]
  monthly: CashflowPeriod[]
  totalCost: number
  peakCost: number
  peakPeriod: number
  avgWeeklyCost: number
  generatedAt: string
  startDate: string
}

export function computeCashflow(tasks: WbsTask[], totalDurationDays: number, startDate?: string): CashflowResult {
  const projectStart = startDate ?? new Date().toISOString().split('T')[0]
  const totalWeeks = Math.max(1, Math.ceil(totalDurationDays / 7))
  const weekly: CashflowPeriod[] = []
  const monthly: CashflowPeriod[] = []

  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = w * 7
    const weekEnd = Math.min(weekStart + 6, totalDurationDays)

    let labourSum = 0
    let materialSum = 0
    let equipmentSum = 0

    for (const task of tasks) {
      const taskStart = task.startDay
      const taskEnd = task.finishDay

      if (taskEnd < weekStart || taskStart > weekEnd) continue

      const overlapStart = Math.max(taskStart, weekStart)
      const overlapEnd = Math.min(taskEnd, weekEnd)
      const overlapDays = Math.max(0, overlapEnd - overlapStart + 1)
      const taskDays = Math.max(1, task.durationDays)
      const fraction = overlapDays / taskDays

      labourSum += task.labourCost * fraction
      materialSum += task.materialCost * fraction
      equipmentSum += task.equipmentCost * fraction
    }

    const periodCost = Math.round((labourSum + materialSum + equipmentSum) * 100) / 100
    weekly.push({
      period: w,
      weekStart,
      weekEnd,
      startDate: dayToDate(projectStart, weekStart),
      endDate: dayToDate(projectStart, weekEnd),
      labourCost: Math.round(labourSum * 100) / 100,
      materialCost: Math.round(materialSum * 100) / 100,
      equipmentCost: Math.round(equipmentSum * 100) / 100,
      periodCost,
      cumulativeCost: 0,
    })
  }

  let cumSum = 0
  for (const w of weekly) {
    cumSum += w.periodCost
    w.cumulativeCost = Math.round(cumSum * 100) / 100
  }

  const monthGroupSize = 4
  for (let m = 0; m < Math.ceil(weekly.length / monthGroupSize); m++) {
    const start = m * monthGroupSize
    const end = Math.min(start + monthGroupSize, weekly.length)
    const slice = weekly.slice(start, end)
    monthly.push({
      period: m,
      weekStart: slice[0].weekStart,
      weekEnd: slice[slice.length - 1].weekEnd,
      startDate: slice[0].startDate,
      endDate: slice[slice.length - 1].endDate,
      labourCost: Math.round(slice.reduce((s, w) => s + w.labourCost, 0) * 100) / 100,
      materialCost: Math.round(slice.reduce((s, w) => s + w.materialCost, 0) * 100) / 100,
      equipmentCost: Math.round(slice.reduce((s, w) => s + w.equipmentCost, 0) * 100) / 100,
      periodCost: Math.round(slice.reduce((s, w) => s + w.periodCost, 0) * 100) / 100,
      cumulativeCost: slice[slice.length - 1].cumulativeCost,
    })
  }

  const totalCost = weekly.reduce((s, w) => s + w.periodCost, 0)
  const peak = weekly.reduce((max, w) => w.periodCost > max.cost ? { cost: w.periodCost, period: w.period } : max, { cost: 0, period: 0 })

  return {
    weekly,
    monthly,
    totalCost: Math.round(totalCost * 100) / 100,
    peakCost: peak.cost,
    peakPeriod: peak.period,
    avgWeeklyCost: totalWeeks > 0 ? Math.round((totalCost / totalWeeks) * 100) / 100 : 0,
    generatedAt: new Date().toISOString(),
    startDate: projectStart,
  }
}

export function buildCashflowCsv(cashflow: CashflowResult, currency: string): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = [
    'WEEKLY CASHFLOW',
    ['Week', 'Start Date', 'End Date', `Labour (${currency})`, `Material (${currency})`, `Equipment (${currency})`, `Period (${currency})`, `Cumulative (${currency})`].map(esc).join(','),
  ]
  for (const w of cashflow.weekly) {
    lines.push([`Week ${w.period + 1}`, w.startDate, w.endDate,
      w.labourCost.toFixed(2), w.materialCost.toFixed(2), w.equipmentCost.toFixed(2),
      w.periodCost.toFixed(2), w.cumulativeCost.toFixed(2)].map(esc).join(','))
  }
  lines.push('')
  lines.push('MONTHLY CASHFLOW')
  lines.push(['Month', 'Start Date', 'End Date', `Labour (${currency})`, `Material (${currency})`, `Equipment (${currency})`, `Period (${currency})`, `Cumulative (${currency})`].map(esc).join(','))
  for (const m of cashflow.monthly) {
    lines.push([`Month ${m.period + 1}`, m.startDate, m.endDate,
      m.labourCost.toFixed(2), m.materialCost.toFixed(2), m.equipmentCost.toFixed(2),
      m.periodCost.toFixed(2), m.cumulativeCost.toFixed(2)].map(esc).join(','))
  }
  lines.push('')
  lines.push(['', '', '', '', '', '', 'Total Cost', cashflow.totalCost.toFixed(2)].map(esc).join(','))
  lines.push(['', '', '', '', '', '', 'Peak Cost (Week)', `${cashflow.peakCost.toFixed(2)} (Week ${cashflow.peakPeriod + 1})`].map(esc).join(','))
  lines.push(['', '', '', '', '', '', 'Avg Weekly Cost', cashflow.avgWeeklyCost.toFixed(2)].map(esc).join(','))
  return lines.join('\n')
}
