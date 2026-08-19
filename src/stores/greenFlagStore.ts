import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  ResourceRecord,
  TeamAssignment,
  ContractorScorecard,
  SupplierScorecard,
  ForwardCommitment,
  CostBaseline,
  BoqItem,
  ContractorCandidate,
} from '@/domain/greenflag';
import { buildResourceHub } from '@/engine/greenflag/resourceHub';
import { bestFitContractor, generateContract } from '@/engine/greenflag/teamAssembly';
import { buildContractorScorecard, buildSupplierScorecard, certifyEntity } from '@/engine/greenflag/certification';
import { createForwardCommitment, commitmentTotals } from '@/engine/greenflag/bulkProcurement';
import { lockCostBaseline, tagBoqWithWbs } from '@/engine/greenflag/costClarification';
import type { BoqResult } from '@/adapters/designToBoq';

interface GreenFlagState {
  resources: ResourceRecord[];
  teamAssignments: TeamAssignment[];
  contractorScorecards: ContractorScorecard[];
  supplierScorecards: SupplierScorecard[];
  forwardCommitments: ForwardCommitment[];
  costBaselines: CostBaseline[];
  boqItems: BoqItem[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  buildHub: (projectId: string, boq: BoqResult | null) => Promise<void>;
  assignTeam: (
    projectId: string,
    input: { path: 'alone' | 'together' | 'for-them'; ownerName: string; projectName: string; contractor: ContractorCandidate | null; totalCents: number },
  ) => Promise<TeamAssignment | null>;
  bestFit: (candidates: ContractorCandidate[], specialization: string, availableFrom: string) => ReturnType<typeof bestFitContractor>;
  certifyContractor: (input: Parameters<typeof certifyEntity>[0]) => Promise<ContractorScorecard | null>;
  certifySupplier: (input: Parameters<typeof certifyEntity>[0]) => Promise<SupplierScorecard | null>;
  addCommitment: (input: { material: string; quantity: number; unit: string; priceCents: number; supplierId: string; commitmentDate: string }) => Promise<ForwardCommitment | null>;
  lockBaseline: (projectId: string, contingencyCents: number) => Promise<CostBaseline | null>;
  seedBoqItems: (projectId: string, items: BoqItem[]) => Promise<void>;
}

export const useGreenFlagStore = create<GreenFlagState>()(
  immer(
    persist(
      (set, get) => ({
        resources: [],
        teamAssignments: [],
        contractorScorecards: [],
        supplierScorecards: [],
        forwardCommitments: [],
        costBaselines: [],
        boqItems: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId; });
          const [resources, teamAssignments, contractorScorecards, supplierScorecards, forwardCommitments, costBaselines, boqItems] = await Promise.all([
            db.resources.where({ projectId }).toArray(),
            db.teamAssignments.where({ projectId }).toArray(),
            db.contractorScorecards.where({ projectId }).toArray(),
            db.supplierScorecards.where({ projectId }).toArray(),
            db.forwardCommitments.where({ projectId }).toArray(),
            db.costBaselines.where({ projectId }).toArray(),
            db.boqItems.where({ projectId }).toArray(),
          ]);
          set((s) => {
            s.resources = resources;
            s.teamAssignments = teamAssignments;
            s.contractorScorecards = contractorScorecards;
            s.supplierScorecards = supplierScorecards;
            s.forwardCommitments = forwardCommitments;
            s.costBaselines = costBaselines;
            s.boqItems = boqItems;
            s.isLoading = false;
          });
        },

        buildHub: async (projectId, boq) => {
          const rates = await db.rates.toArray();
          const result = buildResourceHub(boq, rates, { projectId });
          await db.resources.bulkPut(result.resources);
          set((s) => { s.resources = result.resources; });
        },

        assignTeam: async (projectId, input) => {
          if (!get().currentProjectId && !projectId) return null;
          const assignment = generateContract({
            projectId,
            path: input.path,
            ownerName: input.ownerName,
            projectName: input.projectName,
            contractor: input.contractor,
            totalCents: input.totalCents,
          }).assignment;
          await db.teamAssignments.put(assignment);
          set((s) => {
            const idx = s.teamAssignments.findIndex((t) => t.contractRef === assignment.contractRef);
            if (idx >= 0) s.teamAssignments[idx] = assignment;
            else s.teamAssignments.push(assignment);
          });
          return assignment;
        },

        bestFit: (candidates, specialization, availableFrom) =>
          bestFitContractor(candidates, { specialization, availableFrom }),

        certifyContractor: async (input) => {
          const card = buildContractorScorecard(input);
          await db.contractorScorecards.put(card);
          set((s) => {
            const idx = s.contractorScorecards.findIndex((c) => c.contractorId === card.contractorId);
            if (idx >= 0) s.contractorScorecards[idx] = card;
            else s.contractorScorecards.push(card);
          });
          return card;
        },

        certifySupplier: async (input) => {
          const card = buildSupplierScorecard(input);
          await db.supplierScorecards.put(card);
          set((s) => {
            const idx = s.supplierScorecards.findIndex((c) => c.supplierId === card.supplierId);
            if (idx >= 0) s.supplierScorecards[idx] = card;
            else s.supplierScorecards.push(card);
          });
          return card;
        },

        addCommitment: async (input) => {
          const projectId = get().currentProjectId;
          if (!projectId) return null;
          const commitment = createForwardCommitment({ projectId, ...input });
          await db.forwardCommitments.put(commitment);
          set((s) => { s.forwardCommitments.push(commitment); });
          return commitment;
        },

        lockBaseline: async (projectId, contingencyCents) => {
          const items = get().boqItems.filter((i) => i.projectId === projectId);
          if (items.length === 0) return null;
          const baseline = lockCostBaseline({ projectId, lines: items, contingencyCents });
          await db.costBaselines.put(baseline);
          set((s) => {
            const idx = s.costBaselines.findIndex((b) => b.projectId === projectId);
            if (idx >= 0) s.costBaselines[idx] = baseline;
            else s.costBaselines.push(baseline);
          });
          return baseline;
        },

        seedBoqItems: async (projectId, items) => {
          const tagged = tagBoqWithWbs(items.map((item) => ({ ...item, projectId })));
          await db.boqItems.bulkPut(tagged);
          set((s) => { s.boqItems = tagged; });
        },
      }),
      {
        name: 'budget-engineer-green-flag',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);

export { commitmentTotals };