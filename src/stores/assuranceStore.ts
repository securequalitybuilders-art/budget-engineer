import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  ProjectIntake,
  FeasibilityAssessment,
  RiskGate,
  RiskRegisterEntry,
  SolvencyCheck,
} from '@/domain/assurance';

interface AssuranceState {
  intakes: ProjectIntake[];
  feasibilityAssessments: FeasibilityAssessment[];
  riskGates: RiskGate[];
  riskRegister: RiskRegisterEntry[];
  solvencyChecks: SolvencyCheck[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  setIntake: (intake: ProjectIntake) => Promise<void>;
  setFeasibility: (assessment: FeasibilityAssessment) => Promise<void>;
  setRiskGate: (gate: RiskGate) => Promise<void>;
  addRiskEntry: (entry: RiskRegisterEntry) => Promise<void>;
  updateRiskEntry: (id: string, partial: Partial<RiskRegisterEntry>) => Promise<void>;
  setSolvencyCheck: (check: SolvencyCheck) => Promise<void>;
}

export const useAssuranceStore = create<AssuranceState>()(
  immer(
    persist(
      (set) => ({
        intakes: [],
        feasibilityAssessments: [],
        riskGates: [],
        riskRegister: [],
        solvencyChecks: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [intakes, assessments, riskGates, riskRegister, solvencyChecks] = await Promise.all([
            db.projectIntakes.where({ projectId }).toArray(),
            db.feasibilityAssessments.where({ projectId }).toArray(),
            db.riskGates.where({ projectId }).toArray(),
            db.riskRegister.where({ projectId }).toArray(),
            db.solvencyChecks.where({ projectId }).toArray(),
          ]);
          set((s) => {
            s.intakes = intakes;
            s.feasibilityAssessments = assessments;
            s.riskGates = riskGates;
            s.riskRegister = riskRegister;
            s.solvencyChecks = solvencyChecks;
            s.isLoading = false;
          });
        },

        setIntake: async (intake) => {
          await db.projectIntakes.put(intake);
          set((s) => {
            const idx = s.intakes.findIndex((i) => i.id === intake.id);
            if (idx >= 0) s.intakes[idx] = intake;
            else s.intakes.push(intake);
          });
        },

        setFeasibility: async (assessment) => {
          await db.feasibilityAssessments.put(assessment);
          set((s) => {
            const idx = s.feasibilityAssessments.findIndex((a) => a.id === assessment.id);
            if (idx >= 0) s.feasibilityAssessments[idx] = assessment;
            else s.feasibilityAssessments.push(assessment);
          });
        },

        setRiskGate: async (gate) => {
          await db.riskGates.put(gate);
          set((s) => {
            const idx = s.riskGates.findIndex((g) => g.id === gate.id);
            if (idx >= 0) s.riskGates[idx] = gate;
            else s.riskGates.push(gate);
          });
        },

        addRiskEntry: async (entry) => {
          await db.riskRegister.add(entry);
          set((s) => { s.riskRegister.push(entry) });
        },

        updateRiskEntry: async (id, partial) => {
          await db.riskRegister.update(id, partial);
          set((s) => {
            const entry = s.riskRegister.find((e) => e.id === id);
            if (entry) Object.assign(entry, partial);
          });
        },

        setSolvencyCheck: async (check) => {
          await db.solvencyChecks.put(check);
          set((s) => {
            const idx = s.solvencyChecks.findIndex((c) => c.id === check.id);
            if (idx >= 0) s.solvencyChecks[idx] = check;
            else s.solvencyChecks.push(check);
          });
        },
      }),
      {
        name: 'budget-engineer-assurance',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
