import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useDisciplineStore } from '@/stores/disciplineStore';
import { BentoShell } from '@/components/layout/BentoShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PropertiesPanel } from '@/components/layout/PropertiesPanel';
import { LazyBOQPanel } from '@/components/layout/LazyBOQPanel';
import { TransactionPanel } from '@/components/layout/TransactionPanel';
import { AIChatPanel } from '@/components/layout/AIChatPanel';
import { BuilderJourneyGuide } from '@/components/dashboard/BuilderJourneyGuide';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { getStageDef, getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry';
import { StageRail } from '@/components/dashboard/StageRail';
import { MobileNavDrawer } from '@/components/dashboard/MobileNavDrawer';
import { BriefStage } from '@/components/dashboard/stages/BriefStage';
import { ConceptStage } from '@/components/dashboard/stages/ConceptStage';
import { DesignStage } from '@/components/dashboard/stages/DesignStage';
import { EngineeringStage } from '@/components/dashboard/stages/EngineeringStage';
import { LazyDocsBimStage } from '@/components/dashboard/stages/LazyDocsBimStage';
import { CostDeliverStage } from '@/components/dashboard/stages/CostDeliverStage';
import { GovernancePanel } from '@/components/dashboard/GovernancePanel';
import { SnapshotHistoryPanel } from '@/components/dashboard/SnapshotHistoryPanel';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { ProjectHealthSummaryCard } from '@/components/lifecycle/ProjectHealthSummaryCard';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useChangeStore } from '@/stores/changeStore';
import { Box, FileSpreadsheet, Bug, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateVariedPlanModel } from '@/engine/plan-generator';
import { floorPlanToPlanModel } from '@/adapters/floorPlanToPlanModel';
import type { FloorPlan } from '@/engine/tier3/layoutEngine';
import { designOptionToBimModel } from '@/adapters/designToBim';
import { buildBoqFromDesignOption } from '@/adapters/designToBoq';
import { deriveBoqFromCadOrDesign, buildCadSyncMetadata } from '@/adapters/cadToDesignSyncAdapter';
import { persistDesigns, persistBimModel, persistBoq, logTransaction, loadPersistedProjectWork } from '@/services/projectPersistenceService';
import { savePlanModel, loadPlanModel, loadPlanModelMeta, deletePlanModel } from '@/services/cadPersistenceService';
import type { DesignOption } from '@/domain/boq';
import type { PlanModel, PlanSource } from '@/domain/plan';
import type { GeometrySource } from '@/adapters/cadToDesignSyncAdapter';
import { routeImportFile } from '@/lib/import/importRouter';
import type { BackdropState } from '@/lib/import/backdropUtils';
import { createInitialBackdropState, computeScaleCalibration } from '@/lib/import/backdropUtils';
import { ImportWorkflow } from '@/components/import/ImportWorkflow';

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const { loadProject, currentProject, currentBrief, currentDesigns, isLoading, generateDesigns, seed } = useProjectStore();
  const { activeStageId, setActiveStage, activeView, setActiveView, journeyGuideOpen, toggleJourneyGuide, selectedDesignId, setSelectedDesignId, hasSeenTour, setHasSeenTour } = useUIStore();
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [importWorkflowOpen, setImportWorkflowOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenTour) {
      setTourOpen(true)
    }
  }, [hasSeenTour])

  const handleTourComplete = useCallback(() => {
    setHasSeenTour(true)
    setTourOpen(false)
    setActiveStage('brief')
  }, [setHasSeenTour, setActiveStage])

  const handleTourClose = useCallback(() => {
    setTourOpen(false)
  }, [])

  const [aiDesignOptions, setAiDesignOptions] = useState<DesignOption[]>([]);
  const [tier3Plans, setTier3Plans] = useState<FloorPlan[]>([]);
  const [latestBuildingType, setLatestBuildingType] = useState<string | null>(null);
  const [selectedBuildingType, setSelectedBuildingType] = useState('auto');
  const [persistedPlan, setPersistedPlan] = useState<PlanModel | null>(null);
  const [cadSyncSource, setCadSyncSource] = useState<GeometrySource>('generated-design');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropState>(createInitialBackdropState());
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedPersistenceRef = useRef(false);
  const loadedCadRef = useRef<string | null>(null);
  const loggedBimRef = useRef<string | null>(null);
  const loggedBoqRef = useRef<string | null>(null);

  function showStatus(msg: string, type: 'success' | 'error' | 'info') {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMessage(msg);
    setStatusType(type);
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
      setStatusType(null);
    }, 3000);
  }

  const buildingType = latestBuildingType ?? currentBrief?.parsed?.buildingType ?? 'house'

  const designOptions = useMemo<DesignOption[]>(
    () =>
      currentDesigns.map((design) => ({
        id: design.id,
        name: design.name,
        grossFloorArea: design.parameters.areaM2 ?? 150,
        floors: design.parameters.floors ?? 1,
        buildingType,
        elements: design.elements.map((el) => ({
          id: el.id,
          type: el.category,
          category: el.category,
          name: el.category,
          unit: el.quantity.unit,
          quantity: el.quantity.value,
        })),
      })),
    [currentDesigns, buildingType],
  );

  const visibleDesignOptions = useMemo(
    () => (aiDesignOptions.length > 0 ? aiDesignOptions : designOptions),
    [aiDesignOptions, designOptions],
  );

  const selectedDesign = visibleDesignOptions.find((d) => d.id === selectedDesignId) ?? visibleDesignOptions[0] ?? null;
  const bimModel = useMemo(() => designOptionToBimModel(selectedDesign), [selectedDesign]);

  // Tier 3: find the plan matching the selected design
  const selectedTier3Plan = useMemo<FloorPlan | null>(() => {
    if (tier3Plans.length === 0) return null
    const idx = tier3Plans.findIndex((_, i) => selectedDesign?.id?.endsWith(`-t3-${i}`))
    return idx >= 0 ? tier3Plans[idx] : tier3Plans[0]
  }, [tier3Plans, selectedDesign?.id])

  // Active PlanModel: prefer CAD-edited persisted plan, else Tier 3 floorPlan, else varied generation
  const activePlan = useMemo<PlanModel | null>(() => {
    if (persistedPlan) return { ...persistedPlan, planSource: 'persisted-plan' }
    if (selectedTier3Plan && selectedDesign) {
      return floorPlanToPlanModel(selectedTier3Plan, selectedDesign)
    }
    if (selectedDesign) {
      const plan = generateVariedPlanModel(selectedDesign)
      const source: PlanSource = plan.planSource ?? 'advanced-generated-plan'
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[PlanSource] ${selectedDesign.id} → ${source}`)
      }
      return plan
    }
    return null
  }, [persistedPlan, selectedDesign, selectedTier3Plan]);
  const currentBoq = useMemo(() => {
    if (persistedPlan && selectedDesign) {
      return deriveBoqFromCadOrDesign({
        plan: persistedPlan,
        design: selectedDesign,
        source: cadSyncSource,
        projectId: id,
      })
    }
    return buildBoqFromDesignOption(selectedDesign)
  }, [selectedDesign, persistedPlan, cadSyncSource, id])

  const loadAssurance = useAssuranceStore((s) => s.loadForProject);
  const loadMilestones = useMilestoneStore((s) => s.loadForProject);
  const loadChanges = useChangeStore((s) => s.loadForProject);

  // ── Persistence: load saved AI designs on mount ──
  useEffect(() => {
    seed();
    if (id) {
      loadProject(id);
      loadAssurance(id);
      loadMilestones(id);
      loadChanges(id);
      loadPersistedProjectWork(id).then((saved) => {
        if (saved.designs.length > 0 && aiDesignOptions.length === 0 && designOptions.length === 0) {
          setAiDesignOptions(saved.designs);
          setSelectedDesignId(saved.designs[0].id);
        }
      })
    }
    loadedPersistenceRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadProject, seed]);

  useEffect(() => {
    if (currentProject) {
      const stageMap: Record<string, StageId> = {
        draft: 'brief',
        concept: 'concept',
        design: 'design',
        engineering: 'engineering',
        costing: 'docs-bim',
        tender: 'cost-deliver',
      };
      setActiveStage(stageMap[currentProject.status] || 'brief');
    }
  }, [currentProject, setActiveStage]);

  // ── CAD Persistence: load saved PlanModel on design selection change ──
  useEffect(() => {
    if (!id || !selectedDesign?.id) return;
    if (loadedCadRef.current === selectedDesign.id) return;
    loadedCadRef.current = selectedDesign.id;

    loadPlanModel(id, selectedDesign.id).then((plan) => {
      setPersistedPlan(plan ?? null);
      const syncMeta = buildCadSyncMetadata(
        !!plan,
        false,
      );
      setCadSyncSource(syncMeta.source);
    });
    loadPlanModelMeta(id, selectedDesign.id).then((meta) => {
      setLastSavedAt(meta.savedAt);
    });
  }, [id, selectedDesign?.id]);

  // ── CAD Persistence: auto-save PlanModel on edit commit ──
  const handleSavePlan = useCallback(
    async (projectId: string, designId: string, plan: PlanModel) => {
      setPersistedPlan(plan);
      await savePlanModel(projectId, designId, plan);
      setCadSyncSource('persisted-cad');
      logTransaction(projectId, 'UPDATE', 'design', designId, 'CAD plan saved');
    },
    [],
  );

  // ── CAD Persistence: manual save/restore/reset ──
  const handleManualSavePlan = useCallback(async () => {
    if (!id || !selectedDesign?.id || !persistedPlan) {
      showStatus('Nothing to save — no edits made', 'error')
      return
    }
    setIsManualSaving(true)
    try {
      await savePlanModel(id, selectedDesign.id, persistedPlan)
      setLastSavedAt(new Date().toISOString())
      setCadSyncSource('persisted-cad')
      logTransaction(id, 'UPDATE', 'design', selectedDesign.id, 'CAD plan manually saved')
      showStatus('Saved successfully', 'success')
    } catch {
      showStatus('Save failed — please try again', 'error')
    } finally {
      setIsManualSaving(false)
    }
  }, [id, selectedDesign?.id, persistedPlan])

  const handleRestoreSavedPlan = useCallback(async () => {
    if (!id || !selectedDesign?.id) return
    try {
      const plan = await loadPlanModel(id, selectedDesign.id)
      if (plan) {
        setPersistedPlan(plan)
        setCadSyncSource('persisted-cad')
        const meta = await loadPlanModelMeta(id, selectedDesign.id)
        setLastSavedAt(meta.savedAt)
        logTransaction(id, 'UPDATE', 'design', selectedDesign.id, 'CAD plan restored from saved')
        showStatus('Restored saved CAD', 'success')
      } else {
        showStatus('No saved CAD found', 'info')
      }
    } catch {
      showStatus('Restore failed — please try again', 'error')
    }
  }, [id, selectedDesign?.id])

  const handleResetToGeneratedPlan = useCallback(() => {
    if (!id || !selectedDesign?.id) return
    setPersistedPlan(null)
    setCadSyncSource('generated-design')
    setLastSavedAt(null)
    deletePlanModel(id, selectedDesign.id).catch(() => {})
    logTransaction(id, 'UPDATE', 'design', selectedDesign.id, 'CAD plan reset to generated design')
    showStatus('Reset to generated design', 'info')
  }, [id, selectedDesign?.id])

  // ── Persistence: save BIM model when it changes ──
  useEffect(() => {
    if (!bimModel || !id) return
    persistBimModel(bimModel)
    if (loggedBimRef.current !== selectedDesign?.id) {
      logTransaction(id, 'CREATE', 'boq', bimModel.id, 'BIM model generated from design option')
      loggedBimRef.current = selectedDesign?.id ?? null
    }
  }, [bimModel, id, selectedDesign?.id])

  // ── Persistence: save BOQ when selected design changes ──
  useEffect(() => {
    if (!selectedDesign || !id) return
    if (currentBoq && loggedBoqRef.current !== selectedDesign.id) {
      persistBoq(id, selectedDesign.id, currentBoq)
      logTransaction(id, 'CREATE', 'boq', currentBoq.id, 'BOQ generated from design option')
      loggedBoqRef.current = selectedDesign.id
    }
  }, [selectedDesign, id, currentBoq])

  const handleBackdropUpdate = useCallback((update: Partial<BackdropState>) => {
    setBackdrop((prev) => ({ ...prev, ...update }))
  }, [])

  const handleBackdropSetScale = useCallback((knownWidth: number, knownHeight: number) => {
    setBackdrop((prev) => {
      if (!prev.imageDataUrl || prev.naturalWidth <= 0 || prev.naturalHeight <= 0) return prev
      const cal = computeScaleCalibration(prev.naturalWidth, prev.naturalHeight, knownWidth, knownHeight)
      if (!cal) return prev
      return { ...prev, pxPerMetre: cal.pxPerMetre }
    })
  }, [])

  const handleBackdropClear = useCallback(() => {
    setBackdrop(createInitialBackdropState())
  }, [])

  const handleDesignCreated = (projectId: string, plan: PlanModel) => {
    const tracedDesign: DesignOption = {
      id: `traced-${Date.now()}`,
      name: 'Traced Plan',
      grossFloorArea: plan.width * plan.height,
      floors: 1,
      buildingType: 'imported',
      elements: [],
    }
    plan.designOptionId = tracedDesign.id
    setAiDesignOptions((prev) => [...prev, tracedDesign])
    setSelectedDesignId(tracedDesign.id)
    savePlanModel(projectId, tracedDesign.id, plan)
    setPersistedPlan(plan)
    logTransaction(projectId, 'CREATE', 'design', tracedDesign.id, 'Traced plan created from backdrop')
    showStatus('First room placed — traced plan created. Continue tracing or edit rooms.', 'success')
  }

  const handleImportFile = useCallback(async (file: File) => {
    const result = routeImportFile(file)
    if (result.type === 'dxf') {
      try {
        const text = await file.text()
        const { parseDxfToPlan } = await import('@/lib/import/dxf-importer')
        const plan = parseDxfToPlan(text)
        if (plan && id) {
          const dxfDesignOption: DesignOption = {
            id: `dxf-import-${Date.now()}`,
            name: 'Imported DXF',
            grossFloorArea: plan.width * plan.height,
            floors: 1,
            buildingType: 'imported',
            elements: [],
          }
          plan.designOptionId = dxfDesignOption.id
          setAiDesignOptions((prev) => [...prev, dxfDesignOption])
          setSelectedDesignId(dxfDesignOption.id)
          savePlanModel(id, dxfDesignOption.id, plan)
          setPersistedPlan(plan)
          logTransaction(id, 'CREATE', 'design', dxfDesignOption.id, 'DXF imported — verify scale')
          setActiveView(3)
          showStatus('DXF imported — verify scale', 'success')
        } else {
          showStatus('Could not read this DXF file.', 'error')
        }
      } catch {
        showStatus('Could not read this DXF file.', 'error')
      }
      return
    }

    if (result.type === 'image') {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read image'))
          reader.readAsDataURL(file)
        })
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to decode image'))
          img.src = dataUrl
        })
        setBackdrop({
          imageDataUrl: dataUrl,
          opacity: 0.3,
          visible: true,
          pxPerMetre: null,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        })
        setActiveView(3)
        showStatus('Image loaded as traceable backdrop. Set the scale for accurate tracing.', 'success')
      } catch {
        showStatus('Could not load this image.', 'error')
      }
      return
    }

    if (result.type === 'pdf') {
      showStatus('PDF import as backdrop is not yet available. Take a screenshot or export your PDF page as an image, then import that.', 'info')
      return
    }

    if (result.type === 'unsupported') {
      showStatus(result.message, 'info')
    }
  }, [id, setSelectedDesignId, setActiveView])

  const handleDxfImport = useCallback((plan: PlanModel) => {
    if (!id) return;
    const dxfDesignOption: DesignOption = {
      id: `dxf-import-${Date.now()}`,
      name: 'Imported DXF',
      grossFloorArea: plan.width * plan.height,
      floors: 1,
      buildingType: 'imported',
      elements: [],
    };
    plan.designOptionId = dxfDesignOption.id;
    setAiDesignOptions((prev) => [...prev, dxfDesignOption]);
    setSelectedDesignId(dxfDesignOption.id);
    savePlanModel(id, dxfDesignOption.id, plan);
    setPersistedPlan(plan);
    logTransaction(id, 'CREATE', 'design', dxfDesignOption.id, 'DXF imported — verify scale');
    setActiveView(3);
    showStatus('DXF imported — verify scale', 'success');
  }, [id, setSelectedDesignId, setActiveView]);

  const handleGenerate = async () => {
    if (!id) return;
    setIsGenerating(true);
    try {
      await generateDesigns(id);
      // Run Tier 3 on the generated brief to produce topology-labeled options
      const brief = (await import('@/stores/projectStore')).useProjectStore.getState().currentBrief
      if (brief?.rawText) {
        try {
          const { parseBrief } = await import('@/engine/parseBrief')
          const parsed = parseBrief(brief.rawText, { buildingType: selectedBuildingType })
          const { generateDesignConcept } = await import('@/engine/tier2/conceptEngine')
          const concept = generateDesignConcept(parsed)
          const { generateLayoutParameters, generateFloorPlans } = await import('@/engine/tier3/layoutEngine')
          const params = generateLayoutParameters(concept, parsed)
          const plans = generateFloorPlans(params, parsed)
          if (plans.length > 0) {
            setTier3Plans(plans)
            setAiDesignOptions((prev) => {
              const updated = prev.map((opt, i) => ({
                ...opt,
                name: i < plans.length ? plans[i].name : opt.name,
                id: opt.id + `-t3-${i}`,
              }))
              const fallbackBt = prev.length > 0 ? prev[0].buildingType : 'other'
              for (let i = prev.length; i < plans.length; i++) {
                updated.push({
                  name: plans[i].name,
                  id: `t3-plan-${i}`,
                  grossFloorArea: 0,
                  floors: 1,
                  buildingType: fallbackBt,
                  elements: [],
                })
              }
              return updated
            })
          }
        } catch {
          console.warn('[Tier 3] Layout engine in regenerate path — falling back to generic options')
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiDesignOptions = async (options: DesignOption[]) => {
    setAiDesignOptions(options);
    // Persist AI-generated designs
    if (id && options.length > 0) {
      await persistDesigns(id, options)
      await logTransaction(id, 'AI_GENERATE', 'design', id, 'AI design options generated from brief', {
        after: { count: options.length, options: options.map((o) => o.name) },
      })
    }
  };

  const handleTier3Plans = (plans: FloorPlan[]) => {
    setTier3Plans(plans)
    // Use the ref to avoid stale closure: plans arrive after re-render
    setAiDesignOptions((prev) => {
      if (plans.length === 0) return prev
      const updated = prev.map((opt, i) => ({
        ...opt,
        name: i < plans.length ? plans[i].name : opt.name,
        id: opt.id + `-t3-${i}`,
      }))
      const fallbackBt = prev.length > 0 ? prev[0].buildingType : 'other'
      for (let i = prev.length; i < plans.length; i++) {
        updated.push({
          name: plans[i].name,
          id: `t3-plan-${i}`,
          grossFloorArea: 0,
          floors: 1,
          buildingType: fallbackBt,
          elements: [],
        })
      }
      setSelectedDesignId(updated[0]?.id ?? null)
      return updated
    })
  };

  const handleExport = (type: 'csv' | 'html' | 'print') => {
    if (!id || !selectedDesign) return
    const label = type === 'csv' ? 'CSV' : type === 'html' ? 'HTML dossier' : 'Print/PDF'
    logTransaction(id, 'EXPORT', 'export', selectedDesign.id, `BOQ exported as ${label}`)
  }

  // ── Stage status for Rail ──
  const disciplineStageIds = useMemo(() => getStagesForDiscipline(currentDiscipline).map((s) => s.id), [currentDiscipline]);
  const stageStatus: Partial<Record<StageId, 'done' | 'active' | 'upcoming' | 'blocked'>> = useMemo(() => {
    const hasDesigns = visibleDesignOptions.length > 0
    const hasSelection = !!selectedDesignId && hasDesigns
    const status: Partial<Record<StageId, 'done' | 'active' | 'upcoming' | 'blocked'>> = {}
    for (const id of disciplineStageIds) {
      if (id === activeStageId) {
        status[id] = 'active'
      } else if (id === 'brief') {
        status[id] = 'done'
      } else if ((id === 'design' || id === 'engineering' || id === 'docs-bim' || id === 'cost-deliver') && !hasSelection) {
        status[id] = 'blocked'
      } else {
        status[id] = 'upcoming'
      }
    }
    return status
  }, [activeStageId, disciplineStageIds, visibleDesignOptions.length, selectedDesignId, selectedDesign])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand-accent)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <Box size={32} className="text-[var(--text-muted)]" />
          </div>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Project not found</h2>
          <p className="max-w-xs text-sm text-[var(--text-muted)]">
            This project does not exist or may have been removed. Start a new project to begin.
          </p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600/20 px-4 py-2 text-sm text-cyan-300 transition-colors hover:bg-cyan-600/30"
          >
            <FileSpreadsheet size={16} />
            Create new project
          </Link>
        </div>
      </div>
    );
  }

  const stageLabel = (() => {
    try { return getStageDef(activeStageId).label } catch { return 'Dashboard' }
  })()

  return (
    <>
      <BentoShell>
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-stone-700/60 bg-stone-950/90 px-3 py-2 md:hidden">
          <MobileNavDrawer
            open={mobileNavOpen}
            onOpenChange={setMobileNavOpen}
            activeStageId={activeStageId}
            onStageChange={(stageId) => { setMobileNavOpen(false); setActiveStage(stageId); setActiveView(stageId); }}
            stageStatus={stageStatus}
            activeTool={typeof activeView === 'string' ? activeView : null}
            onToolChange={(tool) => { setMobileNavOpen(false); setActiveView(tool); }}
            currentStageLabel={stageLabel}
          />
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleJourneyGuide}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-stone-400 hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors"
              aria-label="Toggle builder journey guide"
              title="Builder Guide"
            >
              G
            </button>
            <button
              onClick={() => setTourOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-stone-400 hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors"
              aria-label="How it works — replay onboarding tour"
              title="How it works"
            >
              ?
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lifecycle summary bar */}
          <div className="hidden w-56 flex-shrink-0 border-r border-[var(--border-default)] p-2 lg:flex">
            <ProjectHealthSummaryCard />
          </div>

          {/* Stage Rail — hidden on mobile */}
          <div className="hidden md:flex">
            <StageRail
              activeStageId={activeStageId}
              onStageChange={(stageId) => { setActiveStage(stageId); setActiveView(stageId); }}
              stageStatus={stageStatus}
              activeTool={typeof activeView === 'string' ? activeView : null}
              onToolChange={setActiveView}
            />
          </div>

          {/* Main content area */}
          <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
            {(['brief', 'concept', 'site-analysis', 'design', 'engineering', 'docs-bim', 'cost-deliver'] as StageId[]).includes(activeView as StageId) ? (
              <>
                {activeStageId === 'brief' && (
                  <BriefStage
                    onParsed={(result) => { if (result?.buildingType) setLatestBuildingType(result.buildingType) }}
                    onDesignOptionsGenerated={handleAiDesignOptions}
                    onTier3Plans={handleTier3Plans}
                    onBuildingTypeChange={setSelectedBuildingType}
                    visibleDesignOptions={visibleDesignOptions}
                    selectedDesignId={selectedDesignId}
                    setSelectedDesignId={setSelectedDesignId}
                    selectedDesign={selectedDesign}
                    onImportFile={handleImportFile}
                  />
                )}
                {activeStageId === 'concept' && (
                  <ConceptStage
                    visibleDesignOptions={visibleDesignOptions}
                    selectedDesignId={selectedDesignId}
                    setSelectedDesignId={setSelectedDesignId}
                    selectedDesign={selectedDesign}
                    handleGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    onDxfImported={handleDxfImport}
                    onImportFile={handleImportFile}
                  />
                )}
                {activeStageId === 'site-analysis' && (
                  <Link
                    to={`/project/${id}/studio/site-analysis`}
                    className="flex flex-1 items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Globe size={40} className="text-[var(--brand-accent)]" />
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Site Analysis</h2>
                      <p className="max-w-sm text-sm text-[var(--text-secondary)]">
                        Open the Site Analysis Studio for heliodon, shadow casting, and environmental assessment.
                      </p>
                      <Button className="gap-2 mt-2">
                        <Globe size={16} />
                        Open Site Analysis Studio
                      </Button>
                    </div>
                  </Link>
                )}
                {activeStageId === 'design' && (
                  <DesignStage
                    projectId={id ?? null}
                    selectedDesign={selectedDesign}
                    activePlan={activePlan}
                    handleSavePlan={handleSavePlan}
                    cadSyncSource={cadSyncSource}
                    lastSavedAt={lastSavedAt}
                    isManualSaving={isManualSaving}
                    statusMessage={statusMessage}
                    statusType={statusType}
                    onManualSavePlan={handleManualSavePlan}
                    onRestoreSavedPlan={handleRestoreSavedPlan}
                    onResetToGeneratedPlan={handleResetToGeneratedPlan}
                    handleGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    backdrop={backdrop.imageDataUrl ? backdrop : null}
                    onBackdropUpdate={handleBackdropUpdate}
                    onBackdropSetScale={handleBackdropSetScale}
                    onBackdropClear={handleBackdropClear}
                    onImportFile={handleImportFile}
                    onDesignCreated={handleDesignCreated}
                    onOpenImportWorkflow={() => setImportWorkflowOpen(true)}
                  />
                )}
                {activeStageId === 'engineering' && (
                  <EngineeringStage
                    selectedDesign={selectedDesign}
                    activePlan={activePlan}
                    boq={currentBoq}
                    onDesignOptionsGenerated={handleAiDesignOptions}
                    onParsed={(result) => { if (result?.buildingType) setLatestBuildingType(result.buildingType) }}
                    onTier3Plans={handleTier3Plans}
                    onBuildingTypeChange={setSelectedBuildingType}
                  />
                )}
                {activeStageId === 'docs-bim' && (
                  <LazyDocsBimStage
                    activePlan={activePlan}
                    selectedDesign={selectedDesign}
                  />
                )}
                {activeStageId === 'cost-deliver' && (
                  <CostDeliverStage
                    selectedDesign={selectedDesign}
                    boq={currentBoq}
                    onExport={handleExport}
                    activePlan={activePlan}
                    buildingType={buildingType}
                    projectRegion={currentProject?.region}
                  />
                )}

                <LazyBOQPanel />
              </>
            ) : activeView === 'history' ? (
              <TransactionPanel variant="full" />
            ) : activeView === 'governance' ? (
              <GovernancePanel
                variant="full"
                selectedDesign={selectedDesign}
                hasBim={(bimModel?.elements.length ?? 0) > 0}
                hasBoq={!!selectedDesign}
                hasAnalysis={!!selectedDesign}
                projectId={id}
              />
            ) : activeView === 'snapshots' ? (
              <SnapshotHistoryPanel
                variant="full"
                projectId={id}
                selectedDesign={selectedDesign}
                currentBoq={currentBoq}
              />
            ) : activeView === 'properties' ? (
              <PropertiesPanel variant="full" />
            ) : null}
          </div>

          {/* Journey Guide toggle + Onboarding button — desktop only */}
          <div className="absolute left-4 top-2 z-20 hidden gap-1 md:flex">
            <button
              onClick={toggleJourneyGuide}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-stone-400 hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors"
              aria-label="Toggle builder journey guide"
              title="Builder Guide"
            >
              G
            </button>
            <button
              onClick={() => setTourOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-stone-400 hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors"
              aria-label="How it works — replay onboarding tour"
              title="How it works"
            >
              ?
            </button>
          </div>

          {/* Journey Guide floating overlay */}
          {journeyGuideOpen && (
            <div className="fixed right-0 top-14 z-30 h-[calc(100vh-3.5rem)] shadow-2xl">
              <div className="relative h-full">
                <BuilderJourneyGuide
                  hasDesignOptions={visibleDesignOptions.length > 0}
                  selectedDesignName={selectedDesign?.name}
                  activeCanvasView="plan"
                  hasBoq={!!selectedDesign}
                  hasAnalysis={!!selectedDesign}
                />
                <button
                  onClick={toggleJourneyGuide}
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-700 text-[9px] text-stone-300 hover:bg-stone-600 transition-colors"
                  aria-label="Close journey guide"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Feedback floating button */}
          <button
            onClick={() => {
              const el = document.getElementById('feedback-floating-panel')
              if (el) {
                el.classList.toggle('hidden')
              }
            }}
            className="fixed bottom-24 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 text-stone-400 shadow-lg hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors border border-stone-700/60"
            aria-label="Open feedback form"
            title="Send Feedback"
          >
            <Bug size={16} />
          </button>

          {/* Feedback floating panel */}
          <div id="feedback-floating-panel" className="fixed bottom-36 right-4 z-40 hidden w-80 rounded-lg border border-stone-700/60 bg-stone-950 p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-cyan-400">Send Feedback</h3>
              <button
                onClick={() => {
                  const el = document.getElementById('feedback-floating-panel')
                  if (el) el.classList.add('hidden')
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-700 text-[9px] text-stone-300 hover:bg-stone-600"
                aria-label="Close feedback panel"
              >
                ✕
              </button>
            </div>
            <FeedbackPanel compact projectName={currentProject?.name} currentUrl={window.location.href} />
          </div>
        </div>
      </div>

      <AIChatPanel />
      <OnboardingTour open={tourOpen} onClose={handleTourClose} onComplete={handleTourComplete} />

      {importWorkflowOpen && id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setImportWorkflowOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Guided Import</h2>
              <button
                onClick={() => setImportWorkflowOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                aria-label="Close import workflow"
              >
                ✕
              </button>
            </div>
            <ImportWorkflow
              projectId={id}
              onComplete={() => {
                setImportWorkflowOpen(false);
                showStatus('Import completed — review the resulting plan', 'success');
              }}
              onCancel={() => setImportWorkflowOpen(false)}
            />
          </div>
        </div>
      )}
    </BentoShell>
    </>
  );
}
