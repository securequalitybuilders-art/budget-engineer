import type { PipelineResult } from '@/engine/pipeline/generativeDesignPipeline'
import { CheckCircle2, XCircle, AlertTriangle, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PipelineResultsPanelProps {
  result: PipelineResult | null
  isOpen: boolean
  onClose: () => void
}

export function PipelineResultsPanel({ result, isOpen, onClose }: PipelineResultsPanelProps) {
  if (!isOpen || !result) return null

  const stepIcons: Record<string, React.ReactNode> = {
    passed: <CheckCircle2 size={14} className="text-green-400" />,
    failed: <XCircle size={14} className="text-red-400" />,
    running: <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />,
    pending: <div className="h-3.5 w-3.5 rounded-full border border-slate-500" />,
    skipped: <div className="h-3.5 w-3.5 rounded-full bg-slate-600" />,
  }

  const cr = result.complianceReport
  const cp = result.councilPackage

  const downloadReport = async () => {
    const { formatPipelineReport } = await import('@/engine/pipeline/generativeDesignPipeline')
    const text = formatPipelineReport(result)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pipeline-report-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 pt-10 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl shadow-cyan-500/10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${result.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {result.success ? <CheckCircle2 size={22} className="text-green-400" /> : <XCircle size={22} className="text-red-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pipeline Results</h2>
              <p className={`text-xs ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Design generated successfully' : 'Pipeline completed with errors'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={downloadReport}>
              <Download size={14} />
              Report
            </Button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close results panel">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-400">Steps</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.steps.map((step) => (
              <div key={step.name} className="flex items-center gap-2.5 rounded-lg bg-slate-800/80 px-3 py-2">
                {stepIcons[step.status] ?? stepIcons.pending}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-200">{step.name}</span>
                  <span className="block text-[10px] text-slate-400">{step.durationMs ? `${step.durationMs}ms` : step.status}</span>
                </div>
                {step.error && (
                  <span className="shrink-0" title={step.error}>
                    <AlertTriangle size={12} className="text-amber-400" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cr && (
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">Compliance</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{cr.score}%</span>
                <span className="text-xs text-slate-400">{cr.passedRules}/{cr.totalRules} rules passed</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all ${cr.score >= 80 ? 'bg-green-500' : cr.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${cr.score}%` }}
                />
              </div>
              {cr.warnings.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] font-medium text-amber-400">Warnings</p>
                  {cr.warnings.slice(0, 3).map((w, i) => (
                    <p key={i} className="text-[10px] text-slate-400">{w}</p>
                  ))}
                  {cr.warnings.length > 3 && (
                    <p className="text-[10px] text-slate-400">+{cr.warnings.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          )}

          {cp && (
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-400">Council Package</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sheets</span>
                  <span className="font-medium text-white">{cp.sheets.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Drawing Register</span>
                  <span className="font-medium text-white">{cp.drawingRegister.length} entries</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Room Schedule</span>
                  <span className="font-medium text-white">{cp.roomSchedule.length} rooms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">BOQ Total</span>
                  <span className="font-medium text-white">{cp.boqSummary.currency} {cp.boqSummary.totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Disciplines</span>
                  <span className="font-medium text-white">{[...new Set(cp.sheets.map(s => s.discipline))].join(', ')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {result.optimizerResult && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">Optimization</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Candidates</span>
                <span className="font-medium text-white">{result.optimizerResult.candidates.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pareto Front</span>
                <span className="font-medium text-white">{result.optimizerResult.paretoFront.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Topologies</span>
                <span className="font-medium text-white">{[...new Set(result.optimizerResult.candidates.map(c => c.topology))].join(', ')}</span>
              </div>
              {result.selectedCandidate && (
                <div className="mt-2 rounded-lg bg-slate-900/60 p-2">
                  <p className="text-[10px] font-medium text-amber-300">Selected</p>
                  <p className="text-xs text-slate-300">{result.selectedCandidate.topology} (seed {result.selectedCandidate.seed})</p>
                  <p className="text-[10px] text-slate-400">
                    scores: eff {(result.selectedCandidate.scores.efficiency * 100).toFixed(0)}% · wc {(result.selectedCandidate.scores.wetCoreClustering * 100).toFixed(0)}% · str {(result.selectedCandidate.scores.structuralEfficiency * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {result.enhancedBrief?.spatialConstraints && result.enhancedBrief.spatialConstraints.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-400">Spatial Constraints</h3>
            <div className="flex flex-wrap gap-1.5">
              {result.enhancedBrief.spatialConstraints.map((c, i) => {
                const label = 'rooms' in c ? (c as { rooms: string[] }).rooms.join(' → ') : 'room' in c ? (c as { room: string }).room : `${(c as { source: string }).source} → ${(c as { target: string }).target}`
                return (
                  <span key={i} className="rounded-md bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300">
                    {c.type}: {label}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
