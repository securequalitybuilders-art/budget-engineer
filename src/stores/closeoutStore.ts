import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  ScheduleOfValues,
  FinalAccountResult,
  LienWaiver,
  GainFadeResult,
  HistoricalCostRecord,
  LessonLearned,
} from '@/domain/closeout';
import type { PlanValidation } from '@/domain/architect';

interface CloseoutState {
  sovs: ScheduleOfValues[];
  finalAccounts: FinalAccountResult[];
  lienWaivers: LienWaiver[];
  gainFades: GainFadeResult[];
  historicalCosts: HistoricalCostRecord[];
  lessons: LessonLearned[];
  planValidations: PlanValidation[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  setScheduleOfValues: (sov: ScheduleOfValues) => Promise<void>;
  setFinalAccount: (account: FinalAccountResult) => Promise<void>;
  setLienWaiver: (waiver: LienWaiver) => Promise<void>;
  setGainFade: (result: GainFadeResult) => Promise<void>;
  addHistoricalCost: (record: HistoricalCostRecord) => Promise<void>;
  addLesson: (lesson: LessonLearned) => Promise<void>;
  setPlanValidation: (validation: PlanValidation) => Promise<void>;
}

export const useCloseoutStore = create<CloseoutState>()(
  immer(
    persist(
      (set) => ({
        sovs: [],
        finalAccounts: [],
        lienWaivers: [],
        gainFades: [],
        historicalCosts: [],
        lessons: [],
        planValidations: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [sovs, accounts, waivers, gainFades, costs, lessons, validations] = await Promise.all([
            db.sovs.where({ projectId }).toArray(),
            db.finalAccounts.where({ projectId }).toArray(),
            db.lienWaivers.where({ projectId }).toArray(),
            db.gainFades.where({ projectId }).toArray(),
            db.historicalCosts.where({ projectId }).toArray(),
            db.lessons.where({ projectId }).toArray(),
            db.planValidations.toArray(),
          ]);
          set((s) => {
            s.sovs = sovs;
            s.finalAccounts = accounts;
            s.lienWaivers = waivers;
            s.gainFades = gainFades;
            s.historicalCosts = costs;
            s.lessons = lessons;
            s.planValidations = validations;
            s.isLoading = false;
          });
        },

        setScheduleOfValues: async (sov) => {
          await db.sovs.put(sov);
          set((s) => {
            const idx = s.sovs.findIndex((x) => x.id === sov.id);
            if (idx >= 0) s.sovs[idx] = sov;
            else s.sovs.push(sov);
          });
        },

        setFinalAccount: async (account) => {
          await db.finalAccounts.put(account);
          set((s) => {
            const idx = s.finalAccounts.findIndex((x) => x.projectId === account.projectId);
            if (idx >= 0) s.finalAccounts[idx] = account;
            else s.finalAccounts.push(account);
          });
        },

        setLienWaiver: async (waiver) => {
          await db.lienWaivers.put(waiver);
          set((s) => {
            const idx = s.lienWaivers.findIndex((x) => x.id === waiver.id);
            if (idx >= 0) s.lienWaivers[idx] = waiver;
            else s.lienWaivers.push(waiver);
          });
        },

        setGainFade: async (result) => {
          await db.gainFades.put(result);
          set((s) => {
            const idx = s.gainFades.findIndex((x) => x.id === result.id);
            if (idx >= 0) s.gainFades[idx] = result;
            else s.gainFades.push(result);
          });
        },

        addHistoricalCost: async (record) => {
          await db.historicalCosts.put(record);
          set((s) => { s.historicalCosts.push(record) });
        },

        addLesson: async (lesson) => {
          await db.lessons.put(lesson);
          set((s) => { s.lessons.push(lesson) });
        },

        setPlanValidation: async (validation) => {
          await db.planValidations.put(validation);
          set((s) => {
            const idx = s.planValidations.findIndex((x) => x.planId === validation.planId);
            if (idx >= 0) s.planValidations[idx] = validation;
            else s.planValidations.push(validation);
          });
        },
      }),
      {
        name: 'budget-engineer-closeout',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
