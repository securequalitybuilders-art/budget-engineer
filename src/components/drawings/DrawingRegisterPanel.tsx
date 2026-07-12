import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, Clock, AlertTriangle, Filter, ListOrdered } from 'lucide-react'
import type { DrawingRegisterSheet, DisciplineCode, SheetStatus } from '@/lib/drawings/drawing-register'

interface DrawingRegisterPanelProps {
  sheets: DrawingRegisterSheet[]
  activeSheetId: string | null
  onSelectSheet: (id: string) => void
}

const DISCIPLINES: { value: DisciplineCode | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'A', label: 'Architecture' },
  { value: 'S', label: 'Structural' },
  { value: 'E', label: 'Electrical' },
  { value: 'P', label: 'Plumbing' },
  { value: 'M', label: 'Mechanical' },
  { value: 'I', label: 'Interior' },
  { value: 'L', label: 'Landscape' },
  { value: 'C', label: 'Civil' },
]

const STATUS_OPTIONS: { value: SheetStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'generated', label: 'Generated' },
  { value: 'error', label: 'Error' },
]

function StatusBadge({ status }: { status: SheetStatus }) {
  switch (status) {
    case 'generated':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <CheckCircle size={10} />
          Generated
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-500/10 px-2 py-0.5 text-[10px] font-medium text-stone-400">
          <Clock size={10} />
          Pending
        </span>
      )
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
          <AlertTriangle size={10} />
          Error
        </span>
      )
  }
}

function DisciplineBadge({ code }: { code: DisciplineCode }) {
  const colors: Record<DisciplineCode, string> = {
    A: 'bg-cyan-500/10 text-cyan-300',
    S: 'bg-red-500/10 text-red-300',
    M: 'bg-amber-500/10 text-amber-300',
    E: 'bg-yellow-500/10 text-yellow-300',
    P: 'bg-blue-500/10 text-blue-300',
    I: 'bg-violet-500/10 text-violet-300',
    L: 'bg-green-500/10 text-green-300',
    C: 'bg-stone-500/10 text-stone-300',
  }
  return (
    <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${colors[code] ?? 'bg-stone-500/10 text-stone-300'}`}>
      {code}
    </span>
  )
}

export function DrawingRegisterPanel({ sheets, activeSheetId, onSelectSheet }: DrawingRegisterPanelProps) {
  const [discipline, setDiscipline] = useState<DisciplineCode | 'ALL'>('ALL')
  const [status, setStatus] = useState<SheetStatus | 'ALL'>('ALL')

  const filtered = sheets.filter((s) => {
    if (discipline !== 'ALL' && s.discipline !== discipline) return false
    if (status !== 'ALL' && s.status !== status) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => a.sheetNumber.localeCompare(b.sheetNumber))

  const pendingCount = sheets.filter((s) => s.status === 'pending').length
  const generatedCount = sheets.filter((s) => s.status === 'generated').length
  const errorCount = sheets.filter((s) => s.status === 'error').length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-stone-700/60 bg-stone-900/60 px-2.5 py-1.5">
          <Filter size={12} className="text-stone-400" />
          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              data-testid={`disc-filter-${d.value}`}
              onClick={() => setDiscipline(d.value)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                discipline === d.value
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-stone-700/60 bg-stone-900/60 px-2.5 py-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              data-testid={`status-filter-${s.value}`}
              onClick={() => setStatus(s.value)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                status === s.value
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <FileText size={10} /> {sheets.length} total
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle size={10} /> {generatedCount} generated
        </span>
        <span className="flex items-center gap-1 text-stone-400">
          <Clock size={10} /> {pendingCount} pending
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle size={10} /> {errorCount} errors
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-700/60">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-stone-700/60 bg-stone-900/80">
              <th className="px-3 py-2 font-medium text-stone-400">Sheet</th>
              <th className="px-3 py-2 font-medium text-stone-400">Title</th>
              <th className="px-3 py-2 font-medium text-stone-400">Disc.</th>
              <th className="px-3 py-2 font-medium text-stone-400">Scale</th>
              <th className="px-3 py-2 font-medium text-stone-400">Rev</th>
              <th className="px-3 py-2 font-medium text-stone-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr key="empty">
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No drawings match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((sheet) => (
                <motion.tr
                  key={sheet.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onSelectSheet(sheet.id)}
                  className={`cursor-pointer border-b border-stone-800/60 transition-colors hover:bg-stone-800/40 ${
                    activeSheetId === sheet.id ? 'bg-cyan-600/10' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-300">
                    <span className="inline-flex items-center gap-1">
                      <ListOrdered size={10} className="text-gray-400" />
                      {sheet.sheetNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-stone-200">{sheet.title}</td>
                  <td className="px-3 py-2">
                    <DisciplineBadge code={sheet.discipline} />
                  </td>
                  <td className="px-3 py-2 text-stone-400">{sheet.scale}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-stone-400">{sheet.revision}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={sheet.status} />
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {errorCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertTriangle size={12} className="text-red-400 shrink-0" />
          <p className="text-[10px] text-red-300">
            {errorCount} drawing{errorCount > 1 ? 's' : ''} encountered an error during generation.
          </p>
        </div>
      )}
    </div>
  )
}
