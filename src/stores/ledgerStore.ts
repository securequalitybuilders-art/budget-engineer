import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type { LedgerEntry, LedgerSummary } from '@/domain/ledger';
import type { ChangeImpactResult } from '@/engine/change/changeLensEngine';
import {
  codePurchaseOrderLines,
  summarizeLedger,
} from '@/engine/ledger/trueLedger';

interface LedgerState {
  entries: LedgerEntry[];
  analyses: ChangeImpactResult[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  addEntry: (entry: LedgerEntry) => Promise<void>;
  addEntries: (entries: LedgerEntry[]) => Promise<void>;
  codePurchaseOrder: (poId: string) => Promise<LedgerEntry[]>;
  setAnalysis: (analysis: ChangeImpactResult) => Promise<void>;
  summary: () => LedgerSummary;
}

export const useLedgerStore = create<LedgerState>()(
  immer(
    persist(
      (set, get) => ({
        entries: [],
        analyses: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [entries, analyses] = await Promise.all([
            db.ledgerEntries.where({ projectId }).toArray(),
            db.changeLensAnalyses.toArray(),
          ]);
          set((s) => {
            s.entries = entries;
            s.analyses = analyses;
            s.isLoading = false;
          });
        },

        addEntry: async (entry) => {
          await db.ledgerEntries.add(entry);
          set((s) => { s.entries.push(entry) });
        },

        addEntries: async (entries) => {
          if (entries.length === 0) return;
          await db.ledgerEntries.bulkAdd(entries);
          set((s) => { s.entries.push(...entries) });
        },

        codePurchaseOrder: async (poId) => {
          const po = await db.purchaseOrders.get(poId);
          if (!po) return [];
          const entries = codePurchaseOrderLines(po);
          if (entries.length > 0) {
            await db.ledgerEntries.bulkAdd(entries);
            set((s) => { s.entries.push(...entries) });
          }
          return entries;
        },

        setAnalysis: async (analysis) => {
          await db.changeLensAnalyses.put(analysis);
          set((s) => {
            const idx = s.analyses.findIndex((a) => a.changeOrderNumber === analysis.changeOrderNumber);
            if (idx >= 0) s.analyses[idx] = analysis;
            else s.analyses.push(analysis);
          });
        },

        summary: () => summarizeLedger(get().entries),
      }),
      {
        name: 'budget-engineer-ledger',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
