import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  WbsDictionaryEntry,
  ScheduleRecord,
  ResourceScheduleRow,
  LogisticsRecord,
  DigitalTwinTimelineEntry,
  VerificationReport,
  EscrowMilestoneRecord,
  EscrowReleaseRecord,
  VariationPenalty,
  WipaaEntry,
  EquipmentSlot,
  TruckLocation,
  FleetDriver,
  PurchaseOrderRecord,
  InvoiceRecord,
  InspectionChecklist,
} from '@/domain/sitehawk';
import { buildCriticalPath } from '@/engine/sitehawk/criticalPath';
import { createLogisticsRecord, advanceLogistics } from '@/engine/sitehawk/resourceScheduling';
import { createTwinSnapshot, createVerificationReport } from '@/engine/sitehawk/digitalTwin';
import { createEscrowMilestone, transitionEscrowMilestone } from '@/engine/sitehawk/escrowTrigger';
import { buildWipaaEntry } from '@/engine/sitehawk/wipaaMonitor';
import { transitionPo as engineTransitionPo, transitionInvoice as engineTransitionInvoice } from '@/engine/sitehawk/realTimeJobCosting';

interface SiteHawkState {
  wbsDictionary: WbsDictionaryEntry[];
  schedules: ScheduleRecord[];
  resourceSchedules: ResourceScheduleRow[];
  logistics: LogisticsRecord[];
  digitalTwinTimeline: DigitalTwinTimelineEntry[];
  verificationReports: VerificationReport[];
  escrowMilestones: EscrowMilestoneRecord[];
  escrowReleases: EscrowReleaseRecord[];
  variationPenalties: VariationPenalty[];
  wipaaEntries: WipaaEntry[];
  equipmentSlots: EquipmentSlot[];
  truckLocations: TruckLocation[];
  drivers: FleetDriver[];
  pos: PurchaseOrderRecord[];
  invoices: InvoiceRecord[];
  inspectionChecklists: InspectionChecklist[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  saveSchedule: (projectId: string, tasks: Array<{ id: string; name: string; wbsCode: string; durationDays: number; predecessors: string[]; costCents: number }>) => Promise<ScheduleRecord[]>;
  addLogistics: (input: { supplierName: string; material: string; etaDays: number; orderId?: string | null }) => Promise<LogisticsRecord | null>;
  stepLogistics: (id: string) => Promise<void>;
  addSnapshot: (input: { milestoneId?: string | null; geoLat: number; geoLng: number; note: string; progressPct: number }) => Promise<DigitalTwinTimelineEntry | null>;
  addVerification: (input: { milestoneId?: string | null; method: VerificationReport['method']; verdict: VerificationReport['verdict']; confidence: number; details: string }) => Promise<VerificationReport | null>;
  addEscrowMilestone: (input: { escrowId?: string | null; milestoneName: string; amountCents: number }) => Promise<EscrowMilestoneRecord | null>;
  transitionEscrow: (id: string, approval?: 'approved' | 'rejected') => Promise<{ ok: boolean; reason: string }>;
  addWipaaEntry: (input: { monthKey: string; billedCents: number; incurredCents: number; revenueEarnedCents: number; overUnderBilledCents: number; status: 'on-track' | 'under-billed' | 'over-billed' }) => Promise<WipaaEntry | null>;
  addEquipmentSlot: (slot: EquipmentSlot) => Promise<void>;
  advanceTruck: (truck: TruckLocation) => Promise<void>;
  addDriver: (driver: FleetDriver) => Promise<void>;
  addPurchaseOrder: (po: PurchaseOrderRecord) => Promise<void>;
  addInvoice: (invoice: InvoiceRecord) => Promise<void>;
  transitionPo: (id: string, status: PurchaseOrderRecord['status']) => Promise<void>;
  transitionInvoice: (id: string, status: InvoiceRecord['status']) => Promise<void>;
  addInspectionChecklist: (cl: InspectionChecklist) => Promise<void>;
  updateInspectionChecklist: (cl: InspectionChecklist) => Promise<void>;
}

export const useSiteHawkStore = create<SiteHawkState>()(
  immer(
    persist(
      (set, get) => ({
        wbsDictionary: [],
        schedules: [],
        resourceSchedules: [],
        logistics: [],
        digitalTwinTimeline: [],
        verificationReports: [],
        escrowMilestones: [],
        escrowReleases: [],
        variationPenalties: [],
        wipaaEntries: [],
        equipmentSlots: [],
        truckLocations: [],
        drivers: [],
        pos: [],
        invoices: [],
        inspectionChecklists: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId; });
          const [wbsDictionary, schedules, resourceSchedules, logistics, digitalTwinTimeline, verificationReports, escrowMilestones, escrowReleases, variationPenalties, wipaaEntries, equipmentSlots, truckLocations, drivers, pos, invoices, inspectionChecklists] = await Promise.all([
            db.wbsDictionary.where({ projectId }).toArray(),
            db.schedules.where({ projectId }).toArray(),
            db.resourceSchedules.where({ projectId }).toArray(),
            db.logistics.where({ projectId }).toArray(),
            db.digitalTwinTimeline.where({ projectId }).toArray(),
            db.verificationReports.where({ projectId }).toArray(),
            db.escrowMilestones.where({ projectId }).toArray(),
            db.escrowReleases.where({ projectId }).toArray(),
            db.variationPenalties.where({ projectId }).toArray(),
            db.wipaaEntries.where({ projectId }).toArray(),
            db.equipmentSlots.where({ projectId }).toArray(),
            db.truckLocations.where({ projectId }).toArray(),
            db.fleetDrivers.where({ projectId }).toArray(),
            db.purchaseOrdersP2.where({ projectId }).toArray(),
            db.invoicesP2.where({ projectId }).toArray(),
            db.inspectionChecklists.where({ projectId }).toArray(),
          ]);
          set((s) => {
            s.wbsDictionary = wbsDictionary;
            s.schedules = schedules;
            s.resourceSchedules = resourceSchedules;
            s.logistics = logistics;
            s.digitalTwinTimeline = digitalTwinTimeline;
            s.verificationReports = verificationReports;
            s.escrowMilestones = escrowMilestones;
            s.escrowReleases = escrowReleases;
            s.variationPenalties = variationPenalties;
            s.wipaaEntries = wipaaEntries;
            s.equipmentSlots = equipmentSlots;
            s.truckLocations = truckLocations;
            s.drivers = drivers;
            s.pos = pos;
            s.invoices = invoices;
            s.inspectionChecklists = inspectionChecklists;
            s.isLoading = false;
          });
        },

        saveSchedule: async (projectId, tasks) => {
          const result = buildCriticalPath(tasks);
          const schedule = result.schedule.map((s) => ({ ...s, projectId }));
          await db.schedules.bulkPut(schedule);
          set((s) => { s.schedules = schedule; });
          return schedule;
        },

        addLogistics: async (input) => {
          const projectId = get().currentProjectId;
          if (!projectId) return null;
          const record = createLogisticsRecord({ projectId, ...input });
          await db.logistics.put(record);
          set((s) => { s.logistics.push(record); });
          return record;
        },

        stepLogistics: async (id) => {
          const record = get().logistics.find((r) => r.id === id);
          if (!record) return;
          const next = advanceLogistics(record);
          await db.logistics.put(next);
          set((s) => {
            const idx = s.logistics.findIndex((r) => r.id === id);
            if (idx >= 0) s.logistics[idx] = next;
          });
        },

        addSnapshot: async (input) => {
          const projectId = get().currentProjectId;
          if (!projectId) return null;
          const entry = createTwinSnapshot({ projectId, ...input });
          if (!entry) return null;
          await db.digitalTwinTimeline.put(entry);
          set((s) => { s.digitalTwinTimeline.push(entry); });
          return entry;
        },

        addVerification: async (input) => {
          const projectId = get().currentProjectId;
          if (!projectId) return null;
          const report = createVerificationReport({ projectId, ...input });
          await db.verificationReports.put(report);
          set((s) => { s.verificationReports.push(report); });
          return report;
        },

        addEscrowMilestone: async (input) => {
          const projectId = get().currentProjectId;
          if (!projectId) return null;
          const milestone = createEscrowMilestone({ projectId, ...input });
          await db.escrowMilestones.put(milestone);
          set((s) => { s.escrowMilestones.push(milestone); });
          return milestone;
        },

        transitionEscrow: async (id, approval) => {
          const milestone = get().escrowMilestones.find((m) => m.id === id);
          if (!milestone) return { ok: false, reason: 'Milestone not found' };
          const verification = get().verificationReports.filter((v) => v.projectId === milestone.projectId).slice(-1)[0] ?? null;
          const result = transitionEscrowMilestone({ milestone, verification, approval });
          await db.escrowMilestones.put(result.milestone);
          set((s) => {
            const idx = s.escrowMilestones.findIndex((m) => m.id === id);
            if (idx >= 0) s.escrowMilestones[idx] = result.milestone;
          });
          return result;
        },

        addWipaaEntry: async (input) => {
          const projectId = get().currentProjectId;
          if (!projectId) return null;
          const entry = buildWipaaEntry({ projectId, ...input });
          await db.wipaaEntries.put(entry);
          set((s) => {
            const idx = s.wipaaEntries.findIndex((e) => e.monthKey === entry.monthKey);
            if (idx >= 0) s.wipaaEntries[idx] = entry;
            else s.wipaaEntries.push(entry);
          });
          return entry;
        },

        addEquipmentSlot: async (slot) => {
          await db.equipmentSlots.put(slot);
          set((s) => { s.equipmentSlots.push(slot); });
        },

        advanceTruck: async (truck) => {
          await db.truckLocations.put(truck);
          set((s) => {
            const idx = s.truckLocations.findIndex((t) => t.id === truck.id);
            if (idx >= 0) s.truckLocations[idx] = truck;
            else s.truckLocations.push(truck);
          });
        },

        addDriver: async (driver) => {
          await db.fleetDrivers.put(driver);
          set((s) => { s.drivers.push(driver); });
        },

        addPurchaseOrder: async (po) => {
          await db.purchaseOrdersP2.put(po);
          set((s) => { s.pos.push(po); });
        },

        addInvoice: async (invoice) => {
          await db.invoicesP2.put(invoice);
          set((s) => { s.invoices.push(invoice); });
        },

        transitionPo: async (id, status) => {
          const po = get().pos.find((p) => p.id === id);
          if (!po) return;
          const next = engineTransitionPo(po, status);
          await db.purchaseOrdersP2.put(next);
          set((s) => {
            const idx = s.pos.findIndex((p) => p.id === id);
            if (idx >= 0) s.pos[idx] = next;
          });
        },

        transitionInvoice: async (id, status) => {
          const inv = get().invoices.find((i) => i.id === id);
          if (!inv) return;
          const next = engineTransitionInvoice(inv, status);
          await db.invoicesP2.put(next);
          set((s) => {
            const idx = s.invoices.findIndex((i) => i.id === id);
            if (idx >= 0) s.invoices[idx] = next;
          });
        },

        addInspectionChecklist: async (cl) => {
          await db.inspectionChecklists.put(cl);
          set((s) => { s.inspectionChecklists.push(cl); });
        },

        updateInspectionChecklist: async (cl) => {
          await db.inspectionChecklists.put(cl);
          set((s) => {
            const idx = s.inspectionChecklists.findIndex((c) => c.id === cl.id);
            if (idx >= 0) s.inspectionChecklists[idx] = cl;
          });
        },
      }),
      {
        name: 'budget-engineer-site-hawk',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);