import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type { MarketRateLike } from '@/engine/ecosystem/priceIndex';
import {
  buildMarketIndexSnapshot,
  indexRefreshDue,
  sortSnapshotsDesc,
  type MarketIndexSnapshot,
} from '@/engine/ecosystem/marketIndexScheduler';

export type IndexRefreshResult =
  | { ran: true; snapshot: MarketIndexSnapshot }
  | { ran: false; reason: 'fresh' | 'no-rates' | 'error' };

export interface MarketIndexRefreshOptions {
  now?: Date;
  rates?: MarketRateLike[];
}

interface MarketIndexState {
  snapshot: MarketIndexSnapshot | null;
  history: MarketIndexSnapshot[];
  isLoading: boolean;

  load: () => Promise<void>;
  autoRefresh: (options?: MarketIndexRefreshOptions) => Promise<IndexRefreshResult>;
  runNow: (options?: MarketIndexRefreshOptions) => Promise<MarketIndexSnapshot | null>;
}

async function loadRates(rates?: MarketRateLike[]): Promise<MarketRateLike[]> {
  if (rates) return rates;
  return db.rates.toArray();
}

async function computeAndPersist(
  options: MarketIndexRefreshOptions,
  source: 'auto' | 'manual'
): Promise<MarketIndexSnapshot> {
  const rates = await loadRates(options.rates);
  const snapshot = buildMarketIndexSnapshot(rates, {
    now: options.now,
    source,
  });
  await db.marketIndexSnapshots.put(snapshot);
  return snapshot;
}

function upsertHistory(history: MarketIndexSnapshot[], snapshot: MarketIndexSnapshot): MarketIndexSnapshot[] {
  const idx = history.findIndex((s) => s.id === snapshot.id);
  const next = idx >= 0 ? [...history.slice(0, idx), snapshot, ...history.slice(idx + 1)] : [...history, snapshot];
  return sortSnapshotsDesc(next);
}

export const useMarketIndexStore = create<MarketIndexState>()(
  immer((set) => ({
    snapshot: null,
    history: [],
    isLoading: false,

    load: async () => {
      set((s) => { s.isLoading = true });
      const snapshots = sortSnapshotsDesc(await db.marketIndexSnapshots.toArray());
      set((s) => {
        s.snapshot = snapshots[0] ?? null;
        s.history = snapshots;
        s.isLoading = false;
      });
    },

    autoRefresh: async (options = {}) => {
      try {
        const all = sortSnapshotsDesc(await db.marketIndexSnapshots.toArray());
        const latest = all[0] ?? null;
        if (!indexRefreshDue(latest, options.now ?? new Date())) {
          set((s) => {
            s.snapshot = latest;
            s.history = all;
          });
          return { ran: false, reason: 'fresh' };
        }
        const rates = await loadRates(options.rates);
        if (rates.length === 0) {
          set((s) => {
            s.snapshot = latest;
            s.history = all;
          });
          return { ran: false, reason: 'no-rates' };
        }
        const snapshot = await computeAndPersist(options, 'auto');
        set((s) => {
          s.snapshot = snapshot;
          s.history = upsertHistory(s.history, snapshot);
        });
        return { ran: true, snapshot };
      } catch {
        return { ran: false, reason: 'error' };
      }
    },

    runNow: async (options = {}) => {
      const rates = await loadRates(options.rates);
      if (rates.length === 0) return null;
      const snapshot = await computeAndPersist(options, 'manual');
      set((s) => {
        s.snapshot = snapshot;
        s.history = upsertHistory(s.history, snapshot);
      });
      return snapshot;
    },
  }))
);
