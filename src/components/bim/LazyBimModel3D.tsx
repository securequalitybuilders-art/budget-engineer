import { lazy, Suspense, useState } from 'react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Bim3DUnavailable } from '@/components/bim/Bim3DUnavailable'
import { isWebGLAvailable } from '@/lib/webgl'

const BimModel3DInner = lazy(() =>
  import('./BimModel3D').then((m) => ({ default: m.BimModel3D })),
)

interface LazyBimModel3DProps {
  plan: PlanModel | null
  design: DesignOption | null
  height?: number
}

export function LazyBimModel3D(props: LazyBimModel3DProps) {
  const [retryKey, setRetryKey] = useState(0)

  const handleRetry = () => setRetryKey((k) => k + 1)

  if (!isWebGLAvailable()) {
    return <Bim3DUnavailable onRetry={handleRetry} />
  }

  return (
    <ErrorBoundary fallback={(retry) => <Bim3DUnavailable onRetry={retry} />}>
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
        <BimModel3DInner key={retryKey} {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
