import { useState, useCallback } from 'react'
import { useDiagnosticsStore } from '@/stores/diagnosticsStore'
import { Bug, Download, Trash2, X } from 'lucide-react'

interface DiagnosticsPanelProps {
  onClose: () => void
}

export function DiagnosticsPanel({ onClose }: DiagnosticsPanelProps) {
  const { log, buildVersion, buildTime, clearLog, getExportableState } = useDiagnosticsStore()
  const [tab, setTab] = useState<'log' | 'info'>('log')

  const handleExport = useCallback(() => {
    const state = getExportableState()
    const blob = new Blob([state], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-engineer-diagnostics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [getExportableState])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bug size={16} className="text-[var(--brand-accent)]" />
            <span className="text-sm font-semibold">Diagnostics</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Export diagnostics">
              <Download size={14} />
            </button>
            <button onClick={clearLog} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Clear log">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-[var(--border-default)]">
          <button
            onClick={() => setTab('log')}
            className={`px-4 py-2 text-xs font-medium ${tab === 'log' ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
          >
            Error Log ({log.length})
          </button>
          <button
            onClick={() => setTab('info')}
            className={`px-4 py-2 text-xs font-medium ${tab === 'info' ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
          >
            Build Info
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {tab === 'log' && (
            log.length === 0 ? (
              <p className="text-center text-xs text-[var(--text-muted)]">No errors captured.</p>
            ) : (
              <div className="space-y-1">
                {log.slice().reverse().map((entry) => (
                  <div key={entry.id} className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-mono">
                    <span className={
                      entry.level === 'error' ? 'text-red-400' :
                      entry.level === 'warn' ? 'text-amber-400' :
                      'text-gray-400'
                    }>
                      [{entry.level.toUpperCase()}]
                    </span>{' '}
                    <span className="text-[var(--text-muted)]">{new Date(entry.timestamp).toLocaleTimeString()}</span>{' '}
                    <span className="text-[var(--text-secondary)]">{entry.message}</span>
                    {entry.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[var(--text-tertiary)]">Stack</summary>
                        <pre className="mt-1 whitespace-pre-wrap text-[10px] text-[var(--text-tertiary)]">{entry.stack}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'info' && (
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Build Version</span>
                <span className="text-[var(--text-primary)]">{buildVersion}</span>
              </div>
              <div className="flex justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Build Time</span>
                <span className="text-[var(--text-primary)]">{new Date(buildTime).toISOString()}</span>
              </div>
              <div className="flex justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">User Agent</span>
                <span className="max-w-[60%] truncate text-[var(--text-primary)]">{navigator.userAgent}</span>
              </div>
              <div className="flex justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Online</span>
                <span className={navigator.onLine ? 'text-green-400' : 'text-red-400'}>{navigator.onLine ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between rounded bg-[var(--bg-tertiary)] px-3 py-2">
                <span className="text-[var(--text-tertiary)]">Storage (localStorage)</span>
                <span className="text-[var(--text-primary)]">{formatBytes(new Blob([JSON.stringify(localStorage)]).size)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
