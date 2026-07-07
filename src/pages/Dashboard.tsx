import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { BentoShell } from '@/components/layout/BentoShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PropertiesPanel } from '@/components/layout/PropertiesPanel';
import { BOQPanel } from '@/components/layout/BOQPanel';
import { TransactionPanel } from '@/components/layout/TransactionPanel';
import { AIChatPanel } from '@/components/layout/AIChatPanel';
import { BuilderJourneyGuide } from '@/components/dashboard/BuilderJourneyGuide';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { StageRail } from '@/components/dashboard/StageRail';
import { BriefStage } from '@/components/dashboard/stages/BriefStage';
import { ConceptStage } from '@/components/dashboard/stages/ConceptStage';
import { DesignStage } from '@/components/dashboard/stages/DesignStage';
import { EngineeringStage } from '@/components/dashboard/stages/EngineeringStage';
import { DocsBimStage } from '@/components/dashboard/stages/DocsBimStage';
import { CostDeliverStage } from '@/components/dashboard/stages/CostDeliverStage';
import { GovernancePanel } from '@/components/dashboard/GovernancePanel';
import { SnapshotHistoryPanel } from '@/components/dashboard/SnapshotHistoryPanel';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { Box, FileSpreadsheet } from 'lucide-react';
import { generatePlanModel } from '@/engine/plan-generator';
import { floorPlanToPlanModel } from '@/adapters/floorPlanToPlanModel';
import type { FloorPlan } from '@/engine/tier3/layoutEngine';
import { designOptionToBimModel } from '@/adapters/designToBim';
import { buildBoqFromDesignOption } from '@/adapters/designToBoq';
import { deriveBoqFromCadOrDesign, buildCadSyncMetadata } from '@/adapters/cadToDesignSyncAdapter';
import { persistDesigns, persistBimModel, persistBoq, logTransaction, loadPersistedProjectWork } from '@/services/projectPersistenceService';
import { savePlanModel, loadPlanModel, loadPlanModelMeta, deletePlanModel } from '@/services/cadPersistenceService';
import type { DesignOption } from '@/domain/boq';
import type { PlanModel } from '@/domain/plan';
import type { GeometrySource } from '@/adapters/cadToDesignSyncAdapter';

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const { loadProject, currentProject, currentBrief, currentDesigns, isLoading, generateDesigns, seed } = useProjectStore();
  const { activeStage, setActiveStage, selectedDesignId, setSelectedDesignId, hasSeenTour, setHasSeenTour } = useUIStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenTour) {
      setTourOpen(true)
    }
  }, [hasSeenTour])

  const handleTourComplete = useCallback(() => {
    setHasSeenTour(true)
    setTourOpen(false)
    setActiveStage(1)
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

  // Active PlanModel: prefer CAD-edited persisted plan, else Tier 3 floorPlan, else generic
  const activePlan = useMemo<PlanModel | null>(() => {
    if (persistedPlan) return persistedPlan
    if (selectedTier3Plan && selectedDesign) {
      return floorPlanToPlanModel(selectedTier3Plan, selectedDesign)
    }
    return selectedDesign ? generatePlanModel(selectedDesign) : null
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

  // ── Persistence: load saved AI designs on mount ──
  useEffect(() => {
    seed();
    if (id) {
      loadProject(id);
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
      const stageMap: Record<string, number> = {
        draft: 1,
        concept: 2,
        design: 3,
        engineering: 4,
        costing: 5,
        tender: 6,
      };
      setActiveStage(stageMap[currentProject.status] || 1);
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
  const stageStatus: Record<number, 'done' | 'active' | 'upcoming' | 'blocked'> = useMemo(() => {
    const hasDesigns = visibleDesignOptions.length > 0
    const hasSelection = !!selectedDesignId && hasDesigns
    const hasBoq = !!selectedDesign
    return {
      1: activeStage === 1 ? 'active' : 'done',
      2: !hasDesigns ? (activeStage === 2 ? 'active' : 'blocked') : (activeStage === 2 ? 'active' : 'done'),
      3: !hasSelection ? (activeStage === 3 ? 'active' : 'blocked') : (activeStage === 3 ? 'active' : 'done'),
      4: !hasSelection ? (activeStage === 4 ? 'active' : 'blocked') : (activeStage === 4 ? 'active' : 'done'),
      5: !hasSelection ? (activeStage === 5 ? 'active' : 'blocked') : (activeStage === 5 ? 'active' : 'done'),
      6: !hasBoq ? (activeStage === 6 ? 'active' : 'blocked') : (activeStage === 6 ? 'active' : 'done'),
    }
  }, [activeStage, visibleDesignOptions.length, selectedDesignId, selectedDesign])

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

  return (
    <>
      <BentoShell>
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Stage Rail */}
          <StageRail
            activeStage={activeStage}
            onStageChange={setActiveStage}
            stageStatus={stageStatus}
          />

          {/* Stage content area */}
          <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
            {activeStage === 1 && (
              <BriefStage
                onParsed={(result) => { if (result?.buildingType) setLatestBuildingType(result.buildingType) }}
                onDesignOptionsGenerated={handleAiDesignOptions}
                onTier3Plans={handleTier3Plans}
                onBuildingTypeChange={setSelectedBuildingType}
                visibleDesignOptions={visibleDesignOptions}
                selectedDesignId={selectedDesignId}
                setSelectedDesignId={setSelectedDesignId}
                selectedDesign={selectedDesign}
              />
            )}
            {activeStage === 2 && (
              <ConceptStage
                visibleDesignOptions={visibleDesignOptions}
                selectedDesignId={selectedDesignId}
                setSelectedDesignId={setSelectedDesignId}
                selectedDesign={selectedDesign}
                handleGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            )}
            {activeStage === 3 && (
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
              />
            )}
            {activeStage === 4 && (
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
            {activeStage === 5 && (
              <DocsBimStage
                activePlan={activePlan}
                selectedDesign={selectedDesign}
              />
            )}
            {activeStage === 6 && (
              <CostDeliverStage
                selectedDesign={selectedDesign}
                boq={currentBoq}
                onExport={handleExport}
                activePlan={activePlan}
                buildingType={buildingType}
              />
            )}

            <BOQPanel />
          </div>

          {/* Right sidebar - cross-cutting panels */}
          <div className="flex flex-shrink-0 overflow-x-auto lg:overflow-x-visible">
            <div className="relative">
              <BuilderJourneyGuide
                hasDesignOptions={visibleDesignOptions.length > 0}
                selectedDesignName={selectedDesign?.name}
                activeCanvasView="plan"
                hasBoq={!!selectedDesign}
                hasAnalysis={!!selectedDesign}
              />
              <button
                onClick={() => setTourOpen(true)}
                className="absolute -top-0.5 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-stone-400 hover:bg-cyan-600/20 hover:text-cyan-300 transition-colors"
                aria-label="How it works — replay onboarding tour"
                title="How it works"
              >
                ?
              </button>
            </div>
            <PropertiesPanel />
            <TransactionPanel />
            <GovernancePanel
              selectedDesign={selectedDesign}
              hasBim={(bimModel?.elements.length ?? 0) > 0}
              hasBoq={!!selectedDesign}
              hasAnalysis={!!selectedDesign}
              projectId={id}
            />
            <SnapshotHistoryPanel
              projectId={id}
              selectedDesign={selectedDesign}
              currentBoq={currentBoq}
            />
            <div className="w-64 shrink-0 border-l border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <FeedbackPanel compact projectName={currentProject?.name} currentUrl={window.location.href} />
            </div>
          </div>
        </div>
      </div>

      <AIChatPanel />
      <OnboardingTour open={tourOpen} onClose={handleTourClose} onComplete={handleTourComplete} />
    </BentoShell>
    </>
  );
}
