import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db, seedRates } from '@/db/db';
import type { Project, Brief, Design, BOQ, ProjectTransaction } from '@/types';
import { uuid, clone } from '@/lib/utils';
import { parseBrief } from '@/ai/briefParser';
import { generateDesignOptions } from '@/ai/designEngine';
import { generateBOQ } from '@/ai/boqEngine';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  currentProject: Project | null;
  currentBrief: Brief | null;
  currentDesigns: Design[];
  currentBOQ: BOQ | null;
  transactions: ProjectTransaction[];
  isLoading: boolean;
  isHydrated: boolean;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateBrief: (projectId: string, brief: Partial<Brief['parsed']> & { rawText: string }) => Promise<void>;
  generateDesigns: (projectId: string) => Promise<void>;
  generateBOQ: (projectId: string, designId?: string) => Promise<void>;
  addTransaction: (transaction: Omit<ProjectTransaction, 'id' | 'createdAt'>) => Promise<void>;
  seed: () => Promise<void>;
}

interface CreateProjectInput {
  name: string;
  profile: Project['profile'];
  region: Project['region'];
  currency: Project['currency'];
}

const now = () => new Date().toISOString();

export const useProjectStore = create<ProjectState>()(
  immer(
    persist(
      (set, get) => ({
        projects: [],
        currentProjectId: null,
        currentProject: null,
        currentBrief: null,
        currentDesigns: [],
        currentBOQ: null,
        transactions: [],
        isLoading: false,
        isHydrated: false,

        seed: async () => {
          await seedRates();
        },

        loadProjects: async () => {
          set((s) => {
            s.isLoading = true;
          });
          const projects = await db.projects.toArray();
          projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          set((s) => {
            s.projects = projects;
            s.isLoading = false;
            s.isHydrated = true;
          });
        },

        loadProject: async (id) => {
          set((s) => {
            s.isLoading = true;
            s.currentProjectId = id;
          });
          const [project, brief, designs, boqs, transactions] = await Promise.all([
            db.projects.get(id),
            db.briefs.get(id),
            db.designs.where({ projectId: id }).toArray(),
            db.boqs.where({ projectId: id }).toArray(),
            db.transactions.where({ projectId: id }).toArray(),
          ]);

          const sortedTransactions = transactions.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          set((s) => {
            s.currentProject = project || null;
            s.currentBrief = brief || null;
            s.currentDesigns = designs || [];
            s.currentBOQ = boqs[0] || null;
            s.transactions = sortedTransactions;
            s.isLoading = false;
          });
        },

        createProject: async (input) => {
          const project: Project = {
            id: uuid(),
            slug: input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            name: input.name,
            ownerId: 'local-user',
            profile: input.profile,
            region: input.region,
            currency: input.currency,
            status: 'draft',
            createdAt: now(),
            updatedAt: now(),
            version: 1,
          };

          await db.projects.add(project);

          await get().addTransaction({
            projectId: project.id,
            actor: 'USER',
            action: 'CREATE',
            entityType: 'project',
            entityId: project.id,
            after: clone(project),
            reason: 'Project created by user',
          });

          set((s) => {
            s.projects.unshift(project);
            s.currentProjectId = project.id;
            s.currentProject = project;
            s.currentBrief = null;
            s.currentDesigns = [];
            s.currentBOQ = null;
            s.transactions = [];
          });

          return project;
        },

        updateBrief: async (projectId, briefInput) => {
          const existing = await db.briefs.get(projectId);
          const project = await db.projects.get(projectId);
          const before = existing ? clone(existing) : undefined;

          // rawText is top-level; everything else goes into parsed.
          const { rawText, ...parsedInput } = briefInput;

          const brief: Brief = {
            projectId,
            rawText,
            parsed: {
              buildingType: 'residential',
              floors: 1,
              location: 'zimbabwe',
              standards: ['ZBC 1996'],
              ...(existing?.parsed || {}),
              ...parsedInput,
            },
          };

          await db.briefs.put(brief);

          await db.projects.update(projectId, {
            status: 'concept',
            updatedAt: now(),
            version: (project?.version || 0) + 1,
          });

          await get().addTransaction({
            projectId,
            actor: 'USER',
            action: 'UPDATE',
            entityType: 'brief',
            entityId: projectId,
            before,
            after: clone(brief),
            reason: 'Brief updated by user',
          });

          // Refresh current project state
          await get().loadProject(projectId);
        },

        generateDesigns: async (projectId) => {
          const brief = await db.briefs.get(projectId);
          if (!brief) throw new Error('No brief found for project');

          const project = await db.projects.get(projectId);
          if (!project) throw new Error('Project not found');

          const parsed = parseBrief(brief.rawText, project.region);

          await get().addTransaction({
            projectId,
            actor: 'AI_AGENT',
            action: 'AI_GENERATE',
            entityType: 'brief',
            entityId: projectId,
            after: clone(parsed),
            reason: 'Brief parsed into structured design parameters',
          });

          const designs = generateDesignOptions(projectId, parsed);

          await db.designs.bulkAdd(designs);

          await db.projects.update(projectId, {
            status: 'design',
            updatedAt: now(),
            version: (project.version || 0) + 1,
          });

          await get().addTransaction({
            projectId,
            actor: 'AI_AGENT',
            action: 'CREATE',
            entityType: 'design',
            entityId: projectId,
            after: { count: designs.length, options: designs.map((d) => d.name) },
            reason: 'Generated 3 design options from brief',
          });

          await get().loadProject(projectId);
        },

        generateBOQ: async (projectId, designId) => {
          const project = await db.projects.get(projectId);
          if (!project) throw new Error('Project not found');

          const designs = await db.designs.where({ projectId }).toArray();
          const targetDesignId = designId || designs[0]?.id;
          if (!targetDesignId) throw new Error('No design found to cost');

          const boq = await generateBOQ(projectId, targetDesignId, project.region, 10);

          // Remove any existing BOQ for this design and store the new one
          await db.boqs.where({ designId: targetDesignId }).delete();
          await db.boqs.add(boq);

          await db.projects.update(projectId, {
            status: 'costing',
            updatedAt: now(),
            version: (project.version || 0) + 1,
          });

          await get().addTransaction({
            projectId,
            actor: 'AI_AGENT',
            action: 'CREATE',
            entityType: 'boq',
            entityId: boq.id,
            after: clone(boq),
            reason: 'Generated BOQ from design elements',
          });

          await get().loadProject(projectId);
        },

        addTransaction: async (transaction) => {
          const tx: ProjectTransaction = {
            ...transaction,
            id: uuid(),
            createdAt: now(),
          };
          await db.transactions.add(tx);
          set((s) => {
            s.transactions.unshift(tx);
          });
        },
      }),
      {
        name: 'budget-engineer-ui',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
        onRehydrateStorage: () => (state) => {
          if (state) state.isHydrated = true;
        },
      }
    )
  )
);
