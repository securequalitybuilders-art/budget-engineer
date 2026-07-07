import { lazy, Suspense, useState } from 'react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Bim3DUnavailable } from '@/components/bim/Bim3DUnavailable'
import { isWebGLAvailable } from '@/lib/webgl'
import type { ViewMode } from './viewMode'

const BimModel3DInner = lazy(() =>
  import('./BimModel3D').then((m) => ({ default: m.BimModel3D })),
)

interface LazyBimModel3DProps {
  plan: PlanModel | null
  design: DesignOption | null
  height?: number
}

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'dollhouse', label: 'Dollhouse' },
  { value: 'noRoof', label: 'No Roof' },
]

export function LazyBimModel3D(props: LazyBimModel3DProps) {
  const [retryKey, setRetryKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [visibleStorey, setVisibleStorey] = useState<number | 'all'>('all')

  const handleRetry = () => setRetryKey((k) => k + 1)

  const storeyCount = props.design?.floors ?? 1
  const storeyLabels: { value: number | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    ...Array.from({ length: storeyCount }, (_, i) => ({
      value: i,
      label: i === 0 ? 'G' : String(i),
    })),
  ]

  if (!isWebGLAvailable()) {
    return <Bim3DUnavailable onRetry={handleRetry} />
  }

  return (
    <ErrorBoundary fallback={(retry) => <Bim3DUnavailable onRetry={retry} />}>
      {/* View mode controls */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {/* View-mode buttons */}
        <div className="flex items-center gap-0.5 rounded-lg bg-stone-900/80 p-0.5" role="group" aria-label="3D view mode">
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              aria-pressed={viewMode === m.value}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === m.value
                  ? 'bg-cyan-700 text-white'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Storey selector — only when multi-storey */}
        {storeyCount > 1 && (
          <div className="flex items-center gap-0.5 rounded-lg bg-stone-900/80 p-0.5" role="group" aria-label="Storey selector">
            {storeyLabels.map((s) => (
              <button
                key={String(s.value)}
                onClick={() => setVisibleStorey(s.value)}
                aria-pressed={visibleStorey === s.value}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  visibleStorey === s.value
                    ? 'bg-cyan-700 text-white'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Suspense
        fallback={
          <div
            className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60"
            style={{ height: props.height ?? 480 }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-sm text-slate-400">Loading 3D BIM model...</p>
            </div>
          </div>
        }
      >
        <BimModel3DInner key={retryKey} viewMode={viewMode} visibleStorey={visibleStorey} {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
