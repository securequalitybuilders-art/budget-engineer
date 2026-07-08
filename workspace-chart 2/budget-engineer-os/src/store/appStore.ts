import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { generateBOQ } from '../engine/boqEngine'
import type { BOQ, DesignOption } from '../domain/boq'
import type { PlanModel } from '../domain/plan'
import type { CadDocument } from '../domain/cad'
import { generatePlanModel } from '../engine/planGenerator'
import { deriveElementsFromPlan } from '../lib/quantityFromPlan'
import { exportPlanToMakerJson } from '../lib/makerExport'

export type CurrencyCode = 'USD' | 'ZAR' | 'BWP'

export interface ProjectBrief {
  profile: string
  region: string
  currency: CurrencyCode
  briefText: string
  budgetText?: string
}

export interface ProjectRecord {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  brief: ProjectBrief
}

export interface TransactionEvent {
  id: string
  projectId: string
  actor: 'USER' | 'AI_AGENT' | 'SYSTEM'
  action: string
  entityType: 'PROJECT' | 'BRIEF' | 'DESIGN' | 'BOQ' | 'CAD'
  entityId: string
  timestamp: string
  before?: unknown
  after?: unknown
  meta?: Record<string, unknown>
}

interface AppState {
  projects: ProjectRecord[]
  designsByProject: Record<string, DesignOption[]>
  boqsByProject: Record<string, BOQ[]>
  plansByProjectDesign: Record<string, PlanModel>
  cadDocsByProjectDesign: Record<string, CadDocument>
  selectedProjectId: string | null
  selectedDesignIdByProject: Record<string, string>
  selectedBoqIdByProject: Record<string, string>
  transactions: TransactionEvent[]
  createProject: (input: { name: string; brief: ProjectBrief }) => string
  setSelectedProject: (projectId: string) => void
  setDesignOptions: (projectId: string, designs: DesignOption[], actor?: TransactionEvent['actor']) => void
  setSelectedDesign: (projectId: string, designId: string) => void
  savePlanForDesign: (projectId: string, designId: string, plan: PlanModel) => void
  getPlanForDesign: (projectId: string, designId: string) => PlanModel | null
  saveCadDocForDesign: (projectId: string, designId: string, doc: CadDocument) => void
  getCadDocForDesign: (projectId: string, designId: string) => CadDocument | null
  exportMakerJsonForSelectedDesign: (projectId: string) => string | null
  generateBoqForSelectedDesign: (projectId: string) => BOQ | null
  setSelectedBoq: (projectId: string, boqId: string) => void
  logEvent: (event: Omit<TransactionEvent, 'id' | 'timestamp'>) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => window.localStorage)
  : undefined

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      designsByProject: {},
      boqsByProject: {},
      plansByProjectDesign: {},
      cadDocsByProjectDesign: {},
      selectedProjectId: null,
      selectedDesignIdByProject: {},
      selectedBoqIdByProject: {},
      transactions: [],

      createProject: ({ name, brief }) => {
        const id = uid()
        const now = new Date().toISOString()
        const project: ProjectRecord = { id, name, createdAt: now, updatedAt: now, brief }

        set((state) => ({ projects: [project, ...state.projects], selectedProjectId: id }))

        get().logEvent({
          projectId: id,
          actor: 'USER',
          action: 'PROJECT_CREATED',
          entityType: 'PROJECT',
          entityId: id,
          after: project,
        })

        return id
      },

      setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

      setDesignOptions: (projectId, designs, actor = 'AI_AGENT') => {
        const selectedId = designs[0]?.id
        set((state) => ({
          designsByProject: { ...state.designsByProject, [projectId]: designs },
          selectedDesignIdByProject: selectedId
            ? { ...state.selectedDesignIdByProject, [projectId]: selectedId }
            : state.selectedDesignIdByProject,
        }))

        get().logEvent({
          projectId,
          actor,
          action: 'DESIGN_OPTIONS_GENERATED',
          entityType: 'DESIGN',
          entityId: selectedId ?? uid(),
          after: designs,
          meta: { count: designs.length },
        })
      },

      setSelectedDesign: (projectId, designId) => {
        set((state) => ({
          selectedDesignIdByProject: { ...state.selectedDesignIdByProject, [projectId]: designId },
        }))

        get().logEvent({
          projectId,
          actor: 'USER',
          action: 'DESIGN_SELECTED',
          entityType: 'DESIGN',
          entityId: designId,
          meta: { designId },
        })
      },

      savePlanForDesign: (projectId, designId, plan) => {
        const key = `${projectId}::${designId}`
        set((state) => ({ plansByProjectDesign: { ...state.plansByProjectDesign, [key]: plan } }))

        get().logEvent({
          projectId,
          actor: 'USER',
          action: 'PLAN_EDITED',
          entityType: 'DESIGN',
          entityId: designId,
          meta: { key, rooms: plan.rooms.length, walls: plan.walls.length },
        })
      },

      getPlanForDesign: (projectId, designId) => {
        const key = `${projectId}::${designId}`
        return get().plansByProjectDesign[key] ?? null
      },

      saveCadDocForDesign: (projectId, designId, doc) => {
        const key = `${projectId}::${designId}`
        set((state) => ({ cadDocsByProjectDesign: { ...state.cadDocsByProjectDesign, [key]: doc } }))

        get().logEvent({
          projectId,
          actor: 'USER',
          action: 'CAD_DOC_SAVED',
          entityType: 'CAD',
          entityId: designId,
          meta: { key, walls: doc.walls.length, openings: doc.openings.length, floors: doc.floors.length },
        })
      },

      getCadDocForDesign: (projectId, designId) => {
        const key = `${projectId}::${designId}`
        return get().cadDocsByProjectDesign[key] ?? null
      },

      exportMakerJsonForSelectedDesign: (projectId) => {
        const state = get()
        const selectedDesignId = state.selectedDesignIdByProject[projectId]
        if (!selectedDesignId) return null
        const key = `${projectId}::${selectedDesignId}`
        const plan = state.plansByProjectDesign[key]
        if (!plan) return null
        return exportPlanToMakerJson(plan)
      },

      generateBoqForSelectedDesign: (projectId) => {
        const state = get()
        const project = state.projects.find((item) => item.id === projectId)
        const designs = state.designsByProject[projectId] ?? []
        const selectedDesignId = state.selectedDesignIdByProject[projectId]
        const design = designs.find((item) => item.id === selectedDesignId) ?? designs[0]
        if (!project || !design) return null

        const key = `${projectId}::${design.id}`
        const persistedPlan = state.plansByProjectDesign[key] ?? generatePlanModel(design)
        const derivedElements = deriveElementsFromPlan(persistedPlan)
        const designForBoq: DesignOption = { ...design, elements: derivedElements }

        const boq = generateBOQ({ projectId, design: designForBoq, currency: project.brief.currency })

        set((current) => ({
          boqsByProject: { ...current.boqsByProject, [projectId]: [boq, ...(current.boqsByProject[projectId] ?? [])] },
          selectedBoqIdByProject: { ...current.selectedBoqIdByProject, [projectId]: boq.id },
        }))

        get().logEvent({
          projectId,
          actor: 'AI_AGENT',
          action: 'BOQ_GENERATED',
          entityType: 'BOQ',
          entityId: boq.id,
          after: boq,
          meta: { designOptionId: design.id, lineItems: boq.lineItems.length, grandTotalCents: boq.totals.grandTotalCents },
        })

        return boq
      },

      setSelectedBoq: (projectId, boqId) => {
        set((state) => ({ selectedBoqIdByProject: { ...state.selectedBoqIdByProject, [projectId]: boqId } }))

        get().logEvent({
          projectId,
          actor: 'USER',
          action: 'BOQ_SELECTED',
          entityType: 'BOQ',
          entityId: boqId,
          meta: { boqId },
        })
      },

      logEvent: (event) => {
        const entry: TransactionEvent = { id: uid(), timestamp: new Date().toISOString(), ...event }
        set((state) => ({ transactions: [entry, ...state.transactions].slice(0, 500) }))
      },
    }),
    {
      name: 'budget-engineer-os-store',
      storage,
      partialize: (state) => ({
        projects: state.projects,
        designsByProject: state.designsByProject,
        boqsByProject: state.boqsByProject,
        plansByProjectDesign: state.plansByProjectDesign,
        cadDocsByProjectDesign: state.cadDocsByProjectDesign,
        selectedProjectId: state.selectedProjectId,
        selectedDesignIdByProject: state.selectedDesignIdByProject,
        selectedBoqIdByProject: state.selectedBoqIdByProject,
        transactions: state.transactions,
      }),
    },
  ),
)
