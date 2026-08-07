import { useEffect, useState, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { useDisciplineStore } from '@/stores/disciplineStore';
import { BentoShell } from '@/components/layout/BentoShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PropertiesPanel } from '@/components/layout/PropertiesPanel';
import { LazyBOQPanel } from '@/components/layout/LazyBOQPanel';
import { PageLoader } from '@/components/layout/PageLoader';
import { TransactionPanel } from '@/components/layout/TransactionPanel';
import { AIChatPanel } from '@/components/layout/AIChatPanel';
import ExecutionPanel from '@/components/execution/ExecutionPanel';
import { BuilderJourneyGuide } from '@/components/dashboard/BuilderJourneyGuide';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { getStageDef, getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry';
import { StageRail } from '@/components/dashboard/StageRail';
import { MobileNavDrawer } from '@/components/dashboard/MobileNavDrawer';
const BriefStage = lazy(() => import('@/components/dashboard/stages/BriefStage').then(m => ({ default: m.BriefStage })));
const ConceptStage = lazy(() => import('@/components/dashboard/stages/ConceptStage').then(m => ({ default: m.ConceptStage })));
const DesignStage = lazy(() => import('@/components/dashboard/stages/DesignStage').then(m => ({ default: m.DesignStage })));
const BimStage = lazy(() => import('@/components/dashboard/stages/BimStage').then(m => ({ default: m.BimStage })));
const CostDeliverStage = lazy(() => import('@/components/dashboard/stages/CostDeliverStage').then(m => ({ default: m.CostDeliverStage })));
const BudgetEngineeredStage = lazy(() => import('@/components/dashboard/stages/BudgetEngineeredStage').then(m => ({ default: m.BudgetEngineeredStage })));
const DocsBimStage = lazy(() => import('@/components/dashboard/stages/DocsBimStage').then(m => ({ default: m.DocsBimStage })));
const LazyDesignOptionsPanel = lazy(() => import('@/components/dashboard/DesignOptionsPanel').then(m => ({ default: m.DesignOptionsPanel })));
const LazyImportWorkflow = lazy(() => import('@/components/import/ImportWorkflow').then(m => ({ default: m.ImportWorkflow })));
import { GovernancePanel } from '@/components/dashboard/GovernancePanel';
import { SnapshotHistoryPanel } from '@/components/dashboard/SnapshotHistoryPanel';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { loadSiteContext, deriveSiteDimensions } from '@/lib/site/siteContextReader';
import { composeDesignConstraints } from '@/adapters/designConstraints';
import { ProjectHealthSummaryCard } from '@/components/lifecycle/ProjectHealthSummaryCard';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useChangeStore } from '@/stores/changeStore';
import { Box, FileSpreadsheet, Bug } from 'lucide-react';
import type { FloorPlan } from '@/engine/tier3/layoutEngine';
import { persistDesigns, persistBimModel, persistBoq, logTransaction, loadPersistedProjectWork } from '@/services/projectPersistenceService';
import { savePlanModel, loadPlanModel } from '@/services/cadPersistenceService';
import type { DesignOption } from '@/domain/boq';
import type { PlanModel, PlanSource } from '@/domain/plan';
import type { GeometrySource } from '@/adapters/cadToDesignSyncAdapter';
import type { BoqResult } from '@/adapters/designToBoq';
import type { BimModel } from '@/domain/bim';
import type { BackdropState } from '@/lib/import/backdropUtils';
import { createInitialBackdropState, computeScaleCalibration } from '@/lib/import/backdropUtils';
import type { ParseResult } from '@/lib/ai/ai-provider';
import type { PipelineResult } from '@/engine/pipeline/generativeDesignPipeline';

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const { loadProject, currentProject, currentBrief, currentDesigns, isLoading, generateDesigns, seed } = useProjectStore(useShallow(s => ({ loadProject: s.loadProject, currentProject: s.currentProject, currentBrief: s.currentBrief, currentDesigns: s.currentDesigns, isLoading: s.isLoading, generateDesigns: s.generateDesigns, seed: s.seed })));
  const { activeStageId, setActiveStage, activeView, setActiveView, journeyGuideOpen, toggleJourneyGuide, selectedDesignId, setSelectedDesignId, hasSeenTour, setHasSeenTour } = useUIStore(useShallow(s => ({ activeStageId: s.activeStageId, setActiveStage: s.setActiveStage, activeView: s.activeView, setActiveView: s.setActiveView, journeyGuideOpen: s.journeyGuideOpen, toggleJourneyGuide: s.toggleJourneyGuide, selectedDesignId: s.selectedDesignId, setSelectedDesignId: s.setSelectedDesignId, hasSeenTour: s.hasSeenTour, setHasSeenTour: s.setHasSeenTour })));
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [tourOpen, setTourOpen] = useState(() => !hasSeenTour);
  const [importWorkflowOpen, setImportWorkflowOpen] = useState(false);

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropState>(createInitialBackdropState());
  const loadedPersistenceRef = useRef(false);
  const loggedBimRef = useRef<string | null>(null);
  const loggedBoqRef = useRef<string | null>(null);

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

  // Keep the selected design valid: if selectedDesignId no longer matches an
  // available option (regeneration renames ids, persisted selections go stale),
  // snap to the first option so Concept → Design always transfer the selection.
  useEffect(() => {
    if (visibleDesignOptions.length === 0) return
    if (!visibleDesignOptions.some((d) => d.id === selectedDesignId)) {
      setSelectedDesignId(visibleDesignOptions[0].id)
    }
  }, [visibleDesignOptions, selectedDesignId, setSelectedDesignId])
  // Tier 3: find the plan matching the selected design
  const selectedTier3Plan = useMemo<FloorPlan | null>(() => {
    if (tier3Plans.length === 0) return null
    const idx = tier3Plans.findIndex((_, i) => selectedDesign?.id?.endsWith(`-t3-${i}`))
    return idx >= 0 ? tier3Plans[idx] : tier3Plans[0]
  }, [tier3Plans, selectedDesign?.id])

  // Active PlanModel: lazy-loaded from adapters (persisted branch derived at render)
  const [loadedPlan, setLoadedPlan] = useState<PlanModel | null>(null);
  const activePlan: PlanModel | null = useMemo(() => persistedPlan
    ? { ...persistedPlan, planSource: 'persisted-plan' as PlanSource }
    : loadedPlan, [persistedPlan, loadedPlan]);
  useEffect(() => {
    if (persistedPlan) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      if (selectedTier3Plan && selectedDesign) {
        const { floorPlanToPlanModel } = await import('@/adapters/floorPlanToPlanModel');
        if (!cancelled) setLoadedPlan(floorPlanToPlanModel(selectedTier3Plan, selectedDesign));
      } else if (selectedDesign) {
        const { generateVariedPlanModel } = await import('@/engine/plan-generator');
        const plan = generateVariedPlanModel(selectedDesign);
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[PlanSource] ${selectedDesign.id} → ${plan.planSource ?? 'advanced-generated-plan'}`)
        }
        if (!cancelled) setLoadedPlan(plan);
      } else {
        if (!cancelled) setLoadedPlan(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [persistedPlan, selectedDesign, selectedTier3Plan]);

  const [currentBoq, setCurrentBoq] = useState<BoqResult | null>(null);
  useEffect(() => {
    const load = async () => {
      if (persistedPlan && selectedDesign) {
        const { deriveBoqFromCadOrDesign } = await import('@/adapters/cadToDesignSyncAdapter');
        setCurrentBoq(deriveBoqFromCadOrDesign({ plan: persistedPlan, design: selectedDesign, source: cadSyncSource, projectId: id }));
      } else if (selectedDesign) {
        const { buildBoqFromDesignOption } = await import('@/adapters/designToBoq');
        setCurrentBoq(buildBoqFromDesignOption(selectedDesign));
      } else {
        setCurrentBoq(null);
      }
    };
    load();
  }, [selectedDesign, persistedPlan, cadSyncSource, id]);

  const [loadedBimModel, setLoadedBimModel] = useState<BimModel | null>(null);
  const bimModel: BimModel | null = selectedDesign ? loadedBimModel : null;
  useEffect(() => {
    if (!selectedDesign) { return; }
    import('@/adapters/designToBim').then(m => setLoadedBimModel(m.designOptionToBimModel(selectedDesign)));
  }, [selectedDesign]);

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
          const stillValid = saved.designs.some((d) => d.id === selectedDesignId)
          if (!stillValid) setSelectedDesignId(saved.designs[0].id);
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
        costing: 'budget',
        tender: 'budget-engineered',
      };
      setActiveStage(stageMap[currentProject.status] || 'brief');
    }
  }, [currentProject, setActiveStage]);

  // ── CAD Persistence: load saved PlanModel on design selection change ──
  useEffect(() => {
    if (!id || !selectedDesign?.id) return;
    let cancelled = false;
    loadPlanModel(id, selectedDesign.id).then(async (plan) => {
      if (cancelled) return;
      setPersistedPlan(plan ?? null);
      const { buildCadSyncMetadata } = await import('@/adapters/cadToDesignSyncAdapter')
      if (cancelled) return;
      const syncMeta = buildCadSyncMetadata(!!plan, false);
      setCadSyncSource(syncMeta.source);
    });
    return () => { cancelled = true; };
  }, [id, selectedDesign?.id]);

  // ── CAD Persistence: auto-save PlanModel on edit commit (debounced) ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSavePlan = useCallback(
    async (projectId: string, designId: string, plan: PlanModel) => {
      setPersistedPlan(plan);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        await savePlanModel(projectId, designId, plan);
        setCadSyncSource('persisted-cad');
        logTransaction(projectId, 'UPDATE', 'design', designId, 'CAD plan saved');
        saveTimerRef.current = null
      }, 500);
    },
    [],
  );

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
  }

  const handleImportFile = useCallback(async (file: File) => {
    const { routeImportFile } = await import('@/lib/import/importRouter')
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
        } else {
          return
        }
      } catch {
        return
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
      } catch {
        return
      }
      return
    }

    if (result.type === 'pdf') {
      return
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
  }, [id, setSelectedDesignId, setActiveView]);

  const handlePipelineGenerate = async () => {
    if (!id) return;
    setIsPipelineRunning(true);
    setPipelineStatus('Parsing brief...');
    try {
      const brief = (await import('@/stores/projectStore')).useProjectStore.getState().currentBrief
      const text = brief?.rawText || ''
      setPipelineStatus('Running generative design pipeline...');
      const siteContext = loadSiteContext(id)
      const { siteWidthM, siteDepthM } = deriveSiteDimensions(siteContext)
      setPipelineStatus('Running generative design pipeline (site-aware)...');
      const { runPipeline: execPipeline } = await import('@/engine/pipeline/generativeDesignPipeline')
      const result = await execPipeline({
        rawBriefText: text,
        projectName: currentProject?.name,
        siteWidthM,
        siteDepthM,
        jurisdiction: siteContext ? 'zimbabwe' : 'south-africa',
      })
      if (result.success && result.planModel && result.designOption) {
        setPipelineStatus('Adding pipeline result...');
        const pipelineDesign: DesignOption = {
          ...result.designOption,
          id: `pipeline-${Date.now()}`,
          name: result.designOption.name || 'Pipeline Design',
          grossFloorArea: result.designOption.grossFloorArea || result.planModel.width * result.planModel.height,
          buildingType: result.designOption.buildingType || buildingType,
        }
        setAiDesignOptions((prev) => [...prev, pipelineDesign])
        setSelectedDesignId(pipelineDesign.id)
        if (result.planModel) {
          savePlanModel(id, pipelineDesign.id, result.planModel)
        }
        logTransaction(id, 'AI_GENERATE', 'design', pipelineDesign.id, 'Pipeline-generated design option')
        setPipelineResult(result)
      } else {
        setPipelineResult(result)
      }
    } catch {
      return
    } finally {
      setIsPipelineRunning(false);
      setPipelineStatus(null);
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    setIsGenerating(true);
    setGenerationStatus('Analyzing brief...');
    try {
      await generateDesigns(id);
      const brief = (await import('@/stores/projectStore')).useProjectStore.getState().currentBrief
      if (brief?.rawText) {
        try {
          setGenerationStatus('Parsing design requirements...');
          const { parseBrief } = await import('@/engine/parseBrief')
          const parsed = parseBrief(brief.rawText, { buildingType: selectedBuildingType })
          setGenerationStatus('Generating design concept...');
          const { generateDesignConcept } = await import('@/engine/tier2/conceptEngine')
          const concept = generateDesignConcept(parsed)
          const siteContext = loadSiteContext(id)
          const constraints = composeDesignConstraints(siteContext, {
            maxStructuralSpan: parsed.typology?.maxStructuralSpan,
          })
          setGenerationStatus('Computing layout parameters...');
          const { generateLayoutParameters, generateFloorPlans } = await import('@/engine/tier3/layoutEngine')
          const params = generateLayoutParameters(concept, parsed, constraints)
          setGenerationStatus('Generating floor plans...');
          const plans = generateFloorPlans(params, parsed)
          if (plans.length > 0) {
            setGenerationStatus('Finalizing design options...');
            setTier3Plans(plans)
            const prevOptions = aiDesignOptions
            const updated = prevOptions.map((opt, i) => ({
              ...opt,
              name: i < plans.length ? plans[i].name : opt.name,
              id: opt.id + `-t3-${i}`,
            }))
            const fallbackBt = prevOptions.length > 0 ? prevOptions[0].buildingType : 'other'
            for (let i = prevOptions.length; i < plans.length; i++) {
              updated.push({
                name: plans[i].name,
                id: `t3-plan-${i}`,
                grossFloorArea: 0,
                floors: 1,
                buildingType: fallbackBt,
                elements: [],
              })
            }
            setAiDesignOptions(updated)
            if (selectedDesignId) {
              const selIdx = prevOptions.findIndex((opt) => opt.id === selectedDesignId)
              if (selIdx >= 0) setSelectedDesignId(updated[selIdx]?.id ?? null)
            }
          }
        } catch {
          console.warn('[Tier 3] Layout engine in regenerate path — falling back to generic options')
        }
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
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
    if (plans.length === 0) return
    const prevOptions = aiDesignOptions
    const updated = prevOptions.map((opt, i) => ({
      ...opt,
      name: i < plans.length ? plans[i].name : opt.name,
      id: opt.id + `-t3-${i}`,
    }))
    const fallbackBt = prevOptions.length > 0 ? prevOptions[0].buildingType : 'other'
    for (let i = prevOptions.length; i < plans.length; i++) {
      updated.push({
        name: plans[i].name,
        id: `t3-plan-${i}`,
        grossFloorArea: 0,
        floors: 1,
        buildingType: fallbackBt,
        elements: [],
      })
    }
    setAiDesignOptions(updated)
    if (selectedDesignId) {
      const selIdx = prevOptions.findIndex((opt) => opt.id === selectedDesignId)
      setSelectedDesignId(selIdx >= 0 ? (updated[selIdx]?.id ?? null) : (updated[0]?.id ?? null))
    } else {
      setSelectedDesignId(updated[0]?.id ?? null)
    }
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
      } else if ((id === 'design' || id === 'bim' || id === 'budget' || id === 'budget-engineered') && !hasSelection) {
        status[id] = 'blocked'
      } else {
        status[id] = 'upcoming'
      }
    }
    return status
  }, [activeStageId, disciplineStageIds, visibleDesignOptions.length, selectedDesignId])

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
            {(['brief', 'concept', 'design', 'bim', 'docs-bim', 'budget', 'budget-engineered'] as StageId[]).includes(activeView as StageId) ? (
              <>
                {activeStageId === 'brief' && (
                  <Suspense fallback={<PageLoader />}>
                    <BriefStage
                      projectId={id}
                      onParsed={(result: ParseResult) => { if (result?.buildingType) setLatestBuildingType(result.buildingType) }}
                      onDesignOptionsGenerated={handleAiDesignOptions}
                      onTier3Plans={handleTier3Plans}
                      onBuildingTypeChange={setSelectedBuildingType}
                      visibleDesignOptions={visibleDesignOptions}
                      selectedDesignId={selectedDesignId}
                      setSelectedDesignId={setSelectedDesignId}
                      selectedDesign={selectedDesign}
                      onImportFile={handleImportFile}
                      onContinueToConcept={() => { setActiveStage('concept'); setActiveView('concept') }}
                    />
                  </Suspense>
                )}
                {activeStageId === 'concept' && (
                  <Suspense fallback={<PageLoader />}>
                    <ConceptStage
                      visibleDesignOptions={visibleDesignOptions}
                      selectedDesignId={selectedDesignId}
                      setSelectedDesignId={setSelectedDesignId}
                      selectedDesign={selectedDesign}
                      handleGenerate={handleGenerate}
                      isGenerating={isGenerating}
                      generationStatus={generationStatus}
                      onDxfImported={handleDxfImport}
                      onImportFile={handleImportFile}
                      activePlan={activePlan}
                      projectId={id ?? null}
                      isPipelineRunning={isPipelineRunning}
                      onRunPipeline={handlePipelineGenerate}
                      pipelineStatus={pipelineStatus}
                      pipelineResult={pipelineResult}
                    />
                  </Suspense>
                )}
                {activeStageId === 'design' && (
                  <Suspense fallback={<PageLoader />}>
                    <DesignStage
                      projectId={id ?? null}
                      selectedDesign={selectedDesign}
                      activePlan={activePlan}
                      handleSavePlan={handleSavePlan}
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
                  </Suspense>
                )}
                {activeStageId === 'bim' && (
                  <Suspense fallback={<PageLoader />}>
                    <BimStage
                      activePlan={activePlan}
                      selectedDesign={selectedDesign}
                      boq={currentBoq}
                      projectId={id}
                      budgetCents={currentBoq ? Math.round(currentBoq.summary.grandTotal * 100) : undefined}
                      onDesignOptionsGenerated={handleAiDesignOptions}
                      onParsed={(result: ParseResult) => { if (result?.buildingType) setLatestBuildingType(result.buildingType) }}
                      onTier3Plans={handleTier3Plans}
                      onBuildingTypeChange={setSelectedBuildingType}
                    />
                  </Suspense>
                )}
                {activeStageId === 'docs-bim' && (
                  <Suspense fallback={<PageLoader />}>
                    <DocsBimStage
                      activePlan={activePlan}
                      selectedDesign={selectedDesign}
                    />
                  </Suspense>
                )}

                {activeStageId === 'budget' && (
                  <Suspense fallback={<PageLoader />}>
                    <CostDeliverStage
                      selectedDesign={selectedDesign}
                      boq={currentBoq}
                      onExport={handleExport}
                      activePlan={activePlan}
                      buildingType={buildingType}
                      projectRegion={currentProject?.region}
                    />
                  </Suspense>
                )}
                {activeStageId === 'budget-engineered' && (
                  <Suspense fallback={<PageLoader />}>
                    <BudgetEngineeredStage
                      activePlan={activePlan}
                      selectedDesign={selectedDesign}
                      buildingType={buildingType}
                      projectRegion={currentProject?.region}
                    />
                  </Suspense>
                )}

                <LazyBOQPanel />
              </>
            ) : activeView === 'execution' ? (
              <ExecutionPanel
                projectId={id}
                budgetCents={currentBoq ? Math.round(currentBoq.summary.grandTotal * 100) : undefined}
              />
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
            ) : activeView === 'design-options' ? (
              <Suspense fallback={<PageLoader />}>
                <LazyDesignOptionsPanel
                  visibleDesignOptions={visibleDesignOptions}
                  selectedDesignId={selectedDesignId}
                  setSelectedDesignId={setSelectedDesignId}
                  handleGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  generationStatus={generationStatus}
                  onImportFile={handleImportFile}
                  onOpenInConcept={() => { setActiveStage('concept'); setActiveView('concept') }}
                />
              </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <LazyImportWorkflow
                projectId={id}
                onComplete={() => {
                  setImportWorkflowOpen(false);
                }}
                onCancel={() => setImportWorkflowOpen(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </BentoShell>
    </>
  );
}
