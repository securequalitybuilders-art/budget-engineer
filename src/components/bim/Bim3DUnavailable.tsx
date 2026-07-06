import { type ReactNode } from 'react'

interface Bim3DUnavailableProps {
  onRetry?: () => void
}

export function Bim3DUnavailable({ onRetry }: Bim3DUnavailableProps): ReactNode {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-6"
      style={{ minHeight: 240 }}
    >
      <p className="max-w-md text-center text-sm text-stone-300">
        3D view unavailable on this device/browser. Your drawings, 2D plan, BOQ, and exports still work.
      </p>
      <p className="max-w-md text-center text-xs text-stone-400">
        Try a different browser, disable heavy extensions, or reload.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-600/30"
        >
          Retry
        </button>
      )}
    </div>
  )
}
