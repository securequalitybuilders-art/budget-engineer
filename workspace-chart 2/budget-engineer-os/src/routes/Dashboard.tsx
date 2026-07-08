import { useMemo, useState } from 'react'
import { BOQPanel } from '../components/boq/BOQPanel'
import { PlanCanvas } from '../components/cad/PlanCanvas'
import { PlanComparison } from '../components/cad/PlanComparison'
import { PlanLegend } from '../components/cad/PlanLegend'
import { WallFirstCanvas } from '../components/cad/WallFirstCanvas'
import { LayerPanel } from '../components/cad/LayerPanel'
import { FloorPanel } from '../components/cad/FloorPanel'
import { AnnotationPanel } from '../components/cad/AnnotationPanel'
import { BimPropertyPanel } from '../components/cad/BimPropertyPanel'
import { CadSemanticsPanel } from '../components/cad/CadSemanticsPanel'
import { VerticalCoordinationPanel } from '../components/cad/VerticalCoordinationPanel'
import { useCadDocument } from '../components/cad/useCadDocument'
import { useAppStore } from '../store/appStore'
import { formatCurrency } from '../lib/money'
import { generatePlanModel } from '../engine/planGenerator'
import { cadDocumentToRichPlanModel } from '../lib/cadPlanSync'

export default function Dashboard() {
  const {
    selectedProjectId,
    projects,
    designsByProject,
    boqsByProject,
    selectedDesignIdByProject,
    selectedBoqIdByProject,
    transactions,
    setSelectedDesign,
    generateBoqForSelectedDesign,
    setSelectedBoq,
    savePlanForDesign,
    getPlanForDesign,
    saveCadDocForDesign,
    getCadDocForDesign,
    exportMakerJsonForSelectedDesign,
  } = useAppStore()

  const [makerJsonPreview, setMakerJsonPreview] = useState<string | null>(null)

  const project = projects.find((item) => item.id === selectedProjectId) ?? null
  const designs = selectedProjectId ? (designsByProject[selectedProjectId] ?? []) : []
  const selectedDesignId = selectedProjectId ? selectedDesignIdByProject[selectedProjectId] : undefined
  const selectedDesign = designs.find((item) => item.id === selectedDesignId) ?? designs[0] ?? null
  const boqs = selectedProjectId ? (boqsByProject[selectedProjectId] ?? []) : []
  const selectedBoqId = selectedProjectId ? selectedBoqIdByProject[selectedProjectId] : undefined
  const selectedBoq = boqs.find((item) => item.id === selectedBoqId) ?? boqs[0] ?? null
  const currentPlan = selectedProjectId && selectedDesign
    ? (getPlanForDesign(selectedProjectId, selectedDesign.id) ?? generatePlanModel(selectedDesign))
    : null
  const initialCadDoc = selectedProjectId && selectedDesign ? getCadDocForDesign(selectedProjectId, selectedDesign.id) : null

  const { doc, setDoc, undo, redo, canUndo, canRedo } = useCadDocument(initialCadDoc, selectedProjectId, selectedDesign?.id ?? null, currentPlan)
  const projectedPlan = doc && currentPlan ? cadDocumentToRichPlanModel(doc, currentPlan) : currentPlan

  const projectTransactions = useMemo(
    () => (selectedProjectId ? transactions.filter((item) => item.projectId === selectedProjectId).slice(0, 12) : []),
    [selectedProjectId, transactions],
  )

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold">Budget Engineer Dashboard</h1>
          <p className="mt-3 text-slate-300">No project selected. Create or restore a project to continue with BOQ generation.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-300">Budget Engineer Studio</div>
                <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
                <p className="mt-3 max-w-3xl text-slate-300">{project.brief.briefText}</p>
              </div>
              <div className="grid min-w-[220px] gap-3 text-sm text-slate-300">
                <Metric label="Region" value={project.brief.region} />
                <Metric label="Currency" value={project.brief.currency} />
                <Metric label="Budget" value={project.brief.budgetText || 'Not specified'} />
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Design Options</h2>
                <p className="mt-1 text-sm text-slate-300">Select the active design option before generating the BOQ and rendering the CAD plan.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => selectedProjectId && generateBoqForSelectedDesign(selectedProjectId)}
                  disabled={!selectedDesign}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  Generate BOQ from Geometry
                </button>
                <button
                  onClick={() => {
                    if (!selectedProjectId) return
                    const data = exportMakerJsonForSelectedDesign(selectedProjectId)
                    setMakerJsonPreview(data)
                  }}
                  disabled={!selectedDesign}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-800/40 disabled:text-slate-400"
                >
                  Preview Maker JSON
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {designs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-300">No design options available yet.</div>
              ) : (
                designs.map((design) => {
                  const isActive = design.id === selectedDesign?.id
                  return (
                    <button
                      key={design.id}
                      onClick={() => selectedProjectId && setSelectedDesign(selectedProjectId, design.id)}
                      className={`rounded-2xl border p-5 text-left transition ${isActive ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-slate-900/40 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Option</div>
                          <div className="mt-1 text-lg font-semibold text-white">{design.name}</div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs ${isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/10 text-slate-300'}`}>
                          {isActive ? 'Selected' : 'Select'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-slate-300">
                        <Metric label="Area" value={`${design.grossFloorArea} m²`} compact />
                        <Metric label="Floors" value={`${design.floors}`} compact />
                        <Metric label="Elements" value={`${design.elements.length}`} compact />
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <PlanComparison designs={designs} selectedDesignId={selectedDesign?.id} />

          <WallFirstCanvas
            document={doc}
            basePlan={currentPlan}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onChange={(next) => {
              setDoc(next)
              if (selectedProjectId && selectedDesign) {
                saveCadDocForDesign(selectedProjectId, selectedDesign.id, next)
                savePlanForDesign(selectedProjectId, selectedDesign.id, cadDocumentToRichPlanModel(next, currentPlan))
              }
            }}
          />

          <PlanCanvas
            projectId={selectedProjectId}
            design={selectedDesign}
            persistedPlan={projectedPlan}
            onSavePlan={savePlanForDesign}
          />

          {makerJsonPreview && (
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Maker.js Export Preview</h2>
                <button
                  onClick={() => setMakerJsonPreview(null)}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Close
                </button>
              </div>
              <pre className="max-h-[320px] overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-slate-200">{makerJsonPreview}</pre>
            </section>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Bill of Quantities</h2>
                <p className="mt-1 text-sm text-slate-300">Computed from live plan geometry using local seeded rate cards.</p>
              </div>
              {boqs.length > 0 && (
                <select
                  value={selectedBoq?.id ?? ''}
                  onChange={(event) => selectedProjectId && setSelectedBoq(selectedProjectId, event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                >
                  {boqs.map((boq, index) => (
                    <option key={boq.id} value={boq.id}>
                      BOQ {boqs.length - index} · {formatCurrency(boq.totals.grandTotalCents, boq.currency)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <BOQPanel boq={selectedBoq} />
          </section>
        </section>

        <aside className="space-y-6">
          <PlanLegend design={selectedDesign} plan={projectedPlan} />
          <LayerPanel doc={doc} onToggleLayer={() => {}} />
          <FloorPanel doc={doc} onSelectFloor={(floorId) => {
            if (!doc || !selectedProjectId || !selectedDesign) return
            const next = { ...doc, activeFloorId: floorId }
            setDoc(next)
            saveCadDocForDesign(selectedProjectId, selectedDesign.id, next)
          }} />
          <AnnotationPanel doc={doc} />
          <CadSemanticsPanel doc={doc} />
          <VerticalCoordinationPanel doc={doc} />
          <BimPropertyPanel doc={doc} selectedWallId={doc?.walls[0]?.id ?? null} />

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Current Selection</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Metric label="Project" value={project.name} />
              <Metric label="Design" value={selectedDesign?.name ?? 'None'} />
              <Metric label="BOQ Items" value={selectedBoq ? `${selectedBoq.lineItems.length}` : '0'} />
              <Metric label="Grand Total" value={selectedBoq ? formatCurrency(selectedBoq.totals.grandTotalCents, selectedBoq.currency) : '—'} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Transaction History</h2>
            <div className="mt-4 space-y-3">
              {projectTransactions.length === 0 ? (
                <div className="text-sm text-slate-300">No transactions yet.</div>
              ) : (
                projectTransactions.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white">{entry.action}</div>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">{entry.actor}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{entry.entityType} · {new Date(entry.timestamp).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? '' : 'rounded-2xl border border-white/10 bg-slate-900/40 p-3'}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  )
}
