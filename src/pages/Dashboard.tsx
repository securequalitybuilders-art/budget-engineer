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
import { EngineeringStudioPanel } from '@/components/dashboard/EngineeringStudioPanel';
import { BuilderJourneyGuide } from '@/components/dashboard/BuilderJourneyGuide';
import { CadSyncControls } from '@/components/dashboard/CadSyncControls';
import { Button } from '@/components/ui/Button';
import { Layers, Box, Ruler, FileSpreadsheet, Wand2, Loader2, Boxes, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlanCanvas } from '@/components/cad/PlanCanvas';
import { PlanComparison } from '@/components/cad/PlanComparison';
import { LazyBimViewer } from '@/components/bim/LazyBimViewer';
import { BoqExportPanel } from '@/components/dashboard/BoqExportPanel';
import { EngineeringAnalysisPanel } from '@/components/dashboard/EngineeringAnalysisPanel';
import { GovernancePanel } from '@/components/dashboard/GovernancePanel';
import { SnapshotHistoryPanel } from '@/components/dashboard/SnapshotHistoryPanel';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
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
  const { setActiveStage } = useUIStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [activeCanvasView, setActiveCanvasView] = useState<'plan' | 'bim'>('plan');
  const [aiDesignOptions, setAiDesignOptions] = useState<DesignOption[]>([]);
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

  const designOptions = useMemo<DesignOption[]>(
    () =>
      currentDesigns.map((design) => ({
        id: design.id,
        name: design.name,
        grossFloorArea: design.parameters.areaM2 ?? 150,
        floors: design.parameters.floors ?? 1,
        elements: design.elements.map((el) => ({
          id: el.id,
          type: el.category,
          category: el.category,
          name: el.category,
          unit: el.quantity.unit,
          quantity: el.quantity.value,
        })),
      })),
    [currentDesigns],
  );

  const visibleDesignOptions = useMemo(
    () => (aiDesignOptions.length > 0 ? aiDesignOptions : designOptions),
    [aiDesignOptions, designOptions],
  );

  const selectedDesign = visibleDesignOptions.find((d) => d.id === selectedDesignId) ?? visibleDesignOptions[0] ?? null;
  const bimModel = useMemo(() => designOptionToBimModel(selectedDesign), [selectedDesign]);
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
      const stageMap: Record<typeof currentProject.status, number> = {
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
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiDesignOptions = async (options: DesignOption[]) => {
    setAiDesignOptions(options);
    if (options.length > 0) {
      setSelectedDesignId(options[0].id);
    }
    // Persist AI-generated designs
    if (id && options.length > 0) {
      await persistDesigns(id, options)
      await logTransaction(id, 'AI_GENERATE', 'design', id, 'AI design options generated from brief', {
        after: { count: options.length, options: options.map((o) => o.name) },
      })
    }
  };

  const handleExport = (type: 'csv' | 'html' | 'print') => {
    if (!id || !selectedDesign) return
    const label = type === 'csv' ? 'CSV' : type === 'html' ? 'HTML dossier' : 'Print/PDF'
    logTransaction(id, 'EXPORT', 'export', selectedDesign.id, `BOQ exported as ${label}`)
  }

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
    <BentoShell>
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Main canvas area */}
          <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* Toolbar */}
            <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full glass px-2 py-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[var(--brand-accent)]" aria-label="Select">
                <Box size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Wall tool">
                <Layers size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Measure">
                <Ruler size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="AI design">
                <Wand2 size={16} />
              </Button>

              <span className="mx-1 h-5 w-px bg-white/10" />

              <CadSyncControls
                sourceLabel={
                  cadSyncSource === 'persisted-cad' ? 'Edited CAD' :
                  cadSyncSource === 'fallback-generated' ? 'Fallback' :
                  'Generated'
                }
                lastSavedAt={lastSavedAt}
                isSaving={isManualSaving}
                disabled={!id || !selectedDesign?.id}
                statusMessage={statusMessage}
                statusType={statusType}
                onSave={handleManualSavePlan}
                onRestore={handleRestoreSavedPlan}
                onReset={handleResetToGeneratedPlan}
              />

              <Button
                variant={activeCanvasView === 'plan' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="2D Plan View"
                onClick={() => setActiveCanvasView('plan')}
              >
                <LayoutGrid size={16} />
              </Button>
              <Button
                variant={activeCanvasView === 'bim' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="3D BIM View"
                onClick={() => setActiveCanvasView('bim')}
              >
                <Boxes size={16} />
              </Button>
            </div>

            {/* Canvas area */}
            <div className="flex flex-1 flex-col overflow-auto p-4">
              {visibleDesignOptions.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {visibleDesignOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedDesignId(option.id)}
                        className={`max-w-[160px] truncate rounded-xl border px-3 py-2 text-xs ${
                          (selectedDesign?.id ?? visibleDesignOptions[0]?.id) === option.id
                            ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                            : 'border-white/10 bg-slate-900 text-slate-400'
                        }`}
                        title={option.name}
                      >
                        {option.name}
                      </button>
                    ))}
                    <Button className="ml-auto gap-2" onClick={handleGenerate} disabled={isGenerating || !currentBrief}>
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      {isGenerating ? 'Generating...' : 'Regenerate'}
                    </Button>
                  </div>
                  {activeCanvasView === 'plan' ? (
                    <PlanCanvas projectId={id ?? null} design={selectedDesign} persistedPlan={persistedPlan} onSavePlan={handleSavePlan} />
                  ) : (
                    <LazyBimViewer model={bimModel} height={480} />
                  )}
                  <PlanComparison designs={visibleDesignOptions} selectedDesignId={selectedDesign?.id} />
                  <p className="max-w-xs text-[10px] text-stone-500">
                    Mobile: review, estimates, exports supported. For best CAD editing, use a tablet or desktop.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
                      <Box size={40} className="text-[var(--brand-accent)]" />
                    </div>
                    <h2 className="font-display text-2xl font-bold">2D / 3D Design Canvas</h2>
                    <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                      Go to the AI Brief panel on the right to describe your project in plain English.
                      Once you generate design options, 2D plans and 3D views appear here.
                    </p>
                    <div className="mt-6 flex flex-col items-center gap-3">
                      <Button className="gap-2" onClick={handleGenerate} disabled={isGenerating || !currentBrief}>
                        {isGenerating ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Wand2 size={16} />
                        )}
                        {isGenerating ? 'Generating designs...' : 'Generate Design Options'}
                      </Button>
                      <Button variant="secondary" className="gap-2">
                        <FileSpreadsheet size={16} />
                        Import DXF
                      </Button>
                    </div>
                    <p className="mt-6 max-w-xs text-[10px] text-stone-500">
                      Mobile: review, estimates, exports supported. For best CAD editing, use a tablet or desktop.
                    </p>
                  </motion.div>
                </div>
              )}
            </div>

            {/* BOQ toggle when closed */}
            <BOQPanel />
          </div>

          {/* Right sidebar */}
          <div className="flex flex-shrink-0 overflow-x-auto lg:overflow-x-visible">
            <BuilderJourneyGuide
              hasDesignOptions={visibleDesignOptions.length > 0}
              selectedDesignName={selectedDesign?.name}
              activeCanvasView={activeCanvasView}
              hasBoq={!!selectedDesign}
              hasAnalysis={!!selectedDesign}
            />
            <PropertiesPanel />
            <TransactionPanel />
            <EngineeringStudioPanel selectedDesign={selectedDesign} onDesignOptionsGenerated={handleAiDesignOptions} />
            <BoqExportPanel selectedDesign={selectedDesign} boq={currentBoq} onExport={handleExport} />
            <EngineeringAnalysisPanel selectedDesign={selectedDesign} />
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
    </BentoShell>
  );
}
