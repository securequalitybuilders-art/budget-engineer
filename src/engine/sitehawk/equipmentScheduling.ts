/**
 * P2 Equipment Scheduling engine.
 * Machine scheduling, equipment plan generation, and cost tracking.
 * Pure functions — no React, no network.
 */
import type { EquipmentSlot, ScheduleRecord } from '@/domain/sitehawk';

export interface EquipmentPlanOptions {
  projectId?: string;
  now?: Date;
}

export interface EquipmentPlanResult {
  slots: EquipmentSlot[];
  totalCostCents: number;
  summary: EquipmentSummary;
}

export interface EquipmentSummary {
  totalSlots: number;
  scheduled: number;
  onSite: number;
  inUse: number;
  demob: number;
  totalDays: number;
  totalCostCents: number;
}

const EQUIPMENT_CATALOG: Array<{
  type: string;
  description: string;
  dailyRateCents: number;
  wbsPattern: RegExp;
}> = [
  { type: 'Excavator', description: 'CAT 320 hydraulic excavator', dailyRateCents: 150_00, wbsPattern: /excavat|earthwork|found/i },
  { type: 'Concrete Mixer', description: '350L portable concrete mixer', dailyRateCents: 35_00, wbsPattern: /concrete|slab|foundation/i },
  { type: 'Tower Crane', description: 'Tower crane 6t capacity', dailyRateCents: 250_00, wbsPattern: /steel|frame|structural/i },
  { type: 'Compactor', description: 'Plate compactor 200kg', dailyRateCents: 25_00, wbsPattern: /compac|backfill|subgrad/i },
  { type: 'Scaffolding Set', description: 'Full scaffold set per bay', dailyRateCents: 45_00, wbsPattern: /scaffold|masonry|plaster|paint/i },
  { type: 'Cement Pump', description: 'Concrete boom pump 36m', dailyRateCents: 180_00, wbsPattern: /pump|concrete|slab/i },
  { type: 'Generator', description: '80kVA diesel generator', dailyRateCents: 65_00, wbsPattern: /electr|generat|power/i },
  { type: 'Water Tanker', description: '5000L water bowser', dailyRateCents: 40_00, wbsPattern: /water|curing|plumb/i },
  { type: 'Tipper Truck', description: '10-tonne tipper truck', dailyRateCents: 80_00, wbsPattern: /earthwork|material|haul|deliver/i },
  { type: 'Welding Set', description: 'Arc welding set 400A', dailyRateCents: 30_00, wbsPattern: /weld|steel|metal/i },
];

export function matchEquipmentToTask(schedule: ScheduleRecord): typeof EQUIPMENT_CATALOG[number] | null {
  const desc = `${schedule.task} ${schedule.wbsCode}`.toLowerCase();
  for (const eq of EQUIPMENT_CATALOG) {
    if (eq.wbsPattern.test(desc)) return eq;
  }
  return null;
}

export function buildEquipmentPlan(
  schedules: ScheduleRecord[],
  opts: EquipmentPlanOptions = {},
): EquipmentPlanResult {
  const projectId = opts.projectId ?? 'local';
  const slots: EquipmentSlot[] = [];

  for (const schedule of schedules) {
    const match = matchEquipmentToTask(schedule);
    if (!match) continue;

    const durationDays = Math.max(1, Math.ceil(schedule.durationDays));
    const costCents = match.dailyRateCents * durationDays;

    slots.push({
      id: `eq-${projectId}-${schedule.wbsCode}-${match.type.toLowerCase().replace(/\s+/g, '-')}`,
      projectId,
      equipmentType: match.type,
      description: match.description,
      operatorName: null,
      scheduledDate: schedule.startDate,
      durationDays,
      wbsCode: schedule.wbsCode,
      costCents,
      status: 'scheduled',
    });
  }

  const summary = summarizeEquipment(slots);
  return { slots, totalCostCents: summary.totalCostCents, summary };
}

export function summarizeEquipment(slots: EquipmentSlot[]): EquipmentSummary {
  let scheduled = 0;
  let onSite = 0;
  let inUse = 0;
  let demob = 0;
  let totalDays = 0;
  let totalCostCents = 0;

  for (const s of slots) {
    if (s.status === 'scheduled') scheduled++;
    else if (s.status === 'on-site') onSite++;
    else if (s.status === 'in-use') inUse++;
    else demob++;
    totalDays += s.durationDays;
    totalCostCents += s.costCents;
  }

  return {
    totalSlots: slots.length,
    scheduled,
    onSite,
    inUse,
    demob,
    totalDays,
    totalCostCents,
  };
}

export function transitionEquipment(slot: EquipmentSlot, nextStatus: EquipmentSlot['status']): EquipmentSlot {
  return { ...slot, status: nextStatus };
}
