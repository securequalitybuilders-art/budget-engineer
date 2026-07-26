import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PilotObservation, PilotSession } from '@/lib/pilot/pilotFeedbackModel';
import { generateId } from '@/lib/pilot/pilotFeedbackModel';
import { sortBySeverity } from '@/lib/pilot/pilotIssueClassification';

export interface PilotFeedbackState {
  sessions: Record<string, PilotSession>;
  observations: Record<string, PilotObservation>;
  activeSessionId: string | null;

  createSession: (session: Omit<PilotSession, 'id'>) => string;
  updateSession: (id: string, updates: Partial<PilotSession>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;

  addObservation: (obs: Omit<PilotObservation, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateObservation: (id: string, updates: Partial<PilotObservation>) => void;
  deleteObservation: (id: string) => void;

  getSessionObservations: (sessionId: string) => PilotObservation[];
  getAllSessions: () => PilotSession[];
  getAllObservations: () => PilotObservation[];
  getActiveObservations: () => PilotObservation[];
  getActiveSession: () => PilotSession | null;
  getSortedObservations: (sessionId: string) => PilotObservation[];
}

export const usePilotFeedbackStore = create<PilotFeedbackState>()(
  immer(
    persist(
      (set, get) => ({
        sessions: {},
        observations: {},
        activeSessionId: null,

        createSession: (sessionData) => {
          const id = generateId();
          set((state) => {
            state.sessions[id] = { ...sessionData, id };
            if (!state.activeSessionId) {
              state.activeSessionId = id;
            }
          });
          return id;
        },

        updateSession: (id, updates) => set((state) => {
          if (state.sessions[id]) {
            Object.assign(state.sessions[id], updates);
          }
        }),

        deleteSession: (id) => set((state) => {
          delete state.sessions[id];
          for (const key of Object.keys(state.observations)) {
            if (state.observations[key].sessionId === id) {
              delete state.observations[key];
            }
          }
          if (state.activeSessionId === id) {
            const remaining = Object.keys(state.sessions);
            state.activeSessionId = remaining.length > 0 ? remaining[0] : null;
          }
        }),

        setActiveSession: (id) => set((state) => {
          state.activeSessionId = id;
        }),

        addObservation: (obsData) => {
          const id = generateId();
          const now = new Date().toISOString();
          set((state) => {
            state.observations[id] = { ...obsData, id, createdAt: now, updatedAt: now };
          });
          return id;
        },

        updateObservation: (id, updates) => set((state) => {
          if (state.observations[id]) {
            Object.assign(state.observations[id], updates, { updatedAt: new Date().toISOString() });
          }
        }),

        deleteObservation: (id) => set((state) => {
          delete state.observations[id];
        }),

        getSessionObservations: (sessionId: string) => {
          return Object.values(get().observations).filter(o => o.sessionId === sessionId);
        },

        getAllSessions: () => {
          return Object.values(get().sessions);
        },

        getAllObservations: () => {
          return Object.values(get().observations);
        },

        getActiveObservations: () => {
          const state = get();
          if (!state.activeSessionId) return [];
          return Object.values(state.observations).filter(
            o => o.sessionId === state.activeSessionId
          );
        },

        getActiveSession: () => {
          const state = get();
          if (!state.activeSessionId) return null;
          return state.sessions[state.activeSessionId] ?? null;
        },

        getSortedObservations: (sessionId: string) => {
          return sortBySeverity(
            Object.values(get().observations).filter(o => o.sessionId === sessionId)
          );
        },
      }),
      {
        name: 'budget-engineer-pilot-feedback',
      }
    )
  )
);
