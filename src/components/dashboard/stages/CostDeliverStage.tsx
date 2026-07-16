import { useMemo, useState, useCallback, useEffect } from 'react'
import { BoqExportPanel } from '@/components/dashboard/BoqExportPanel'
import { SchedulesPanel } from '@/components/planning/SchedulesPanel'
import { GanttChart } from '@/components/planning/GanttChart'
import { CashflowChart } from '@/components/planning/CashflowChart'
import { DeliveryWorkflowPanel } from '@/components/delivery/DeliveryWorkflowPanel'
import { ProcurementPanel } from '@/components/procurement/ProcurementPanel'
import { Box, ClipboardList, CalendarDays, TrendingUp, FileText, FileSpreadsheet, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useDeliveryStore } from '@/stores/deliveryStore'
import { useProcurementStore } from '@/stores/procurementStore'
import { useProjectStore } from '@/stores/projectStore'
import type { DesignOption } from '@/domain/boq'
import type { BoqResult } from '@/adapters/designToBoq'
import type { PlanModel } from '@/domain/plan'
import { generateSchedules } from '@/adapters/designToSchedules'
import { generateDetailedBoq, buildFormalBOQ } from '@/lib/boq/detailedBoq'
import { generateProgramme } from '@/lib/planning/gantt'
import { computeCashflow } from '@/lib/planning/cashflow'
import type { RoofType } from '@/adapters/designToBoq'
import { downloadTextFile } from '@/adapters/designToBoq'

interface CostDeliverStageProps {
  selectedDesign: DesignOption | null
  boq: BoqResult | null
  onExport: (type: 'csv' | 'html' | 'print') => void
  activePlan: PlanModel | null
  buildingType: string
  projectRegion?: string
}

const TABS = [
  { id: 'boq', label: 'BOQ', icon: ClipboardList },
  { id: 'schedules', label: 'Schedules', icon: CalendarDays },
  { id: 'programme', label: 'Programme', icon: CalendarDays },
  { id: 'cashflow', label: 'Cashflow', icon: TrendingUp },
  { id: 'delivery', label: 'Delivery', icon: FileSpreadsheet },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
] as const

type TabId = (typeof TABS)[number]['id']

export function CostDeliverStage({
  selectedDesign,
  boq,
  onExport,
  activePlan,
  buildingType,
  projectRegion,
}: CostDeliverStageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('boq')
  const projectStartDate = new Date().toISOString().split('T')[0]
  const projectId = useProjectStore((s) => s.currentProjectId)

  const { currentDelivery, loadForProject: loadDelivery } = useDeliveryStore()
  const { loadForProject: loadProcurement } = useProcurementStore()

  useEffect(() => {
    if (projectId) {
      loadDelivery(projectId)
      loadProcurement(projectId)
    }
  }, [projectId, loadDelivery, loadProcurement])
  const region = projectRegion ?? 'zimbabwe'

  const detailedBoq = useMemo(() => {
    if (!selectedDesign) return null
    return generateDetailedBoq(selectedDesign, {
      region,
      roofType: 'concrete-slab' as RoofType,
      depth: 'trade-detailed',
      areaM2: selectedDesign.grossFloorArea,
      floorCount: selectedDesign.floors,
    })
  }, [selectedDesign, region])

  // Bridge DetailedBoqResult → BoqResult so the BOQ tab shows all 11 trade sections
  const detailedBoqAsResult: BoqResult | null = useMemo(() => {
    if (!detailedBoq) return null
    return {
      ...detailedBoq.boq,
      assumptions: detailedBoq.assumptions,
      quantities: detailedBoq.quantities,
      estimateDepth: detailedBoq.depth === 'detailed' ? 'detailed' as const : 'shell' as const,
    }
  }, [detailedBoq])

  const schedules = useMemo(() => {
    if (!selectedDesign) return null
    return generateSchedules(selectedDesign, 'concrete-slab')
  }, [selectedDesign])

  const programme = useMemo(() => {
    if (!detailedBoq) return null
    const areaM2 = selectedDesign?.grossFloorArea ?? 150
    const floors = selectedDesign?.floors ?? 1
    return generateProgramme(detailedBoq.boq.summary.subtotal, areaM2, floors, detailedBoq.quantities.roomCount, true, projectStartDate)
  }, [detailedBoq, selectedDesign])

  const cashflow = useMemo(() => {
    if (!programme) return null
    return computeCashflow(programme.tasks, programme.totalDurationDays, programme.startDate)
  }, [programme])

  const handleExportFormalBoq = useCallback(() => {
    if (!detailedBoq || !selectedDesign) return
    const html = buildFormalBOQ(detailedBoq, selectedDesign, region, {
      region,
      roofType: 'concrete-slab' as RoofType,
      depth: 'trade-detailed',
      areaM2: selectedDesign.grossFloorArea,
      floorCount: selectedDesign.floors,
    })
    const slug = selectedDesign.name.toLowerCase().replace(/\s+/g, '-')
    downloadTextFile(`formal-boq-${slug}.html`, html, 'text/html')
  }, [detailedBoq, selectedDesign, region])

  if (!selectedDesign) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
            <Box size={40} className="text-[var(--brand-accent)]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Cost & Deliver</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            Select a design option in the Concept stage first. BOQ and export options appear once a design is chosen.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex gap-0 border-b border-stone-700/60 bg-stone-900/30 px-4">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-stone-400 hover:text-stone-300 hover:border-stone-500'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'boq' && (
          <div className="p-4 space-y-3">
            <BoqExportPanel
              selectedDesign={selectedDesign}
              boq={detailedBoqAsResult ?? boq}
              onExport={onExport}
              activePlan={activePlan}
              buildingType={buildingType}
              projectRegion={projectRegion}
            />
            {detailedBoq && (
              <button
                onClick={handleExportFormalBoq}
                className="flex w-full items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-cyan-600/40 hover:bg-cyan-500/5 hover:text-cyan-200"
              >
                <FileText size={14} />
                Download Full Formal BOQ — Material Schedule &amp; Gantt Included
              </button>
            )}
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="p-4">
            <SchedulesPanel schedules={schedules} />
          </div>
        )}

        {activeTab === 'programme' && programme && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-200">Construction Programme — Gantt Chart</h3>
              <span className="text-[10px] text-stone-400">
                {programme.totalDurationDays} days | {programme.criticalPath.length} critical tasks
              </span>
            </div>
            <GanttChart gantt={programme} currency={detailedBoq?.boq.currency ?? 'USD'} />
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="p-4">
            <DeliveryWorkflowPanel delivery={currentDelivery} />
          </div>
        )}

        {activeTab === 'procurement' && projectId && (
          <div className="p-4">
            <ProcurementPanel projectId={projectId} />
          </div>
        )}

        {activeTab === 'cashflow' && cashflow && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-200">Cashflow Analysis</h3>
              <span className="text-[10px] text-stone-400">
                {cashflow.weekly.length} weeks | Peak: {cashflow.peakCost.toFixed(2)}
              </span>
            </div>
            <CashflowChart cashflow={cashflow} currency={detailedBoq?.boq.currency ?? 'USD'} />
          </div>
        )}
      </div>
    </div>
  )
}
