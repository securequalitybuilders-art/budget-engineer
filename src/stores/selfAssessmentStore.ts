import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AssessedProjectSnapshot, SelfAssessmentResult } from '@/lib/selfAssessment/selfAssessmentModel';
import { runSelfAssessment } from '@/lib/selfAssessment/selfAssessmentEngine';
import { checkStaleness, compareAssessments } from '@/lib/selfAssessment/assessmentComparison';
import type { StaleCheckResult, AssessmentComparisonResult } from '@/lib/selfAssessment/assessmentComparison';

export interface StoredAssessment {
  id: string;
  snapshot: AssessedProjectSnapshot;
  result: SelfAssessmentResult;
  createdAt: string;
  linkedSessionId: string | null;
  name: string;
  _order: number;
}

function generateAssessmentId(): string {
  return `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveName(snapshot: AssessedProjectSnapshot): string {
  const name = snapshot.projectName || 'Unnamed Project';
  const date = new Date().toLocaleDateString('en-GB');
  return `${name} — ${date}`;
}

export interface SelfAssessmentStoreState {
  assessments: Record<string, StoredAssessment>;
  activeAssessmentId: string | null;

  runAssessment: (snapshot: AssessedProjectSnapshot, linkedSessionId?: string | null) => string;
  deleteAssessment: (id: string) => void;
  setActiveAssessment: (id: string | null) => void;
  linkToSession: (assessmentId: string, sessionId: string) => void;

  getActiveAssessment: () => StoredAssessment | null;
  getLatestAssessment: () => StoredAssessment | null;
  getAllAssessments: () => StoredAssessment[];
  getAssessmentsForSession: (sessionId: string) => StoredAssessment[];
  clearAssessments: () => void;

  checkStaleness: (assessmentId: string, current: Partial<AssessedProjectSnapshot>) => StaleCheckResult;
  compare: (beforeId: string, afterId: string) => AssessmentComparisonResult | null;
}

export const useSelfAssessmentStore = create<SelfAssessmentStoreState>()(
  immer(
    persist(
      (set, get) => {
        let _nextOrder = Date.now();

        return {
        assessments: {},
        activeAssessmentId: null,

        runAssessment: (snapshot, linkedSessionId = null) => {
          const id = generateAssessmentId();
          const result = runSelfAssessment(snapshot);
          const name = deriveName(snapshot);
          const order = ++_nextOrder;
          set((state) => {
            state.assessments[id] = {
              id,
              snapshot,
              result,
              createdAt: new Date().toISOString(),
              linkedSessionId,
              name,
              _order: order,
            };
            state.activeAssessmentId = id;
          });
          return id;
        },

        deleteAssessment: (id) => set((state) => {
          delete state.assessments[id];
          if (state.activeAssessmentId === id) {
            const remaining = Object.keys(state.assessments);
            state.activeAssessmentId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
          }
        }),

        setActiveAssessment: (id) => set((state) => {
          state.activeAssessmentId = id;
        }),

        linkToSession: (assessmentId, sessionId) => set((state) => {
          if (state.assessments[assessmentId]) {
            state.assessments[assessmentId].linkedSessionId = sessionId;
          }
        }),

        getActiveAssessment: () => {
          const state = get();
          if (!state.activeAssessmentId) return null;
          return state.assessments[state.activeAssessmentId] ?? null;
        },

        getLatestAssessment: () => {
          const all = Object.values(get().assessments);
          if (all.length === 0) return null;
          return all.reduce((latest, a) =>
            a._order > latest._order ? a : latest
          );
        },

        getAllAssessments: () => {
          return Object.values(get().assessments).sort((a, b) => b._order - a._order);
        },

        getAssessmentsForSession: (sessionId) => {
          return Object.values(get().assessments).filter(
            a => a.linkedSessionId === sessionId
          ).sort((a, b) => b._order - a._order);
        },

        clearAssessments: () => set((state) => {
          state.assessments = {};
          state.activeAssessmentId = null;
        }),

        checkStaleness: (assessmentId, current) => {
          const a = get().assessments[assessmentId];
          if (!a) return { isStale: false, changedFields: [], recommendation: 'Assessment not found.' };
          return checkStaleness(a.snapshot, current);
        },

        compare: (beforeId, afterId) => {
          const before = get().assessments[beforeId];
          const after = get().assessments[afterId];
          if (!before || !after) return null;
          return compareAssessments(before, after);
        },
      };
      },
      {
        name: 'budget-engineer-self-assessment',
      }
    )
  )
);
