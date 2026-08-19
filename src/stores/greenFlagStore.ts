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
  GhostMaterial,
  CashFlowForecast,
  MustHaveItem,
  CostAtGlance,
} from '@/domain/greenflag';
import { buildResourceHub } from '@/engine/greenflag/resourceHub';
import { bestFitContractor, generateContract } from '@/engine/greenflag/teamAssembly';
import { buildContractorScorecard, buildSupplierScorecard, certifyEntity } from '@/engine/greenflag/certification';
import { createForwardCommitment, commitmentTotals } from '@/engine/greenflag/bulkProcurement';
import {
  lockCostBaseline,
  tagBoqWithWbs,
  detectGhostMaterials,
  cashFlowForecast,
  mustHavesTracker,
  buildCostAtGlance,
} from '@/engine/greenflag/costClarification';
import type { BoqResult } from '@/adapters/designToBoq';

interface GreenFlagState {
  resources: ResourceRecord[];
  teamAssignments: TeamAssignment[];
  contractorScorecards: ContractorScorecard[];
  supplierScorecards: SupplierScorecard[];
  forwardCommitments: ForwardCommitment[];
  costBaselines: CostBaseline[];
  boqItems: BoqItem[];
  ghostMaterials: GhostMaterial[];
  cashFlow: CashFlowForecast | null;
  mustHaves: MustHaveItem[];
  costAtGlance: CostAtGlance | null;
  contingencyPct: number;
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
  lockBaseline: (projectId: string, contingencyPct: number) => Promise<CostBaseline | null>;
  seedBoqItems: (projectId: string, items: BoqItem[]) => Promise<void>;
  detectGhosts: (projectId: string, deliveries: Array<{ description: string; quantityDelivered: number; unit: string }>) => void;
  setContingencyPct: (pct: number) => void;
  computeCashFlow: () => void;
  computeCostAtGlance: () => void;
  updateMustHaves: (items: Array<{ name: string; category: string; budgetAllowanceCents: number; actualCostCents: number }>) => void;
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
        ghostMaterials: [],
        cashFlow: null,
        mustHaves: [],
        costAtGlance: null,
        contingencyPct: 9,
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
          const baseline = costBaselines[0] ?? null;
          let ghostMaterials: GhostMaterial[] = [];
          let cashFlow: CashFlowForecast | null = null;
          let costAtGlance: CostAtGlance | null = null;
          if (baseline) {
            ghostMaterials = detectGhostMaterials(boqItems, []);
            cashFlow = cashFlowForecast({ projectId, baseline });
            costAtGlance = buildCostAtGlance({
              projectId,
              baseline,
              ghostMaterialCostCents: ghostMaterials.reduce((s, g) => s + g.ghostCostCents, 0),
              redPenLeakageCents: 0,
              valueEngineeringSavingsCents: 0,
            });
          }
          set((s) => {
            s.resources = resources;
            s.teamAssignments = teamAssignments;
            s.contractorScorecards = contractorScorecards;
            s.supplierScorecards = supplierScorecards;
            s.forwardCommitments = forwardCommitments;
            s.costBaselines = costBaselines;
            s.boqItems = boqItems;
            s.ghostMaterials = ghostMaterials;
            s.cashFlow = cashFlow;
            s.costAtGlance = costAtGlance;
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

        lockBaseline: async (projectId, contingencyPct) => {
          const items = get().boqItems.filter((i) => i.projectId === projectId);
          if (items.length === 0) return null;
          const contingencyCents = Math.round(items.reduce((s, l) => s + l.totalCents, 0) * (contingencyPct / 100));
          const baseline = lockCostBaseline({ projectId, lines: items, contingencyCents });
          await db.costBaselines.put(baseline);
          const ghostMaterials = detectGhostMaterials(items, []);
          const cashFlow = cashFlowForecast({ projectId, baseline });
          const costAtGlance = buildCostAtGlance({
            projectId,
            baseline,
            ghostMaterialCostCents: ghostMaterials.reduce((s, g) => s + g.ghostCostCents, 0),
            redPenLeakageCents: 0,
            valueEngineeringSavingsCents: 0,
          });
          set((s) => {
            const idx = s.costBaselines.findIndex((b) => b.projectId === projectId);
            if (idx >= 0) s.costBaselines[idx] = baseline;
            else s.costBaselines.push(baseline);
            s.ghostMaterials = ghostMaterials;
            s.cashFlow = cashFlow;
            s.costAtGlance = costAtGlance;
          });
          return baseline;
        },

        seedBoqItems: async (projectId, items) => {
          const tagged = tagBoqWithWbs(items.map((item) => ({ ...item, projectId })));
          await db.boqItems.bulkPut(tagged);
          set((s) => { s.boqItems = tagged; });
        },

        detectGhosts: (projectId, deliveries) => {
          const items = get().boqItems.filter((i) => i.projectId === projectId);
          const ghosts = detectGhostMaterials(items, deliveries);
          set((s) => { s.ghostMaterials = ghosts; });
        },

        setContingencyPct: (pct) => {
          set((s) => { s.contingencyPct = pct; });
        },

        computeCashFlow: () => {
          const baseline = get().costBaselines[0];
          const projectId = get().currentProjectId;
          if (!baseline || !projectId) return;
          const cf = cashFlowForecast({ projectId, baseline });
          set((s) => { s.cashFlow = cf; });
        },

        computeCostAtGlance: () => {
          const baseline = get().costBaselines[0];
          const projectId = get().currentProjectId;
          if (!baseline || !projectId) return;
          const ghosts = get().ghostMaterials;
          const lag = buildCostAtGlance({
            projectId,
            baseline,
            ghostMaterialCostCents: ghosts.reduce((s, g) => s + g.ghostCostCents, 0),
            redPenLeakageCents: 0,
            valueEngineeringSavingsCents: 0,
          });
          set((s) => { s.costAtGlance = lag; });
        },

        updateMustHaves: (items) => {
          const projectId = get().currentProjectId;
          if (!projectId) return;
          const mh = mustHavesTracker(items, projectId);
          set((s) => { s.mustHaves = mh; });
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