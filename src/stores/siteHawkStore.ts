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
} from '@/domain/sitehawk';
import { buildCriticalPath } from '@/engine/sitehawk/criticalPath';
import { createLogisticsRecord, advanceLogistics } from '@/engine/sitehawk/resourceScheduling';
import { createTwinSnapshot, createVerificationReport } from '@/engine/sitehawk/digitalTwin';
import { createEscrowMilestone, transitionEscrowMilestone } from '@/engine/sitehawk/escrowTrigger';
import { buildWipaaEntry } from '@/engine/sitehawk/wipaaMonitor';

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
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId; });
          const [wbsDictionary, schedules, resourceSchedules, logistics, digitalTwinTimeline, verificationReports, escrowMilestones, escrowReleases, variationPenalties, wipaaEntries] = await Promise.all([
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
      }),
      {
        name: 'budget-engineer-site-hawk',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);