/**
 * P2 Site Mobilization / Resource Scheduling engine.
 * Trade-labour allocation per day from the schedule, WBS auto-coding of
 * labour hours, and logistics fleet records with geofenced delivery status.
 */
import type { ResourceScheduleRow, LogisticsRecord, RealTimeJobCosting } from '@/domain/sitehawk';
import type { ScheduleRecord } from '@/domain/sitehawk';

export const TRADE_LABOUR_RATES: Record<string, number> = {
  'Cement & Concrete': 12000,
  'Brick & Block': 11000,
  'Steel & Reinforcement': 13500,
  'Timber & Roofing': 12500,
  Finishes: 10000,
  Fenestration: 14000,
  'Doors & Ironmongery': 13000,
  'Electrical & Solar': 15000,
  'Plumbing & Sanitary': 14500,
  'General Materials': 11000,
};

export interface LabourAllocationOptions {
  crewSize?: number;
  hoursPerDay?: number;
}

/** Auto-coded labour schedule: labour-hours = duration × crew, WBS = task wbs. */
export function buildResourceSchedule(
  schedule: ScheduleRecord[],
  opts: LabourAllocationOptions = {},
): ResourceScheduleRow[] {
  const crewSize = opts.crewSize ?? 3;
  const hoursPerDay = opts.hoursPerDay ?? 8;
  const rows: ResourceScheduleRow[] = [];
  for (const task of schedule) {
    for (let day = 0; day < task.durationDays; day++) {
      const labourHours = hoursPerDay * crewSize;
      rows.push({
        id: `rs-${task.id}-${day}`,
        projectId: task.projectId,
        date: isoDay(task.startDate, day),
        trade: tradeFromWbs(task.wbsCode),
        labourHours,
        crewSize,
        autoCodedWbs: task.wbsCode,
        costCents: labourHours * (TRADE_LABOUR_RATES[tradeFromWbs(task.wbsCode)] ?? 11000),
      });
    }
  }
  return rows;
}

function isoDay(startDate: string, offsetDays: number): string {
  if (!startDate) return '';
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function tradeFromWbs(wbsCode: string): string {
  if (wbsCode.startsWith('02')) return 'Cement & Concrete';
  if (wbsCode.startsWith('03')) return 'Brick & Block';
  if (wbsCode.startsWith('04')) return 'Timber & Roofing';
  if (wbsCode.startsWith('05')) return 'Finishes';
  if (wbsCode.startsWith('06.01')) return 'Electrical & Solar';
  if (wbsCode.startsWith('06.02')) return 'Plumbing & Sanitary';
  return 'General Materials';
}

export interface LogisticsInput {
  projectId: string;
  supplierName: string;
  material: string;
  orderId?: string | null;
  etaDays: number;
  geofenced?: boolean;
  geofenceName?: string | null;
  now?: Date;
}

export function createLogisticsRecord(input: LogisticsInput): LogisticsRecord {
  const now = input.now ?? new Date();
  return {
    id: `lg-${input.projectId}-${now.getTime()}`,
    projectId: input.projectId,
    orderId: input.orderId ?? null,
    supplierName: input.supplierName,
    material: input.material,
    status: 'ordered',
    etaDays: input.etaDays,
    geofenced: input.geofenced ?? true,
    geofenceName: input.geofenceName ?? 'Site geofence',
    updatedAt: now.toISOString(),
  };
}

export function advanceLogistics(record: LogisticsRecord): LogisticsRecord {
  const next = record.status === 'ordered' ? 'in-transit' : record.status === 'in-transit' ? 'arrived' : record.status === 'arrived' ? 'delivered' : 'delivered';
  return { ...record, status: next, updatedAt: new Date().toISOString() };
}

export function logisticsSummary(records: LogisticsRecord[]): {
  total: number;
  inTransit: number;
  geofenced: number;
  overdue: number;
} {
  const inTransit = records.filter((r) => r.status === 'in-transit').length;
  const geofenced = records.filter((r) => r.geofenced && r.status !== 'delivered').length;
  const overdue = records.filter((r) => r.etaDays <= 0 && r.status !== 'delivered').length;
  return { total: records.length, inTransit, geofenced, overdue };
}

/** Aggregate resource-schedule rows into a RealTimeJobCosting summary. */
export function aggregateJobCosts(rows: ResourceScheduleRow[]): RealTimeJobCosting {
  let totalCents = 0;
  const byWbs: Record<string, number> = {};
  for (const r of rows) {
    totalCents += r.costCents;
    byWbs[r.autoCodedWbs] = (byWbs[r.autoCodedWbs] ?? 0) + r.costCents;
  }
  return {
    totalCents,
    labourCents: totalCents,
    materialCents: 0,
    equipmentCents: 0,
    byWbs,
  };
}