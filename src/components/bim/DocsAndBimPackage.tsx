import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Download, FileText, Layers, Eye } from 'lucide-react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { PascalViewer } from './PascalViewer'
import { DrawIoEditor } from './DrawIoEditor'

export interface DocsAndBimPackageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
  height?: number
}

interface SheetDef {
  id: string
  number: string
  title: string
  category: 'plan' | 'elevation' | 'section' | 'mep' | 'schedule' | 'compliance'
}

const SADC_SHEETS: SheetDef[] = [
  { id: 'register', number: 'A-001', title: 'Drawing Register & Notes', category: 'schedule' },
  { id: 'site-plan', number: 'A-101', title: 'Site Plan', category: 'plan' },
  { id: 'ground-floor', number: 'A-102', title: 'Ground Floor Plan', category: 'plan' },
  { id: 'first-floor', number: 'A-103', title: 'First Floor Plan', category: 'plan' },
  { id: 'roof-plan', number: 'A-104', title: 'Roof Plan', category: 'plan' },
  { id: 'foundation', number: 'A-105', title: 'Foundation Plan', category: 'plan' },
  { id: 'front-elev', number: 'A-201', title: 'Front Elevation', category: 'elevation' },
  { id: 'rear-elev', number: 'A-202', title: 'Rear Elevation', category: 'elevation' },
  { id: 'left-elev', number: 'A-203', title: 'Left Elevation', category: 'elevation' },
  { id: 'right-elev', number: 'A-204', title: 'Right Elevation', category: 'elevation' },
  { id: 'section-1', number: 'A-301', title: 'Section A-A', category: 'section' },
  { id: 'section-2', number: 'A-302', title: 'Section B-B', category: 'section' },
  { id: 'electrical', number: 'A-401', title: 'Electrical Plan', category: 'mep' },
  { id: 'plumbing', number: 'A-402', title: 'Plumbing Plan', category: 'mep' },
  { id: 'door-window', number: 'A-501', title: 'Door & Window Schedule', category: 'schedule' },
  { id: 'room-schedule', number: 'A-502', title: 'Room Schedule', category: 'schedule' },
  { id: 'details', number: 'A-601', title: 'Construction Details', category: 'plan' },
  { id: 'compliance', number: 'A-701', title: 'Compliance Certificate', category: 'compliance' },
]

const CATEGORY_COLORS: Record<string, string> = {
  plan: '#3b82f6',
  elevation: '#22c55e',
  section: '#f59e0b',
  mep: '#ef4444',
  schedule: '#8b5cf6',
  compliance: '#d4a574',
}

export function DocsAndBimPackage({
  activePlan: _activePlan,
  selectedDesign: _selectedDesign,
  height = 500,
}: DocsAndBimPackageProps) {
  const [activeSheetId, setActiveSheetId] = useState('register')
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const [xmlMap, setXmlMap] = useState<Record<string, string>>({})

  const activeSheet = useMemo(
    () => SADC_SHEETS.find((s) => s.id === activeSheetId) ?? SADC_SHEETS[0],
    [activeSheetId],
  )

  const sheetsByCategory = useMemo(() => {
    const grouped: Record<string, SheetDef[]> = {}
    for (const sheet of SADC_SHEETS) {
      if (!grouped[sheet.category]) grouped[sheet.category] = []
      grouped[sheet.category].push(sheet)
    }
    return grouped
  }, [])

  const handleXmlChange = useCallback(
    (xml: string) => {
      setXmlMap((prev) => ({ ...prev, [activeSheetId]: xml }))
    },
    [activeSheetId],
  )

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(xmlMap, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'council-package.xml'
    a.click()
    URL.revokeObjectURL(url)
  }, [xmlMap])

  const completedCount = Object.keys(xmlMap).length

  return (
    <div
      className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden"
      data-component="docs-and-bim-package"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--brand-accent)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            18-Sheet SADC Council Package
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">
            {completedCount}/{SADC_SHEETS.length}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === '3d' ? 'brand' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('3d')}
            className="text-xs h-7"
          >
            <Eye className="h-3 w-3 mr-1" /> 3D
          </Button>
          <Button
            variant={viewMode === '2d' ? 'brand' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('2d')}
            className="text-xs h-7"
          >
            <FileText className="h-3 w-3 mr-1" /> 2D
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="text-xs h-7"
          >
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="flex" style={{ height }}>
        <div className="w-56 border-r border-white/10 overflow-y-auto bg-slate-900/50">
          {Object.entries(sheetsByCategory).map(([cat, sheets]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800/50">
                {cat}
              </div>
              {sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => setActiveSheetId(sheet.id)}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-white/5 transition-colors ${
                    activeSheetId === sheet.id
                      ? 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                  data-sheet-id={sheet.id}
                >
                  <span className="font-mono text-[10px] mr-1.5" style={{ color: CATEGORY_COLORS[cat] }}>
                    {sheet.number}
                  </span>
                  {sheet.title}
                  {xmlMap[sheet.id] && (
                    <span className="ml-1 text-green-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: CATEGORY_COLORS[activeSheet.category] + '20',
                color: CATEGORY_COLORS[activeSheet.category],
              }}
            >
              {activeSheet.number}
            </span>
            <span className="text-sm text-[var(--text-primary)]">{activeSheet.title}</span>
          </div>

          {viewMode === '3d' ? (
            <PascalViewer height={height - 80} />
          ) : (
            <DrawIoEditor
              initialXml={xmlMap[activeSheetId] ?? ''}
              onXmlChange={handleXmlChange}
              height={height - 80}
            />
          )}
        </div>
      </div>
    </div>
  )
}
