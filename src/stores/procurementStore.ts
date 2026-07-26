import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  ProcurementRequest,
  SupplierQuote,
  PurchaseOrder,
  DeliveryRecord,
} from '@/domain/procurement';

interface ProcurementState {
  requests: ProcurementRequest[];
  quotes: SupplierQuote[];
  purchaseOrders: PurchaseOrder[];
  deliveryRecords: DeliveryRecord[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  addRequest: (req: ProcurementRequest) => Promise<void>;
  updateRequest: (id: string, partial: Partial<ProcurementRequest>) => Promise<void>;
  addQuote: (quote: SupplierQuote) => Promise<void>;
  setPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  addDeliveryRecord: (record: DeliveryRecord) => Promise<void>;
}

export const useProcurementStore = create<ProcurementState>()(
  immer(
    persist(
      (set) => ({
        requests: [],
        quotes: [],
        purchaseOrders: [],
        deliveryRecords: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [requests, allQuotes, purchaseOrders, allRecords] = await Promise.all([
            db.procurementRequests.where({ projectId }).toArray(),
            db.supplierQuotes.toArray(),
            db.purchaseOrders.where({ projectId }).toArray(),
            db.deliveryRecords.toArray(),
          ]);
          const reqIds = new Set(requests.map((r) => r.id));
          const poIds = new Set(purchaseOrders.map((po) => po.id));
          const quotes = allQuotes.filter((q) => reqIds.has(q.procurementRequestId));
          const deliveryRecords = allRecords.filter((d) => poIds.has(d.purchaseOrderId));
          set((s) => {
            s.requests = requests;
            s.quotes = quotes;
            s.purchaseOrders = purchaseOrders;
            s.deliveryRecords = deliveryRecords;
            s.isLoading = false;
          });
        },

        addRequest: async (req) => {
          await db.procurementRequests.add(req);
          set((s) => { s.requests.push(req) });
        },

        updateRequest: async (id, partial) => {
          await db.procurementRequests.update(id, partial);
          set((s) => {
            const req = s.requests.find((r) => r.id === id);
            if (req) Object.assign(req, partial);
          });
        },

        addQuote: async (quote) => {
          await db.supplierQuotes.add(quote);
          set((s) => { s.quotes.push(quote) });
        },

        setPurchaseOrder: async (po) => {
          await db.purchaseOrders.put(po);
          set((s) => {
            const idx = s.purchaseOrders.findIndex((p) => p.id === po.id);
            if (idx >= 0) s.purchaseOrders[idx] = po;
            else s.purchaseOrders.push(po);
          });
        },

        addDeliveryRecord: async (record) => {
          await db.deliveryRecords.add(record);
          set((s) => { s.deliveryRecords.push(record) });
        },
      }),
      {
        name: 'budget-engineer-procurement',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
