import { useState } from 'react'
import { Save, RotateCcw, Undo2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface CadSyncControlsProps {
  sourceLabel: string
  lastSavedAt?: string | null
  isSaving?: boolean
  disabled?: boolean
  statusMessage?: string | null
  statusType?: 'success' | 'error' | 'info' | null
  onSave: () => Promise<void> | void
  onRestore: () => Promise<void> | void
  onReset: () => void
}

export function CadSyncControls({
  sourceLabel,
  lastSavedAt,
  isSaving = false,
  disabled = false,
  statusMessage,
  statusType,
  onSave,
  onRestore,
  onReset,
}: CadSyncControlsProps) {
  const [expanded, setExpanded] = useState(false)

  const statusColor =
    statusType === 'success' ? 'text-emerald-400' :
    statusType === 'error' ? 'text-red-400' :
    statusType === 'info' ? 'text-cyan-400' :
    'text-stone-400'

  const statusIcon =
    statusType === 'success' ? <CheckCircle2 size={10} className="shrink-0" /> :
    statusType === 'error' ? <AlertCircle size={10} className="shrink-0" /> :
    null

  const lastSavedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 rounded-full bg-stone-800/80 px-2 py-1 text-[10px] text-stone-400 transition-colors hover:bg-stone-700/80 hover:text-stone-200"
        aria-label="CAD sync controls"
        title={sourceLabel}
      >
        <Save size={12} className="text-cyan-400" />
        <span className="hidden sm:inline">{expanded ? 'Close' : 'CAD'}</span>
      </button>

      {expanded && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-stone-700/60 bg-stone-900 p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-2 text-[10px]">
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
              sourceLabel === 'Edited CAD'
                ? 'bg-amber-500/20 text-amber-300'
                : sourceLabel === 'Fallback'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {sourceLabel}
            </span>
          </div>

          {lastSavedTime && (
            <div className="mb-2 flex items-center gap-1.5 text-[10px] text-stone-400">
              <Clock size={10} />
              <span>Saved {lastSavedTime}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={() => { onSave(); setExpanded(false) }}
              disabled={disabled || isSaving}
              className="flex items-center gap-2 rounded-md bg-cyan-600/20 px-2.5 py-1.5 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-600/30 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Save CAD now"
            >
              <Save size={12} />
              {isSaving ? 'Saving...' : 'Save CAD Now'}
            </button>

            <button
              onClick={() => { onRestore(); setExpanded(false) }}
              disabled={disabled}
              className="flex items-center gap-2 rounded-md bg-stone-800 px-2.5 py-1.5 text-[11px] text-stone-300 transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Restore saved CAD"
            >
              <RotateCcw size={12} />
              Restore Saved CAD
            </button>

            <button
              onClick={() => { onReset(); setExpanded(false) }}
              disabled={disabled}
              className="flex items-center gap-2 rounded-md bg-stone-800 px-2.5 py-1.5 text-[11px] text-stone-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Reset to generated design"
            >
              <Undo2 size={12} />
              Reset to Generated
            </button>
          </div>

          {statusMessage && (
            <div className={`mt-2 flex items-center gap-1.5 rounded bg-stone-800/80 p-1.5 text-[9px] ${statusColor}`}>
              {statusIcon}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
