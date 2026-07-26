export interface WbsTask {
  code: string
  name: string
  trade: string
  durationDays: number
  predecessors: string[]
  labourCost: number
  materialCost: number
  equipmentCost: number
  totalCost: number
  startDay: number
  finishDay: number
  isCritical: boolean
}

export interface GanttResult {
  tasks: WbsTask[]
  totalDurationDays: number
  criticalPath: string[]
  generatedAt: string
  startDate: string
}

export function dayToDate(startDate: string, day: number): string {
  const d = new Date(startDate + 'T12:00:00')
  d.setDate(d.getDate() + day)
  return d.toISOString().split('T')[0]
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0]
}

const TRADE_SEQUENCE: string[] = [
  'Preliminaries',
  'Substructure',
  'Superstructure',
  'Roofing',
  'Openings',
  'Finishes',
  'Plumbing',
  'Electrical',
  'Mechanical',
  'External Works',
]

interface TradeDuration {
  trade: string
  baseDays: number
  minDays: number
  maxDays: number
  costPct: number
  labourPct: number
  materialPct: number
  equipmentPct: number
}

const TRADE_DEFAULTS: TradeDuration[] = [
  { trade: 'Preliminaries', baseDays: 5, minDays: 3, maxDays: 10, costPct: 0.04, labourPct: 0.4, materialPct: 0.3, equipmentPct: 0.3 },
  { trade: 'Substructure', baseDays: 12, minDays: 8, maxDays: 20, costPct: 0.10, labourPct: 0.3, materialPct: 0.5, equipmentPct: 0.2 },
  { trade: 'Superstructure', baseDays: 20, minDays: 12, maxDays: 35, costPct: 0.25, labourPct: 0.35, materialPct: 0.5, equipmentPct: 0.15 },
  { trade: 'Roofing', baseDays: 10, minDays: 6, maxDays: 18, costPct: 0.08, labourPct: 0.3, materialPct: 0.6, equipmentPct: 0.1 },
  { trade: 'Openings', baseDays: 8, minDays: 5, maxDays: 14, costPct: 0.06, labourPct: 0.35, materialPct: 0.55, equipmentPct: 0.1 },
  { trade: 'Finishes', baseDays: 18, minDays: 10, maxDays: 30, costPct: 0.15, labourPct: 0.4, materialPct: 0.5, equipmentPct: 0.1 },
  { trade: 'Plumbing', baseDays: 12, minDays: 7, maxDays: 20, costPct: 0.10, labourPct: 0.35, materialPct: 0.55, equipmentPct: 0.1 },
  { trade: 'Electrical', baseDays: 10, minDays: 6, maxDays: 18, costPct: 0.08, labourPct: 0.35, materialPct: 0.55, equipmentPct: 0.1 },
  { trade: 'Mechanical', baseDays: 8, minDays: 5, maxDays: 14, costPct: 0.06, labourPct: 0.35, materialPct: 0.5, equipmentPct: 0.15 },
  { trade: 'External Works', baseDays: 8, minDays: 5, maxDays: 14, costPct: 0.04, labourPct: 0.3, materialPct: 0.5, equipmentPct: 0.2 },
]

function scaleDuration(baseDays: number, areaM2: number): number {
  const refArea = 150
  const ratio = Math.max(0.5, Math.min(3, Math.sqrt(areaM2 / refArea)))
  return Math.max(1, Math.round(baseDays * ratio))
}

function isSequential(tradeIndex: number, seq: string[], task: WbsTask): boolean {
  const idx = seq.indexOf(task.trade)
  if (idx < 0) return true
  return idx <= tradeIndex
}

export function generateProgramme(
  subtotalCost: number,
  areaM2: number,
  _floors: number,
  _roomCount: number,
  isDetailed: boolean,
  startDate?: string,
): GanttResult {
  const trades: TradeDuration[] = TRADE_DEFAULTS.map((t) => ({
    ...t,
    baseDays: isDetailed ? t.baseDays : Math.max(1, Math.round(t.baseDays * 0.7)),
    costPct: isDetailed ? t.costPct : t.costPct * 0.85,
  }))

  const tasks: WbsTask[] = []
  let currentDay = 0

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i]
    const duration = scaleDuration(t.baseDays, areaM2)
    const taskCost = subtotalCost * t.costPct
    const predecessors: string[] = []

    if (i > 0) {
      const prev = tasks.filter((p) => isSequential(i, TRADE_SEQUENCE, p))
      if (prev.length > 0) {
        predecessors.push(prev[prev.length - 1].code)
      }
    }

    const startDay = currentDay
    const finishDay = startDay + duration - 1
    const labourCost = taskCost * t.labourPct
    const materialCost = taskCost * t.materialPct
    const equipmentCost = taskCost * t.equipmentPct

    const task: WbsTask = {
      code: `${String(i + 1).padStart(2, '0')}-${t.trade}`,
      name: t.trade,
      trade: t.trade,
      durationDays: duration,
      predecessors,
      labourCost: Math.round(labourCost * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      equipmentCost: Math.round(equipmentCost * 100) / 100,
      totalCost: Math.round(taskCost * 100) / 100,
      startDay,
      finishDay,
      isCritical: true,
    }
    tasks.push(task)
    currentDay = finishDay + 1
  }

  const criticalPath = tasks.filter((t) => t.isCritical).map((t) => t.code)
  const totalDurationDays = tasks.length > 0 ? tasks[tasks.length - 1].finishDay + 1 : 0

  const projectStart = startDate ?? todayDateStr()

  return {
    tasks,
    totalDurationDays,
    criticalPath,
    generatedAt: new Date().toISOString(),
    startDate: projectStart,
  }
}

export function buildProgrammeCsv(gantt: GanttResult, currency: string): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const d2d = (day: number) => dayToDate(gantt.startDate, day)

  const lines: string[] = [
    ['Code', 'Task', 'Trade', 'Duration (days)', 'Predecessors', 'Start Date', 'Finish Date',
     `Labour (${currency})`, `Material (${currency})`, `Equipment (${currency})`, `Total (${currency})`, 'Critical'].map(esc).join(','),
  ]
  for (const t of gantt.tasks) {
    lines.push([
      t.code, t.name, t.trade, t.durationDays, t.predecessors.join('; '), d2d(t.startDay), d2d(t.finishDay),
      t.labourCost.toFixed(2), t.materialCost.toFixed(2), t.equipmentCost.toFixed(2), t.totalCost.toFixed(2),
      t.isCritical ? 'Yes' : 'No',
    ].map(esc).join(','))
  }
  lines.push('')
  lines.push(['', '', '', '', '', '', '', '', '', '', 'Total Duration', `${gantt.totalDurationDays} days`].map(esc).join(','))
  lines.push(['', '', '', '', '', '', '', '', '', '', 'Critical Path', gantt.criticalPath.join(' → ')].map(esc).join(','))
  return lines.join('\n')
}
